"""Force-set password for existing Firebase user."""
import firebase_admin
from firebase_admin import auth, credentials
from app.config import settings

EMAIL = "karthikrajt1@gmail.com"
PASSWORD = "Karthik@123"

cred = credentials.Certificate(settings.firebase_credentials_path)
firebase_admin.initialize_app(cred)

user = auth.get_user_by_email(EMAIL)
auth.update_user(user.uid, password=PASSWORD)
print(f"Password updated for {EMAIL} (UID: {user.uid})")
