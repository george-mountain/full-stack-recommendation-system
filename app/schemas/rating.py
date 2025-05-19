from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RatingBase(BaseModel):
    movie_id: int
    rating: float
    timestamp: int


class RatingCreate(RatingBase):
    pass


class RatingUpdate(BaseModel):
    rating: Optional[float] = None


class RatingInDB(RatingBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Rating(RatingInDB):

    pass
