from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.models.client import Client
from app.models.vendor import Vendor
from app.models.trip import Trip
from app.api.deps import TenantContext, get_tenant_context
from app.services.cache import (
    invalidate_dashboard_slice,
    invalidate_report_windows,
)
from app.services.pdf_renderer import build_invoice_pdf
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
    base_amount: Decimal | None = None
    billing_period_start: datetime | None = None
    billing_period_end: datetime | None = None
    notes: str | None = None


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    invoice_type: InvoiceType
    client_id: int
    vendor_id: int | None
    billing_period_start: datetime
    billing_period_end: datetime
    total_trips: int
    total_distance: Decimal | None
    total_duration: Decimal | None
    base_amount: Decimal
    extra_charges: Decimal
    incentives: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    status: InvoiceStatus
    generated_at: datetime | None
    due_date: datetime | None
    paid_at: datetime | None
    notes: str | None
    
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

    trip_metrics = db.query(
        func.count(Trip.id),
        func.coalesce(func.sum(Trip.distance_km), 0),
        func.coalesce(func.sum(Trip.duration_hours), 0),
    ).filter(
        Trip.client_id == client_id,
        Trip.trip_date >= invoice_data.billing_period_start,
        Trip.trip_date <= invoice_data.billing_period_end,
    )
    if invoice_vendor_id:
        trip_metrics = trip_metrics.filter(Trip.vendor_id == invoice_vendor_id)
    total_trips, total_distance, total_duration = trip_metrics.first()
    
    new_invoice = Invoice(
        **invoice_data.dict(exclude={"client_id", "vendor_id"}),
        client_id=client_id,
        vendor_id=invoice_vendor_id,
        invoice_number=invoice_number,
        total_amount=total_amount,
        total_trips=total_trips or 0,
        total_distance=total_distance,
        total_duration=total_duration,
        generated_at=datetime.utcnow()
    )
    
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)

    invalidate_dashboard_slice(client_id)
    invalidate_dashboard_slice(None)
    if invoice_vendor_id:
        invalidate_dashboard_slice(client_id, invoice_vendor_id)
        invalidate_dashboard_slice(None, invoice_vendor_id)
    invalidate_report_windows(client_id=client_id, vendor_id=invoice_vendor_id)
    
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
    invalidate_dashboard_slice(invoice.client_id)
    invalidate_dashboard_slice(None)
    if invoice.vendor_id:
        invalidate_dashboard_slice(invoice.client_id, invoice.vendor_id)
        invalidate_dashboard_slice(None, invoice.vendor_id)
    invalidate_report_windows(client_id=invoice.client_id, vendor_id=invoice.vendor_id)
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
    invalidate_dashboard_slice(invoice.client_id)
    invalidate_dashboard_slice(None)
    if invoice.vendor_id:
        invalidate_dashboard_slice(invoice.client_id, invoice.vendor_id)
        invalidate_dashboard_slice(None, invoice.vendor_id)
    invalidate_report_windows(client_id=invoice.client_id, vendor_id=invoice.vendor_id)
    return None


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
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

    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    vendor = db.query(Vendor).filter(Vendor.id == invoice.vendor_id).first() if invoice.vendor_id else None

    pdf_stream = build_invoice_pdf(invoice, client, vendor)
    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"},
    )
