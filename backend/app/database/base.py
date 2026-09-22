from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.database.models.project import Project  # noqa: E402,F401
from app.database.models.parcel import LandParcel  # noqa: E402,F401
