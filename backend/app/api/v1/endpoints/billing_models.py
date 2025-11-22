from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.billing_model import BillingModel, BillingModelType
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
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
    current_user: User = Depends(get_current_user)
):
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
    current_user: User = Depends(get_current_user)
):
    query = db.query(BillingModel).filter(BillingModel.is_active == True)
    if vendor_id:
        query = query.filter(BillingModel.vendor_id == vendor_id)
    models = query.offset(skip).limit(limit).all()
    return models


@router.get("/{model_id}", response_model=BillingModelResponse)
def get_billing_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    model = db.query(BillingModel).filter(BillingModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Billing model not found")
    return model
