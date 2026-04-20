import sys
import io
import json
from database import okrs_collection, big_tasks_collection, sub_tasks_collection

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("--- Inspecting first OKR ---")
okr = okrs_collection.find_one()
if okr:
    # Convert ObjectId to string for printing
    okr['_id'] = str(okr['_id'])
    print(json.dumps(okr, indent=2, ensure_ascii=False))
else:
    print("No OKR found")
