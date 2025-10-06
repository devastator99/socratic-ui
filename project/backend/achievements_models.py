from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from models import Base

class Achievement(Base):
    """Model for user achievements."""
    __tablename__ = 'achievements'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    xp_value = Column(Integer)

    user_id = Column(Integer, ForeignKey('users.id'))
    user = relationship("User", back_populates="achievements")

class Reputation(Base):
    """Model for user reputation."""
    __tablename__ = 'reputation'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    score = Column(Integer)

    user = relationship("User", back_populates="reputation")
