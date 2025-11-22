from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.models.trip import Trip
from app.models.invoice import Invoice
from app.models.incentive import Incentive
from app.api.deps import TenantContext, get_tenant_context
from app.models.vendor import Vendor
from app.models.employee import Employee
from app.services.cache import build_cache_key, cache_get_json, cache_set_json
from app.services.monitoring import track_report_generation
import pandas as pd
from io import BytesIO

router = APIRouter()

REPORT_CACHE_SCOPE = "reports"
REPORT_CACHE_TTL = 300


@router.get("/client/{client_id}/monthly")
def generate_client_report(
    client_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    scoped_client_id = tenant.assert_client_access(client_id)
    if not scoped_client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    client_id = scoped_client_id
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    cache_key = build_cache_key("reports:client", client_id, f"{year:04d}-{month:02d}")
    cached = cache_get_json(cache_key, scope=REPORT_CACHE_SCOPE)
    if cached:
        return cached
    
    with track_report_generation("client_monthly"):
        trips = db.query(Trip).filter(
            Trip.client_id == client_id,
            Trip.trip_date >= start_date,
            Trip.trip_date < end_date
        ).all()

        invoices = db.query(Invoice).filter(
            Invoice.client_id == client_id,
            Invoice.billing_period_start >= start_date,
            Invoice.billing_period_end < end_date
        ).all()

        payload = {
            "client_id": client_id,
            "period": f"{year}-{month:02d}",
            "total_trips": len(trips),
            "total_distance": float(sum([t.distance_km or 0 for t in trips])),
            "total_invoices": len(invoices),
            "total_amount": float(sum([inv.total_amount for inv in invoices]))
        }

    cache_set_json(cache_key, payload, ttl_seconds=REPORT_CACHE_TTL)
    return payload


@router.get("/vendor/{vendor_id}/monthly")
def generate_vendor_report(
    vendor_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if tenant.client_id and vendor.client_id != tenant.client_id and not tenant.is_admin:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    if tenant.vendor_id and tenant.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Vendor mismatch")
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    cache_key = build_cache_key("reports:vendor", vendor_id, f"{year:04d}-{month:02d}")
    cached = cache_get_json(cache_key, scope=REPORT_CACHE_SCOPE)
    if cached:
        return cached

    with track_report_generation("vendor_monthly"):
        trips = db.query(Trip).filter(
            Trip.vendor_id == vendor_id,
            Trip.trip_date >= start_date,
            Trip.trip_date < end_date
        ).all()

        invoices = db.query(Invoice).filter(
            Invoice.vendor_id == vendor_id,
            Invoice.billing_period_start >= start_date,
            Invoice.billing_period_end < end_date
        ).all()

        payload = {
            "vendor_id": vendor_id,
            "period": f"{year}-{month:02d}",
            "total_trips": len(trips),
            "total_distance": float(sum([t.distance_km or 0 for t in trips])),
            "total_payable": float(sum([inv.total_amount for inv in invoices]))
        }

    cache_set_json(cache_key, payload, ttl_seconds=REPORT_CACHE_TTL)
    return payload


@router.get("/employee/{employee_id}/incentives")
def generate_employee_incentive_report(
    employee_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not tenant.is_admin and tenant.client_id != employee.client_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    cache_key = build_cache_key("reports:employee", employee_id, f"{year:04d}-{month:02d}")
    cached = cache_get_json(cache_key, scope=REPORT_CACHE_SCOPE)
    if cached:
        return cached

    with track_report_generation("employee_incentives"):
        incentives = db.query(Incentive).filter(
            Incentive.employee_id == employee_id,
            Incentive.period_start >= start_date,
            Incentive.period_end < end_date
        ).all()

        payload = {
            "employee_id": employee_id,
            "period": f"{year}-{month:02d}",
            "total_incentives": len(incentives),
            "total_amount": float(sum([inc.amount for inc in incentives])),
            "incentives": [
                {
                    "type": inc.incentive_type,
                    "amount": float(inc.amount),
                    "extra_hours": float(inc.extra_hours or 0),
                    "extra_trips": inc.extra_trips or 0
                }
                for inc in incentives
            ]
        }

    cache_set_json(cache_key, payload, ttl_seconds=REPORT_CACHE_TTL)
    return payload


@router.get("/export/trips")
def export_trips_excel(
    start_date: datetime,
    end_date: datetime,
    client_id: int | None = None,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    scoped_client_id = tenant.assert_client_access(client_id)
    query = db.query(Trip).filter(
        Trip.trip_date >= start_date,
        Trip.trip_date <= end_date
    )

    if scoped_client_id:
        query = query.filter(Trip.client_id == scoped_client_id)
    if tenant.vendor_id and not tenant.is_admin:
        query = query.filter(Trip.vendor_id == tenant.vendor_id)

    with track_report_generation("trip_export"):
        trips = query.all()

        data = [{
            'Trip ID': t.id,
            'Date': t.trip_date,
            'Pickup': t.pickup_location,
            'Drop': t.drop_location,
            'Distance (km)': float(t.distance_km or 0),
            'Duration (hrs)': float(t.duration_hours or 0),
            'Fare': float(t.total_fare or 0),
            'Status': t.status
        } for t in trips]

        df = pd.DataFrame(data)

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Trips')

        output.seek(0)

    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=trips_report.xlsx"}
    )
