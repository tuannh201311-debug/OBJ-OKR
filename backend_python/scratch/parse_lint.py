import json
import sys
import os

filepath = 'lint_results.json'
if not os.path.exists(filepath):
    print(f"File {filepath} not found")
    sys.exit(1)

try:
    with open(filepath, 'r') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error loading JSON: {e}")
    sys.exit(1)

error_count = 0
for file in data:
    for msg in file['messages']:
        if msg.get('severity') == 2: # Error
            print(f"{file['filePath']}:{msg['line']}:{msg['column']} - {msg['message']} ({msg['ruleId']})")
            error_count += 1

print(f"Total errors: {error_count}")
