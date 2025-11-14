import json
import os
from contextlib import contextmanager
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import declarative_base, relationship, scoped_session, sessionmaker


DATABASE_URL = os.getenv("HARVESTER_DATABASE_URL", "sqlite:///harvester.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = scoped_session(
    sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)
)

Base = declarative_base()


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True)
    base_url = Column(String(1024), unique=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )
    last_harvest_at = Column(DateTime)
    total_documents = Column(Integer, default=0, nullable=False)
    current_parameters_id = Column(Integer, ForeignKey("harvest_parameters.id"))

    sessions = relationship("HarvestSession", back_populates="site", cascade="all")
    documents = relationship("Document", back_populates="site", cascade="all")
    parameters_history = relationship(
        "HarvestParameters",
        back_populates="site",
        cascade="all, delete-orphan",
        order_by="HarvestParameters.created_at",
        foreign_keys="HarvestParameters.site_id",
    )
    current_parameters = relationship(
        "HarvestParameters",
        foreign_keys=[current_parameters_id],
        post_update=True,
    )


class HarvestParameters(Base):
    __tablename__ = "harvest_parameters"

    id = Column(Integer, primary_key=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    data = Column(Text, nullable=False)
    scope = Column(String(20), default="session", nullable=False)  # 'site' ou 'session'

    site = relationship(
        "Site",
        back_populates="parameters_history",
        foreign_keys=[site_id],
    )
    sessions = relationship("HarvestSession", back_populates="parameters")

    def as_dict(self):
        return {
            "id": self.id,
            "site_id": self.site_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "data": json.loads(self.data) if self.data else {},
            "scope": self.scope,
        }


class HarvestSession(Base):
    __tablename__ = "harvest_sessions"

    id = Column(Integer, primary_key=True)
    job_uuid = Column(String(36), unique=True, nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    parameters_id = Column(Integer, ForeignKey("harvest_parameters.id"))

    started_at = Column(DateTime, default=func.now(), nullable=False)
    completed_at = Column(DateTime)
    status = Column(String(20), default="running", nullable=False)
    total_found = Column(Integer, default=0, nullable=False)
    duplicates_removed = Column(Integer, default=0, nullable=False)
    new_documents = Column(Integer, default=0, nullable=False)
    total_documents = Column(Integer, default=0, nullable=False)
    error_message = Column(Text)

    site = relationship("Site", back_populates="sessions")
    parameters = relationship("HarvestParameters", back_populates="sessions")
    documents = relationship(
        "Document",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Document.id",
    )

    def as_summary(self):
        return {
            "id": self.job_uuid,
            "status": self.status,
            "site_id": self.site_id,
            "document_count": self.total_documents,
            "original_count": self.total_found,
            "deleted_count": self.duplicates_removed,
            "new_documents": self.new_documents,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "site_url": self.site.base_url if self.site else None,
        }


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint("site_id", "url", name="uq_document_site_url"),
    )

    id = Column(Integer, primary_key=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("harvest_sessions.id"), nullable=False)

    url = Column(Text, nullable=False)
    filename = Column(Text)
    title = Column(Text)
    file_type = Column(String(50))
    file_size = Column(String(50))
    last_modified = Column(String(100))
    accessible = Column(Integer, default=1, nullable=False)
    added_at = Column(DateTime, default=func.now(), nullable=False)
    extra_metadata = Column(Text)  # JSON brut des métadonnées supplémentaires

    site = relationship("Site", back_populates="documents")
    session = relationship("HarvestSession", back_populates="documents")

    def to_dict(self):
        base = {
            "id": self.id,
            "url": self.url,
            "filename": self.filename,
            "title": self.title,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "last_modified": self.last_modified,
            "accessible": bool(self.accessible),
            "added_at": self.added_at.isoformat() if self.added_at else None,
        }
        if self.extra_metadata:
            try:
                base.update(json.loads(self.extra_metadata))
            except json.JSONDecodeError:
                pass
        return base


class JoradpArchive(Base):
    __tablename__ = "joradp_archive"
    __table_args__ = (
        UniqueConstraint("year", "number", name="uq_joradp_year_number"),
    )

    id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False)
    number = Column(Integer, nullable=False)
    language = Column(String(20), default="jo-francais", nullable=False)
    url = Column(Text, nullable=False)
    filename = Column(String(255))
    status = Column(
        String(50),
        default="checking",
        nullable=False,
    )  # checking, available, downloaded, error_404, error_timeout, error_download
    local_path = Column(Text)
    file_size = Column(Integer)
    scan_attempts = Column(Integer, default=0, nullable=False)
    download_attempts = Column(Integer, default=0, nullable=False)
    last_error = Column(Text)
    first_checked = Column(DateTime)
    last_checked = Column(DateTime)
    downloaded_at = Column(DateTime)
    updated_at = Column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    def as_dict(self):
        return {
            "id": self.id,
            "year": self.year,
            "number": self.number,
            "language": self.language,
            "url": self.url,
            "filename": self.filename,
            "status": self.status,
            "local_path": self.local_path,
            "file_size": self.file_size,
            "scan_attempts": self.scan_attempts,
            "download_attempts": self.download_attempts,
            "last_error": self.last_error,
            "first_checked": self.first_checked.isoformat()
            if self.first_checked
            else None,
            "last_checked": self.last_checked.isoformat()
            if self.last_checked
            else None,
            "downloaded_at": self.downloaded_at.isoformat()
            if self.downloaded_at
            else None,
        }


