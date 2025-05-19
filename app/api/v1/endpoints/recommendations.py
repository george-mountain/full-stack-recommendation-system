from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db import models
from app.services.recommender.predict import get_recommendations_for_user

router = APIRouter()


@router.get("/user/me", response_model=List[Dict[str, Any]])
async def get_my_recommendations(
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    exclude_watched: bool = True,
    count: int = 10,
):
    """
    Get movie recommendations for the currently authenticated user.
    """
    if count <= 0 or count > 50:
        count = 10

    recommendations = await get_recommendations_for_user(
        db=db,
        user=current_user,
        exclude_watched=exclude_watched,
        num_recommendations=count,
    )
    if not recommendations:

        pass
    return recommendations


@router.get("/user/{user_id}", response_model=List[Dict[str, Any]])
async def get_user_recommendations(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    # current_user: models.User = Depends(deps.get_current_active_user), # Optional: admin check
    exclude_watched: bool = True,
    count: int = 10,
):
    """
    Get movie recommendations for a specific user ID.
    (Currently public, consider adding admin restrictions if needed)
    """
    target_user = await deps.crud.user.get(db, id=user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    if count <= 0 or count > 50:
        count = 10

    recommendations = await get_recommendations_for_user(
        db=db,
        user=target_user,
        exclude_watched=exclude_watched,
        num_recommendations=count,
    )
    return recommendations
