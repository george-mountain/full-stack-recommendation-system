import asyncio
import logging
import random
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Dict

import pandas as pd
import requests
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from app.db import crud
    from app.db.models import Movie, Rating, User
    from app.db.session import AsyncSessionLocal, Base, async_engine
    from app.schemas.movie import MovieCreate
    from app.schemas.rating import RatingCreate
    from app.schemas.user import UserCreate
except ImportError:
    APP_DIR = Path(__file__).resolve().parent.parent / "app"
    import sys

    sys.path.insert(0, str(APP_DIR.parent))
    from app.db import crud
    from app.db.models import Movie, Rating, User
    from app.db.session import AsyncSessionLocal, Base, async_engine
    from app.schemas.movie import MovieCreate
    from app.schemas.rating import RatingCreate
    from app.schemas.user import UserCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MOVIELENS_1M_URL = "https://files.grouplens.org/datasets/movielens/ml-1m.zip"
DATA_BASE_PATH = Path("/app/data") if Path("/app/data").exists() else Path("./data")
ML_1M_DIR = DATA_BASE_PATH / "ml-1m"
MOVIES_FILE_NAME = "movies.dat"
RATINGS_FILE_NAME = "ratings.dat"
MOVIES_FILE = ML_1M_DIR / MOVIES_FILE_NAME
RATINGS_FILE = ML_1M_DIR / RATINGS_FILE_NAME

NUM_USERS_TO_SEED = 200
MAX_RATINGS_PER_USER_TO_SEED = 70
MIN_RATINGS_FOR_USER_CONSIDERATION = 20

YOUTUBE_VIDEO_IDS = [
    "u31SAHB9hX4",
    "euz-KBBfAAo",
    "6ZfuNTqbHE8",
    "hA6hldpSTF8",
    "QwievZ1Tx-8",
    "EXeTwQWrcwY",
    "YoHD9XEInc0",
    "s7EdQ4FqbhY",
    "5PSNL1qE6VY",
    "KYz2wyBy3kc",
    "RFinNxS5KN4",
    "9ix7TUGVYIo",
    "kXYiU_JCYtU",
    "6hB3S9bIaco",
    "m8e-FF8MsqU",
]  # Add more diverse IDs

ML_1M_DIR.mkdir(parents=True, exist_ok=True)

# This map will store MovieLensID -> internal auto-generated Movie.id
movielens_id_to_internal_id_map: Dict[int, int] = {}


async def download_and_extract_movielens_if_needed():

    if MOVIES_FILE.exists() and RATINGS_FILE.exists():
        logger.info(f"MovieLens data files found at {ML_1M_DIR}. Skipping download.")
        return True
    logger.info(f"Attempting to download MovieLens 1M dataset to {ML_1M_DIR}...")
    try:
        response = requests.get(MOVIELENS_1M_URL, stream=True, timeout=120)
        response.raise_for_status()
        with zipfile.ZipFile(BytesIO(response.content)) as z:
            logger.info(f"Extracting necessary files to {ML_1M_DIR}...")
            extracted_something = False
            for member_info in z.infolist():
                file_path_in_zip = Path(member_info.filename)
                if file_path_in_zip.name == MOVIES_FILE_NAME:
                    with z.open(member_info) as source, open(
                        MOVIES_FILE, "wb"
                    ) as target:
                        target.write(source.read())
                    logger.info(f"Extracted {MOVIES_FILE_NAME}")
                    extracted_something = True
                elif file_path_in_zip.name == RATINGS_FILE_NAME:
                    with z.open(member_info) as source, open(
                        RATINGS_FILE, "wb"
                    ) as target:
                        target.write(source.read())
                    logger.info(f"Extracted {RATINGS_FILE_NAME}")
                    extracted_something = True
            if not extracted_something:
                logger.warning(
                    f"Could not find {MOVIES_FILE_NAME} or {RATINGS_FILE_NAME} in zip."
                )
        if not MOVIES_FILE.exists() or not RATINGS_FILE.exists():
            logger.error(f"Download/extraction failed for {ML_1M_DIR}.")
            return False
        logger.info("MovieLens 1M dataset downloaded and extracted successfully.")
        return True
    except Exception as e:
        logger.error(f"Download/extraction error: {e}", exc_info=True)
        logger.error(
            f"Please ensure {MOVIES_FILE} and {RATINGS_FILE} are manually placed."
        )
        return False


