from fastapi import APIRouter
from app.api.v1.endpoints import auth, clients, vendors, employees, trips, billing_models, invoices, reports, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(billing_models.router, prefix="/billing-models", tags=["billing-models"])
api_router.include_router(trips.router, prefix="/trips", tags=["trips"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
