from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class IncentiveType(str, enum.Enum):
    EXTRA_HOURS = "extra_hours"
    EXTRA_TRIPS = "extra_trips"
    REFERRAL = "referral"
    PERFORMANCE = "performance"


class Incentive(Base):
    __tablename__ = "incentives"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    incentive_type = Column(SQLEnum(IncentiveType), nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    extra_hours = Column(Numeric(10, 2), default=0)
    extra_trips = Column(Integer, default=0)
    
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(Text)
    
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    employee = relationship("Employee", back_populates="incentives")
