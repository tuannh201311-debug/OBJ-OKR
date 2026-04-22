import sys
import io
import json
from fastapi.encoders import jsonable_encoder
from database import okrs_collection, big_tasks_collection, sub_tasks_collection
from models import OKRResponse, BigTaskResponse, SubTaskResponse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_serialization():
    print("--- Serializing OKRs ---")
    okrs = list(okrs_collection.find({}))
    for o in okrs:
        try:
            # We must remove _id or convert it because Pydantic models don't like it
            # if we are simulating the FastAPI response_model behavior
            o_clean = {k: v for k, v in o.items() if k != '_id'}
            validated = OKRResponse(**o_clean)
            print(f"Validated OKR: {validated.title} (ID: {validated.id})")
        except Exception as e:
            print(f"FAILED to validate OKR: {o.get('title')} - Error: {e}")

    print("\n--- Serializing BigTasks ---")
    bts = list(big_tasks_collection.find({}).limit(5))
    for bt in bts:
        try:
            bt_clean = {k: v for k, v in bt.items() if k != '_id'}
            validated = BigTaskResponse(**bt_clean)
            # print(f"Validated BT: {validated.title}")
        except Exception as e:
            print(f"FAILED to validate BigTask: {bt.get('title')} - Error: {e}")

check_serialization()
