from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    ratings = relationship("Rating", back_populates="user")


class Movie(Base):
    __tablename__ = "movies"

    title = Column(String, index=True, nullable=False)
    genres = Column(String, nullable=True)
    resource_url = Column(String, nullable=True)
    movie_lens_id = Column(Integer, unique=True, nullable=True, index=True)

    ratings = relationship("Rating", back_populates="movie")


class Rating(Base):
    __tablename__ = "ratings"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    movie_id = Column(Integer, ForeignKey("movies.id"), nullable=False)

    rating = Column(Float, nullable=False)
    timestamp = Column(Integer, nullable=False, index=True)

    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")
