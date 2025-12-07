#docker run -p 8080:8080 ai-assistant
#FROM python:3.10-slim
#
#RUN apt-get update && apt-get install -y libgomp1
#
#WORKDIR /app
#COPY . .
#
##Сначала
#RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
#
## Устанавливаем зависимости из requirements.txt.txt
#RUN pip install --no-cache-dir -r requirements.txt
#
#EXPOSE 8000
#CMD ["uvicorn", "FastAPI_server:app", "--host", "0.0.0.0", "--port", "8000"]


FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements.txt СРАЗУ и устанавливаем все вместе
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "FastAPI_server:app", "--host", "0.0.0.0", "--port", "8000"]
