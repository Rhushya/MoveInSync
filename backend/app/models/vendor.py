from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False, index=True)
    contact_email = Column(String, nullable=False)
    contact_phone = Column(String)
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    client = relationship("Client", back_populates="vendors")
    billing_models = relationship("BillingModel", back_populates="vendor")
    trips = relationship("Trip", back_populates="vendor")
    invoices = relationship("Invoice", back_populates="vendor")
