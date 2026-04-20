import os
from pymongo import MongoClient
from dotenv import load_dotenv
import uuid
from auth import get_password_hash

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "okr_app")

def recreate_database():
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    
    print(f"Connecting to database: {DATABASE_NAME}")
    
    # Save admins first
    users_collection = db["users"]
    admins = list(users_collection.find({"role": "admin"}))
    
    # List of collections to drop
    collections = ["users", "user_roles", "okrs", "big_tasks", "sub_tasks"]
    
    for coll in collections:
        print(f"Dropping collection: {coll}")
        db[coll].drop()
    
    print("Database cleared.")
    
    # Restore admins or seed default
    if admins:
        for admin in admins:
            # Remove _id if it exists to avoid duplication issues if we are doing drops
            if '_id' in admin: del admin['_id']
            users_collection.insert_one(admin)
            print(f"Restored admin: {admin['email']}")
    else:
        admin_id = str(uuid.uuid4())
        admin_user = {
            "id": admin_id,
            "email": "admin@example.com",
            "hashed_password": get_password_hash("admin123"),
            "display_name": "System Admin",
            "role": "admin"
        }
        users_collection.insert_one(admin_user)
        print(f"Created default admin: admin@example.com / admin123")
    
    print("Database recreation complete.")

if __name__ == "__main__":
    recreate_database()
