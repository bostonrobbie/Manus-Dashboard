"""
User model - stores user accounts for authentication and authorization.

Supports role-based access control (admin, viewer).
"""

from sqlalchemy import Column, String, Index, CheckConstraint

from .base import Base, UUIDMixin, TimestampMixin


class User(Base, UUIDMixin, TimestampMixin):
    """
    User account for dashboard access.
    
    Supports JWT authentication and role-based permissions.
    """

    __tablename__ = "users"

    # Authentication
    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
        comment="User email (used for login)",
    )
    password_hash = Column(
        String,
        nullable=False,
        comment="Hashed password (bcrypt or Argon2)",
    )

    # Profile
    full_name = Column(
        String,
        nullable=True,
        comment="User's full name",
    )

    # Authorization
    role = Column(
        String,
        nullable=False,
        default="viewer",
        comment="admin, viewer",
    )

    # Status
    is_active = Column(
        String,
        nullable=False,
        default="true",
        comment="Account active status (for disabling users)",
    )

    # Constraints and indexes
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'viewer')", name="ck_users_role"),
        Index("ix_users_email", "email"),
        Index("ix_users_role", "role"),
    )

    def __repr__(self) -> str:
        return f"<User(email={self.email}, role={self.role})>"

    @property
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == "admin"

    @property
    def is_viewer(self) -> bool:
        """Check if user has viewer role."""
        return self.role == "viewer"
