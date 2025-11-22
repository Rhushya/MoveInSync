from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.trip import Trip
from app.models.billing_model import BillingModel, BillingModelType
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.models.incentive import Incentive, IncentiveType


class BillingEngine:
    """
    Core billing engine that calculates trip fares based on different billing models.
    Handles Package, Trip-based, and Hybrid models.
    Time Complexity: O(n) where n is number of trips
    Space Complexity: O(1) for calculations
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_trip_fare(self, trip: Trip, billing_model: BillingModel) -> Decimal:
        """Calculate fare for a single trip based on billing model"""
        if billing_model.model_type == BillingModelType.TRIP_BASED:
            return self._calculate_trip_based(trip, billing_model)
        elif billing_model.model_type == BillingModelType.PACKAGE:
            return self._calculate_package_based(trip, billing_model)
        elif billing_model.model_type == BillingModelType.HYBRID:
            return self._calculate_hybrid(trip, billing_model)
        return Decimal(0)
    
    def _calculate_trip_based(self, trip: Trip, model: BillingModel) -> Decimal:
        """Trip-based billing: charge per trip + distance + time"""
        base_fare = model.cost_per_trip or Decimal(0)
        
        if trip.distance_km and model.cost_per_kilometer:
            base_fare += trip.distance_km * model.cost_per_kilometer
        
        if trip.duration_hours and model.cost_per_hour:
            base_fare += trip.duration_hours * model.cost_per_hour
        
        return base_fare
    
    def _calculate_package_based(self, trip: Trip, model: BillingModel) -> Decimal:
        """Package-based: Fixed cost with overage charges"""
        extra_km_charge = Decimal(0)
        extra_hour_charge = Decimal(0)
        
        if trip.distance_km and model.included_kilometers:
            if trip.distance_km > model.included_kilometers:
                extra_km = trip.distance_km - model.included_kilometers
                extra_km_charge = extra_km * (model.extra_km_rate or Decimal(0))
        
        if trip.duration_hours and model.extra_hour_rate:
            standard_hours = Decimal(2)
            if trip.duration_hours > standard_hours:
                extra_hours = trip.duration_hours - standard_hours
                extra_hour_charge = extra_hours * model.extra_hour_rate
        
        trip.extra_km_charge = extra_km_charge
        trip.extra_hour_charge = extra_hour_charge
        
        return extra_km_charge + extra_hour_charge
    
    def _calculate_hybrid(self, trip: Trip, model: BillingModel) -> Decimal:
        """Hybrid: Combination of trip-based and package"""
        base = self._calculate_trip_based(trip, model)
        extra = self._calculate_package_based(trip, model)
        return base + extra
    
    def generate_vendor_invoice(
        self,
        vendor_id: int,
        client_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Invoice:
        """Generate invoice for vendor for a billing period"""
        trips = self.db.query(Trip).filter(
            Trip.vendor_id == vendor_id,
            Trip.client_id == client_id,
            Trip.trip_date >= start_date,
            Trip.trip_date < end_date,
            Trip.is_billed == False
        ).all()
        
        billing_model = self.db.query(BillingModel).filter(
            BillingModel.vendor_id == vendor_id,
            BillingModel.is_active == True
        ).first()
        
        total_amount = Decimal(0)
        total_distance = Decimal(0)
        total_duration = Decimal(0)
        extra_charges = Decimal(0)
        
        if billing_model.model_type == BillingModelType.PACKAGE:
            total_amount = billing_model.monthly_fixed_cost or Decimal(0)
        
        for trip in trips:
            fare = self.calculate_trip_fare(trip, billing_model)
            trip.total_fare = fare
            trip.is_billed = True
            
            if billing_model.model_type != BillingModelType.PACKAGE:
                total_amount += fare
            else:
                extra_charges += (trip.extra_km_charge or 0) + (trip.extra_hour_charge or 0)
            
            total_distance += trip.distance_km or 0
            total_duration += trip.duration_hours or 0
        
        import random
        import string
        invoice_number = f"INV-V-{''.join(random.choices(string.ascii_uppercase + string.digits, k=10))}"
        
        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_type=InvoiceType.VENDOR,
            client_id=client_id,
            vendor_id=vendor_id,
            billing_period_start=start_date,
            billing_period_end=end_date,
            total_trips=len(trips),
            total_distance=total_distance,
            total_duration=total_duration,
            base_amount=total_amount,
            extra_charges=extra_charges,
            total_amount=total_amount + extra_charges,
            status=InvoiceStatus.GENERATED,
            generated_at=datetime.utcnow()
        )
        
        self.db.add(invoice)
        self.db.commit()
        
        return invoice
    
    def calculate_employee_incentives(
        self,
        employee_id: int,
        start_date: datetime,
        end_date: datetime,
        extra_hour_rate: Decimal = Decimal(50)
    ) -> Incentive:
        """Calculate incentives for employee based on extra hours/trips"""
        trips = self.db.query(Trip).filter(
            Trip.employee_id == employee_id,
            Trip.trip_date >= start_date,
            Trip.trip_date < end_date
        ).all()
        
        total_extra_hours = Decimal(0)
        standard_hours = Decimal(2)
        
        for trip in trips:
            if trip.duration_hours and trip.duration_hours > standard_hours:
                total_extra_hours += (trip.duration_hours - standard_hours)
        
        incentive_amount = total_extra_hours * extra_hour_rate
        
        if incentive_amount > 0:
            incentive = Incentive(
                employee_id=employee_id,
                incentive_type=IncentiveType.EXTRA_HOURS,
                period_start=start_date,
                period_end=end_date,
                extra_hours=total_extra_hours,
                amount=incentive_amount,
                description=f"Extra hours incentive for {total_extra_hours} hours"
            )
            
            self.db.add(incentive)
            self.db.commit()
            
            return incentive
        
        return None
