"""
Moissonnage incrémental JORADP
Modes: depuis_dernier, entre_dates, depuis_numero
"""
from datetime import datetime

from shared.postgres import get_connection
from harvester_joradp_exhaustive import JORADPExhaustiveHarvester


def _serialize_date(value):
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return value
    return value


class JORADPIncrementalHarvester(JORADPExhaustiveHarvester):
    """Moissonnage incrémental avec plusieurs modes"""

    def harvest_depuis_dernier(self):
        """Moissonne depuis le dernier document collecté (session ou global)."""
        print("🔄 Mode: Depuis le dernier document")

        last_doc = None
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT url, publication_date
                FROM joradp_documents
                WHERE session_id = %s
                ORDER BY publication_date DESC NULLS LAST, id DESC
                LIMIT 1
                """,
                (self.session_id,),
            )
            last_doc = cur.fetchone()

            if not last_doc:
                cur.execute(
                    """
                    SELECT url, publication_date
                    FROM joradp_documents
                    ORDER BY publication_date DESC NULLS LAST, id DESC
                    LIMIT 1
                    """
                )
                last_doc = cur.fetchone()

        if not last_doc:
            print("❌ Aucun document existant, utilisez harvest_all")
            self.last_doc_info = None
            return

        publication_date = _serialize_date(last_doc.get('publication_date'))
        self.last_doc_info = {
            'url': last_doc['url'],
            'date': publication_date
        }

        last_url = last_doc['url']
        parts = last_url.split('/')
        filename = parts[-1]  # F2024088.pdf
        year = int(filename[1:5])  # 2024
        num = int(filename[5:8])   # 088

        print(f"   Dernier doc: {filename} ({publication_date})")
        print(f"   Reprise depuis: année {year}, numéro {num + 1}")

        current_year = datetime.now().year

        if num < 999:
            self.harvest_year(year, start_num=num + 1)

        if year < current_year:
            self.harvest_all(start_year=year + 1, end_year=current_year)

    def harvest_entre_dates(self, date_debut, date_fin):
        """Moissonne/remoissonne entre deux dates"""
        print(f"🔄 Mode: Entre dates {date_debut} et {date_fin}")

        year_debut = int(date_debut[:4])
        year_fin = int(date_fin[:4])

        print(f"   Années à traiter: {year_debut} à {year_fin}")
        self.harvest_all(start_year=year_debut, end_year=year_fin)

    def harvest_depuis_numero(self, year, start_num, max_docs=100):
        """Moissonne X documents depuis un numéro dans une année"""
        print(f"🔄 Mode: Depuis numéro {start_num} en {year}")
        print(f"   Maximum: {max_docs} documents")

        end_num = min(start_num + max_docs - 1, 999)
        self.harvest_year(year, start_num=start_num, max_num=end_num)


def test_incremental():
    """Test des différents modes"""
    print("🧪 Test moissonnage incrémental\n")

    harvester = JORADPIncrementalHarvester(session_id=14)
    harvester.harvest_depuis_dernier()


if __name__ == "__main__":
    test_incremental()
