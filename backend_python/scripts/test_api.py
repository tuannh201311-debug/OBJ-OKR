import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_api():
    # 1. Login to get token
    # (Assuming admin@test.com / admin123 exists or we use an existing user)
    # Let's try to find a user first
    try:
        from database import users_collection
        user = users_collection.find_one()
        if not user:
            print("No users found in DB")
            return
        
        email = user['email']
        # We don't know the password, but we can try common ones or just mock a token
        # Actually, let's just mock the auth dependency in a separate test script or
        # just call the function directly.
        print(f"Testing with user: {email}")
        
    except Exception as e:
        print(f"Error: {e}")

    # Let's use a more direct approach: check the endpoint response using requests
    # I need a valid JWT. I'll generate one using the secret key.
    try:
        import jwt
        from datetime import datetime, timedelta
        SECRET_KEY = "your-secret-key-here" # I should check what it actually is
        # Check .env or auth.py
    except:
        pass

    print("--- Checking Endpoints directly (unauthenticated) ---")
    # This will return 401 but we can see if the server is up
    r = requests.get(f"{BASE_URL}/okrs")
    print(f"GET /okrs status: {r.status_code}")

test_api()
