from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class TripStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    trip_date = Column(DateTime(timezone=True), nullable=False, index=True)
    pickup_time = Column(DateTime(timezone=True))
    drop_time = Column(DateTime(timezone=True))
    
    pickup_location = Column(String, nullable=False)
    drop_location = Column(String, nullable=False)
    
    distance_km = Column(Numeric(10, 2))
    duration_hours = Column(Numeric(10, 2))
    
    base_fare = Column(Numeric(10, 2))
    extra_km_charge = Column(Numeric(10, 2), default=0)
    extra_hour_charge = Column(Numeric(10, 2), default=0)
    total_fare = Column(Numeric(10, 2))
    
    status = Column(SQLEnum(TripStatus), default=TripStatus.SCHEDULED)
    is_billed = Column(Boolean, default=False)
    
    vehicle_number = Column(String)
    driver_name = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    client = relationship("Client", back_populates="trips")
    vendor = relationship("Vendor", back_populates="trips")
    employee = relationship("Employee", back_populates="trips")
