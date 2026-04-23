from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "okr_app")

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

okrs = list(db["okrs"].find({}, {"title": 1, "id": 1}))
print(f"OKRs found: {len(okrs)}")
for okr in okrs:
    print(okr)

bts = list(db["big_tasks"].find({}, {"title": 1, "id": 1, "okr_id": 1}))
print(f"Big Tasks found: {len(bts)}")
for bt in bts:
    print(bt)

sts = list(db["sub_tasks"].find({}, {"title": 1, "id": 1, "big_task_id": 1}))
print(f"Sub Tasks found: {len(sts)}")
for st in sts:
    print(st)
