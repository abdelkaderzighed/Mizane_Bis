from flask import Blueprint

api_bp = Blueprint('api', __name__)

from . import routes_coursupreme_viewer
from . import routes_main
