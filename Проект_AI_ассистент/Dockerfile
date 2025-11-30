#docker run -p 8080:8080 ai-assistant
FROM python:3.12-slim

RUN apt-get update && apt-get install -y libgomp1

WORKDIR /app
COPY . .

# Устанавливаем зависимости из requirements.txt.txt
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000
CMD ["uvicorn", "FastAPI_server:app", "--host", "0.0.0.0", "--port", "8000"]

