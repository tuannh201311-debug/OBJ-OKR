import re
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
import os
import shutil
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from database import users_collection, okrs_collection, big_tasks_collection, sub_tasks_collection, weekly_reports_collection
from models import (
    UserCreate, UserUpdate, UserLogin, TokenResponse, UserResponse,
    OKRCreate, OKRResponse, BigTaskCreate, BigTaskResponse,
    SubTaskCreate, SubTaskResponse, generate_uuid,
    WeeklyReportCreate, WeeklyReportResponse
)
from auth import (
    get_password_hash, verify_password, create_access_token, get_current_user, get_admin_user
)
from database import db
from telegram_bot import start_telegram_polling, send_telegram_message

start_telegram_polling()

app = FastAPI(title="OKR Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:8081", "http://127.0.0.1:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/api/upload")
def upload_file(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    base, ext = os.path.splitext(file.filename)
    unique_filename = f"{base}_{generate_uuid()[:8]}{ext}"
    file_location = f"uploads/{unique_filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    return {"url": f"/uploads/{unique_filename}", "name": file.filename}


@app.get("/")
def read_root():
    return {"status": "ok"}

# ================= AUTH API =================
@app.post("/api/auth/signup", response_model=TokenResponse)
def signup(user: UserCreate):
    # Case-insensitive check for existing email
    if users_collection.find_one({"email": {"$regex": f"^{re.escape(user.email)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_uuid()
    hashed_password = get_password_hash(user.password)
    role = "admin" if users_collection.count_documents({}) == 0 else "user"

    user_doc = {
        "id": user_id,
        "email": user.email,
        "hashed_password": hashed_password,
        "display_name": user.display_name,
        "role": role
    }
    users_collection.insert_one(user_doc)
    
    access_token = create_access_token(data={"sub": user_id})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"id": user_id, "email": user.email, "display_name": user.display_name, "role": role}
    }

@app.post("/api/auth/login", response_model=TokenResponse)
def login(user: UserLogin):
    # Case-insensitive search for email
    user_doc = users_collection.find_one({"email": {"$regex": f"^{re.escape(user.email)}$", "$options": "i"}})
    if not user_doc or not verify_password(user.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user_doc["id"]})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user_doc["id"], 
            "email": user_doc["email"], 
            "display_name": user_doc.get("display_name"), 
            "role": user_doc.get("role", "user")
        }
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(user_id: str = Depends(get_current_user)):
    user_doc = users_collection.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user_doc["id"], 
        "email": user_doc["email"], 
        "display_name": user_doc.get("display_name"), 
        "role": user_doc.get("role", "user")
    }

# ================= USERS API =================
@app.get("/api/users", response_model=List[UserResponse])
def get_users():
    users = list(users_collection.find({}))
    return [{"id": u["id"], "email": u["email"], "display_name": u.get("display_name"), "role": u.get("role", "user")} for u in users]

@app.post("/api/users", response_model=UserResponse)
def create_user(user: UserCreate, admin_id: str = Depends(get_admin_user)):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email exists")
    
    new_id = generate_uuid()
    users_collection.insert_one({
        "id": new_id,
        "email": user.email,
        "hashed_password": get_password_hash(user.password),
        "display_name": user.display_name,
        "role": "user"
    })
    return {"id": new_id, "email": user.email, "display_name": user.display_name, "role": "user"}

@app.put("/api/users/{target_id}/role")
def update_user_role(target_id: str, role: str, user_id: str = Depends(get_admin_user)):
    users_collection.update_one({"id": target_id}, {"$set": {"role": role}})
    return {"status": "ok"}

@app.put("/api/users/{target_id}")
def update_user_profile(target_id: str, updates: UserUpdate, user_id: str = Depends(get_admin_user)):
    update_data = {}
    if updates.display_name is not None:
        update_data["display_name"] = updates.display_name
    if updates.password:
        update_data["hashed_password"] = get_password_hash(updates.password)
        
    if update_data:
        users_collection.update_one({"id": target_id}, {"$set": update_data})
    
    return {"status": "ok"}

