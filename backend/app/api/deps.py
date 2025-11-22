from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.db.session import get_db
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.models.vendor import Vendor


@dataclass
class TenantContext:
    current_user: User
    client_id: Optional[int]
    vendor_id: Optional[int]
    employee_id: Optional[int]
    is_admin: bool

    def assert_client_access(self, requested_client_id: Optional[int]) -> Optional[int]:
        """Validate and resolve the client/tenant identifier for the current request."""
        if self.is_admin:
            # Admin style roles can either scope with header/query value or fall back to their stored client
            return requested_client_id or self.client_id

        if self.client_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant assignment missing for the current user.",
            )

        if requested_client_id and requested_client_id != self.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access denied for this user.",
            )

        return self.client_id

    def assert_vendor_access(self, requested_vendor_id: Optional[int]) -> Optional[int]:
        """Validate vendor level access for vendor scoped roles."""
        if self.is_admin:
            return requested_vendor_id

        if self.vendor_id is None:
            return requested_vendor_id

        if requested_vendor_id and requested_vendor_id != self.vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vendor scoped user cannot access other vendors.",
            )

        return self.vendor_id


def get_tenant_context(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TenantContext:
    """Centralised resolver that figures out the tenant scope for a request."""

    header_client_id: Optional[int] = getattr(request.state, "client_id", None)
    if header_client_id is None:
        raw_header_client_id = request.headers.get("X-Client-ID")
        if raw_header_client_id:
            try:
                header_client_id = int(raw_header_client_id)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="X-Client-ID must be numeric when supplied.",
                )

    is_admin = current_user.role in {
        UserRole.ADMIN,
        UserRole.FINANCE,
        UserRole.OPERATIONS,
    }

    resolved_client_id = current_user.client_id
    vendor_id = current_user.vendor_id
    employee_id = current_user.employee_id

    if current_user.role == UserRole.VENDOR and vendor_id and resolved_client_id is None:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        resolved_client_id = vendor.client_id if vendor else None

    if current_user.role == UserRole.EMPLOYEE and employee_id and resolved_client_id is None:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        resolved_client_id = employee.client_id if employee else None

    if is_admin:
        resolved_client_id = header_client_id or resolved_client_id
    else:
        if header_client_id and resolved_client_id and header_client_id != resolved_client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot impersonate another tenant.",
            )
        if resolved_client_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Current user is not associated with any tenant.",
            )

    return TenantContext(
        current_user=current_user,
        client_id=resolved_client_id,
        vendor_id=vendor_id,
        employee_id=employee_id,
        is_admin=is_admin,
    )
