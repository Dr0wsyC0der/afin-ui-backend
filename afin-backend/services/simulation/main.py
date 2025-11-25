from fastapi import FastAPI
from .routers import router

app = FastAPI(title="AFIN Simulation Service", docs_url="/docs")
app.include_router(router)