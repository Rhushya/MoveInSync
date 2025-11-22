from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.employee import Employee
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel, EmailStr

router = APIRouter()


class EmployeeCreate(BaseModel):
    client_id: int
    employee_code: str
    full_name: str
    email: EmailStr
    phone: str | None = None
    department: str | None = None


class EmployeeResponse(BaseModel):
    id: int
    client_id: int
    employee_code: str
    full_name: str
    email: str
    department: str | None
    is_active: bool
    
    class Config:
        from_attributes = True


@router.post("/", response_model=EmployeeResponse)
def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_employee = Employee(**employee_data.dict())
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    return new_employee


@router.get("/", response_model=List[EmployeeResponse])
def list_employees(
    client_id: int | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Employee)
    if client_id:
        query = query.filter(Employee.client_id == client_id)
    employees = query.offset(skip).limit(limit).all()
    return employees


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee
