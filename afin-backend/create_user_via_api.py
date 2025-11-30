"""
Скрипт для создания пользователя через API
"""
import requests
import json

API_URL = "http://localhost:8000/api/auth"

def create_user(email, password, first_name=None, last_name=None):
    """Создает пользователя через API"""
    try:
        # Проверяем доступность API
        response = requests.get("http://localhost:8000/health", timeout=2)
        if response.status_code != 200:
            print("ERROR: Backend не отвечает. Убедитесь, что сервис запущен на порту 8000")
            return False
    except requests.exceptions.RequestException:
        print("ERROR: Не удалось подключиться к backend. Убедитесь, что сервис запущен:")
        print("   cd services/gateway")
        print("   uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
        return False
    
    # Пытаемся зарегистрировать пользователя
    payload = {
        "email": email,
        "password": password,
    }
    if first_name:
        payload["firstName"] = first_name
    if last_name:
        payload["lastName"] = last_name
    
    try:
        response = requests.post(
            f"{API_URL}/register",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"OK: Пользователь успешно создан!")
            print(f"   Email: {user_data['email']}")
            print(f"   Имя: {user_data.get('firstName', 'N/A')}")
            return True
        elif response.status_code == 400:
            error = response.json().get("detail", "Unknown error")
            if "already registered" in error.lower():
                print(f"INFO: Пользователь {email} уже существует")
                # Пробуем войти
                login_response = requests.post(
                    f"{API_URL}/login",
                    json={"email": email, "password": password},
                    headers={"Content-Type": "application/json"},
                    timeout=5
                )
                if login_response.status_code == 200:
                    print(f"OK: Вход успешен! Пользователь существует и пароль верный.")
                    return True
                else:
                    print(f"ERROR: Пользователь существует, но пароль неверный")
                    return False
            else:
                print(f"ERROR: Ошибка: {error}")
                return False
        else:
            print(f"ERROR: Ошибка {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Ошибка при запросе: {e}")
        return False

if __name__ == "__main__":
    print("Создание тестового пользователя через API...\n")
    
    # Создаем администратора
    create_user("admin@afin.ru", "password123", "Администратор", "Системы")
    print()
    
    # Создаем обычного пользователя
    create_user("user@afin.ru", "password123", "Пользователь", "Тестовый")
    print()
    
    print("Готово! Теперь вы можете войти в систему:")
    print("  Email: admin@afin.ru")
    print("  Пароль: password123")

