from typing import Any, Generic, List, Optional, Type, TypeVar

from sqlalchemy import Float as SQLFloat
from sqlalchemy import cast
from sqlalchemy import delete as sqlalchemy_delete
from sqlalchemy import desc, func
from sqlalchemy import update as sqlalchemy_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import and_

from app.db.base_class import Base
from app.db.models import Movie, Rating, User
from app.schemas.movie import MovieCreate, MovieUpdate
from app.schemas.rating import RatingCreate, RatingUpdate
from app.schemas.user import UserCreate
from app.security import get_password_hash

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=Any)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=Any)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        result = await db.execute(select(self.model).filter(self.model.id == id))
        return result.scalars().first()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        result = await db.execute(
            select(self.model).order_by(self.model.id).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> ModelType:
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        obj_data = db_obj.model_dump()
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, *, id: int) -> Optional[ModelType]:
        obj_to_delete = await self.get(db, id=id)
        if obj_to_delete:
            await db.delete(obj_to_delete)
            await db.commit()
        return obj_to_delete


class CRUDUser(CRUDBase[User, UserCreate, Any]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        result = await db.execute(select(self.model).filter(self.model.email == email))
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            is_active=True,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


class CRUDMovie(CRUDBase[Movie, MovieCreate, MovieUpdate]):

    async def get(self, db: AsyncSession, id: int) -> Optional[Movie]:
        rating_summary_subquery = (
            select(
                Rating.movie_id,
                func.coalesce(cast(func.avg(Rating.rating), SQLFloat), 0.0).label(
                    "average_rating"
                ),
                func.count(Rating.id).label("num_ratings"),
            )
            .filter(Rating.movie_id == id)
            .group_by(Rating.movie_id)
            .subquery("rating_summary")
        )
        stmt = (
            select(
                self.model,
                rating_summary_subquery.c.average_rating,
                rating_summary_subquery.c.num_ratings,
            )
            .outerjoin(
                rating_summary_subquery,
                self.model.id == rating_summary_subquery.c.movie_id,
            )
            .options(selectinload(self.model.ratings))
            .filter(self.model.id == id)
        )
        result = await db.execute(stmt)
        row = result.first()
        if row:
            movie_orm, avg_rating, num_ratings_val = row
            movie_orm.average_rating = avg_rating if avg_rating is not None else 0.0
            movie_orm.num_ratings = (
                num_ratings_val if num_ratings_val is not None else 0
            )
            return movie_orm
        return None

    async def get_by_movie_lens_id(
        self, db: AsyncSession, *, movie_lens_id: int
    ) -> Optional[Movie]:
        """Fetches a movie by its original MovieLens ID, with ratings and aggregates."""
        stmt_for_internal_id = select(self.model.id).filter(
            self.model.movie_lens_id == movie_lens_id
        )
        internal_id_result = await db.execute(stmt_for_internal_id)
        internal_id = internal_id_result.scalar_one_or_none()
        if internal_id:
            return await self.get(db, id=internal_id)
        return None

    async def get_max_internal_movie_id(self, db: AsyncSession) -> Optional[int]:
        """Gets the maximum internal auto-generated movie ID. For model vocab size."""
        result = await db.execute(select(func.max(self.model.id)))
        return result.scalar_one_or_none()

    async def get_multi_with_rating_summary(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search_term: Optional[str] = None,
        filter_genres: Optional[List[str]] = None,
    ) -> List[Movie]:
        rating_summary_subquery = (
            select(
                Rating.movie_id,
                func.coalesce(cast(func.avg(Rating.rating), SQLFloat), 0.0).label(
                    "average_rating"
                ),
                func.count(Rating.id).label("num_ratings"),
            )
            .group_by(Rating.movie_id)
            .subquery("rating_summary")
        )

        stmt = select(
            self.model,
            rating_summary_subquery.c.average_rating,
            rating_summary_subquery.c.num_ratings,
        ).outerjoin(
            rating_summary_subquery,
            self.model.id == rating_summary_subquery.c.movie_id,
        )

        # Apply filters
        query_filters = []
        if search_term:
            query_filters.append(self.model.title.ilike(f"%{search_term}%"))

        if filter_genres:
            for genre_to_filter in filter_genres:
                if genre_to_filter.strip():
                    query_filters.append(
                        self.model.genres.ilike(f"%{genre_to_filter.strip()}%")
                    )

        if query_filters:
            stmt = stmt.filter(and_(*query_filters))

        stmt = stmt.order_by(self.model.id).offset(skip).limit(limit)

        results = await db.execute(stmt)

        movies_with_aggregates = []
        for movie_orm, avg_rating, num_ratings_val in results.all():
            movie_orm.average_rating = avg_rating if avg_rating is not None else 0.0
            movie_orm.num_ratings = (
                num_ratings_val if num_ratings_val is not None else 0
            )
            movies_with_aggregates.append(movie_orm)

        return movies_with_aggregates


class CRUDRating(CRUDBase[Rating, RatingCreate, RatingUpdate]):
    async def create_with_owner(
        self, db: AsyncSession, *, obj_in: RatingCreate, user_id: int
    ) -> Rating:
        db_obj = Rating(**obj_in.model_dump(), user_id=user_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_ratings_by_user(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Rating]:
        stmt = (
            select(self.model)
            .filter(self.model.user_id == user_id)
            .options(selectinload(self.model.movie))
            .order_by(desc(self.model.timestamp))
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_all_ratings_for_training(self, db: AsyncSession) -> List[Rating]:

        stmt = select(self.model).order_by(self.model.user_id, self.model.timestamp)
        result = await db.execute(stmt)
        return result.scalars().all()


user = CRUDUser(User)
movie = CRUDMovie(Movie)
rating = CRUDRating(Rating)
