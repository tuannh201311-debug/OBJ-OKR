from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "okr_app")

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]

users = list(db["users"].find({}, {"email": 1, "role": 1, "display_name": 1}))
print(f"Users found: {len(users)}")
for user in users:
    print(user)
