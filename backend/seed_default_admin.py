"""Seed script to provision a default admin user for local development."""
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import User, UserRole

DEFAULT_EMAIL = "admin@moveinsync.com"
DEFAULT_PASSWORD = "admin123"
DEFAULT_NAME = "MoveInSync Admin"


def seed_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
        if existing:
            print(f"Admin user '{DEFAULT_EMAIL}' already exists.")
            return

        admin = User(
            email=DEFAULT_EMAIL,
            full_name=DEFAULT_NAME,
            role=UserRole.ADMIN,
            hashed_password=get_password_hash(DEFAULT_PASSWORD),
        )
        db.add(admin)
        db.commit()
        print(f"Admin user '{DEFAULT_EMAIL}' created with password '{DEFAULT_PASSWORD}'.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
