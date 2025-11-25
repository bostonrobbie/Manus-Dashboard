"""
Celery application configuration.

Handles async task processing for webhook events and scheduled jobs.
"""

import os
from celery import Celery
from celery.schedules import crontab


# Create Celery app
celery_app = Celery(
    "trading_dashboard",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=os.getenv("TIMEZONE", "America/New_York"),
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # Soft limit at 4 minutes
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
)

# Periodic task schedule
celery_app.conf.beat_schedule = {
    # Update benchmark data daily at 6 PM ET (after market close)
    'update-benchmarks-daily': {
        'task': 'workers.tasks.update_benchmarks_daily',
        'schedule': crontab(hour=18, minute=0),  # 6:00 PM ET
    },
    # Recompute analytics daily at 6:30 PM ET
    'recompute-all-analytics': {
        'task': 'workers.tasks.recompute_all_analytics',
        'schedule': crontab(hour=18, minute=30),  # 6:30 PM ET
    },
}

# Auto-discover tasks
celery_app.autodiscover_tasks(['workers'])
