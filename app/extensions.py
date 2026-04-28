# All extensions are instantiated here — imported everywhere else.
# This single file prevents circular imports.

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_httpauth import HTTPBasicAuth

db      = SQLAlchemy()
migrate = Migrate()
cors    = CORS()
auth    = HTTPBasicAuth()


@auth.verify_password
def verify_password(username, password):
    from config import Config
    if username == Config.ADMIN_USERNAME and password == Config.ADMIN_PASSWORD:
        return username