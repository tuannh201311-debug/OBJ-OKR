import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from database import users_collection
users = list(users_collection.find({}))
print("Total users:", len(users))
for u in users:
    print(u)
