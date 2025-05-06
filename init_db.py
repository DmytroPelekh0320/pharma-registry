import sqlite3
from werkzeug.security import generate_password_hash

# Підключення до бази (створиться, якщо її немає)
conn = sqlite3.connect("users.db")
cursor = conn.cursor()

# Створення таблиці користувачів
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
)
""")

# Видалення старої таблиці (якщо потрібно повністю оновити структуру)
cursor.execute("DROP TABLE IF EXISTS query_history")

# Створення оновленої таблиці історії запитів з results_json
cursor.execute("""
CREATE TABLE query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    name_filter TEXT,
    form_filter TEXT,
    inn_filter TEXT,
    result_count INTEGER,
    results_json TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
)
""")

# Додавання тестового користувача
username = "pelekh.d2004@gmail.com"
password = "admin123"
password_hash = generate_password_hash(password)

try:
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, password_hash))
    print("Користувача додано.")
except sqlite3.IntegrityError:
    print("Користувач уже існує.")

conn.commit()
conn.close()
print("Ініціалізацію завершено.")
