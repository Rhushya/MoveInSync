from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.trip import Trip, TripStatus
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
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
    current_user: User = Depends(get_current_user)
):
    new_trip = Trip(**trip_data.dict())
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip


@router.get("/", response_model=List[TripResponse])
def list_trips(
    client_id: int | None = None,
    vendor_id: int | None = None,
    employee_id: int | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Trip)
    
    if client_id:
        query = query.filter(Trip.client_id == client_id)
    if vendor_id:
        query = query.filter(Trip.vendor_id == vendor_id)
    if employee_id:
        query = query.filter(Trip.employee_id == employee_id)
    if start_date:
        query = query.filter(Trip.trip_date >= start_date)
    if end_date:
        query = query.filter(Trip.trip_date <= end_date)
    
    trips = query.order_by(Trip.trip_date.desc()).offset(skip).limit(limit).all()
    return trips


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.patch("/{trip_id}/complete")
def complete_trip(
    trip_id: int,
    distance_km: Decimal,
    duration_hours: Decimal,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip.distance_km = distance_km
    trip.duration_hours = duration_hours
    trip.status = TripStatus.COMPLETED
    trip.drop_time = datetime.utcnow()
    
    db.commit()
    db.refresh(trip)
    
    return trip
