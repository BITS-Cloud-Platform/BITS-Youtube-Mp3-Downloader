import os
import bcrypt
from datetime import datetime
from models import Session, User, init_db

def create_default_admin():
    db = Session()
    try:
        # Only create if no admin exists at all
        admin_count = db.query(User).filter(User.is_admin == True).count()
        if admin_count > 0:
            print(f"✓ Admin user already exists (count: {admin_count}), skipping default admin creation")
            return
        
        # Check if default admin email is already taken by non-admin
        admin_email = os.environ.get("DEFAULT_ADMIN_EMAIL", "admin@mail.com")
        admin_password = os.environ.get("DEFAULT_ADMIN_PASSWORD", "admin123")
        
        existing = db.query(User).filter(User.email == admin_email).first()
        if existing:
            # Upgrade existing user to admin
            existing.is_admin = True
            db.commit()
            print(f"✓ Upgraded existing user {admin_email} to admin")
            return
        
        # Create new admin
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
