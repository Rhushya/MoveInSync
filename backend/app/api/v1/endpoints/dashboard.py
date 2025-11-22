from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from decimal import Decimal
from app.db.session import get_db
from app.models.trip import Trip
from app.models.invoice import Invoice
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()


class DashboardStats(BaseModel):
    total_clients: int
    total_vendors: int
    total_employees: int
    total_trips_today: int
    total_trips_month: int
    total_revenue_month: Decimal
    pending_invoices: int


class TripTrend(BaseModel):
    date: str
    count: int


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.client import Client
    from app.models.vendor import Vendor
    from app.models.employee import Employee
    
    today = datetime.utcnow().date()
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    total_clients = db.query(func.count(Client.id)).scalar()
    total_vendors = db.query(func.count(Vendor.id)).scalar()
    total_employees = db.query(func.count(Employee.id)).scalar()
    
    total_trips_today = db.query(func.count(Trip.id)).filter(
        func.date(Trip.trip_date) == today
    ).scalar()
    
    total_trips_month = db.query(func.count(Trip.id)).filter(
        Trip.trip_date >= month_start
    ).scalar()
    
    total_revenue = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.billing_period_start >= month_start
    ).scalar() or Decimal(0)
    
    pending_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.status.in_(["draft", "generated", "sent"])
    ).scalar()
    
    return DashboardStats(
        total_clients=total_clients or 0,
        total_vendors=total_vendors or 0,
        total_employees=total_employees or 0,
        total_trips_today=total_trips_today or 0,
        total_trips_month=total_trips_month or 0,
        total_revenue_month=total_revenue,
        pending_invoices=pending_invoices or 0
    )


@router.get("/trip-trends")
def get_trip_trends(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    trips = db.query(
        func.date(Trip.trip_date).label('date'),
        func.count(Trip.id).label('count')
    ).filter(
        Trip.trip_date >= start_date
    ).group_by(
        func.date(Trip.trip_date)
    ).order_by('date').all()
    
    return [{"date": str(trip.date), "count": trip.count} for trip in trips]