@app.delete("/api/users/{target_id}")
def delete_user(target_id: str, user_id: str = Depends(get_admin_user)):
    users_collection.delete_one({"id": target_id})
    return {"status": "ok"}

# ================= OKRS API =================
@app.get("/api/okrs", response_model=List[OKRResponse])
def get_okrs():
    return [{**o, "_id": str(o["_id"])} for o in okrs_collection.find({})]

@app.post("/api/okrs", response_model=OKRResponse)
def create_okr(okr: OKRCreate, user_id: str = Depends(get_admin_user)):
    okr_doc = okr.dict()
    if not okr_doc.get("id"):
        okr_doc["id"] = generate_uuid()
    okr_doc["user_id"] = user_id
    okr_doc["created_at"] = datetime.utcnow().isoformat()
    if okr_doc.get("progress") == 100:
        okr_doc["completed_at"] = datetime.utcnow().isoformat()
    okrs_collection.insert_one(okr_doc)
    okr_doc["_id"] = str(okr_doc["_id"])
    return okr_doc

@app.put("/api/okrs/{okr_id}", response_model=OKRResponse)
def update_okr(okr_id: str, okr: OKRCreate, user_id: str = Depends(get_admin_user)):
    existing = okrs_collection.find_one({"id": okr_id})
    okr_data = okr.dict()
    if not existing:
        okr_data["id"] = okr_id
        okr_data["user_id"] = user_id
        okr_data["created_at"] = datetime.utcnow().isoformat()
        if okr_data.get("progress") == 100:
            okr_data["completed_at"] = datetime.utcnow().isoformat()
        okrs_collection.insert_one(okr_data)
        return okr_data
    
    if okr_data.get("progress") == 100 and existing.get("progress", 0) < 100:
        okr_data["completed_at"] = datetime.utcnow().isoformat()
    elif okr_data.get("progress", 0) < 100:
        okr_data["completed_at"] = None
        
    okrs_collection.update_one({"id": okr_id}, {"$set": okr_data})
    existing.update(okr_data)
    if "_id" in existing:
        existing["_id"] = str(existing["_id"])
    return existing

class ReorderItem(BaseModel):
    id: str
    order: int

@app.post("/api/okrs/reorder")
def reorder_okrs(items: List[ReorderItem], user_id: str = Depends(get_admin_user)):
    for item in items:
        okrs_collection.update_one({"id": item.id}, {"$set": {"order": item.order}})
    return {"status": "ok"}


@app.delete("/api/okrs/{okr_id}")
def delete_okr(okr_id: str, user_id: str = Depends(get_admin_user)):
    okrs_collection.delete_one({"id": okr_id})
    big_tasks = list(big_tasks_collection.find({"okr_id": okr_id}))
    for bt in big_tasks:
        sub_tasks_collection.delete_many({"big_task_id": bt["id"]})
    big_tasks_collection.delete_many({"okr_id": okr_id})
    return {"status": "deleted"}

# ================= BIG TASKS API =================
@app.get("/api/big-tasks", response_model=List[BigTaskResponse])
def get_big_tasks():
    return [{**bt, "_id": str(bt["_id"])} for bt in big_tasks_collection.find({})]

@app.post("/api/big-tasks", response_model=BigTaskResponse)
def create_big_task(big_task: BigTaskCreate, user_id: str = Depends(get_admin_user)):
    bt_doc = big_task.dict()
    if not bt_doc.get("id"):
        bt_doc["id"] = generate_uuid()
    bt_doc["created_at"] = datetime.utcnow().isoformat()
    if bt_doc.get("progress") == 100:
        bt_doc["completed_at"] = datetime.utcnow().isoformat()
    big_tasks_collection.insert_one(bt_doc)
    bt_doc["_id"] = str(bt_doc["_id"])
    return bt_doc

