import logging

import keras
import keras_rs
import tensorflow as tf

from app.core.config import settings

logger = logging.getLogger(__name__)


class SequentialRetrievalModel(keras.Model):
    """Create the sequential retrieval model.

    Args:
      movies_count: Total number of unique movies in the dataset.
      embedding_dimension: Output dimension for movie embedding tables.
    """

    def __init__(
        self,
        movies_count: int,
        embedding_dimension: int = settings.EMBEDDING_DIM,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.movies_count = movies_count
        self.embedding_dimension = embedding_dimension

        self.query_model = keras.Sequential(
            [
                keras.layers.Embedding(self.movies_count + 1, self.embedding_dimension),
                keras.layers.GRU(self.embedding_dimension),
            ]
        )

        self.candidate_model = keras.layers.Embedding(
            self.movies_count + 1, self.embedding_dimension
        )

        self.retrieval = keras_rs.layers.BruteForceRetrieval(k=10, return_scores=False)

        self.loss_fn = keras.losses.CategoricalCrossentropy(
            from_logits=True,
        )

    def build(self, input_shape):
        # Build query and candidate models first
        self.query_model.build(input_shape)

        # Build candidate_model. Its input shape is not directly tied to the main model's input_shape.
        # It will be called with movie IDs. (None,) indicates variable batch size, single feature.
        self.candidate_model.build((None,))

        # CRITICAL: Set the candidate embeddings for the retrieval layer
        # It tells the BruteForceRetrieval layer which embeddings to use as the search space.
        if hasattr(self.candidate_model, "embeddings"):
            self.retrieval.candidate_embeddings = self.candidate_model.embeddings
        else:

            raise AttributeError(
                "Candidate model does not have an 'embeddings' attribute. Check Keras Embedding layer API."
            )

        # Build the retrieval layer
        # Its input shape should match the output shape of the query_model
        # query_model output is (batch_size, embedding_dimension)
        # The input_shape for retrieval.build should reflect the query embedding shape.
        self.retrieval.build(
            input_shape
        )  # Or potentially self.query_model.output_shape

        super().build(input_shape)

    def call(self, inputs, training=False):
        query_embeddings = self.query_model(inputs)
        result = {
            "query_embeddings": query_embeddings,
        }

        if not training:
            # Ensure candidate_embeddings are set, which should happen in build()
            if self.retrieval.candidate_embeddings is None:
                # This case should ideally not be hit if build() worked correctly.
                # Could be a sign that build() was not called or did not set it.
                logger.error(
                    "BruteForceRetrieval.candidate_embeddings is None at call time during prediction."
                )
                # Attempt to set it again, though this is a fallback
                if hasattr(self.candidate_model, "embeddings"):
                    self.retrieval.candidate_embeddings = (
                        self.candidate_model.embeddings
                    )
                    logger.info("Re-assigned candidate_embeddings in call().")
                else:  # Cannot make predictions if no candidates
                    result["predictions"] = tf.constant(
                        [], dtype=tf.int32
                    )  # Empty predictions
                    return result

            result["predictions"] = self.retrieval(query_embeddings)
        return result

    def compute_loss(self, x, y, y_pred, sample_weight=None):
        candidate_id = y
        query_embeddings = y_pred["query_embeddings"]
        candidate_embeddings = self.candidate_model(candidate_id)

        num_queries = keras.ops.shape(query_embeddings)[0]
        num_candidates = keras.ops.shape(candidate_embeddings)[0]
        labels = keras.ops.eye(num_queries, num_candidates)
        scores = keras.ops.matmul(
            query_embeddings, keras.ops.transpose(candidate_embeddings)
        )
        return self.loss_fn(labels, scores, sample_weight=sample_weight)

    def get_config(self):
        config = super().get_config()
        config.update(
            {
                "movies_count": self.movies_count,
                "embedding_dimension": self.embedding_dimension,
            }
        )
        return config

    @classmethod
    def from_config(cls, config):
        return cls(**config)
