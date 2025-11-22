from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from decimal import Decimal
from app.db.session import get_db
from app.models.trip import Trip
from app.models.invoice import Invoice
from app.api.deps import TenantContext, get_tenant_context
from app.services.cache import build_cache_key, cache_get_json, cache_set_json
from pydantic import BaseModel

router = APIRouter()
DASHBOARD_CACHE_SCOPE = "dashboard"
DASHBOARD_CACHE_TTL = 60


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
    tenant: TenantContext = Depends(get_tenant_context)
):
    cache_key = build_cache_key("dashboard:stats", tenant.client_id, tenant.vendor_id)
    cached = cache_get_json(cache_key, scope=DASHBOARD_CACHE_SCOPE)
    if cached:
        return DashboardStats(**cached)

    from app.models.client import Client
    from app.models.vendor import Vendor
    from app.models.employee import Employee
    
    today = datetime.utcnow().date()
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    clients_query = db.query(func.count(Client.id))
    vendors_query = db.query(func.count(Vendor.id))
    employees_query = db.query(func.count(Employee.id))

    if tenant.client_id:
        clients_query = clients_query.filter(Client.id == tenant.client_id)
        vendors_query = vendors_query.filter(Vendor.client_id == tenant.client_id)
        employees_query = employees_query.filter(Employee.client_id == tenant.client_id)
    if tenant.vendor_id and not tenant.is_admin:
        vendors_query = vendors_query.filter(Vendor.id == tenant.vendor_id)
    
    total_clients = clients_query.scalar()
    total_vendors = vendors_query.scalar()
    total_employees = employees_query.scalar()
    
    trip_today_query = db.query(func.count(Trip.id)).filter(func.date(Trip.trip_date) == today)
    trip_month_query = db.query(func.count(Trip.id)).filter(Trip.trip_date >= month_start)
    revenue_query = db.query(func.sum(Invoice.total_amount)).filter(Invoice.billing_period_start >= month_start)
    pending_query = db.query(func.count(Invoice.id)).filter(Invoice.status.in_( ["draft", "generated", "sent"]))

    if tenant.client_id:
        trip_today_query = trip_today_query.filter(Trip.client_id == tenant.client_id)
        trip_month_query = trip_month_query.filter(Trip.client_id == tenant.client_id)
        revenue_query = revenue_query.filter(Invoice.client_id == tenant.client_id)
        pending_query = pending_query.filter(Invoice.client_id == tenant.client_id)
    if tenant.vendor_id and not tenant.is_admin:
        trip_today_query = trip_today_query.filter(Trip.vendor_id == tenant.vendor_id)
        trip_month_query = trip_month_query.filter(Trip.vendor_id == tenant.vendor_id)
        revenue_query = revenue_query.filter(Invoice.vendor_id == tenant.vendor_id)
        pending_query = pending_query.filter(Invoice.vendor_id == tenant.vendor_id)
    
    total_trips_today = trip_today_query.scalar()
    total_trips_month = trip_month_query.scalar()
    total_revenue = revenue_query.scalar() or Decimal(0)
    pending_invoices = pending_query.scalar()
    
    stats = DashboardStats(
        total_clients=total_clients or 0,
        total_vendors=total_vendors or 0,
        total_employees=total_employees or 0,
        total_trips_today=total_trips_today or 0,
        total_trips_month=total_trips_month or 0,
        total_revenue_month=total_revenue,
        pending_invoices=pending_invoices or 0
    )

    cache_set_json(cache_key, stats.model_dump(), ttl_seconds=DASHBOARD_CACHE_TTL)
    return stats


@router.get("/trip-trends")
def get_trip_trends(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    trips_query = db.query(
        func.date(Trip.trip_date).label('date'),
        func.count(Trip.id).label('count')
    ).filter(
        Trip.trip_date >= start_date
    )

    if tenant.client_id:
        trips_query = trips_query.filter(Trip.client_id == tenant.client_id)
    if tenant.vendor_id and not tenant.is_admin:
        trips_query = trips_query.filter(Trip.vendor_id == tenant.vendor_id)

    trips = trips_query.group_by(
        func.date(Trip.trip_date)
    ).order_by('date').all()
    
    return [{"date": str(trip.date), "count": trip.count} for trip in trips]
