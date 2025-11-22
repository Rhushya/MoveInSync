from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.api.deps import TenantContext, get_tenant_context
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


class InvoiceUpdate(BaseModel):
    status: InvoiceStatus | None = None
    total_trips: int | None = None
    total_amount: Decimal | None = None
    extra_charges: Decimal | None = None
    incentives: Decimal | None = None
    tax_amount: Decimal | None = None


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
    tenant: TenantContext = Depends(get_tenant_context)
):
    import random
    import string
    
    invoice_number = f"INV-{''.join(random.choices(string.ascii_uppercase + string.digits, k=10))}"
    
    client_id = tenant.assert_client_access(invoice_data.client_id)
    if not client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="client_id is required for invoice creation")
    if tenant.vendor_id and invoice_data.vendor_id and invoice_data.vendor_id != tenant.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    if tenant.vendor_id and not invoice_data.vendor_id:
        invoice_vendor_id = tenant.vendor_id
    else:
        invoice_vendor_id = invoice_data.vendor_id

    total_amount = invoice_data.base_amount + invoice_data.extra_charges + invoice_data.tax_amount - invoice_data.incentives
    
    new_invoice = Invoice(
        **invoice_data.dict(exclude={"client_id", "vendor_id"}),
        client_id=client_id,
        vendor_id=invoice_vendor_id,
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
    status_filter: InvoiceStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    query = db.query(Invoice)
    
    scoped_client = tenant.assert_client_access(client_id)
    if scoped_client:
        query = query.filter(Invoice.client_id == scoped_client)
    if vendor_id:
        query = query.filter(Invoice.vendor_id == vendor_id)
    if invoice_type:
        query = query.filter(Invoice.invoice_type == invoice_type)
    if status_filter:
        query = query.filter(Invoice.status == status_filter)
    if tenant.vendor_id and not tenant.is_admin:
        query = query.filter(Invoice.vendor_id == tenant.vendor_id)
    
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    return invoices


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not tenant.is_admin and tenant.client_id != invoice.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != invoice.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not tenant.is_admin and tenant.client_id != invoice.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != invoice.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")

    for key, value in invoice_data.model_dump(exclude_unset=True).items():
        setattr(invoice, key, value)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    if not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only platform roles can delete invoices")

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(invoice)
    db.commit()
    return None
