from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class BillingModelType(str, enum.Enum):
    PACKAGE = "package"
    TRIP_BASED = "trip_based"
    HYBRID = "hybrid"


class BillingModel(Base):
    __tablename__ = "billing_models"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    name = Column(String, nullable=False)
    model_type = Column(SQLEnum(BillingModelType), nullable=False)
    
    monthly_fixed_cost = Column(Numeric(10, 2))
    included_trips = Column(Integer)
    included_kilometers = Column(Numeric(10, 2))
    
    cost_per_trip = Column(Numeric(10, 2))
    cost_per_kilometer = Column(Numeric(10, 2))
    cost_per_hour = Column(Numeric(10, 2))
    
    extra_km_rate = Column(Numeric(10, 2))
    extra_hour_rate = Column(Numeric(10, 2))
    
    config_json = Column(JSON)
    
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime(timezone=True), nullable=False)
    effective_to = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    vendor = relationship("Vendor", back_populates="billing_models")
