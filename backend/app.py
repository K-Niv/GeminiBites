import os
import datetime
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# --- Configure CORS ---
# Replace 'http://localhost:3000' with your actual frontend origin if different
# The origins list can contain multiple allowed origins
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"]) # Allow frontend origin with credentials

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-secret-key') # Use environment variable
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# --- Configure JWT ---
app.config["JWT_SECRET_KEY"] = os.environ.get('JWT_SECRET_KEY', 'default-jwt-secret') # Use environment variable
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_COOKIE_SECURE"] = True # Set to True in production (HTTPS)
app.config["JWT_COOKIE_SAMESITE"] = "None"
app.config["JWT_COOKIE_CSRF_PROTECT"] = False # Implement CSRF protection separately
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(days=1) # Make sure datetime is imported where needed

jwt = JWTManager(app)
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Import models after db is defined to avoid circular imports
from models import User, Recipe, Tutorial

# Import routes after app is defined
from routes import *

if __name__ == '__main__':
    app.run(debug=True) # debug=True is helpful for development