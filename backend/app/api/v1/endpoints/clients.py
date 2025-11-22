from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.client import Client
from app.api.deps import TenantContext, get_tenant_context
from pydantic import BaseModel, EmailStr

router = APIRouter()


class ClientCreate(BaseModel):
    name: str
    code: str
    contact_email: EmailStr
    contact_phone: str | None = None
    address: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    address: str | None = None
    is_active: bool | None = None


class ClientResponse(BaseModel):
    id: int
    name: str
    code: str
    contact_email: str
    contact_phone: str | None
    address: str | None
    is_active: bool
    
    class Config:
        from_attributes = True


@router.post("/", response_model=ClientResponse)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    if not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only platform roles can create clients")

    existing = db.query(Client).filter(Client.code == client_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Client code already exists")
    
    new_client = Client(**client_data.dict())
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    
    return new_client


@router.get("/", response_model=List[ClientResponse])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    query = db.query(Client)

    if not tenant.is_admin:
        query = query.filter(Client.id == tenant.client_id)
    elif tenant.client_id:
        query = query.filter(Client.id == tenant.client_id)

    clients = query.offset(skip).limit(limit).all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not tenant.is_admin and tenant.client_id != client.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if not tenant.is_admin and tenant.client_id != client.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")

    for key, value in client_data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    if not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only platform roles can delete clients")

    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.delete(client)
    db.commit()
    return None
