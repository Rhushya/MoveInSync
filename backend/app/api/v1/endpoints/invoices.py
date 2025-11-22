from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class InvoiceCreate(BaseModel):
    invoice_type: InvoiceType
    client_id: int
    vendor_id: int | None = None
    billing_period_start: datetime
    billing_period_end: datetime
    base_amount: Decimal
    extra_charges: Decimal = Decimal(0)
    incentives: Decimal = Decimal(0)
    tax_amount: Decimal = Decimal(0)


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    invoice_type: InvoiceType
    client_id: int
    vendor_id: int | None
    billing_period_start: datetime
    billing_period_end: datetime
    total_trips: int
    total_amount: Decimal
    status: InvoiceStatus
    
    class Config:
        from_attributes = True


@router.post("/", response_model=InvoiceResponse)
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import random
    import string
    
    invoice_number = f"INV-{''.join(random.choices(string.ascii_uppercase + string.digits, k=10))}"
    
    total_amount = invoice_data.base_amount + invoice_data.extra_charges + invoice_data.tax_amount - invoice_data.incentives
    
    new_invoice = Invoice(
        **invoice_data.dict(),
        invoice_number=invoice_number,
        total_amount=total_amount,
        generated_at=datetime.utcnow()
    )
    
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    
    return new_invoice


@router.get("/", response_model=List[InvoiceResponse])
def list_invoices(
    client_id: int | None = None,
    vendor_id: int | None = None,
    invoice_type: InvoiceType | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice)
    
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if vendor_id:
        query = query.filter(Invoice.vendor_id == vendor_id)
    if invoice_type:
        query = query.filter(Invoice.invoice_type == invoice_type)
    
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    return invoices


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice
