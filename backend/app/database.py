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


def _migrate_person_table_sync(conn):
    """
    MVP migration: Add new columns to Person table if they don't exist.
    SQLite does not support IF NOT EXISTS for ALTER TABLE, so we check manually.
    
    NOTE: This is for MVP only. For production, use Alembic migrations.
    """
    from sqlalchemy import text, inspect
    
    # Get existing columns
    inspector = inspect(conn)
    existing_columns = {col['name'] for col in inspector.get_columns('people')}
    
    # Columns to add (name, type)
    new_columns = [
        ('age', 'INTEGER'),
        ('personal_context_json', 'TEXT'),  # JSON stored as TEXT in SQLite
        ('address_json', 'TEXT'),
        ('updated_at', 'DATETIME'),
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            # SQLite ALTER TABLE ADD COLUMN
            conn.execute(text(f'ALTER TABLE people ADD COLUMN {col_name} {col_type}'))
            print(f"[Migration] Added column 'people.{col_name}'")


async def init_db():
    """Initialize database tables and run migrations."""
    from app.models import Account, Person, TwilioNumber, Call, Transcript, CallAnalysis, MemoryState
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Run MVP migrations for existing tables
    async with engine.begin() as conn:
        try:
            await conn.run_sync(_migrate_person_table_sync)
        except Exception as e:
            print(f"[Migration] Warning: {e}")
    
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

