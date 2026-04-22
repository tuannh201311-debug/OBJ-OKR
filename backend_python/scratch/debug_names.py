from database import users_collection, sub_tasks_collection

print("--- USERS ---")
for user in users_collection.find():
    print(f"ID: {user['id']}, Name: {user.get('display_name')}, Email: {user['email']}")

print("\n--- SAMPLE SUBTASKS ---")
for st in sub_tasks_collection.find().limit(5):
    print(f"Title: {st['title']}, Assignee: {st.get('assignee')}, Progress: {st.get('progress')}")
