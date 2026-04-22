import pymongo
import os
from dotenv import load_dotenv

load_dotenv()
uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = pymongo.MongoClient(uri)
db = client[os.getenv("DATABASE_NAME", "okr_app")]

print("--- USERS ---")
for user in db["users"].find():
    print(f"ID: {user['id']}, Name: {user.get('display_name')}, Email: {user['email']}")

print("\n--- SAMPLE SUBTASKS ---")
for st in db["sub_tasks"].find().limit(5):
    print(f"Title: {st['title']}, Assignee: {st.get('assignee')}, Progress: {st.get('progress')}")
