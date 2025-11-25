from fastapi import FastAPI
from .routers import router

app = FastAPI(title="MODELS Service", docs_url="/docs")
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "models"}
