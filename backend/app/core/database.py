from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
import asyncio

# SQLAlchemy base class
class Base(DeclarativeBase):
    pass

# Engine configuration
async_engine = create_async_engine(
    os.getenv("DATABASE_URL", "postgresql+psycopg://user:password@localhost:5432/zameenai"),
    echo=False,
    future=True,
)

sync_engine = create_engine(
    os.getenv("DATABASE_URL", "postgresql+psycopg://user:password@localhost:5432/zameenai"),
    echo=False,
    poolclass=NullPool,
)

# Session factory
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

def get_async_session():
    """Dependency to get async database session."""
    return AsyncSessionLocal()

# PostGIS initialization
@event.listens_for(async_engine.sync_engine, "connect")
def receive_dbapi_connection(dbapi_connection, connection_record):
    """Enable PostGIS extension on connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    cursor.close()