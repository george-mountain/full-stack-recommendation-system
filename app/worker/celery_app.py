from celery import Celery
from celery.schedules import crontab

from app.core.config import settings
from app.db.session import AsyncSessionLocal

# Initialize Celery
celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"],
)

celery_app.conf.task_track_started = True
celery_app.conf.timezone = "Asia/Tokyo"

# Celery Beat Schedule
# This will trigger the training task every day at midnight JST.
celery_app.conf.beat_schedule = {
    "retrain-recommendation-model-midnight": {
        "task": "app.worker.tasks.train_recommendation_model_task",
        "schedule": crontab(minute="0", hour="0"),  # Every midnight
    },
}
