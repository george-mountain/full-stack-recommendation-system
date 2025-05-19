import logging
import os
import random
from typing import List

import keras
import pandas as pd
import tensorflow as tf
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db import crud
from app.db.models import Rating
from app.services.recommender.model import SequentialRetrievalModel
from app.services.recommender.preprocessing import (
    MIN_RATING_FILTER,
    create_tf_datasets,
    generate_examples_from_user_sequences,
    get_movie_sequence_per_user,
)

BATCH_SIZE = 4096
NUM_EPOCHS = 5
LEARNING_RATE = 0.005
TRAIN_DATA_FRACTION = 0.9

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def train_model(db: AsyncSession):
    logger.info("Starting recommendation model training process...")
    logger.info("Fetching ratings data from database...")

    # crud.rating.get_all_ratings_for_training returns List[Rating ORM objects]
    # Each Rating object has 'movie_id' which is the internal, auto-incrementing Movie.id
    raw_ratings_data: List[Rating] = await crud.rating.get_all_ratings_for_training(db)

    if not raw_ratings_data:
        logger.warning("No ratings data found in the database. Skipping training.")
        return

    # Data for Pandas DataFrame will use the internal Movie.id
    data_for_pandas = [
        {
            "user_id": r.user_id,
            "movie_id": r.movie_id,  # This is the internal Movie.id
            "rating": r.rating,
            "timestamp": r.timestamp,
        }
        for r in raw_ratings_data
    ]

    if not data_for_pandas:
        logger.warning("No suitable rating data for training. Skipping.")
        return

    ratings_df = pd.DataFrame(data_for_pandas)
    logger.info(
        f"Processed {len(ratings_df)} ratings into DataFrame using internal movie_id."
    )

    ratings_df = ratings_df[ratings_df["rating"] >= MIN_RATING_FILTER]
    logger.info(
        f"Filtered to {len(ratings_df)} ratings with rating >= {MIN_RATING_FILTER}."
    )

    if ratings_df.empty:
        logger.warning("No ratings data after filtering. Skipping training.")
        return

    logger.info("Generating movie sequences per user...")
    user_sequences = get_movie_sequence_per_user(ratings_df)
    if not user_sequences:
        logger.warning("No user sequences generated.")
        return

    logger.info("Generating examples from user sequences...")
    examples = generate_examples_from_user_sequences(user_sequences)
    if not examples:
        logger.warning("No training examples generated.")
        return
    logger.info(f"Generated {len(examples)} training examples.")

    random.shuffle(examples)
    split_index = int(TRAIN_DATA_FRACTION * len(examples))
    train_examples = examples[:split_index]
    test_examples = examples[split_index:]

    if not train_examples:
        logger.warning("No training examples after split.")
        return

    val_ds = None
    if test_examples:
        val_ds = create_tf_datasets(test_examples, BATCH_SIZE, is_training=False)
    else:
        logger.warning("No test examples after split. Validation will be skipped.")
    logger.info(
        f"Train examples: {len(train_examples)}, Test examples: {len(test_examples)}"
    )

    logger.info("Creating TensorFlow datasets...")
    train_ds = create_tf_datasets(train_examples, BATCH_SIZE, is_training=True)

    # movies_count is now based on the maximum internal movie_id present in the ratings,
    # or the overall maximum internal movie_id in the movies table.
    # This ensures the Embedding layer has enough capacity for all movie IDs the model might see.
    max_internal_movie_id_from_db = await crud.movie.get_max_internal_movie_id(db)

    # Consider also max_movie_id from the actual ratings data being used for training,
    # as there might be movies in DB not yet in ratings. The embedding layer needs to cover all rated movies.
    max_internal_movie_id_in_ratings = 0
    if not ratings_df["movie_id"].empty:
        max_internal_movie_id_in_ratings = ratings_df["movie_id"].max()

    if max_internal_movie_id_from_db is None and max_internal_movie_id_in_ratings == 0:
        logger.error("Cannot determine movies_count (max internal movie_id).")
        return

    movies_count = 0
    if max_internal_movie_id_from_db is not None:
        movies_count = max(movies_count, int(max_internal_movie_id_from_db))
    if max_internal_movie_id_in_ratings > 0:  # Check if there were any ratings
        movies_count = max(movies_count, int(max_internal_movie_id_in_ratings))

    logger.info(
        f"Determined movies_count (max internal movie_id) for model: {movies_count}"
    )

    if movies_count == 0:
        logger.error("movies_count is 0. Cannot train model.")
        return

    model = SequentialRetrievalModel(
        movies_count=movies_count, embedding_dimension=settings.EMBEDDING_DIM
    )
    model.compile(optimizer=keras.optimizers.AdamW(learning_rate=LEARNING_RATE))

    try:
        logger.info(
            f"Building model with dummy input shape: (1, {settings.MAX_CONTEXT_LENGTH})"
        )
        model(tf.zeros((1, settings.MAX_CONTEXT_LENGTH), dtype=tf.int32))
        logger.info("Model built successfully.")
    except Exception as e:
        logger.error(f"Error building model: {e}", exc_info=True)
        return

    logger.info("Starting model training...")
    try:
        fit_kwargs = {"validation_data": val_ds} if val_ds else {}
        history = model.fit(train_ds, epochs=NUM_EPOCHS, verbose=1, **fit_kwargs)
        logger.info(f"Model training completed. History: {history.history}")
    except Exception as e:
        logger.error(f"Error during model training: {e}", exc_info=True)
        return

    model_path = settings.MODEL_PATH
    try:
        logger.info(f"Saving trained model to {model_path}...")
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        model.save(model_path)
        logger.info(f"Model saved successfully.")
    except Exception as e:
        logger.error(f"Error saving model: {e}", exc_info=True)