class JoradpScanHistory(Base):
    __tablename__ = "joradp_scan_history"

    id = Column(Integer, primary_key=True)
    scan_type = Column(String(20), nullable=False)  # full, range, year, incremental
    year_start = Column(Integer)
    year_end = Column(Integer)
    started_at = Column(DateTime, default=func.now(), nullable=False)
    completed_at = Column(DateTime)
    status = Column(String(20), default="running", nullable=False)
    total_checked = Column(Integer, default=0, nullable=False)
    found_available = Column(Integer, default=0, nullable=False)
    found_errors = Column(Integer, default=0, nullable=False)
    log_details = Column(Text)

    def as_dict(self):
        return {
            "id": self.id,
            "scan_type": self.scan_type,
            "year_start": self.year_start,
            "year_end": self.year_end,
            "started_at": self.started_at.isoformat()
            if self.started_at
            else None,
            "completed_at": self.completed_at.isoformat()
            if self.completed_at
            else None,
            "status": self.status,
            "total_checked": self.total_checked,
            "found_available": self.found_available,
            "found_errors": self.found_errors,
            "log_details": self.log_details,
        }


def init_db():
    Base.metadata.create_all(bind=engine)


@contextmanager
def db_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_or_create_site(session, base_url):
    base_url = base_url.strip()
    site = session.query(Site).filter(Site.base_url == base_url).first()
    if site:
        return site

    site = Site(base_url=base_url)
    session.add(site)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        site = session.query(Site).filter(Site.base_url == base_url).first()
        if site:
            return site
        raise
    else:
        session.refresh(site)
        return site


def persist_parameters(session, site, params_dict, scope="session"):
    serialized = json.dumps(params_dict or {}, ensure_ascii=False)
    params = HarvestParameters(site=site, data=serialized, scope=scope)
    session.add(params)
    session.flush()
    return params


def upsert_site_parameters(session, site, params_dict):
    serialized = json.dumps(params_dict or {}, ensure_ascii=False)
    existing = (
        session.query(HarvestParameters)
        .filter(
            HarvestParameters.site_id == site.id,
            HarvestParameters.scope == "site",
        )
        .order_by(HarvestParameters.created_at.desc())
        .first()
    )

    if existing and existing.data == serialized:
        existing.created_at = datetime.utcnow()
        session.flush()
        return existing

    if existing:
        existing.data = serialized
        existing.created_at = datetime.utcnow()
        session.flush()
        return existing

    params = HarvestParameters(site=site, data=serialized, scope="site")
    session.add(params)
    session.flush()
    return params


def create_harvest_session(session, job_id, site, parameters):
    harvest_session = HarvestSession(
        job_uuid=job_id,
        site=site,
        parameters=parameters,
        status="running",
        started_at=datetime.utcnow(),
    )
    session.add(harvest_session)
    session.flush()
    return harvest_session


def update_site_counters(session, site_id):
    total = (
        session.query(func.count(Document.id))
        .filter(Document.site_id == site_id)
        .scalar()
    )
    site = session.get(Site, site_id)
    if site:
        site.total_documents = total or 0
        site.updated_at = datetime.utcnow()
        site.last_harvest_at = datetime.utcnow()
        session.flush()


def record_documents(session, harvest_session, documents):
    """
    Enregistre les documents uniques pour la session en cours.
    Retourne (persisted_docs, skipped_urls)
    """
    if not documents:
        return [], []

    urls = [doc["url"] for doc in documents]
    existing = {
        doc.url
        for doc in session.query(Document.url)
        .filter(Document.site_id == harvest_session.site_id, Document.url.in_(urls))
    }

    persisted = []
    skipped = []

    for metadata in documents:
        url = metadata.get("url")
        if not url or url in existing:
            skipped.append(url)
            continue

        payload = metadata.copy()
        extra = {}

        # fields already mapped
        filename = payload.pop("filename", None)
        title = payload.pop("title", None)
        file_type = payload.pop("file_type", None)
        file_size = payload.pop("file_size", None)
        last_modified = payload.pop("last_modified", None)
        accessible = payload.pop("accessible", True)

        # everything else stored in metadata blob
        extra.update(payload)

        document = Document(
            site_id=harvest_session.site_id,
            session_id=harvest_session.id,
            url=url,
            filename=filename,
            title=title,
            file_type=file_type,
            file_size=file_size,
            last_modified=last_modified,
            accessible=1 if accessible else 0,
            extra_metadata=json.dumps(extra, ensure_ascii=False) if extra else None,
        )
        session.add(document)
        persisted.append(document)

    session.flush()
    return persisted, skipped


def load_session_with_documents(session, job_uuid):
    harvest_session = (
        session.query(HarvestSession)
        .filter(HarvestSession.job_uuid == job_uuid)
        .first()
    )
    if not harvest_session:
        return None, []
    documents = [doc.to_dict() for doc in harvest_session.documents]
    return harvest_session, documents
