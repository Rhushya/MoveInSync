from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.trip import Trip, TripStatus
from app.api.deps import TenantContext, get_tenant_context
from app.services.cache import (
    invalidate_dashboard_slice,
    invalidate_report_windows,
)
from pydantic import BaseModel

router = APIRouter()


class TripCreate(BaseModel):
    client_id: int
    vendor_id: int
    employee_id: int
    trip_date: datetime
    pickup_location: str
    drop_location: str
    pickup_time: datetime | None = None
    drop_time: datetime | None = None
    distance_km: Decimal | None = None
    duration_hours: Decimal | None = None
    vehicle_number: str | None = None
    driver_name: str | None = None


class TripUpdate(BaseModel):
    trip_date: datetime | None = None
    pickup_location: str | None = None
    drop_location: str | None = None
    pickup_time: datetime | None = None
    drop_time: datetime | None = None
    distance_km: Decimal | None = None
    duration_hours: Decimal | None = None
    base_fare: Decimal | None = None
    total_fare: Decimal | None = None
    status: TripStatus | None = None


class TripResponse(BaseModel):
    id: int
    client_id: int
    vendor_id: int
    employee_id: int
    trip_date: datetime
    pickup_location: str
    drop_location: str
    distance_km: Decimal | None
    duration_hours: Decimal | None
    base_fare: Decimal | None
    total_fare: Decimal | None
    status: TripStatus
    is_billed: bool
    
    class Config:
        from_attributes = True


@router.post("/", response_model=TripResponse)
def create_trip(
    trip_data: TripCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    target_client_id = tenant.assert_client_access(trip_data.client_id)
    if not target_client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="client_id is required for trip creation")
    if tenant.vendor_id and not tenant.is_admin and trip_data.vendor_id != tenant.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    if tenant.employee_id and not tenant.is_admin and trip_data.employee_id != tenant.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee mismatch")

    new_trip = Trip(**trip_data.dict(exclude={"client_id"}), client_id=target_client_id)
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    invalidate_dashboard_slice(new_trip.client_id)
    invalidate_dashboard_slice(None)
    invalidate_dashboard_slice(new_trip.client_id, new_trip.vendor_id)
    invalidate_dashboard_slice(None, new_trip.vendor_id)
    invalidate_report_windows(
        client_id=new_trip.client_id,
        vendor_id=new_trip.vendor_id,
        employee_id=new_trip.employee_id,
    )
    return new_trip


@router.get("/", response_model=List[TripResponse])
def list_trips(
    client_id: int | None = None,
    vendor_id: int | None = None,
    employee_id: int | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    status_filter: TripStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    query = db.query(Trip)
    
    scoped_client = tenant.assert_client_access(client_id)
    if scoped_client:
        query = query.filter(Trip.client_id == scoped_client)
    if tenant.vendor_id and not tenant.is_admin:
        query = query.filter(Trip.vendor_id == tenant.vendor_id)
    if tenant.employee_id and not tenant.is_admin:
        query = query.filter(Trip.employee_id == tenant.employee_id)

    if vendor_id:
        query = query.filter(Trip.vendor_id == vendor_id)
    if employee_id:
        query = query.filter(Trip.employee_id == employee_id)
    if start_date:
        query = query.filter(Trip.trip_date >= start_date)
    if end_date:
        query = query.filter(Trip.trip_date <= end_date)
    if status_filter:
        query = query.filter(Trip.status == status_filter)
    
    trips = query.order_by(Trip.trip_date.desc()).offset(skip).limit(limit).all()
    return trips


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if not tenant.is_admin and tenant.client_id != trip.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != trip.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    if tenant.employee_id and tenant.employee_id != trip.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee mismatch")
    return trip


@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: int,
    trip_data: TripUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if not tenant.is_admin and tenant.client_id != trip.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != trip.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    if tenant.employee_id and tenant.employee_id != trip.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee mismatch")

    for key, value in trip_data.model_dump(exclude_unset=True).items():
        setattr(trip, key, value)

    db.commit()
    db.refresh(trip)
    invalidate_dashboard_slice(trip.client_id)
    invalidate_dashboard_slice(None)
    invalidate_dashboard_slice(trip.client_id, trip.vendor_id)
    invalidate_dashboard_slice(None, trip.vendor_id)
    invalidate_report_windows(
        client_id=trip.client_id,
        vendor_id=trip.vendor_id,
        employee_id=trip.employee_id,
    )
    return trip


@router.patch("/{trip_id}/complete")
def complete_trip(
    trip_id: int,
    distance_km: Decimal,
    duration_hours: Decimal,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if not tenant.is_admin and tenant.client_id != trip.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != trip.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    if tenant.employee_id and tenant.employee_id != trip.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee mismatch")
    
    trip.distance_km = distance_km
    trip.duration_hours = duration_hours
    trip.status = TripStatus.COMPLETED
    trip.drop_time = datetime.utcnow()
    
    db.commit()
    db.refresh(trip)
    invalidate_dashboard_slice(trip.client_id)
    invalidate_dashboard_slice(None)
    invalidate_dashboard_slice(trip.client_id, trip.vendor_id)
    invalidate_dashboard_slice(None, trip.vendor_id)
    invalidate_report_windows(
        client_id=trip.client_id,
        vendor_id=trip.vendor_id,
        employee_id=trip.employee_id,
    )
    
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if not tenant.is_admin and tenant.client_id != trip.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != trip.vendor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor mismatch")
    if tenant.employee_id and tenant.employee_id != trip.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee mismatch")

    db.delete(trip)
    db.commit()
    invalidate_dashboard_slice(trip.client_id)
    invalidate_dashboard_slice(None)
    invalidate_dashboard_slice(trip.client_id, trip.vendor_id)
    invalidate_dashboard_slice(None, trip.vendor_id)
    invalidate_report_windows(
        client_id=trip.client_id,
        vendor_id=trip.vendor_id,
        employee_id=trip.employee_id,
    )
    return None
