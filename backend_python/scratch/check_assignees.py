from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "okr_app")

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

sts = list(db["sub_tasks"].find({}, {"assignee": 1}))
assignees = set()
for st in sts:
    if "assignee" in st:
        assignees.add(st["assignee"])

print(f"Unique assignees in sub_tasks: {assignees}")
