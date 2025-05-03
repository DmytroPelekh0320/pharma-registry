from flask import Flask, render_template, request, redirect, url_for, session
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash
import sqlite3
import random
import os
import csv
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
@app.route("/", methods=["GET", "POST"])
def index():
    if "user_id" not in session:
        return redirect(url_for("login"))

    data = load_data()

    for row in data:
        original_form = row["Форма випуску"]
        row["Форма випуску"] = simplify_form(original_form, keywords)

    forms = sorted(set(row["Форма випуску"] for row in data))
    inns = sorted(set(row["Міжнародне непатентоване найменування"] for row in data if row["Міжнародне непатентоване найменування"]))

    filtered = []

    if request.method == "POST":
        name_filter = request.form.get("name", "")
        form_filter = request.form.get("form", "")
        inn_filter = request.form.get("inn", "")

        for row in data:
            if name_filter and name_filter.lower() not in row["Торгівельне найменування"].lower():
                continue
            if form_filter and row["Форма випуску"] != form_filter:
                continue
            if inn_filter and row["Міжнародне непатентоване найменування"] != inn_filter:
                continue
            filtered.append(row)

    return render_template("index.html", data=filtered, forms=forms, inns=inns)

# 🚪 Вихід
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

# 🔁 Запуск
if __name__ == "__main__":
    app.run(debug=True)
