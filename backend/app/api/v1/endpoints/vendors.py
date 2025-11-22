from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.vendor import Vendor
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel, EmailStr

router = APIRouter()


class VendorCreate(BaseModel):
    client_id: int
    name: str
    code: str
    contact_email: EmailStr
    contact_phone: str | None = None
    address: str | None = None


class VendorResponse(BaseModel):
    id: int
    client_id: int
    name: str
    code: str
    contact_email: str
    is_active: bool
    
    class Config:
        from_attributes = True


@router.post("/", response_model=VendorResponse)
def create_vendor(
    vendor_data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_vendor = Vendor(**vendor_data.dict())
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)
    return new_vendor


@router.get("/", response_model=List[VendorResponse])
def list_vendors(
    client_id: int | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Vendor)
    if client_id:
        query = query.filter(Vendor.client_id == client_id)
    vendors = query.offset(skip).limit(limit).all()
    return vendors


@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor
