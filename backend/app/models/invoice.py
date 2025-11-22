from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class InvoiceType(str, enum.Enum):
    CLIENT = "client"
    VENDOR = "vendor"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    SENT = "sent"
    PAID = "paid"
    CANCELLED = "cancelled"


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False, index=True)
    invoice_type = Column(SQLEnum(InvoiceType), nullable=False)
    
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    
    billing_period_start = Column(DateTime(timezone=True), nullable=False)
    billing_period_end = Column(DateTime(timezone=True), nullable=False)
    
    total_trips = Column(Integer, default=0)
    total_distance = Column(Numeric(10, 2), default=0)
    total_duration = Column(Numeric(10, 2), default=0)
    
    base_amount = Column(Numeric(10, 2), nullable=False)
    extra_charges = Column(Numeric(10, 2), default=0)
    incentives = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT)
    notes = Column(Text)
    
    generated_at = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    client = relationship("Client", back_populates="invoices")
    vendor = relationship("Vendor", back_populates="invoices")
