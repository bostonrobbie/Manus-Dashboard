"""
Database configuration and session management.

Provides:
- SQLAlchemy engine and session factory
- Dependency injection for FastAPI routes
- Connection pooling configuration
"""

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://trader:traderpw@localhost:5432/trading")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,  # Number of connections to maintain
    max_overflow=20,  # Additional connections if pool is exhausted
    pool_pre_ping=True,  # Verify connections before using
    echo=False,  # Set to True for SQL query logging
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function for FastAPI routes.
    
    Usage:
        @app.get("/api/trades")
        def get_trades(db: Session = Depends(get_db)):
            return db.query(Trade).all()
    
    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database schema.
    
    Creates all tables defined in models.
    Should only be used for development/testing.
    Use Alembic migrations for production.
    """
    from models import Base
    Base.metadata.create_all(bind=engine)


def check_db_connection() -> bool:
    """
    Check if database connection is healthy.
    
    Used by health check endpoint.
    
    Returns:
        True if connection is healthy, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False
