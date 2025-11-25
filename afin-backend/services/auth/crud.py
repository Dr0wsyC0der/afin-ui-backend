from sqlalchemy.orm import Session
from .models import User
from .utils.password import get_password_hash, verify_password


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, email: str, password: str, first_name: str | None = None, last_name: str | None = None):
    hashed = get_password_hash(password)
    user = User(
        email=email,
        hashed_password=hashed,
        first_name=first_name,
        last_name=last_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def update_user_profile(db: Session, user: User, first_name: str, last_name: str | None = None):
    user.first_name = first_name
    user.last_name = last_name
    db.commit()
    db.refresh(user)
    return user


def change_user_password(db: Session, user: User, current_password: str, new_password: str):
    if not verify_password(current_password, user.hashed_password):
        return False
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    return True