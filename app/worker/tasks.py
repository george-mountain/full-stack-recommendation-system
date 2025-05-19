import asyncio
import logging

from app.db.session import AsyncSessionLocal
from app.services.recommender.train import train_model
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.worker.tasks.train_recommendation_model_task")
def train_recommendation_model_task():
    """
    Celery task to trigger the recommendation model training.
    This task is synchronous from Celery's perspective, but it runs an async function.
    """
    logger.info("Received task: train_recommendation_model_task")

    async def _run_training():
        async with AsyncSessionLocal() as db:
            try:
                await train_model(db)
                logger.info("train_recommendation_model_task completed successfully.")
            except Exception as e:
                logger.error(
                    f"Error during train_recommendation_model_task: {e}", exc_info=True
                )

                raise

    # Run the async function within the synchronous Celery task
    # For Celery 5+, asyncio.run might be okay if event loop isn't already running.
    # For older versions or to be safe:
    try:
        # Get an event loop or create a new one if none exists
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        # If running in a context where an event loop is already running (e.g. inside another async framework like FastAPI),
        # this might need adjustment. For standard Celery worker process, this should be fine.
        loop.run_until_complete(_run_training())
    except (
        RuntimeError
    ) as e:  # Handles "Event loop is closed" or "There is no current event loop"
        if (
            "no current event loop" in str(e).lower()
            or "event loop is closed" in str(e).lower()
        ):
            logger.info(
                "No current event loop or loop closed, creating a new one for the task."
            )
            asyncio.run(_run_training())
        else:
            logger.error(
                f"RuntimeError in train_recommendation_model_task: {e}", exc_info=True
            )
            raise
    except Exception as e:
        logger.error(
            f"General exception in train_recommendation_model_task: {e}", exc_info=True
        )
        raise


@celery_app.task(name="app.worker.tasks.test_celery")
def test_celery(word: str) -> str:
    logger.info(f"Test Celery Task received: {word}")
    return f"Celery test task successfully processed: {word}"
