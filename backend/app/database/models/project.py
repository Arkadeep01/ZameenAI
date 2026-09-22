from sqlalchemy import Column, Integer, String, Date, DateTime
from sqlalchemy.sql import func

from app.database.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)

    project_code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    project_name = Column(
        String(200),
        nullable=False
    )

    project_type = Column(
        String(100),
        nullable=True
    )

    authority = Column(
        String(150),
        nullable=True
    )

    state = Column(
        String(100),
        nullable=False
    )

    district = Column(
        String(100),
        nullable=False
    )

    status = Column(
        String(50),
        nullable=False,
        default="Planning"
    )

    start_date = Column(
        Date,
        nullable=True
    )

    target_date = Column(
        Date,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