async def seed_movies(db: AsyncSession):
    global movielens_id_to_internal_id_map
    logger.info(f"Attempting to seed movies from {MOVIES_FILE}...")
    if not MOVIES_FILE.exists():
        logger.error(f"{MOVIES_FILE} not found! Cannot seed movies.")
        return

    count_query = select(func.count()).select_from(Movie.__table__)
    existing_movie_count = (await db.execute(count_query)).scalar_one()
    if existing_movie_count > 0:
        logger.info(
            f"Movies table has {existing_movie_count} movies. Populating ID map from DB."
        )
        existing_movies_from_db = await db.execute(
            select(Movie.id, Movie.movie_lens_id).filter(
                Movie.movie_lens_id.isnot(None)
            )
        )
        for internal_id, ml_id in existing_movies_from_db.all():
            if ml_id is not None:
                movielens_id_to_internal_id_map[ml_id] = internal_id
        logger.info(
            f"Populated map with {len(movielens_id_to_internal_id_map)} MovieLensID to internal ID mappings from DB."
        )
        return  # Skip seeding new movies if table is not empty

    movies_df = pd.read_csv(
        MOVIES_FILE,
        sep="::",
        names=["MovieLensID", "Title", "Genres"],
        engine="python",
        encoding="iso-8859-1",
    )
    logger.info(f"Found {len(movies_df)} movies in {MOVIES_FILE_NAME}.")
    created_count = 0
    random.shuffle(YOUTUBE_VIDEO_IDS)

    for idx, row_data in movies_df.iterrows():
        movie_lens_id = int(row_data["MovieLensID"])
        video_id_for_url = YOUTUBE_VIDEO_IDS[idx % len(YOUTUBE_VIDEO_IDS)]
        dummy_url = f"https://www.youtube.com/watch?v={video_id_for_url}"

        movie_in = MovieCreate(
            title=str(row_data["Title"]),
            genres=str(row_data["Genres"]),
            resource_url=dummy_url,
            movie_lens_id=movie_lens_id,  # Store original MovieLensID
        )
        try:
            created_movie = await crud.movie.create(db, obj_in=movie_in)
            movielens_id_to_internal_id_map[movie_lens_id] = created_movie.id
            created_count += 1
        except Exception as e:
            logger.error(
                f"Error creating movie with MovieLensID {movie_lens_id} ('{row_data['Title']}'): {e}"
            )
    logger.info(
        f"Finished seeding movies. {created_count} movies added. Map size: {len(movielens_id_to_internal_id_map)}"
    )


