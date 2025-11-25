from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from shared.database import get_db
from . import crud, schemas
from .utils.jwt import create_access_token, decode_token
from .models import User

auth_router = APIRouter()
users_router = APIRouter(prefix="/users")
security = HTTPBearer()


def serialize_user(user: User) -> dict:
    first = user.first_name or user.email.split("@")[0].title()
    return {
        "id": user.id,
        "email": user.email,
        "firstName": first,
        "lastName": user.last_name or "",
        "role": user.role or "user",
        "isActive": user.is_active,
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@auth_router.post("/register")
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    first_name = user_in.firstName or user_in.email.split("@")[0].title()
    user = crud.create_user(
        db,
        user_in.email,
        user_in.password,
        first_name=first_name,
        last_name=user_in.lastName,
    )
    return serialize_user(user)


@auth_router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserCreate, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@auth_router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


@users_router.put("/profile")
def update_profile(
    payload: schemas.ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = crud.update_user_profile(
        db,
        current_user,
        first_name=payload.firstName,
        last_name=payload.lastName,
    )
    return serialize_user(updated)


@users_router.put("/password")
def change_password(
    payload: schemas.PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    success = crud.change_user_password(
        db,
        current_user,
        current_password=payload.currentPassword,
        new_password=payload.newPassword,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текущий пароль неверен",
        )
    return {"detail": "Password updated"}