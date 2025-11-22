from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.billing_model import BillingModel, BillingModelType
from app.api.deps import TenantContext, get_tenant_context
from app.models.vendor import Vendor
from pydantic import BaseModel

router = APIRouter()


class BillingModelCreate(BaseModel):
    vendor_id: int
    name: str
    model_type: BillingModelType
    monthly_fixed_cost: Decimal | None = None
    included_trips: int | None = None
    included_kilometers: Decimal | None = None
    cost_per_trip: Decimal | None = None
    cost_per_kilometer: Decimal | None = None
    cost_per_hour: Decimal | None = None
    extra_km_rate: Decimal | None = None
    extra_hour_rate: Decimal | None = None
    effective_from: datetime


class BillingModelUpdate(BaseModel):
    name: str | None = None
    model_type: BillingModelType | None = None
    monthly_fixed_cost: Decimal | None = None
    included_trips: int | None = None
    included_kilometers: Decimal | None = None
    cost_per_trip: Decimal | None = None
    cost_per_kilometer: Decimal | None = None
    cost_per_hour: Decimal | None = None
    extra_km_rate: Decimal | None = None
    extra_hour_rate: Decimal | None = None
    is_active: bool | None = None


class BillingModelResponse(BaseModel):
    id: int
    vendor_id: int
    name: str
    model_type: BillingModelType
    monthly_fixed_cost: Decimal | None
    included_trips: int | None
    cost_per_trip: Decimal | None
    cost_per_kilometer: Decimal | None
    extra_km_rate: Decimal | None
    extra_hour_rate: Decimal | None
    is_active: bool
    
    class Config:
        from_attributes = True


@router.post("/", response_model=BillingModelResponse)
def create_billing_model(
    model_data: BillingModelCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    vendor = db.query(Vendor).filter(Vendor.id == model_data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if not tenant.is_admin and tenant.client_id != vendor.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")

    if tenant.client_id and tenant.client_id != vendor.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor not part of tenant scope")

    new_model = BillingModel(**model_data.dict())
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model


@router.get("/", response_model=List[BillingModelResponse])
def list_billing_models(
    vendor_id: int | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    query = db.query(BillingModel).filter(BillingModel.is_active == True)
    if vendor_id:
        query = query.filter(BillingModel.vendor_id == vendor_id)

    if tenant.vendor_id and not tenant.is_admin:
        query = query.filter(BillingModel.vendor_id == tenant.vendor_id)
    elif tenant.client_id:
        query = query.join(Vendor).filter(Vendor.client_id == tenant.client_id)
    models = query.offset(skip).limit(limit).all()
    return models


@router.get("/{model_id}", response_model=BillingModelResponse)
def get_billing_model(
    model_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    model = db.query(BillingModel).filter(BillingModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Billing model not found")
    vendor = db.query(Vendor).filter(Vendor.id == model.vendor_id).first()
    if tenant.client_id and vendor and vendor.client_id != tenant.client_id and not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != model.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    return model


@router.put("/{model_id}", response_model=BillingModelResponse)
def update_billing_model(
    model_id: int,
    model_data: BillingModelUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    model = db.query(BillingModel).filter(BillingModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Billing model not found")

    vendor = db.query(Vendor).filter(Vendor.id == model.vendor_id).first()
    if tenant.client_id and vendor and vendor.client_id != tenant.client_id and not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != model.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")

    for key, value in model_data.model_dump(exclude_unset=True).items():
        setattr(model, key, value)

    db.commit()
    db.refresh(model)
    return model


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_billing_model(
    model_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    if not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only platform roles can delete billing models")

    model = db.query(BillingModel).filter(BillingModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Billing model not found")

    db.delete(model)
    db.commit()
    return None
