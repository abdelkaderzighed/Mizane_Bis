from flask import Flask
from flask_cors import CORS

from .routes import mizane_bp
from .mizane import routes as mizane_routes


def create_mizane_app() -> Flask:
    app = Flask(__name__)
    CORS(app, origins="*")
    app.register_blueprint(mizane_bp)
    app.config['JSON_SORT_KEYS'] = False
    # Pré-chauffe des caches d'embeddings au démarrage pour éviter la latence du premier appel.
    try:
        mizane_routes._warm_cache_async()
    except Exception:
        # On n'empêche pas le boot si le warm-up échoue.
        pass
    return app
