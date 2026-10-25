"""Daily attendance PDF report generation (ReportLab)."""
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

try:
    IST = ZoneInfo("Asia/Kolkata")
except Exception:  # Windows without the 'tzdata' package; India has no DST so a fixed offset is exact
    IST = timezone(timedelta(hours=5, minutes=30), "IST")

class PdfDependencyMissing(RuntimeError):
    """Raised when the optional 'reportlab' package is not installed."""


def today_ist() -> str:
    return datetime.now(IST).strftime("%Y-%m-%d")


def _esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_attendance_pdf(
    date: str,
    children: List[dict],
    day_records: Dict[str, bool],
    month_records: Dict[str, Dict[str, bool]],
) -> bytes:
    """children: [{id, name, age}], day_records: {child_id: present} for `date`,
    month_records: {child_id: {date: present}} used for the monthly %."""
    # reportlab is imported lazily so the rest of the API still starts without it.
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as exc:
        raise PdfDependencyMissing(
            "PDF support needs the 'reportlab' package. Run: pip install reportlab"
        ) from exc

    GREEN = colors.HexColor("#193F32")
    PRESENT = colors.HexColor("#2F7D4F")
    ABSENT = colors.HexColor("#C94A3F")
    CREAM = colors.HexColor("#F4EFE3")
    LINE = colors.HexColor("#E2D9C8")

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=16 * mm, bottomMargin=18 * mm,
        title=f"Attendance {date}", author="VikasSetu - Aamchi Shala",
    )
    ss = getSampleStyleSheet()
    h_brand = ParagraphStyle("brand", parent=ss["Normal"], fontName="Helvetica-Bold",
                             fontSize=11, textColor=GREEN)
    h_title = ParagraphStyle("title", parent=ss["Title"], fontName="Helvetica-Bold",
                             fontSize=20, textColor=GREEN, alignment=0, spaceAfter=2)
    sub = ParagraphStyle("sub", parent=ss["Normal"], fontSize=10, textColor=colors.HexColor("#5F6B62"))
    cell = ParagraphStyle("cell", parent=ss["Normal"], fontSize=10, leading=12)

    d = datetime.strptime(date, "%Y-%m-%d")
    pretty = d.strftime("%A, %d %B %Y")

    # Monthly % = days present / school days so far this month (Mon-Sat, up to report date).
      # A Sunday counts as a school day only if at least half the class was marked on it.
         # Monthly % = days present / school days so far this month (Mon-Sat, up to report date).
    marks_per_date: Dict[str, int] = {}
    for recs in month_records.values():
        for k in recs:
            marks_per_date[k] = marks_per_date.get(k, 0) + 1

    n_children = len(children)
    school_days = [
        key
        for n in range(1, d.day + 1)
        for key in [f"{d.year}-{d.month:02d}-{n:02d}"]
        if datetime(d.year, d.month, n).weekday() != 6
        or (
            marks_per_date.get(key, 0) > 0
            and marks_per_date[key] * 2 >= n_children
        )
    ]

    def month_pct(child_id: str) -> str:
        if not school_days:
            return "-"
        recs = month_records.get(child_id, {})
        got = sum(1 for k in school_days if recs.get(k) is True)
        return f"{round(got / len(school_days) * 100)}% ({got}/{len(school_days)})"

    total = len(children)
    present = sum(1 for c in children if day_records.get(c["id"]) is True)
    absent = sum(1 for c in children if day_records.get(c["id"]) is False)
    unmarked = total - present - absent
    pct = round(present / total * 100) if total else 0

    story = [
        Paragraph("VikasSetu &ndash; Aamchi Shala", h_brand),
        Paragraph("Daily Attendance Report", h_title),
        Paragraph(pretty, sub),
        Spacer(1, 6 * mm),
    ]

    summary = Table(
        [["Total children", "Present", "Absent", "Not marked", "Attendance"],
         [str(total), str(present), str(absent), str(unmarked), f"{pct}%"]],
        colWidths=[36 * mm] * 5,
    )
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#5F6B62")),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 16),
        ("TEXTCOLOR", (1, 1), (1, 1), PRESENT),
        ("TEXTCOLOR", (2, 1), (2, 1), ABSENT),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [summary, Spacer(1, 7 * mm)]

    rows = [["S.No.", "Child name", "Age", "Status", "This month"]]
    status_cols = []
    for i, c in enumerate(children, start=1):
        v = day_records.get(c["id"])
        status = "Present" if v is True else "Absent" if v is False else "Not marked"
        status_cols.append(status)
        rows.append([str(i), Paragraph(_esc(c["name"]), cell), str(c["age"]), status, month_pct(c["id"])])
    if not children:
        rows.append(["", "No children in class", "", "", ""])

    table = Table(rows, colWidths=[16 * mm, 70 * mm, 18 * mm, 36 * mm, 36 * mm], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ("ALIGN", (3, 0), (4, -1), "CENTER"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FBF8F0")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for r, status in enumerate(status_cols, start=1):
        color = PRESENT if status == "Present" else ABSENT if status == "Absent" else colors.HexColor("#8A8F88")
        style += [("TEXTCOLOR", (3, r), (3, r), color), ("FONTNAME", (3, r), (3, r), "Helvetica-Bold")]
    table.setStyle(TableStyle(style))
    story.append(table)

    generated = datetime.now(IST).strftime("%d %b %Y, %I:%M %p IST")

    def footer(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#5F6B62"))
        canvas.drawString(16 * mm, 10 * mm, f"Generated on {generated}")
        canvas.drawRightString(A4[0] - 16 * mm, 10 * mm, f"Page {doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()
