from fastapi import FastAPI
from shared.database import Base, engine
from .routers import auth_router, users_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth Service", docs_url="/docs")
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(users_router, prefix="/api", tags=["users"])