from flask import Flask, render_template, request, redirect, url_for, session
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash
import sqlite3
from flask import send_file
import random
import os
import requests
from datetime import datetime
import csv
from flask import make_response, jsonify
import json
import io
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")


# Налаштування пошти
app.config.update(
    MAIL_SERVER='smtp.gmail.com',
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
)

mail = Mail(app)

# Словник ключових слів
keywords = ["Аерозоль", "Бальзам", "Бруньки", "Внутрішньом'язові ін'єкції", "Вушні краплі", "Газ", "Гель", "Генератор", "Гранули", "Гранулят", "Гумка", "Густа маса", "Драже", "Екстракт", "Емульгель", "Емульсія", "Жувальні таблетки", "Збір", "Ін'єкції",  "Капсули", "Квітки", "Концентрат", "Кора", "Кореневища", "Корені", "Корінь", "Краплі", "Крем", "Кубики", "Кільце", "Лак", "Листя", "Лосьйон", "Льодяник", "Лікарська рослинна сировина",
            "Лінімент", "Ліофілізат", "Мазь", "Набір", "Настойка", "Насіння", "Олія", "Ополіскувач", "Пари", "Паста", "Пастилки", "Пелети", "Песарії", "Пластир", "Плитки", "Плоди", "Порошок", "Підшкірні імплантати", "Піна", "Розчин", "Розчинник", "Рідина", "Сироп", "Слані", "Спрей", "Стулки", "Субстанція", "Супліддя", "Супозиторії", "Суспензія", "Таблетки", "Таблетки пролонгованої дії", "Таблетки шипучі", "Трава", "Чай", "Шампунь"]

# Читання CSV
def load_data():
    data = []
    with open("reestr.csv", encoding="cp1251") as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            data.append(row)
    return data

# Спрощення форми
def simplify_form(text, keywords):
    for keyword in keywords:
        if keyword.lower() in text.lower():
            return keyword
    return "Інше"

# 🔐 Вхід
@app.route("/login", methods=["GET", "POST"])
def login():
    print("Login page loaded. Method:", request.method)
    print("SESSION:", session)
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()

        if user and check_password_hash(user[1], password):
            verification_code = str(random.randint(100000, 999999))
            session["temp_user_id"] = user[0]
            session["verification_code"] = verification_code

            msg = Message("Код підтвердження входу",
                          sender=app.config["MAIL_USERNAME"],
                          recipients=[username])
            msg.body = f"Ваш код підтвердження: {verification_code}"
            mail.send(msg)

            return redirect(url_for("verify"))
        else:
            return "Невірний логін або пароль"

    return render_template("login.html")

# 🧾 Підтвердження коду
@app.route("/verify", methods=["GET", "POST"])
def verify():
    if "temp_user_id" not in session:
        return redirect(url_for("login"))

    if request.method == "POST":
        code_entered = request.form["code"]
        if code_entered == session.get("verification_code"):
            session["user_id"] = session.pop("temp_user_id")
            session.pop("verification_code")
            return redirect(url_for("index"))
        else:
            return "Неправильний код. Спробуйте ще раз."

    return render_template("verify.html")

# 📄 Головна сторінка з фільтрацією
# @app.route("/", methods=["GET", "POST"])
# def index():
#     user_authenticated = "user_id" in session

#     data = load_data()

#     for row in data:
#         original_form = row["Форма випуску"]
#         row["Форма випуску"] = simplify_form(original_form, keywords)

#     forms = sorted(set(row["Форма випуску"] for row in data))
#     inns = sorted(set(row["Міжнародне непатентоване найменування"] for row in data if row["Міжнародне непатентоване найменування"]))

#     filtered = []

#     if request.method == "POST":
#         name_filter = request.form.get("name", "")
#         form_filter = request.form.get("form", "")
#         inn_filter = request.form.get("inn", "")

#         for row in data:
#             if name_filter and name_filter.lower() not in row["Торгівельне найменування"].lower():
#                 continue
#             if form_filter and row["Форма випуску"] != form_filter:
#                 continue
#             if inn_filter and row["Міжнародне непатентоване найменування"] != inn_filter:
#                 continue
#             filtered.append(row)
#         if user_authenticated:
#             conn = sqlite3.connect("users.db")
#             cursor = conn.cursor()
#             cursor.execute("""
#         INSERT INTO query_history (
#             user_id, timestamp, name_filter, form_filter, inn_filter, result_count, results_json
#         ) VALUES (?, ?, ?, ?, ?, ?, ?)
#     """, (
#         session["user_id"],
#         datetime.now().isoformat(),
#         name_filter or None,
#         form_filter or None,
#         inn_filter or None,
#         len(filtered),
#         json.dumps(filtered, ensure_ascii=False)
#     ))
#             conn.commit()
#             conn.close()

#     return render_template("index.html", data=filtered, forms=forms, inns=inns, guest=not user_authenticated)
@app.route("/", methods=["GET"])
def index():
    data = load_data()

    # Спрощення форми випуску
    for row in data:
        row["Форма випуску"] = simplify_form(row["Форма випуску"], keywords)

    forms = sorted(set(row["Форма випуску"] for row in data))
    inns = sorted(set(row["Міжнародне непатентоване найменування"] for row in data if row["Міжнародне непатентоване найменування"]))

    return render_template("index.html", forms=forms, inns=inns, guest="user_id" not in session)


