import os
import bcrypt
from datetime import datetime
from models import Session, User, init_db

def create_default_admin():
    db = Session()
    try:
        admin_email = os.environ.get("DEFAULT_ADMIN_EMAIL", "admin@mail.com")
        admin_password = os.environ.get("DEFAULT_ADMIN_PASSWORD", "admin123")
        
        existing = db.query(User).filter(User.email == admin_email).first()
        if existing:
            if not existing.is_admin:
                existing.is_admin = True
                db.commit()
                print(f"✓ Upgraded existing user {admin_email} to admin")
            else:
                print(f"✓ Default admin {admin_email} already exists")
            return
        
        hashed = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt())
        admin = User(
            email=admin_email,
            name="Administrator",
            password_hash=hashed.decode(),
            is_admin=True,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"✓ Created default admin: {admin_email}")
        print(f"  Password: {admin_password}")
        print(f"  ⚠️  Please change this password immediately!")
        
    except Exception as e:
        print(f"✗ Failed to create default admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    create_default_admin()
