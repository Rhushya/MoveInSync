from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.client import Client
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel, EmailStr

router = APIRouter()


class ClientCreate(BaseModel):
    name: str
    code: str
    contact_email: EmailStr
    contact_phone: str | None = None
    address: str | None = None


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
    current_user: User = Depends(get_current_user)
):
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
    current_user: User = Depends(get_current_user)
):
    clients = db.query(Client).offset(skip).limit(limit).all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client
