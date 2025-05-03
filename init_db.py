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
