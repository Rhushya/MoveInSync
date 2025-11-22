"""Utility script to initialize the local SQLite database."""
from app.db.session import Base, engine
import app.models  # noqa: F401,F403

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