@app.put("/api/big-tasks/{big_task_id}", response_model=BigTaskResponse)
def update_big_task(big_task_id: str, big_task: BigTaskCreate, user_id: str = Depends(get_admin_user)):
    existing = big_tasks_collection.find_one({"id": big_task_id})
    bt_data = big_task.dict()
    if not existing:
        bt_data["id"] = big_task_id
        bt_data["created_at"] = datetime.utcnow().isoformat()
        if bt_data.get("progress") == 100:
            bt_data["completed_at"] = datetime.utcnow().isoformat()
        big_tasks_collection.insert_one(bt_data)
        return bt_data
    
    if bt_data.get("progress") == 100 and existing.get("progress", 0) < 100:
        bt_data["completed_at"] = datetime.utcnow().isoformat()
    elif bt_data.get("progress", 0) < 100:
        bt_data["completed_at"] = None

    big_tasks_collection.update_one({"id": big_task_id}, {"$set": bt_data})
    existing.update(bt_data)
    if "_id" in existing:
        existing["_id"] = str(existing["_id"])
    return existing

@app.delete("/api/big-tasks/{big_task_id}")
def delete_big_task(big_task_id: str, user_id: str = Depends(get_admin_user)):
    big_tasks_collection.delete_one({"id": big_task_id})
    sub_tasks_collection.delete_many({"big_task_id": big_task_id})
    return {"status": "deleted"}

# ================= SUB TASKS API =================
@app.get("/api/sub-tasks", response_model=List[SubTaskResponse])
def get_sub_tasks():
    return [{**st, "_id": str(st["_id"])} for st in sub_tasks_collection.find({})]

@app.post("/api/sub-tasks", response_model=SubTaskResponse)
def create_sub_task(sub_task: SubTaskCreate, user_id: str = Depends(get_admin_user)):
    st_doc = sub_task.dict()
    if not st_doc.get("id"):
        st_doc["id"] = generate_uuid()
    st_doc["created_at"] = datetime.utcnow().isoformat()
    if st_doc.get("progress") == 100:
        st_doc["completed_at"] = datetime.utcnow().isoformat()
    sub_tasks_collection.insert_one(st_doc)
    st_doc["_id"] = str(st_doc["_id"])
    
    # Send Telegram notification
    assignee = st_doc.get("assignee", "Chưa gán")
    title = st_doc.get("title", "")
    deadline = st_doc.get("deadline", "")
    
    # Lấy thông tin OKR (Objective)
    okr_title = "Không xác định"
    bt = big_tasks_collection.find_one({"id": st_doc.get("big_task_id")})
    if bt:
        okr = okrs_collection.find_one({"id": bt.get("okr_id")})
        if okr:
            okr_title = okr.get("title", "Không xác định")
            
    msg = f"🆕 <b>CÓ VIỆC MỚI ĐƯỢC GIAO</b>\n\n🎯 <b>Dự án (OKR):</b> {okr_title}\n📌 <b>Công việc:</b> {title}\n👤 <b>Người phụ trách:</b> {assignee}\n⏰ <b>Hạn chót:</b> {deadline}\n\nHãy vào hệ thống để xem chi tiết!"
    send_telegram_message(msg)
    
    return st_doc

@app.put("/api/sub-tasks/{sub_task_id}", response_model=SubTaskResponse)
def update_sub_task(sub_task_id: str, sub_task: SubTaskCreate, user_id: str = Depends(get_admin_user)):
    existing = sub_tasks_collection.find_one({"id": sub_task_id})
    st_data = sub_task.dict()
    if not existing:
        st_data["id"] = sub_task_id
        st_data["created_at"] = datetime.utcnow().isoformat()
        if st_data.get("progress") == 100:
            st_data["completed_at"] = datetime.utcnow().isoformat()
        sub_tasks_collection.insert_one(st_data)
        
        # Send Telegram notification for upserted task
        assignee = st_data.get("assignee", "Chưa gán")
        title = st_data.get("title", "")
        deadline = st_data.get("deadline", "")
        
        # Lấy thông tin OKR (Objective)
        okr_title = "Không xác định"
        bt = big_tasks_collection.find_one({"id": st_data.get("big_task_id")})
        if bt:
            okr = okrs_collection.find_one({"id": bt.get("okr_id")})
            if okr:
                okr_title = okr.get("title", "Không xác định")
                
        msg = f"🆕 <b>CÓ VIỆC MỚI ĐƯỢC GIAO</b>\n\n🎯 <b>Dự án (OKR):</b> {okr_title}\n📌 <b>Công việc:</b> {title}\n👤 <b>Người phụ trách:</b> {assignee}\n⏰ <b>Hạn chót:</b> {deadline}\n\nHãy vào hệ thống để xem chi tiết!"
        send_telegram_message(msg)
        
        return st_data
    
    if st_data.get("progress") == 100 and existing.get("progress", 0) < 100:
        st_data["completed_at"] = datetime.utcnow().isoformat()
    elif st_data.get("progress", 0) < 100:
        st_data["completed_at"] = None

    sub_tasks_collection.update_one({"id": sub_task_id}, {"$set": st_data})
    existing.update(st_data)
    if "_id" in existing:
        existing["_id"] = str(existing["_id"])
    return existing

