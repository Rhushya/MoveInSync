from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.db.session import get_db
from app.models.trip import Trip
from app.models.invoice import Invoice
from app.models.incentive import Incentive
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
import pandas as pd
from io import BytesIO

router = APIRouter()


@router.get("/client/{client_id}/monthly")
def generate_client_report(
    client_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
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
    
    return {
        "client_id": client_id,
        "period": f"{year}-{month:02d}",
        "total_trips": len(trips),
        "total_distance": float(sum([t.distance_km or 0 for t in trips])),
        "total_invoices": len(invoices),
        "total_amount": float(sum([inv.total_amount for inv in invoices]))
    }


@router.get("/vendor/{vendor_id}/monthly")
def generate_vendor_report(
    vendor_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
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
    
    return {
        "vendor_id": vendor_id,
        "period": f"{year}-{month:02d}",
        "total_trips": len(trips),
        "total_distance": float(sum([t.distance_km or 0 for t in trips])),
        "total_payable": float(sum([inv.total_amount for inv in invoices]))
    }


@router.get("/employee/{employee_id}/incentives")
def generate_employee_incentive_report(
    employee_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    incentives = db.query(Incentive).filter(
        Incentive.employee_id == employee_id,
        Incentive.period_start >= start_date,
        Incentive.period_end < end_date
    ).all()
    
    return {
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


@router.get("/export/trips")
def export_trips_excel(
    start_date: datetime,
    end_date: datetime,
    client_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Trip).filter(
        Trip.trip_date >= start_date,
        Trip.trip_date <= end_date
    )
    
    if client_id:
        query = query.filter(Trip.client_id == client_id)
    
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
