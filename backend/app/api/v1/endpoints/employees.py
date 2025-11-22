from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.employee import Employee
from app.api.deps import TenantContext, get_tenant_context
from pydantic import BaseModel, EmailStr

router = APIRouter()


class EmployeeCreate(BaseModel):
    client_id: int
    employee_code: str
    full_name: str
    email: EmailStr
    phone: str | None = None
    department: str | None = None


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    department: str | None = None
    is_active: bool | None = None


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
    tenant: TenantContext = Depends(get_tenant_context)
):
    target_client_id = tenant.assert_client_access(employee_data.client_id)
    if not target_client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="client_id is required for employee creation")
    new_employee = Employee(**employee_data.dict(exclude={"client_id"}), client_id=target_client_id)
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
    tenant: TenantContext = Depends(get_tenant_context)
):
    query = db.query(Employee)
    scoped_client = tenant.assert_client_access(client_id)
    if scoped_client:
        query = query.filter(Employee.client_id == scoped_client)
    employees = query.offset(skip).limit(limit).all()
    return employees


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not tenant.is_admin and tenant.client_id != employee.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not tenant.is_admin and tenant.client_id != employee.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")

    for key, value in employee_data.model_dump(exclude_unset=True).items():
        setattr(employee, key, value)

    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    if not tenant.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only platform roles can delete employees")

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.delete(employee)
    db.commit()
    return None
