from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db import crud, models
from app.schemas.rating import Rating, RatingCreate

router = APIRouter()


@router.post("/", response_model=Rating, status_code=status.HTTP_201_CREATED)
async def create_rating(
    *,
    db: AsyncSession = Depends(deps.get_db),
    rating_in: RatingCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Create a new rating for a movie by the current user.
    """
    movie = await crud.movie.get(db, id=rating_in.movie_id)
    if not movie:
        raise HTTPException(
            status_code=404,
            detail=f"Movie with ID {rating_in.movie_id} not found. Cannot add rating.",
        )

    # Optional: Check if user already rated this movie, and decide if update or error
    # For simplicity, we allow multiple ratings from a user for a movie if timestamps differ,
    # which is how MovieLens data is structured. The sequence model will handle this.

    rating = await crud.rating.create_with_owner(
        db=db, obj_in=rating_in, user_id=current_user.id
    )
    return rating


@router.get("/user/me", response_model=List[Rating])
async def read_my_ratings(
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Get ratings submitted by the current user.
    """
    ratings = await crud.rating.get_ratings_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return ratings


@router.get("/user/{user_id}", response_model=List[Rating])
async def read_user_ratings(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    # current_user: models.User = Depends(deps.get_current_active_user), # If only admins can see others
):
    """
    Get ratings for a specific user.
    """
    user = await crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    ratings = await crud.rating.get_ratings_by_user(
        db, user_id=user_id, skip=skip, limit=limit
    )
    return ratings