@app.delete("/api/sub-tasks/{sub_task_id}")
def delete_sub_task(sub_task_id: str, user_id: str = Depends(get_admin_user)):
    sub_tasks_collection.delete_one({"id": sub_task_id})
    return {"status": "deleted"}


# ================= WEEKLY REPORTS API =================
@app.get("/api/reports/suggested-tasks")
def get_suggested_tasks(week: int, year: int, user_id: str = Depends(get_current_user)):
    user_doc = users_collection.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    display_name = user_doc.get("display_name", "")
    if not display_name:
        return {"done": [], "doing": []}

    # Find tasks assigned to this user
    # We look for the name anywhere in the comma-separated string
    query = {"assignee": {"$regex": f"\\b{re.escape(display_name)}\\b", "$options": "i"}}
    all_sts = list(sub_tasks_collection.find(query))
    
    done = []
    doing = []
    
    for st in all_sts:
        # Check if deadline matches the week/year (optional but helpful)
        # For now, let's include tasks that are 'Doing' or were 'Done' (anytime)
        # But prioritize those with deadlines in the selected week if we can.
        
        bt = big_tasks_collection.find_one({"id": st["big_task_id"]})
        okr_title = "Unknown OKR"
        if bt:
            okr = okrs_collection.find_one({"id": bt["okr_id"]})
            if okr:
                okr_title = okr["title"]
        
        task_info = {"id": st["id"], "title": st["title"], "okr_title": okr_title, "deadline": st.get("deadline")}
        
        if st.get("progress") == 100:
            done.append(task_info)
        else:
            doing.append(task_info)
            
    return {"done": done, "doing": doing}

@app.get("/api/reports/my-report", response_model=Optional[WeeklyReportResponse])
def get_my_report(week: int, year: int, user_id: str = Depends(get_current_user)):
    report = weekly_reports_collection.find_one({"user_id": user_id, "week_number": week, "year": year})
    if not report:
        return None
    report["_id"] = str(report["_id"])
    return report

@app.post("/api/reports", response_model=WeeklyReportResponse)
def submit_report(report: WeeklyReportCreate, user_id: str = Depends(get_current_user)):
    user_doc = users_collection.find_one({"id": user_id})
    
    existing = weekly_reports_collection.find_one({
        "user_id": user_id, 
        "week_number": report.week_number, 
        "year": report.year
    })
    
    report_data = report.dict()
    report_data["user_id"] = user_id
    report_data["user_name"] = user_doc.get("display_name") if user_doc else "Unknown"
    report_data["submitted_at"] = datetime.utcnow().isoformat()
    
    if existing:
        weekly_reports_collection.update_one({"id": existing["id"]}, {"$set": report_data})
        report_data["id"] = existing["id"]
    else:
        report_data["id"] = generate_uuid()
        weekly_reports_collection.insert_one(report_data)
        report_data["_id"] = str(report_data["_id"])
        
    return report_data

@app.get("/api/reports/team", response_model=List[WeeklyReportResponse])
def get_team_reports(week: int, year: int, user_id: str = Depends(get_admin_user)):
    reports = list(weekly_reports_collection.find({"week_number": week, "year": year}))
    for r in reports:
        r["_id"] = str(r["_id"])
    return reports

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
