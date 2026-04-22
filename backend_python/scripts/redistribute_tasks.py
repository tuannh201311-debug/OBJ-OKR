import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "okr_app")

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

users_collection = db["users"]
sub_tasks_collection = db["sub_tasks"]

def redistribute():
    # Get all users
    users = list(users_collection.find({}))
    if not users:
        print("No users found.")
        return
    
    user_names = [u.get("display_name") or u.get("email") for u in users]
    print(f"Users to assign to: {user_names}")
    
    # Get all subtasks
    subtasks = list(sub_tasks_collection.find({}))
    print(f"Found {len(subtasks)} subtasks.")
    
    # Round-robin assignment
    for i, st in enumerate(subtasks):
        new_assignee = user_names[i % len(user_names)]
        sub_tasks_collection.update_one(
            {"id": st["id"]},
            {"$set": {"assignee": new_assignee}}
        )
    print(f"Redistributed {len(subtasks)} tasks successfully.")

if __name__ == "__main__":
    redistribute()