@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    name_filter = data.get("name", "").lower()
    form_filter = data.get("form", "")
    inn_filter = data.get("inn", "")

    results = []
    all_data = load_data()

    for row in all_data:
        original_form = row["Форма випуску"]
        row["Форма випуску"] = simplify_form(original_form, keywords)

        if name_filter and name_filter not in row["Торгівельне найменування"].lower():
            continue
        if form_filter and row["Форма випуску"] != form_filter:
            continue
        if inn_filter and row["Міжнародне непатентоване найменування"] != inn_filter:
            continue
        results.append(row)

    # Запис у query_history тільки для авторизованих
    if "user_id" in session:
        try:
            conn = sqlite3.connect("users.db")
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO query_history (
                    user_id, timestamp, name_filter, form_filter, inn_filter, result_count, results_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                session["user_id"],
                datetime.now().isoformat(),
                name_filter or None,
                form_filter or None,
                inn_filter or None,
                len(results),
                json.dumps(results, ensure_ascii=False)
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[ERROR] Неможливо записати історію: {e}")

    return jsonify(results)




# 🚪 Вихід
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()

        # перевірка чи користувач існує
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        existing_user = cursor.fetchone()

        if existing_user:
            conn.close()
            return "Користувач із такою поштою вже існує."

        # хешування паролю
        password_hash = generate_password_hash(password)

        # додавання користувача
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, password_hash))
        conn.commit()
        conn.close()

        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/history")
def history():
    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, name_filter, form_filter, inn_filter, result_count, results_json
        FROM query_history
        WHERE user_id = ?
        ORDER BY timestamp DESC
    """, (session["user_id"],))

    rows = cursor.fetchall()
    conn.close()

    records = []
    for row in rows:
        records.append({
            "id": row[0],
            "timestamp": row[1],
            "name_filter": row[2],
            "form_filter": row[3],
            "inn_filter": row[4],
            "result_count": row[5],
            "results": json.loads(row[6] or "[]")  # 👈 Десеріалізовані дані
        })

    return render_template("history.html", records=records)



@app.route("/download/<int:record_id>")
def download(record_id):
    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT results_json FROM query_history
        WHERE id = ? AND user_id = ?
    """, (record_id, session["user_id"]))
    row = cursor.fetchone()
    conn.close()

    if not row or not row[0]:
        return "Результати не знайдені.", 404

    results = json.loads(row[0])

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["Торгівельне найменування", "Форма випуску", "Міжнародне непатентоване найменування"])
    writer.writeheader()
    for item in results:
        writer.writerow({
            "Торгівельне найменування": item.get("Торгівельне найменування", ""),
            "Форма випуску": item.get("Форма випуску", ""),
            "Міжнародне непатентоване найменування": item.get("Міжнародне непатентоване найменування", "")
        })

    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode("utf-8-sig")),
                     mimetype="text/csv",
                     as_attachment=True,
                     download_name=f"results_{record_id}.csv")

@app.route("/save_results", methods=["POST"])
def save_results():
    if "user_id" not in session:
        return "Доступ заборонено. Увійдіть у систему, щоб зберігати результати.", 403

    raw_data = request.form.get("results")
    if not raw_data:
        return "Немає даних для збереження", 400

    try:
        records = json.loads(raw_data)
    except Exception as e:
        return f"Помилка обробки даних: {str(e)}", 400

    # BOM для Excel
    bom = '\ufeff'
    csv_content = bom + "Торгівельне найменування,Форма випуску,МНН\n"
    for row in records:
        csv_content += f"{row.get('Торгівельне найменування','')},{row.get('Форма випуску','')},{row.get('Міжнародне непатентоване найменування','')}\n"

    response = make_response(csv_content)
    response.headers["Content-Disposition"] = "attachment; filename=result.csv"
    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    return response

# 🔽 ID твого файла з Google Диску
DRIVE_FILE_ID = "1Fn6iv3UNRPajBFbU-yKSzuRqHz1m4K61"
LOCAL_FILENAME = "reestr.csv"

def ensure_file_exists():
    if not os.path.exists(LOCAL_FILENAME):
        print("[INFO] Файл не знайдено локально. Завантажую з Google Диску...")
        download_from_drive()
        print("[INFO] Файл успішно завантажено.")

def download_from_drive():
    url = f"https://drive.google.com/uc?export=download&id={DRIVE_FILE_ID}"
    response = requests.get(url)

    if response.status_code == 200:
        with open(LOCAL_FILENAME, "wb") as f:
            f.write(response.content)
    else:
        raise Exception("❌ Не вдалося завантажити файл з Google Диску. Перевір URL або доступ.")

# 🔁 Завантаження CSV-даних
def load_data():
    ensure_file_exists()
    data = []
    with open(LOCAL_FILENAME, encoding="cp1251") as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            data.append(row)
    return data


# 🔁 Запуск
if __name__ == "__main__":
    import webbrowser
    webbrowser.open("http://127.0.0.1:5000/login")  # відкриє login в браузері
    app.run(debug=True)