"""Celery configuration and task definitions."""

from celery import Celery
from celery.schedules import crontab

from app import config

# Create Celery app
celery_app = Celery(
    "auosint",
    broker=config.CELERY_BROKER_URL,
    backend=config.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.breach_tasks",
        "app.tasks.scan_tasks",
        "app.tasks.evidence_tasks",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    task_soft_time_limit=3000,
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=100,
    result_expires=86400,
    beat_schedule={
        # Daily breach news scan at 6 AM UTC
        "daily-breach-news-scan": {
            "task": "app.tasks.breach_tasks.scan_philippines_news_feeds_task",
            "schedule": crontab(hour=6, minute=0),
        },
        # Daily dark web scan at 8 AM UTC
        "daily-darkweb-scan": {
            "task": "app.tasks.breach_tasks.scan_philippines_darkweb_task",
            "schedule": crontab(hour=8, minute=0),
        },
        # Daily ransomware scan at 10 AM UTC
        "daily-ransomware-scan": {
            "task": "app.tasks.breach_tasks.scan_philippines_ransomware_task",
            "schedule": crontab(hour=10, minute=0),
        },
        # Cleanup old scan history weekly
        "weekly-cleanup": {
            "task": "app.tasks.maintenance_tasks.cleanup_old_scans_task",
            "schedule": crontab(day_of_week=0, hour=2, minute=0),
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks()


@celery_app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")