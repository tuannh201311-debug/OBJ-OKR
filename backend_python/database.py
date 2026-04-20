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
