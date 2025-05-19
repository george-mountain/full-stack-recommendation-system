import collections
from typing import Any, Dict, List

import pandas as pd
import tensorflow as tf

from app.core.config import settings

MAX_CONTEXT_LENGTH = settings.MAX_CONTEXT_LENGTH
MIN_SEQUENCE_LENGTH = settings.MIN_SEQUENCE_LENGTH
MIN_RATING_FILTER = 2


def get_movie_sequence_per_user(
    ratings_df: pd.DataFrame,
) -> Dict[int, List[Dict[str, Any]]]:
    """Get movieID sequences for every user from a DataFrame of ratings."""
    sequences = collections.defaultdict(list)

    # ratings_df has columns: 'user_id', 'movie_id', 'rating', 'timestamp'
    # These column names should match what crud.rating.get_all_ratings_for_training provides
    for _, row in ratings_df.iterrows():
        user_id = int(row["user_id"])
        sequences[user_id].append(
            {
                "movie_id": int(row["movie_id"]),
                "timestamp": int(row["timestamp"]),
                "rating": float(row["rating"]),
            }
        )

    # Sort movie sequences by timestamp for every user.
    for user_id, context in sequences.items():
        context.sort(key=lambda x: x["timestamp"])
        sequences[user_id] = context
    return sequences


def generate_examples_from_user_sequences(
    sequences: Dict[int, List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """Generates sequences for all users, with padding, truncation, etc."""

    def generate_examples_from_user_sequence(
        sequence: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Generates examples for a single user sequence."""
        examples = []
        for label_idx in range(
            1, len(sequence)
        ):  # Start from 1, as first item cannot be a label
            # Determine the start of the context sequence
            start_idx = max(0, label_idx - MAX_CONTEXT_LENGTH)
            context = sequence[
                start_idx:label_idx
            ]  # History up to, but not including, the label

            # Pad context to MAX_CONTEXT_LENGTH
            # Padded items get movie_id = 0 (mask token)
            padded_context = [
                {"movie_id": 0, "timestamp": 0, "rating": 0.0}
            ] * MAX_CONTEXT_LENGTH

            # Create a copy for modification
            current_context_list = list(context)

            # Padding
            while len(current_context_list) < MAX_CONTEXT_LENGTH:
                current_context_list.append(
                    {
                        "movie_id": 0,
                        "timestamp": 0,
                        "rating": 0.0,
                    }
                )

            label_movie_id = int(sequence[label_idx]["movie_id"])
            context_movie_ids = [
                int(movie["movie_id"]) for movie in current_context_list
            ]

            examples.append(
                {
                    "context_movie_id": context_movie_ids,
                    "label_movie_id": label_movie_id,
                },
            )
        return examples

    all_examples = []
    for user_id, sequence in sequences.items():
        if (
            len(sequence) < MIN_SEQUENCE_LENGTH
        ):  # User needs at least this many interactions
            continue

        user_examples = generate_examples_from_user_sequence(sequence)
        all_examples.extend(user_examples)

    return all_examples


def create_tf_datasets(
    examples: List[Dict[str, Any]], batch_size: int, is_training: bool = True
):
    """Converts list of examples to a tf.data.Dataset."""

    dataset_dict = collections.defaultdict(list)
    for example in examples:
        dataset_dict["context_movie_id"].append(example["context_movie_id"])
        dataset_dict["label_movie_id"].append(example["label_movie_id"])

    # Convert to TensorFlow tensors
    context_movie_id_tf = tf.constant(dataset_dict["context_movie_id"], dtype=tf.int32)
    label_movie_id_tf = tf.constant(dataset_dict["label_movie_id"], dtype=tf.int32)

    # Create tf.data.Dataset
    # The model's fit method expects (features, labels)
    # features = context_movie_id_tf
    # labels = label_movie_id_tf
    dataset = tf.data.Dataset.from_tensor_slices(
        (context_movie_id_tf, label_movie_id_tf)
    )

    if is_training:
        dataset = dataset.shuffle(len(examples), reshuffle_each_iteration=True)

    dataset = dataset.batch(batch_size)
    dataset = dataset.cache()  # Cache after batching and shuffling for training
    dataset = dataset.prefetch(tf.data.AUTOTUNE)

    return dataset


def prepare_user_context_for_prediction(
    user_movie_ids: List[int], max_context_length: int = MAX_CONTEXT_LENGTH
) -> List[int]:
    """
    Prepares a user's movie interaction sequence for prediction.
    Takes a list of actual movie_ids.
    Pads or truncates to max_context_length.
    Padding token is 0.
    """
    # Truncate if longer than max_context_length (take the most recent items)
    context = user_movie_ids[-max_context_length:]

    # GRU processes sequence, so order matters.
    # pad at the end for training contexts
    # So, [m1, m2] becomes [m1, m2, 0, 0, 0] if MAX_CONTEXT_LENGTH is 5.

    padded_context = list(context)  # Make a copy
    while len(padded_context) < max_context_length:
        padded_context.append(0)  # Pad with 0

    return padded_context
