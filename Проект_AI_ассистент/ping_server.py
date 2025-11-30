import requests
response = requests.post("http://127.0.0.1:8080/work_json", params={"ping": "pong"})
print(response.status_code, response.text)