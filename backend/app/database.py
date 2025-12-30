"""Database setup and session management."""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# Ensure data directory exists
os.makedirs("data", exist_ok=True)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency for getting database sessions."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    from app.models import Account, Person, TwilioNumber, Call, Transcript, CallAnalysis, MemoryState
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create default accounts if they don't exist
    async with async_session_maker() as session:
        from sqlalchemy import select
        
        # Check for default private account
        result = await session.execute(
            select(Account).where(Account.id == 1)
        )
        if not result.scalar_one_or_none():
            default_private = Account(
                id=1,
                type="private",
                name="Standard Privatkonto"
            )
            session.add(default_private)
        
        # Check for default clinical account
        result = await session.execute(
            select(Account).where(Account.id == 2)
        )
        if not result.scalar_one_or_none():
            default_clinical = Account(
                id=2,
                type="clinical",
                name="Standard Klinikkonto"
            )
            session.add(default_clinical)
        
        await session.commit()

