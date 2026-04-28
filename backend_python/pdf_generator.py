import os
import urllib.request
from fpdf import FPDF
from database import okrs_collection, big_tasks_collection, sub_tasks_collection, users_collection
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
        self.add_font("Roboto", "", "fonts/Roboto-Regular.ttf", uni=True)
        self.add_font("Roboto", "B", "fonts/Roboto-Bold.ttf", uni=True)

    def header(self):
        self.set_font("Roboto", "B", 16)
        self.set_text_color(30, 58, 138)  # #1e3a8a
        self.cell(0, 10, f"Báo Cáo Tổng Hợp Tuần {self.week} - Năm {self.year}", ln=True, align="C")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Roboto", "", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 10, f"Trang {self.page_no()}", align="C")

def generate_team_weekly_report(week: int, year: int) -> bytes:
    # Gather data
    tasks = list(sub_tasks_collection.find({}))
    
    # Filter tasks updated/relevant to this week (for simplicity, we group all tasks by assignee)
    # Ideally, we filter by updated_at or progress made, but since the requirement is 
    # "báo cáo của các thành viên cho vào 1 bản", we will group by assignee.
    
    assignee_tasks = defaultdict(list)
    for t in tasks:
        assignee = t.get("assignee", "Chưa gán")
        # Fetch parent BigTask and OKR to provide context
        bt = big_tasks_collection.find_one({"id": t.get("big_task_id")})
        okr_title = "Không xác định"
        bt_title = "Không xác định"
        if bt:
            bt_title = bt.get("title", "")
            okr = okrs_collection.find_one({"id": bt.get("okr_id")})
            if okr:
                okr_title = okr.get("title", "")
        
        assignee_tasks[assignee].append({
            "title": t.get("title", ""),
            "progress": t.get("progress", 0),
            "deadline": t.get("deadline", ""),
            "status": t.get("status", ""),
            "okr_title": okr_title,
            "bt_title": bt_title
        })

    # Sort assignees
    sorted_assignees = sorted(assignee_tasks.keys())

    pdf = PDFReport(week, year)
    pdf.add_page()
    
    if not sorted_assignees:
        pdf.set_font("Roboto", "", 12)
        pdf.cell(0, 10, "Không có dữ liệu công việc.", ln=True)
        return pdf.output(dest='S').encode('latin1')

    for assignee in sorted_assignees:
        # Member Header
        pdf.set_font("Roboto", "B", 14)
        pdf.set_text_color(37, 99, 235)  # #2563eb
        pdf.set_fill_color(241, 245, 249)  # bg-slate-100
        pdf.cell(0, 12, f"  Nhân sự: {assignee}", ln=True, fill=True)
        pdf.ln(2)
        
        member_tasks = assignee_tasks[assignee]
        # Group member tasks by OKR
        tasks_by_okr = defaultdict(list)
        for t in member_tasks:
            tasks_by_okr[t["okr_title"]].append(t)
            
        for okr_title, okr_tasks in tasks_by_okr.items():
            pdf.set_font("Roboto", "B", 11)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(0, 8, f"📌 Dự án (OKR): {okr_title}", ln=True)
            
            # Table Header
            pdf.set_font("Roboto", "B", 10)
            pdf.set_fill_color(226, 232, 240)
            pdf.cell(90, 8, "Tên công việc", border=1, fill=True)
            pdf.cell(40, 8, "Thuộc Plan", border=1, fill=True)
            pdf.cell(30, 8, "Hạn chót", border=1, align="C", fill=True)
            pdf.cell(30, 8, "Tiến độ", border=1, align="C", fill=True)
            pdf.ln()
            
            pdf.set_font("Roboto", "", 10)
            for t in okr_tasks:
                title = t["title"][:40] + ("..." if len(t["title"]) > 40 else "")
                bt_title = t["bt_title"][:20] + ("..." if len(t["bt_title"]) > 20 else "")
                
                pdf.cell(90, 8, title, border=1)
                pdf.cell(40, 8, bt_title, border=1)
                pdf.cell(30, 8, str(t["deadline"]), border=1, align="C")
                
                progress = float(t["progress"])
                if progress == 100:
                    pdf.set_text_color(22, 163, 74) # Green
                elif progress == 0:
                    pdf.set_text_color(225, 29, 72) # Red
                else:
                    pdf.set_text_color(217, 119, 6) # Orange
                    
                pdf.cell(30, 8, f"{progress}%", border=1, align="C")
                pdf.set_text_color(15, 23, 42) # Reset to black
                pdf.ln()
            pdf.ln(4)
        pdf.ln(5)

    return pdf.output(dest='S').encode('latin1')
