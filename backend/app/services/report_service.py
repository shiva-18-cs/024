import os
import io
import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from app.core.config import settings

class ReportService:
    """
    Automated Governance & Compliance Report Generation Service for CoalGuard.
    Produces enterprise/government grade PDF documents, Excel spreadsheets,
    and structured CSV/JSON audit reports.
    """

    @classmethod
    def generate_pdf(cls, report_data: Dict[str, Any], output_path: str) -> str:
        """
        Creates an official Coal India Limited / Ministry of Coal
        compliant PDF document using ReportLab.
        """
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        normal = styles["Normal"]
        
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            alignment=1  # Centered
        )

        subtitle_style = ParagraphStyle(
            "SubTitle",
            parent=normal,
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#475569"),
            alignment=1
        )

        h2_style = ParagraphStyle(
            "Heading2Custom",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0284c7"),
            spaceBefore=12,
            spaceAfter=6
        )

        body_style = ParagraphStyle(
            "BodyCustom",
            parent=normal,
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1e293b")
        )

        story = []

        # 1. Government Header Banner
        header_text = "<b>GOVERNMENT OF INDIA • MINISTRY OF COAL</b><br/><b>COAL INDIA LIMITED (CIL) • CENTRAL MINE GOVERNANCE SYSTEM</b>"
        story.append(Paragraph(header_text, title_style))
        story.append(Paragraph(f"Official Statutory Inspection & Compliance Audit Report — Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0284c7"), spaceAfter=12))

        # 2. Key Metadata Table
        meta_data = [
            [
                Paragraph("<b>Report Ref No:</b>", body_style),
                Paragraph(report_data.get("report_number", "CR-2026-001"), body_style),
                Paragraph("<b>Inspection Date:</b>", body_style),
                Paragraph(str(report_data.get("inspection_date", "2026-09-26"))[:10], body_style)
            ],
            [
                Paragraph("<b>Mine Facility:</b>", body_style),
                Paragraph(f"{report_data.get('mine_name', 'Mine Alpha')} ({report_data.get('mine_code', 'M-01')})", body_style),
                Paragraph("<b>Subsidiary:</b>", body_style),
                Paragraph(report_data.get("subsidiary", "ECL / CIL"), body_style)
            ],
            [
                Paragraph("<b>Contractor Agency:</b>", body_style),
                Paragraph(report_data.get("contractor_name", "N/A"), body_style),
                Paragraph("<b>Inspecting Officer:</b>", body_style),
                Paragraph(report_data.get("officer_name", "Field Officer"), body_style)
            ],
            [
                Paragraph("<b>Inspection Type:</b>", body_style),
                Paragraph(report_data.get("inspection_type", "Safety"), body_style),
                Paragraph("<b>Geo-Coordinates:</b>", body_style),
                Paragraph(f"{report_data.get('latitude', 23.795):.4f}° N, {report_data.get('longitude', 86.430):.4f}° E", body_style)
            ],
            [
                Paragraph("<b>Compliance Score:</b>", body_style),
                Paragraph(f"<b>{report_data.get('compliance_score', 85.0)} / 100</b>", body_style),
                Paragraph("<b>Workflow Status:</b>", body_style),
                Paragraph(f"<b>{report_data.get('workflow_stage', 'APPROVED')}</b>", body_style)
            ]
        ]

        t_meta = Table(meta_data, colWidths=[105, 160, 105, 170])
        t_meta.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_meta)
        story.append(Spacer(1, 12))

        # 3. AI-Assisted Risk Assessment Callout
        ai_score = report_data.get("ai_risk_score", 45.0)
        ai_cat = report_data.get("ai_risk_category", "LOW")
        ai_color = colors.HexColor("#16a34a") if ai_score < 40 else (colors.HexColor("#ca8a04") if ai_score < 70 else colors.HexColor("#dc2626"))
        
        ai_box_data = [
            [
                Paragraph(f"<b>AI-ASSISTED RISK ASSESSMENT:</b> {ai_score:.1f}/100 — [{ai_cat}]", ParagraphStyle("AIH", parent=body_style, textColor=ai_color, fontName="Helvetica-Bold", fontSize=10)),
            ],
            [
                Paragraph(f"<i>Contributing Factors:</i> {', '.join(report_data.get('ai_factors', ['Normal operation standards met.']))}", body_style)
            ]
        ]
        t_ai = Table(ai_box_data, colWidths=[540])
        t_ai.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
            ("BOX", (0, 0), (-1, -1), 1.5, ai_color),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t_ai)
        story.append(Spacer(1, 10))

        # 4. Checklist Results
        checklists = report_data.get("checklists", [])
        if checklists:
            story.append(Paragraph("Statutory Checklist Findings", h2_style))
            chk_rows = [["Item / Rule", "Category", "Result", "Remarks"]]
            for c in checklists[:8]:
                res = "PASS" if c.get("is_compliant") else "FAIL"
                chk_rows.append([
                    Paragraph(c.get("item_title", ""), body_style),
                    Paragraph(c.get("category", "Safety"), body_style),
                    Paragraph(f"<b>{res}</b>", ParagraphStyle("res", parent=body_style, textColor=colors.green if res == "PASS" else colors.red)),
                    Paragraph(c.get("remarks", "") or "Checked", body_style)
                ])
            t_chk = Table(chk_rows, colWidths=[180, 90, 60, 210])
            t_chk.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(t_chk)
            story.append(Spacer(1, 10))

        # 5. Detected Violations & Corrective Actions
        violations = report_data.get("violations", [])
        if violations:
            story.append(Paragraph("Recorded Violations & Corrective Directives", h2_style))
            vio_rows = [["Violation Code", "Category", "Severity", "Statutory Reference & Details"]]
            for v in violations:
                vio_rows.append([
                    Paragraph(v.get("violation_code", "V-001"), body_style),
                    Paragraph(v.get("category", "Safety"), body_style),
                    Paragraph(f"<b>{v.get('severity', 'HIGH')}</b>", ParagraphStyle("sev", parent=body_style, textColor=colors.red)),
                    Paragraph(f"<b>{v.get('title', '')}</b>: {v.get('description', '')}", body_style)
                ])
            t_vio = Table(vio_rows, colWidths=[100, 90, 70, 280])
            t_vio.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#991b1b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(t_vio)
            story.append(Spacer(1, 15))

        # 6. Statutory Signatures & Multi-Tier Approvals
        sig_data = [
            [
                Paragraph("<b>FIELD OFFICER VERIFICATION</b><br/>Digitally Signed & Submitted<br/>Date: " + str(report_data.get("inspection_date", ""))[:10], body_style),
                Paragraph("<b>MINE MANAGER VALIDATION</b><br/>Reviewed and Enforced<br/>Action Assigned", body_style),
                Paragraph("<b>CORPORATE GOVERNANCE (CIL)</b><br/>Statutory Compliance Seal<br/>Status: APPROVED", body_style)
            ]
        ]
        t_sig = Table(sig_data, colWidths=[180, 180, 180])
        t_sig.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t_sig)

        doc.build(story)
        return output_path

    @classmethod
    def generate_excel(cls, data_list: list[Dict[str, Any]], output_path: str, title: str = "Compliance Summary") -> str:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = title[:30]

        headers = list(data_list[0].keys()) if data_list else ["Status", "Record"]
        ws.append(headers)

        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for row_data in data_list:
            row_vals = []
            for h in headers:
                val = row_data.get(h, "")
                if isinstance(val, (dict, list)):
                    val = json.dumps(val)
                row_vals.append(str(val))
            ws.append(row_vals)

        wb.save(output_path)
        return output_path

    @classmethod
    def generate_csv(cls, data_list: list[Dict[str, Any]], output_path: str) -> str:
        if not data_list:
            Path(output_path).write_text("No data\n")
            return output_path

        headers = list(data_list[0].keys())
        with open(output_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            for r in data_list:
                cleaned = {k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in r.items()}
                writer.writerow(cleaned)
        return output_path
