import requests
import json

from client_request import payload

url = "http://127.0.0.1:8000/explain_delay"
headers = {"Content-Type": "application/json"}

payload = {
    "expected_duration": 240,
    "process_name": "Закупка оборудования",
    "role": "Engineer",
    "department": "Procurement",
    "status": "active",
    "month": 10,
    "weekday": 3,
    "delay_probability": 0.676,
    "prediction": "Delayed"
}

response = requests.post(url, headers=headers, json=payload)
print("Status:", response.status_code)
print("Response:", json.dumps(response.json(), indent=2, ensure_ascii=False))