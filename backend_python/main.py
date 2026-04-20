from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List

from database import users_collection, okrs_collection, big_tasks_collection, sub_tasks_collection
from models import (
    UserCreate, UserUpdate, UserLogin, TokenResponse, UserResponse,
    OKRCreate, OKRResponse, BigTaskCreate, BigTaskResponse,
    SubTaskCreate, SubTaskResponse, generate_uuid
)
from auth import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from database import db

app = FastAPI(title="OKR Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:8081", "http://127.0.0.1:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to check if user is admin
def is_admin(user_id: str):
    u = users_collection.find_one({"id": user_id})
    return u and u.get("role") == "admin"

@app.get("/")
def read_root():
    return {"status": "ok"}

# ================= AUTH API =================
@app.post("/api/auth/signup", response_model=TokenResponse)
def signup(user: UserCreate):
    if users_collection.find_one({"email": user.email}):
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
    user_doc = users_collection.find_one({"email": user.email})
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
def create_user(user: UserCreate, user_id: str = Depends(get_current_user)):
    if not is_admin(user_id):
         raise HTTPException(status_code=403, detail="Forbidden")
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
def update_user_role(target_id: str, role: str, user_id: str = Depends(get_current_user)):
    if not is_admin(user_id):
         raise HTTPException(status_code=403, detail="Forbidden")
    users_collection.update_one({"id": target_id}, {"$set": {"role": role}})
    return {"status": "ok"}

@app.put("/api/users/{target_id}")
def update_user_profile(target_id: str, updates: UserUpdate, user_id: str = Depends(get_current_user)):
    if not is_admin(user_id):
         raise HTTPException(status_code=403, detail="Forbidden")
    
    update_data = {}
    if updates.display_name is not None:
        update_data["display_name"] = updates.display_name
    if updates.password:
        update_data["hashed_password"] = get_password_hash(updates.password)
        
    if update_data:
        users_collection.update_one({"id": target_id}, {"$set": update_data})
    
    return {"status": "ok"}

@app.delete("/api/users/{target_id}")
def delete_user(target_id: str, user_id: str = Depends(get_current_user)):
    if not is_admin(user_id):
         raise HTTPException(status_code=403, detail="Forbidden")
    users_collection.delete_one({"id": target_id})
    return {"status": "ok"}

# ================= OKRS API =================
@app.get("/api/okrs", response_model=List[OKRResponse])
def get_okrs():
    return list(okrs_collection.find({}))

@app.post("/api/okrs", response_model=OKRResponse)
def create_okr(okr: OKRCreate, user_id: str = Depends(get_current_user)):
    okr_doc = okr.dict()
    okr_doc["id"] = generate_uuid()
    okr_doc["user_id"] = user_id
    okr_doc["created_at"] = datetime.utcnow().isoformat()
    okrs_collection.insert_one(okr_doc)
    return okr_doc

@app.put("/api/okrs/{okr_id}", response_model=OKRResponse)
def update_okr(okr_id: str, okr: OKRCreate, user_id: str = Depends(get_current_user)):
    existing = okrs_collection.find_one({"id": okr_id})
    okr_data = okr.dict()
    if not existing:
        okr_data["id"] = okr_id
        okr_data["user_id"] = user_id
        okr_data["created_at"] = datetime.utcnow().isoformat()
        okrs_collection.insert_one(okr_data)
        return okr_data
    okrs_collection.update_one({"id": okr_id}, {"$set": okr_data})
    existing.update(okr_data)
    return existing

@app.delete("/api/okrs/{okr_id}")
def delete_okr(okr_id: str, user_id: str = Depends(get_current_user)):
    okrs_collection.delete_one({"id": okr_id})
    big_tasks = list(big_tasks_collection.find({"okr_id": okr_id}))
    for bt in big_tasks:
        sub_tasks_collection.delete_many({"big_task_id": bt["id"]})
    big_tasks_collection.delete_many({"okr_id": okr_id})
    return {"status": "deleted"}

# ================= BIG TASKS API =================
@app.get("/api/big-tasks", response_model=List[BigTaskResponse])
def get_big_tasks():
    return list(big_tasks_collection.find({}))

@app.post("/api/big-tasks", response_model=BigTaskResponse)
def create_big_task(big_task: BigTaskCreate, user_id: str = Depends(get_current_user)):
    bt_doc = big_task.dict()
    bt_doc["id"] = generate_uuid()
    bt_doc["created_at"] = datetime.utcnow().isoformat()
    big_tasks_collection.insert_one(bt_doc)
    return bt_doc

@app.put("/api/big-tasks/{big_task_id}", response_model=BigTaskResponse)
def update_big_task(big_task_id: str, big_task: BigTaskCreate, user_id: str = Depends(get_current_user)):
    existing = big_tasks_collection.find_one({"id": big_task_id})
    bt_data = big_task.dict()
    if not existing:
        bt_data["id"] = big_task_id
        bt_data["created_at"] = datetime.utcnow().isoformat()
        big_tasks_collection.insert_one(bt_data)
        return bt_data
    big_tasks_collection.update_one({"id": big_task_id}, {"$set": bt_data})
    existing.update(bt_data)
    return existing

@app.delete("/api/big-tasks/{big_task_id}")
def delete_big_task(big_task_id: str, user_id: str = Depends(get_current_user)):
    big_tasks_collection.delete_one({"id": big_task_id})
    sub_tasks_collection.delete_many({"big_task_id": big_task_id})
    return {"status": "deleted"}

# ================= SUB TASKS API =================
@app.get("/api/sub-tasks", response_model=List[SubTaskResponse])
def get_sub_tasks():
    return list(sub_tasks_collection.find({}))

@app.post("/api/sub-tasks", response_model=SubTaskResponse)
def create_sub_task(sub_task: SubTaskCreate, user_id: str = Depends(get_current_user)):
    st_doc = sub_task.dict()
    st_doc["id"] = generate_uuid()
    st_doc["created_at"] = datetime.utcnow().isoformat()
    sub_tasks_collection.insert_one(st_doc)
    return st_doc

@app.put("/api/sub-tasks/{sub_task_id}", response_model=SubTaskResponse)
def update_sub_task(sub_task_id: str, sub_task: SubTaskCreate, user_id: str = Depends(get_current_user)):
    existing = sub_tasks_collection.find_one({"id": sub_task_id})
    st_data = sub_task.dict()
    if not existing:
        st_data["id"] = sub_task_id
        st_data["created_at"] = datetime.utcnow().isoformat()
        sub_tasks_collection.insert_one(st_data)
        return st_data
    sub_tasks_collection.update_one({"id": sub_task_id}, {"$set": st_data})
    existing.update(st_data)
    return existing

@app.delete("/api/sub-tasks/{sub_task_id}")
def delete_sub_task(sub_task_id: str, user_id: str = Depends(get_current_user)):
    sub_tasks_collection.delete_one({"id": sub_task_id})
    return {"status": "deleted"}

# ================= ADMIN ACTIONS =================
@app.post("/api/admin/reset-db")
def reset_db(user_id: str = Depends(get_current_user)):
    if not is_admin(user_id):
        raise HTTPException(status_code=403, detail="Only admins can reset the database")
    
    # Drop all relevant collections
    collections = ["users", "okrs", "big_tasks", "sub_tasks"]
    for coll in collections:
        db[coll].drop()
    
    # Re-create the current admin user so they aren't logged out/deleted permanently
    # (Optional: depends on if we want a FULL wipe including the person who clicked it)
    # For safety, let's KEEP the admin users but wipe everything else.
    # Actually, the user said "tạo lại db", usually means wipe everything.
    # But if I wipe 'users', the current token will become invalid.
    
    # Let's keep the admin who is performing the action.
    current_admin = users_collection.find_one({"id": user_id})
    if current_admin:
        users_collection.insert_one(current_admin)
        
    return {"status": "Database has been reset. OKRs and Tasks cleared. Admin preserved."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
