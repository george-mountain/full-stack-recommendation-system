import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import keras
import numpy as np
import tensorflow as tf
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db import crud, models
from app.services.recommender.model import SequentialRetrievalModel
from app.services.recommender.preprocessing import prepare_user_context_for_prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_model: Optional[SequentialRetrievalModel] = None
_movie_id_to_details: Optional[Dict[int, Dict[str, Any]]] = (
    None  # Keyed by internal Movie.id
)
_movies_count_at_load: Optional[int] = None  # Max internal Movie.id model was built for
_loaded_model_timestamp: Optional[float] = None


async def load_model_and_mappings(db: AsyncSession, force_reload: bool = False):
    global _model, _movie_id_to_details, _movies_count_at_load, _loaded_model_timestamp

    model_path_obj = Path(settings.MODEL_PATH)
    if not model_path_obj.exists():
        logger.warning(
            f"Model file not found at {settings.MODEL_PATH}. Prediction not available."
        )
        _model = None
        _movie_id_to_details = None
        _movies_count_at_load = None
        _loaded_model_timestamp = None
        return

    current_model_timestamp = model_path_obj.stat().st_mtime
    needs_load = (
        force_reload
        or _model is None
        or (
            _loaded_model_timestamp is not None
            and current_model_timestamp > _loaded_model_timestamp
        )
        or _movie_id_to_details is None
    )

    if not needs_load:
        return

    logger.info(
        f"Reloading model/mappings (Reason: force={force_reload}, model_none={_model is None}, ts_change={_loaded_model_timestamp is None or current_model_timestamp > _loaded_model_timestamp}, details_none={_movie_id_to_details is None})."
    )
    _model = None
    _movie_id_to_details = None
    _movies_count_at_load = None
    _loaded_model_timestamp = None

    try:
        _model = keras.models.load_model(
            settings.MODEL_PATH,
            custom_objects={"SequentialRetrievalModel": SequentialRetrievalModel},
        )
        if hasattr(
            _model, "movies_count"
        ):  # movies_count is max internal ID model was trained with
            _movies_count_at_load = _model.movies_count
        else:  # Fallback if model config doesn't store it
            max_id_db = await crud.movie.get_max_internal_movie_id(db)
            _movies_count_at_load = int(max_id_db) if max_id_db else 0
        logger.info(
            f"Model loaded. Expects movies_count (max internal_id): {_movies_count_at_load}"
        )

        if _movies_count_at_load and _movies_count_at_load > 0:
            _model(
                tf.zeros((1, settings.MAX_CONTEXT_LENGTH), dtype=tf.int32),
                training=False,
            )  # Build call
        _loaded_model_timestamp = current_model_timestamp
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Error loading model: {e}", exc_info=True)
        _model = None
        return

    if _movie_id_to_details is None and _model is not None:
        logger.info("Fetching movie details for cache (keyed by internal Movie.id)...")
        all_movies_db = await crud.movie.get_multi(
            db, limit=10000
        )  # Fetches all movies
        if not all_movies_db:
            logger.error("No movies from DB for cache!")
            _movie_id_to_details = {}
            return

        _movie_id_to_details = {
            movie.id: {  # Key by internal Movie.id
                "internal_id": movie.id,
                "movie_lens_id": movie.movie_lens_id,
                "title": movie.title,
                "resource_url": movie.resource_url,
                "genres": movie.genres,
            }
            for movie in all_movies_db
        }
        _movie_id_to_details[0] = {
            "title": "Padding Token",
            "internal_id": 0,
        }  # Model padding token
        logger.info(
            f"Loaded details for {len(_movie_id_to_details)-1} movies into cache."
        )


async def get_recommendations_for_user(
    db: AsyncSession,
    user: models.User,
    exclude_watched: bool = True,
    num_recommendations: int = 10,
) -> List[Dict[str, Any]]:
    await load_model_and_mappings(db)
    if not _model or not _movie_id_to_details or _movies_count_at_load is None:
        logger.warning("Model/mappings not loaded. Cannot recommend.")
        return []

    user_ratings = await crud.rating.get_ratings_by_user(
        db, user_id=user.id, limit=settings.MAX_CONTEXT_LENGTH * 2
    )
    # History should use internal movie_id, as model is trained on them
    user_movie_ids_history = [r.movie_id for r in reversed(user_ratings)]

    if not user_movie_ids_history:
        logger.info(f"User {user.id} has no history.")
        return []

    prediction_context_ids = prepare_user_context_for_prediction(user_movie_ids_history)
    context_tensor = tf.constant([prediction_context_ids], dtype=tf.int32)

    try:
        model_output = _model(context_tensor, training=False)
        predicted_internal_movie_ids = model_output["predictions"]
        predicted_internal_movie_ids = (
            predicted_internal_movie_ids.numpy()[0]
            if hasattr(predicted_internal_movie_ids, "numpy")
            else list(predicted_internal_movie_ids[0])
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return []

    recommendations = []
    watched_internal_ids_set = set(user_movie_ids_history)
    for internal_movie_id_int in predicted_internal_movie_ids:
        internal_movie_id = int(internal_movie_id_int)
        if internal_movie_id == 0:
            continue
        if exclude_watched and internal_movie_id in watched_internal_ids_set:
            continue

        movie_detail_info = _movie_id_to_details.get(internal_movie_id)
        if movie_detail_info:
            recommendations.append(
                {
                    "movie_id": internal_movie_id,  # This is the internal ID
                    "movie_lens_id": movie_detail_info.get(
                        "movie_lens_id"
                    ),  # Original ML ID if present
                    "title": movie_detail_info.get("title"),
                    "resource_url": movie_detail_info.get("resource_url"),
                    "genres": movie_detail_info.get("genres"),
                }
            )
        else:
            logger.warning(
                f"Internal Movie ID {internal_movie_id} predicted but not found in details map. Max internal ID at load: {_movies_count_at_load}"
            )
        if len(recommendations) >= num_recommendations:
            break
    return recommendations
