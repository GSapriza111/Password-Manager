import uuid, bcrypt
from flask import Flask, request
from flask_cors import CORS, cross_origin
from email_validator import validate_email, EmailNotValidError
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Uuid, primary_key = True, default = uuid.uuid4)
    email = db.Column(db.String(255), nullable = False, unique = True)
    kdf_salt = db.Column(db.String(255), nullable = False)
    auth_verifier = db.Column(db.String(255), nullable=False)

    vault_items = db.relationship('VaultItem', backref='owner', lazy=True)



class VaultItem(db.Model):
    __tablename__= 'vault_items'
    id = db.Column(db.Uuid, primary_key = True, default = uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey('users.id'), nullable=False)
    ciphertext = db.Column(db.Text, nullable = False)
    iv = db.Column(db.String(255), nullable = False)
    auth_tag = db.Column(db.String(255), nullable = False)

@app.route('/')
def index():
    return "running"

@app.route('/register', methods = ["POST"])
def create_user():
    req = request.get_json()
    email = req.get('email')
    kdf_salt = req.get('kdf_salt')
    auth_v = req.get('auth_verifier')

    if not email or not kdf_salt or not auth_v:
        return {"error": "Missing required fields"}, 400

    try:
        valid = validate_email(email)
        email_normalized = valid.normalized
    except EmailNotValidError as e:
        print("Invalid email", e)

    if len(kdf_salt) != 32:
        return {"error": "invalid salt length"}, 400

    try:
        temp = bytes.fromhex(kdf_salt)
    except ValueError:
        return {"error": "invalid salt value"}, 400



    if len(auth_v) != 64:
        return {"error": "invalid auth len"}, 400
    
    try:
        temp = bytes.fromhex(auth_v)
    except ValueError:
        return {"error": 'invalid auth verifier value'}, 400

    existing_user = db.session.execute(
        db.select(User).filter_by(email=email_normalized)
    ).scalar_one_or_none()

    if existing_user:
        return {"error": "user already exists"}, 409

    hashed_auth_v = bcrypt.hashpw(auth_v.encode('utf-8'), bcrypt.gensalt())

    new_user = User(
        email = email_normalized,
        kdf_salt = kdf_salt,
        auth_verifier = hashed_auth_v.decode('utf-8')
    )

    db.session.add(new_user)
    db.session.commit()
    return {"message": "Master vault initialized securely"}, 201


@app.route('/api/salt', methods = ['POST'])
def get_salt():
    req = request.get_json()
    email = req.get('email')

    if not email:
        return {"error": "Email Required"}, 400

    try:
        valid_email = validate_email(email)
        email_normalized = valid_email.normalized
    except EmailNotValidError:
        return {"error": "invalid email format"}, 400

    user = db.session.execute(
        db.select(User).filter_by(email = email_normalized)
    ).scalar_one_or_none()
    if user:
        return {"salt": user.kdf_salt}, 200
    else:
        fake = os.urandom(16).hex()
        return {"salt": fake}, 200


@app.route('/login', methods = ['POST'])
def login():
    req = request.get_json()
    email = req.get('email')
    auth_v = req.get('auth_verifier')

    gen_error = {"error": "Invalid email or pw"}

    if not email or not auth_v:
        return gen_error, 401

    try:
        valid = validate_email(email)
        email_normalized = valid.normalized
    except EmailNotValidError:
        return gen_error, 401

    if len(auth_v) != 64:
        return gen_error, 401
    try:
        bytes.fromhex(auth_v)
    except ValueError:
        return gen_error, 401

    user = db.session.execute(
        db.select(User).filter_by(email=email_normalized)
    ).scalar_one_or_none()

    if not user:
        return gen_error, 401

    is_valid = bcrypt.checkpw(
        auth_v.encode('utf-8'),
        user.auth_verifier.encode('utf-8')
    )

    if not is_valid:
        return gen_error, 401

    return {"message": "Authentication successful. Vault access granted."}, 200


from app import VaultItem # Ensure this is imported if separated

@app.route('/api/vault', methods=['POST'])
def add_vault_item():
    req = request.get_json()
    email = req.get('email')
    
    # 1. Verify user exists
    user = db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()

    if not user:
        return {"error": "Unauthorized"}, 401

    # 2. Store the mathematical blobs. The server cannot read the ciphertext.
    new_item = VaultItem(
        user_id=user.id,
        ciphertext=req.get('ciphertext'),
        iv=req.get('iv'),
        auth_tag=req.get('auth_tag')
    )

    db.session.add(new_item)
    db.session.commit()

    return {"message": "Encrypted item saved"}, 201


if __name__=="__main__":
    app.run(debug=True)