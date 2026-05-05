import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "okr_app")

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

# Collections
users_collection = db["users"]
roles_collection = db["user_roles"]
okrs_collection = db["okrs"]
big_tasks_collection = db["big_tasks"]
sub_tasks_collection = db["sub_tasks"]
weekly_reports_collection = db["weekly_reports"]
activity_logs_collection = db["activity_logs"]

# Initialize Indexes for Performance
try:
    users_collection.create_index("email", unique=True)
    weekly_reports_collection.create_index([("week_number", 1), ("year", 1), ("user_id", 1)])
    sub_tasks_collection.create_index("assignee")
    activity_logs_collection.create_index([("item_id", 1), ("timestamp", -1)])
    activity_logs_collection.create_index("timestamp")
except Exception as e:
    print(f"Warning: Could not create indexes - {e}")
