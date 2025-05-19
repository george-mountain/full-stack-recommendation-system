from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base_class import Base

# Async engine
async_engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Async session factory
AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def create_db_and_tables():
    async with async_engine.begin() as conn:

        await conn.run_sync(Base.metadata.create_all)
