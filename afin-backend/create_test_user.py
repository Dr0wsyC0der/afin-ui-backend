"""
Скрипт для создания тестового пользователя в базе данных
"""
import sys
from pathlib import Path

# Добавляем путь к проекту
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from shared.database import SessionLocal, engine, Base
from services.auth.models import User
from services.auth.utils.password import get_password_hash

def create_test_users():
    """Создает тестовых пользователей в базе данных"""
    # Создаем таблицы, если их нет
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Проверяем, есть ли уже пользователи
        existing_admin = db.query(User).filter(User.email == "admin@afin.ru").first()
        existing_user = db.query(User).filter(User.email == "user@afin.ru").first()
        
        # Создаем администратора
        if not existing_admin:
            admin = User(
                email="admin@afin.ru",
                hashed_password=get_password_hash("password123"),
                first_name="Администратор",
                last_name="Системы",
                role="admin",
                is_active=True
            )
            db.add(admin)
            print("✅ Создан пользователь: admin@afin.ru / password123")
        else:
            print("ℹ️  Пользователь admin@afin.ru уже существует")
        
        # Создаем обычного пользователя
        if not existing_user:
            user = User(
                email="user@afin.ru",
                hashed_password=get_password_hash("password123"),
                first_name="Пользователь",
                last_name="Тестовый",
                role="user",
                is_active=True
            )
            db.add(user)
            print("✅ Создан пользователь: user@afin.ru / password123")
        else:
            print("ℹ️  Пользователь user@afin.ru уже существует")
        
        db.commit()
        print("\n🎉 Готово! Теперь вы можете войти в систему.")
        print("\nТестовые учетные записи:")
        print("  - Email: admin@afin.ru, Пароль: password123")
        print("  - Email: user@afin.ru, Пароль: password123")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: Ошибка при создании пользователей: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()

