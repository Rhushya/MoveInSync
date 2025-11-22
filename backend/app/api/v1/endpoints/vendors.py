from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.vendor import Vendor
from app.api.deps import TenantContext, get_tenant_context
from pydantic import BaseModel, EmailStr

router = APIRouter()


class VendorCreate(BaseModel):
    client_id: int
    name: str
    code: str
    contact_email: EmailStr
    contact_phone: str | None = None
    address: str | None = None


class VendorUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    address: str | None = None
    is_active: bool | None = None


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
    tenant: TenantContext = Depends(get_tenant_context)
):
    target_client_id: int | None
    if tenant.is_admin:
        target_client_id = vendor_data.client_id or tenant.client_id
    else:
        target_client_id = tenant.client_id

    if not target_client_id:
        raise HTTPException(status_code=400, detail="client_id is required for vendor creation")

    new_vendor = Vendor(**vendor_data.dict(exclude={"client_id"}), client_id=target_client_id)
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
    tenant: TenantContext = Depends(get_tenant_context)
):
    query = db.query(Vendor)
    scoped_client = tenant.assert_client_access(client_id)

    if scoped_client:
        query = query.filter(Vendor.client_id == scoped_client)

    if tenant.vendor_id and not tenant.is_admin:
        query = query.filter(Vendor.id == tenant.vendor_id)
    vendors = query.offset(skip).limit(limit).all()
    return vendors


@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if not tenant.is_admin and tenant.client_id != vendor.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != vendor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    return vendor


@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if not tenant.is_admin and tenant.client_id != vendor.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != vendor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")

    for key, value in vendor_data.model_dump(exclude_unset=True).items():
        setattr(vendor, key, value)

    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    if not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only platform roles can delete vendors")

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    db.delete(vendor)
    db.commit()
    return None
