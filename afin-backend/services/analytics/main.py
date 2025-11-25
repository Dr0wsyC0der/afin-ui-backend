from fastapi import FastAPI
from .routers import router

app = FastAPI(title="ANALYTICS Service", docs_url="/docs")
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "analytics"}
