from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from .rating import Rating


class MovieBaseProperties(BaseModel):
    title: str
    genres: Optional[str] = None
    resource_url: Optional[str] = None
    movie_lens_id: Optional[int] = None


class MovieCreate(MovieBaseProperties):

    pass


class MovieUpdate(BaseModel):
    title: Optional[str] = None
    genres: Optional[str] = None
    resource_url: Optional[str] = None
    movie_lens_id: Optional[int] = None


class MovieInDBBase(MovieBaseProperties):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MovieInList(MovieInDBBase):
    average_rating: Optional[float] = 0.0
    num_ratings: Optional[int] = 0


class Movie(MovieInDBBase):
    ratings: List[Rating] = []
    average_rating: Optional[float] = 0.0
    num_ratings: Optional[int] = 0
