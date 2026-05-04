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
        # Logo placeholder space
        self.set_font("Roboto", "B", 20)
        self.set_text_color(30, 58, 138)  # Deep blue
        self.cell(w=0, h=15, text="OKR MANAGEMENT SYSTEM", align="C", new_x="LMARGIN", new_y="NEXT")
        
        self.set_font("Roboto", "", 12)
        self.set_text_color(100, 116, 139) # Slate
        self.cell(w=0, h=8, text=f"BÁO CÁO TỔNG HỢP CHI TIẾT - TUẦN {self.week} / {self.year}", align="C", new_x="LMARGIN", new_y="NEXT")
        
        # Divider line
        self.set_draw_color(226, 232, 240)
        self.line(10, 35, 200, 35)
        self.ln(10)

    def footer(self):
        self.set_y(-20)
        self.set_draw_color(226, 232, 240)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)
        self.set_font("Roboto", "", 9)
        self.set_text_color(148, 163, 184)
        self.cell(w=0, h=10, text=f"Hệ thống Quản trị OKR - Trang {self.page_no()}", align="C")

def generate_team_weekly_report(week: int, year: int) -> bytes:
    # Lấy danh sách các báo cáo tuần đã được nộp
    reports = list(weekly_reports_collection.find({"week_number": week, "year": year}))
    
    pdf = PDFReport(week, year)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    
    if not reports:
        pdf.set_font("Roboto", "", 12)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(w=0, h=20, text="Chưa có dữ liệu báo cáo nào được nộp trong tuần này.", align="C", new_x="LMARGIN", new_y="NEXT")
        return bytes(pdf.output())

    # Summary Stats Banner
    pdf.set_font("Roboto", "B", 12)
    pdf.set_text_color(30, 58, 138)
    pdf.set_fill_color(248, 250, 252)
    pdf.set_x(10)
    pdf.cell(w=pdf.epw, h=12, text=f" TỔNG HỢP: {len(reports)} NHÂN SỰ ĐÃ NỘP BÁO CÁO", border=0, new_x="LMARGIN", new_y="NEXT", fill=True, align="L")
    pdf.ln(5)

    # Sort reports by user_name safely
    reports.sort(key=lambda r: r.get("user_name") or "")

    for report in reports:
        user_name = report.get("user_name") or "Không xác định"
        
        # User Header Block
        pdf.set_font("Roboto", "B", 14)
        pdf.set_text_color(255, 255, 255)
        pdf.set_fill_color(37, 99, 235) # Royal Blue
        pdf.set_x(10)
        pdf.cell(w=pdf.epw, h=12, text=f"  NHÂN SỰ: {user_name.upper()}", new_x="LMARGIN", new_y="NEXT", fill=True)
        pdf.ln(4)
        
        # 1. OKR Tasks
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(22, 163, 74) # Green
        pdf.set_x(10)
        pdf.cell(w=pdf.epw, h=8, text=">>> 1. CÔNG VIỆC HOÀN THÀNH (OKR)", new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(22, 163, 74)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        
        done_tasks = report.get("done_tasks") or []
        pdf.set_font("Roboto", "", 10)
        pdf.set_text_color(15, 23, 42)
        if not done_tasks:
            pdf.set_x(10)
            pdf.cell(w=pdf.epw, h=6, text="   (Không có công việc nào được chọn)", new_x="LMARGIN", new_y="NEXT")
        else:
            for t in done_tasks:
                pdf.set_x(10)
                # Header with percentage
                pdf.set_font("Roboto", "B", 10)
                progress = t.get('progress', 0)
                pdf.multi_cell(w=pdf.epw, h=6, text=f"  [{progress}%] {t.get('title', '')}")
                
                # Context info
                pdf.set_x(10)
                pdf.set_font("Roboto", "", 9)
                pdf.set_text_color(100, 116, 139)
                okr_t = t.get('okr_title', 'N/A')
                plan_t = t.get('big_task_title', 'N/A')
                pdf.multi_cell(w=pdf.epw, h=5, text=f"      • OBJ: {okr_t} | Plan: {plan_t}")
                pdf.set_text_color(15, 23, 42)
                pdf.ln(1)
        pdf.ln(3)

        # 2. Ad-hoc Tasks
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(217, 119, 6) # Amber
        pdf.set_x(10)
        pdf.cell(w=pdf.epw, h=8, text=">>> 2. CÔNG VIỆC PHÁT SINH (AD-HOC)", new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(217, 119, 6)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        
        ad_hoc = report.get("ad_hoc_tasks") or []
        pdf.set_font("Roboto", "", 10)
        if not ad_hoc:
            pdf.set_x(10)
            pdf.cell(w=pdf.epw, h=6, text="   (Không có công việc phát sinh)", new_x="LMARGIN", new_y="NEXT")
        else:
            for t in ad_hoc:
                pdf.set_x(10)
                pdf.multi_cell(w=pdf.epw, h=6, text=f"  • {t}")
        pdf.ln(3)

        # 3. Doing Tasks
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(37, 99, 235) # Blue
        pdf.set_x(10)
        pdf.cell(w=pdf.epw, h=8, text=">>> 3. TIẾN ĐỘ ĐANG TRIỂN KHAI", new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(37, 99, 235)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        
        doing_tasks = report.get("doing_tasks") or []
        if not doing_tasks:
            pdf.set_x(10)
            pdf.cell(w=pdf.epw, h=6, text="   (Không có công việc đang triển khai)", new_x="LMARGIN", new_y="NEXT")
        else:
            for t in doing_tasks:
                pdf.set_x(10)
                pdf.set_font("Roboto", "B", 10)
                progress = t.get('progress', 0)
                pdf.multi_cell(w=pdf.epw, h=6, text=f"  [{progress}%] {t.get('title', '')}")
                
                pdf.set_x(10)
                pdf.set_font("Roboto", "", 9)
                pdf.set_text_color(100, 116, 139)
                okr_t = t.get('okr_title', 'N/A')
                plan_t = t.get('big_task_title', 'N/A')
                pdf.multi_cell(w=pdf.epw, h=5, text=f"      • OBJ: {okr_t} | Plan: {plan_t}")
                pdf.set_text_color(15, 23, 42)
                pdf.ln(1)
        pdf.ln(3)

        # 4. Challenges
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(225, 29, 72) # Rose
        pdf.set_x(10)
        pdf.cell(w=pdf.epw, h=8, text=">>> 4. KHÓ KHĂN & KIẾN NGHỊ", new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(225, 29, 72)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        
        challenges = report.get("challenges") or ""
        pdf.set_x(10)
        pdf.set_font("Roboto", "", 10)
        pdf.multi_cell(w=pdf.epw, h=6, text=f"   {challenges if challenges.strip() else '(Không có khó khăn)'}")
        pdf.ln(3)

        # 5. Next Week Plan
        pdf.set_font("Roboto", "B", 11)
        pdf.set_text_color(71, 85, 105) # Slate
        pdf.set_x(10)
        pdf.cell(w=pdf.epw, h=8, text=">>> 5. KẾ HOẠCH TUẦN KẾ TIẾP", new_x="LMARGIN", new_y="NEXT")
        pdf.set_draw_color(71, 85, 105)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        
        next_plan = report.get("next_week_plan") or ""
        pdf.set_x(10)
        pdf.set_font("Roboto", "", 10)
        pdf.multi_cell(w=pdf.epw, h=6, text=f"   {next_plan if next_plan.strip() else '(Chưa có kế hoạch cụ thể)'}")
        
        pdf.ln(15)
        # Decorative separator
        pdf.set_draw_color(241, 245, 249)
        pdf.set_x(10)
        pdf.cell(w=pdf.epw, h=0, text="", border="T", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

    return bytes(pdf.output())
