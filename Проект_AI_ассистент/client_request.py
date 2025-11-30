import requests, json
import socket
print("Can connect:", socket.create_connection(("127.0.0.1", 8000), timeout=2))

import sys
print("Python executable:", sys.executable)

url = "http://127.0.0.1:8000/predict_delay"
headers = {"Content-Type": "application/json"}

payload = {
    "expected_duration": 240,
    "process_name": "Закупка оборудования",
    "role": "Engineer",
    "department": "Procurement",
    "status": "active",
    "month": 10,
    "weekday": 3
}

r = requests.post(url, headers=headers, json=payload)
print("Status:", r.status_code)
print("Text:", r.text)