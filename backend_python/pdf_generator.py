import os
import urllib.request
from fpdf import FPDF
from database import okrs_collection, big_tasks_collection, sub_tasks_collection, users_collection, weekly_reports_collection
from collections import defaultdict
import tempfile

FONT_URL = "https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf"
FONT_BOLD_URL = "https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf"

def ensure_fonts():
    os.makedirs("fonts", exist_ok=True)
    if not os.path.exists("fonts/Roboto-Regular.ttf"):
        urllib.request.urlretrieve(FONT_URL, "fonts/Roboto-Regular.ttf")
    if not os.path.exists("fonts/Roboto-Bold.ttf"):
        urllib.request.urlretrieve(FONT_BOLD_URL, "fonts/Roboto-Bold.ttf")

class PDFReport(FPDF):
    def __init__(self, week, year):
        super().__init__()
        self.week = week
        self.year = year
        ensure_fonts()
        self.add_font("Roboto", "", "fonts/Roboto-Regular.ttf")
        self.add_font("Roboto", "B", "fonts/Roboto-Bold.ttf")

    def header(self):
        self.set_font("Roboto", "B", 16)
        self.set_text_color(30, 58, 138)  # #1e3a8a
        self.cell(w=0, h=10, text=f"Báo Cáo Tổng Hợp Tuần {self.week} - Năm {self.year}", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Roboto", "", 8)
        self.set_text_color(100, 116, 139)
        self.cell(w=0, h=10, text=f"Trang {self.page_no()}", align="C")

def generate_team_weekly_report(week: int, year: int) -> bytes:
    # Lấy danh sách các báo cáo tuần đã được nộp
    reports = list(weekly_reports_collection.find({"week_number": week, "year": year}))
    
    pdf = PDFReport(week, year)
    pdf.add_page()
    
    if not reports:
        pdf.set_font("Roboto", "", 12)
        pdf.cell(w=0, h=10, text="Chưa có báo cáo nào được nộp trong tuần này.", new_x="LMARGIN", new_y="NEXT")
        return bytes(pdf.output())

    # Sort reports by user_name safely handling None
    reports.sort(key=lambda r: r.get("user_name") or "")

    for report in reports:
        user_name = report.get("user_name") or "Không xác định"
        
        # Member Header
        pdf.set_font("Roboto", "B", 14)
        pdf.set_text_color(37, 99, 235)  # #2563eb
        pdf.set_fill_color(241, 245, 249)  # bg-slate-100
        pdf.cell(w=0, h=12, text=f"  Nhân sự: {user_name}", new_x="LMARGIN", new_y="NEXT", fill=True)
        pdf.ln(2)
        
        # 1. Công việc đã thực hiện
        done_tasks = report.get("done_tasks") or []
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(22, 163, 74) # Green
        pdf.cell(w=0, h=8, text="1. Công việc thực hiện trong tuần", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Roboto", "", 10)
        pdf.set_text_color(15, 23, 42)
        if not done_tasks:
            pdf.cell(w=0, h=6, text="  - Không có", new_x="LMARGIN", new_y="NEXT")
        else:
            for t in done_tasks:
                progress = t.get("progress", 0)
                bt_title = t.get("big_task_title", "Không có")
                pdf.multi_cell(w=pdf.epw, h=6, text=f"  - [{progress}%] {t.get('title', '')} (OBJ: {t.get('okr_title', '')} | Plan: {bt_title})")
        pdf.ln(2)

        # 2. Công việc ngoài OKR
        ad_hoc = report.get("ad_hoc_tasks") or []
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(217, 119, 6) # Orange
        pdf.cell(w=0, h=8, text="2. Công việc ngoài OKR", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Roboto", "", 10)
        pdf.set_text_color(15, 23, 42)
        if not ad_hoc:
            pdf.cell(w=0, h=6, text="  - Không có", new_x="LMARGIN", new_y="NEXT")
        else:
            for t in ad_hoc:
                pdf.multi_cell(w=pdf.epw, h=6, text=f"  - {t}")
        pdf.ln(2)

        # 3. Công việc đang triển khai
        doing_tasks = report.get("doing_tasks") or []
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(37, 99, 235) # Blue
        pdf.cell(w=0, h=8, text="3. Công việc đang triển khai", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Roboto", "", 10)
        pdf.set_text_color(15, 23, 42)
        if not doing_tasks:
            pdf.cell(w=0, h=6, text="  - Không có", new_x="LMARGIN", new_y="NEXT")
        else:
            for t in doing_tasks:
                progress = t.get("progress", 0)
                bt_title = t.get("big_task_title", "Không có")
                pdf.multi_cell(w=pdf.epw, h=6, text=f"  - [{progress}%] {t.get('title', '')} (OBJ: {t.get('okr_title', '')} | Plan: {bt_title})")
        pdf.ln(2)

        # 4. Khó khăn
        challenges = report.get("challenges") or ""
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(225, 29, 72) # Red
        pdf.cell(w=0, h=8, text="4. Khó khăn & Thách thức", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Roboto", "", 10)
        pdf.set_text_color(15, 23, 42)
        pdf.multi_cell(w=pdf.epw, h=6, text=challenges if challenges else "  - Không có")
        pdf.ln(2)

        # 5. Kế hoạch tuần tới
        next_plan = report.get("next_week_plan") or ""
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(w=0, h=8, text="5. Kế hoạch tuần tới", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Roboto", "", 10)
        pdf.multi_cell(w=pdf.epw, h=6, text=next_plan if next_plan else "  - Chưa lập kế hoạch")
        
        pdf.ln(8)

    return bytes(pdf.output())
