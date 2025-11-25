"""Alembic environment configuration."""
from __future__ import annotations

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Import all models to ensure they're registered with Base.metadata
from models.base import Base
from models import (
    instrument,
    ohlc,
    trade,
    position,
    equity,
    snapshot,
    analytics,
    user,
)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Interpret the config file for Python logging.
# This line sets up loggers basically.

target_metadata = Base.metadata

def _get_url() -> str:
    """Resolve the database URL from the environment."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://trading:dashboard@db:5432/trading_dashboard"
    return database_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = _get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