async def seed_users_and_ratings(db: AsyncSession):
    global movielens_id_to_internal_id_map
    logger.info(f"Attempting to seed users and ratings from {RATINGS_FILE}...")

    user_count_query = select(func.count()).select_from(User.__table__)
    existing_user_count = (await db.execute(user_count_query)).scalar_one()
    if existing_user_count > 0:
        logger.info(
            f"Users table already contains {existing_user_count} users. Skipping user and rating seeding."
        )
        return

    ratings_df = pd.read_csv(
        RATINGS_FILE,
        sep="::",
        names=["UserID", "MovieLensRatingID", "Rating", "Timestamp"],
        engine="python",
    )

    user_rating_counts = ratings_df["UserID"].value_counts()
    eligible_movielens_user_ids = user_rating_counts[
        user_rating_counts >= MIN_RATINGS_FOR_USER_CONSIDERATION
    ].index.tolist()
    if not eligible_movielens_user_ids:
        logger.warning("No users with enough ratings.")
        return
    random.shuffle(eligible_movielens_user_ids)
    selected_movielens_user_ids_for_db = eligible_movielens_user_ids[:NUM_USERS_TO_SEED]
    if selected_movielens_user_ids_for_db:
        example_ml_userid = selected_movielens_user_ids_for_db[0]
        logger.info(
            f"Example user to be created: Email: user{example_ml_userid}@example.com, Password: pass{example_ml_userid}"
        )
    movielens_user_id_to_db_user_map = {}
    created_user_count = 0
    for movielens_user_id in selected_movielens_user_ids_for_db:
        user_in = UserCreate(
            email=f"user{movielens_user_id}@example.com",
            password=f"pass{movielens_user_id}",
        )
        try:
            db_user = await crud.user.create(db, obj_in=user_in)
            movielens_user_id_to_db_user_map[int(movielens_user_id)] = db_user
            created_user_count += 1
        except Exception as e:
            logger.error(f"Error creating user for ML UserID {movielens_user_id}: {e}")
    logger.info(f"Created {created_user_count} users.")
    if not movielens_user_id_to_db_user_map:
        logger.warning("No users created, cannot seed ratings.")
        return

    ratings_to_seed_df = ratings_df[
        ratings_df["UserID"].isin(movielens_user_id_to_db_user_map.keys())
    ].copy()

    def sample_ratings_from_group(group_df):
        return group_df.sample(
            n=min(len(group_df), MAX_RATINGS_PER_USER_TO_SEED), random_state=1
        )

    list_of_sampled_dfs = []
    if "UserID" not in ratings_to_seed_df.columns:
        logger.error("UserID missing in ratings_to_seed_df")
        return
    for _, group in ratings_to_seed_df.groupby("UserID"):
        list_of_sampled_dfs.append(sample_ratings_from_group(group))

    if not list_of_sampled_dfs:
        logger.warning("No ratings to sample.")
        sampled_ratings_df = pd.DataFrame()
    else:
        sampled_ratings_df = pd.concat(list_of_sampled_dfs).reset_index(drop=True)
    logger.info(
        f"Selected {len(sampled_ratings_df)} ratings to seed. Columns: {sampled_ratings_df.columns.tolist()}"
    )

    seeded_ratings_count = 0
    for _, row in sampled_ratings_df.iterrows():
        try:
            movielens_user_id = int(row["UserID"])
            movie_lens_id_from_rating_file = int(row["MovieLensRatingID"])
            rating_value = float(row["Rating"])
            timestamp_value = int(row["Timestamp"])
        except KeyError as e:
            logger.error(f"KeyError in rating row. Row: {row.to_dict()} Err: {e}")
            continue

        db_user = movielens_user_id_to_db_user_map.get(movielens_user_id)
        internal_movie_id = movielens_id_to_internal_id_map.get(
            movie_lens_id_from_rating_file
        )

        if db_user and internal_movie_id:
            rating_in = RatingCreate(
                movie_id=internal_movie_id,
                rating=rating_value,
                timestamp=timestamp_value,
            )
            try:
                await crud.rating.create_with_owner(
                    db, obj_in=rating_in, user_id=db_user.id
                )
                seeded_ratings_count += 1
            except Exception as e:
                logger.error(
                    f"Error creating rating for user {db_user.id}, internal movie {internal_movie_id}: {e}"
                )
        elif not internal_movie_id:
            logger.warning(
                f"Internal movie ID for MovieLensID {movie_lens_id_from_rating_file} not in map. Skipping rating."
            )
    logger.info(f"Finished seeding ratings. {seeded_ratings_count} ratings added.")


async def init_db():
    async with async_engine.begin() as conn:
        logger.info("Creating tables if they don't exist (based on current models)...")
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables checked/created.")


async def seed_database():
    logger.info("Starting database seeding process...")
    await init_db()
    if not await download_and_extract_movielens_if_needed():
        logger.error("Failed to acquire MovieLens data. Aborting seed.")
        return

    global movielens_id_to_internal_id_map
    movielens_id_to_internal_id_map = {}
    async with AsyncSessionLocal() as db:
        await seed_movies(db)
        await seed_users_and_ratings(db)

    logger.info("Database seeding process completed.")


if __name__ == "__main__":
    logger.info("Running seed_db.py script...")
    import os

    os.environ.setdefault("KERAS_BACKEND", "tensorflow")
    asyncio.run(seed_database())
    logger.info("seed_db.py script finished.")
