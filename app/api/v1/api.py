from fastapi import APIRouter

from app.api.v1.endpoints import movies, ratings, recommendations, users

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(movies.router, prefix="/movies", tags=["movies"])
api_router.include_router(ratings.router, prefix="/ratings", tags=["ratings"])
api_router.include_router(
    recommendations.router, prefix="/recommendations", tags=["recommendations"]
)
