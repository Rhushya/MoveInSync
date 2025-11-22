from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.client import Client
from app.models.invoice import Invoice
from app.models.vendor import Vendor

styles = getSampleStyleSheet()


def _format_currency(value: Optional[Decimal]) -> str:
    amount = float(value or 0)
    return f"INR {amount:,.2f}"


def build_invoice_pdf(invoice: Invoice, client: Client, vendor: Optional[Vendor] = None) -> BytesIO:
    """Render a lightweight PDF representation of an invoice."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=LETTER, topMargin=36, bottomMargin=36, leftMargin=48, rightMargin=48)
    elements = []

    elements.append(Paragraph(f"Invoice {invoice.invoice_number}", styles["Title"]))
    elements.append(Spacer(1, 12))

    issued_date = invoice.generated_at or datetime.utcnow()
    header_rows = [
        ["Issue Date", issued_date.strftime("%d %b %Y")],
        ["Invoice Type", invoice.invoice_type.value.title()],
        ["Billing Period", f"{invoice.billing_period_start.date()} — {invoice.billing_period_end.date()}"],
        ["Status", invoice.status.value.title()],
    ]

    summary_table = Table(header_rows, hAlign="LEFT", colWidths=[140, 320])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.whitesmoke]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 18))

    client_block = f"<b>Bill To:</b><br/>{client.name}<br/>{client.address or 'N/A'}<br/>{client.contact_email}"
    vendor_block = "Vendor: Not specified"
    if vendor:
        vendor_block = f"<b>Vendor:</b><br/>{vendor.name}<br/>{vendor.address or 'N/A'}<br/>{vendor.contact_email}"

    info_table = Table([[Paragraph(client_block, styles["Normal"]), Paragraph(vendor_block, styles["Normal"])]] , colWidths=[230, 230])
    info_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(info_table)
    elements.append(Spacer(1, 18))

    breakdown = [
        ["Base Amount", _format_currency(invoice.base_amount)],
        ["Extra Charges", _format_currency(invoice.extra_charges)],
        ["Incentives", _format_currency(invoice.incentives)],
        ["Tax Amount", _format_currency(invoice.tax_amount)],
        ["Total Trips", str(invoice.total_trips)],
        ["Total Amount Due", _format_currency(invoice.total_amount)],
    ]
    breakdown_table = Table(breakdown, colWidths=[200, 200])
    breakdown_table.setStyle(TableStyle([
        ("BACKGROUND", (0, -1), (-1, -1), colors.lightgrey),
        ("FONTSIZE", (0, -1), (-1, -1), 12),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
    ]))
    elements.append(breakdown_table)

    if invoice.notes:
        elements.append(Spacer(1, 18))
        elements.append(Paragraph(f"Notes: {invoice.notes}", styles["Italic"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer
