"""
Export API Routes: Generates institutional PDF performance reports and downloadable CSV trade logs.
"""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import io
import csv
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

router = APIRouter(prefix="/api/export", tags=["Export"])

class ExportPayload(BaseModel):
    strategy_name: str
    symbol: str
    summary: Dict[str, Any]
    risk_metrics: Dict[str, Any]
    trade_statistics: Dict[str, Any]
    trades: List[Dict[str, Any]]

@router.post("/csv")
def export_csv(payload: ExportPayload):
    """Generates and returns downloadable CSV trade log."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Trade ID", "Symbol", "Side", "Entry Date", "Exit Date",
        "Duration (Bars)", "Qty", "Entry Price", "Exit Price",
        "PnL ($)", "PnL (%)", "Commission ($)", "Slippage ($)"
    ])
    
    for t in payload.trades:
        writer.writerow([
            t.get("id", ""),
            t.get("symbol", payload.symbol),
            t.get("side", ""),
            t.get("entry_date", ""),
            t.get("exit_date", ""),
            t.get("duration_bars", 0),
            t.get("qty", 0.0),
            round(t.get("entry_price", 0.0), 2),
            round(t.get("exit_price", 0.0), 2),
            round(t.get("pnl", 0.0), 2),
            round(t.get("pnl_pct", 0.0), 2),
            round(t.get("commission", 0.0), 2),
            round(t.get("slippage", 0.0), 2)
        ])
        
    csv_content = output.getvalue()
    filename = f"ChronoTrade_TradeLog_{payload.strategy_name.replace(' ', '_')}_{payload.symbol}.csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/pdf")
def export_pdf(payload: ExportPayload):
    """Generates an institutional PDF performance report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=12
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=20
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=14,
        spaceAfter=8
    )
    normal_style = styles['Normal']
    
    elements = []
    
    # Title
    elements.append(Paragraph("CHRONOTRADE INSTITUTIONAL BACKTEST REPORT", title_style))
    elements.append(Paragraph(f"Strategy: <b>{payload.strategy_name}</b> | Asset: <b>{payload.symbol}</b> | Benchmark: <b>SPY</b>", subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Executive Summary Table
    elements.append(Paragraph("Executive Performance Metrics", section_heading))
    
    summary = payload.summary
    table_data = [
        ["Metric", "Value", "Metric", "Value"],
        ["Initial Equity", f"${summary.get('initial_equity', 10000):,.2f}", "CAGR", f"{summary.get('cagr_pct', 0):.2f}%"],
        ["Final Equity", f"${summary.get('final_equity', 10000):,.2f}", "Sharpe Ratio", f"{summary.get('sharpe_ratio', 0):.2f}"],
        ["Cumulative Return", f"{summary.get('cumulative_return_pct', 0):.2f}%", "Sortino Ratio", f"{summary.get('sortino_ratio', 0):.2f}"],
        ["Ann. Volatility", f"{summary.get('annualized_volatility_pct', 0):.2f}%", "Calmar Ratio", f"{summary.get('calmar_ratio', 0):.2f}"],
        ["Max Drawdown", f"{summary.get('max_drawdown_pct', 0):.2f}%", "Alpha (Annualized)", f"{summary.get('alpha', 0):.2f}"],
        ["Beta vs SPY", f"{summary.get('beta', 1):.2f}", "Information Ratio", f"{summary.get('information_ratio', 0):.2f}"]
    ]
    
    t_summary = Table(table_data, colWidths=[130, 130, 130, 130])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(t_summary)
    elements.append(Spacer(1, 15))
    
    # Risk Metrics Table
    elements.append(Paragraph("Value-at-Risk & Risk Exposure", section_heading))
    risk = payload.risk_metrics
    risk_table_data = [
        ["Risk Metric", "95% Confidence", "99% Confidence"],
        ["Historical VaR (Daily)", f"{risk.get('var_95_historical', 0)*100:.2f}%", f"{risk.get('var_99_historical', 0)*100:.2f}%"],
        ["Parametric VaR (Daily)", f"{risk.get('var_95_parametric', 0)*100:.2f}%", f"{risk.get('var_99_parametric', 0)*100:.2f}%"],
        ["Conditional VaR (CVaR / ES)", f"{risk.get('cvar_95', 0)*100:.2f}%", f"{risk.get('cvar_99', 0)*100:.2f}%"]
    ]
    t_risk = Table(risk_table_data, colWidths=[180, 170, 170])
    t_risk.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(t_risk)
    elements.append(Spacer(1, 15))
    
    # Trade Statistics Table
    elements.append(Paragraph("Trade Breakdown & Expectancy", section_heading))
    t_stats = payload.trade_statistics
    stats_data = [
        ["Total Trades", str(t_stats.get('total_trades', 0)), "Win Rate", f"{t_stats.get('win_rate', 0)*100:.1f}%"],
        ["Winning Trades", str(t_stats.get('winning_trades', 0)), "Profit Factor", f"{t_stats.get('profit_factor', 0):.2f}"],
        ["Losing Trades", str(t_stats.get('losing_trades', 0)), "Avg Trade Expectancy", f"${t_stats.get('expectancy', 0):,.2f}"],
        ["Max Win Streak", str(t_stats.get('max_consecutive_wins', 0)), "Max Loss Streak", str(t_stats.get('max_consecutive_losses', 0))],
        ["Total Commissions Paid", f"${t_stats.get('total_commissions_fees', 0):,.2f}", "Total Slippage Paid", f"${t_stats.get('total_slippage_cost', 0):,.2f}"]
    ]
    t_trade_stats = Table(stats_data, colWidths=[130, 130, 130, 130])
    t_trade_stats.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#475569')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    elements.append(t_trade_stats)
    
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    filename = f"ChronoTrade_Report_{payload.strategy_name.replace(' ', '_')}_{payload.symbol}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
