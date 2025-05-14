from flask import Flask, render_template, request, redirect, url_for, session
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash
import sqlite3
from flask import send_file
import random
import pandas as pd
import os
import requests
from datetime import datetime
import csv
from flask import make_response, jsonify
import json
import io
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
polish_data_cache = None

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
# Спрощення форми
def simplify_form(text, keywords):
    for keyword in keywords:
        if keyword.lower() in text.lower():
            return keyword
    return "Інше"


# Польські ключові форми випуску
polish_keywords = [
    "Aerozol", "Balsam", "Gaz", "Żel", "Granulat", "Drażetki", "Ekstrakt", "Emulsja",
    "Tabletki", "Kapsułki", "Maść", "Syrop", "Krople", "Roztwór", "Zawiesina", "Pasta",
    "Płyn", "Liofilizat", "Czopki", "Spray", "Substancja", "Implant", "Plaster", "Szampon",
    "Koncentrat", "Proszek", "Zioła", "Globulki", "Pastylki"
]

def simplify_form_polish(text, keywords):
    for keyword in keywords:
        if keyword.lower() in text.lower():
            return keyword
    return "Inne"


def load_data(source="ukraine"):
    data = []

    if source == "ukraine":
        with open("reestr.csv", encoding="cp1251") as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                form = simplify_form(row.get("Форма випуску", ""), keywords)
                country = None
                for i in range(1, 6):
                    val = row.get(f"Виробник {i}: країна")
                    if val and val.strip():
                        country = val.strip()
                        break
                data.append({
                    "Торгівельне найменування": row.get("Торгівельне найменування", "").strip(),
                    "Форма випуску": form,
                    "Міжнародне непатентоване найменування": row.get("Міжнародне непатентоване найменування", "").strip(),
                    "Країна виробника": country or "Невідомо"
                })

    elif source == "poland":
        global polish_data_cache

        if polish_data_cache is None:
            df = pd.read_excel(
                "Rejestr_Produktow_Leczniczych_calosciowy_stan_na_dzien_20250302.xlsx",
                engine="openpyxl",
                usecols=[
                    "Nazwa Produktu Leczniczego",
                    "Postać farmaceutyczna",
                    "Nazwa powszechnie stosowana",
                    "Kraj wytwórcy"
                ]
            )
            polish_data_cache = df.copy()
        else:
            df = polish_data_cache

        total = 0
        valid_names = 0
        valid_inns = 0

        for row in df.to_dict("records"):
            total += 1
            name = str(row.get("Nazwa Produktu Leczniczego", "")).strip()
            inn = str(row.get("Nazwa powszechnie stosowana", "") or "").strip()
            form_raw = str(row.get("Postać farmaceutyczna", "") or "").strip()
            country = str(row.get("Kraj wytwórcy", "") or "").strip()

            if not name or name.lower() in ("nan", ""):
                continue
            valid_names += 1

            if not inn or inn.lower() in ("-", "nan") or inn.replace(".", "").isnumeric():
                inn = "—"
            else:
                valid_inns += 1

            if not country or country.lower() in ("nan",):
                country = "Невідомо"

            data.append({
                "Торгівельне найменування": name,
                "Форма випуску": simplify_form_polish(form_raw, polish_keywords),
                "Міжнародне непатентоване найменування": inn,
                "Країна виробника": country
            })

        print(f"🔍 Польський реєстр: зчитано рядків: {total}")
        print(f"✅ Валідні назви: {valid_names}")
        print(f"✅ Валідні МНН: {valid_inns}")
        print(f"📦 Завантажено записів: {len(data)}")

    return data





def clean_country(val):
    if not isinstance(val, str):
        return None
    return val.split('\n')[0].strip()


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


@app.route("/set_source", methods=["POST"])
def set_source():
    session["source"] = request.form.get("source", "ukraine")
    return redirect(url_for("index"))


@app.route("/", methods=["GET"])
def index():
    source = session.get("source", "ukraine")
    raw_data = load_data(source)

    data = []
    for row in raw_data:
        # Спрощення форми випуску окремо, залежно від джерела
        if source == "ukraine":
            row["Форма випуску"] = simplify_form(str(row.get("Форма випуску", "")), keywords)
        else:
            row["Форма випуску"] = simplify_form_polish(str(row.get("Форма випуску", "")), polish_keywords)
        data.append(row)

    # Унікальні значення для фільтрів з не оброблених полів (назва та МНН)
    names = sorted(set(
        str(row.get("Торгівельне найменування")).strip()
        for row in data
        if isinstance(row.get("Торгівельне найменування"), str) and row.get("Торгівельне найменування").strip()
    ))

    inns = sorted(set(
        val for val in (
            str(row.get("Міжнародне непатентоване найменування", "")).strip()
            for row in data
      )
      if val and val != "-" and not val.replace(".", "").isnumeric()
    ))


    forms = sorted(set(
        str(row.get("Форма випуску", "")).strip()
        for row in data
        if row.get("Форма випуску")
    ))

    # Країни — розділяємо, якщо їх кілька в одному рядку
    countries = sorted(set(
        country.strip()
        for row in data
        for country in str(row.get("Країна виробника", "")).split("\n")
        if country.strip()
    ))


    print(f"🧬 МНН у фільтрі: {len(inns)} назв, перші 50: {inns[:50]}")
    print(f"🏷️ Торгівельні назви у фільтрі: {len(names)} назв, перші 50: {names[:50]}")


    return render_template(
        "index.html",
        forms=forms,
        inns=inns,
        names=names,
        countries=countries,
        guest="user_id" not in session,
        source=source
    )







@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    name_filter = data.get("name", "").lower()
    form_filter = data.get("form", "")
    inn_filter = data.get("inn", "")
    country_filter = data.get("country", "")

    results = []
    source = session.get("source", "ukraine")
    all_data = load_data(source)

    for row in all_data:
        if name_filter and name_filter != (row["Торгівельне найменування"] or "").lower():
            continue
        if form_filter and row["Форма випуску"] != form_filter:
            continue
        if inn_filter and row["Міжнародне непатентоване найменування"] != inn_filter:
            continue
        if country_filter and row["Країна виробника"] != country_filter:
            continue

        results.append(row)

    # Збереження історії (без змін)
    if "user_id" in session:
        try:
            conn = sqlite3.connect("users.db")
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO query_history (
                    user_id, timestamp, name_filter, form_filter, inn_filter, country_filter, result_count, results_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session["user_id"],
                datetime.now().isoformat(),
                name_filter or None,
                form_filter or None,
                inn_filter or None,
                country_filter or None,
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
        SELECT id, timestamp, name_filter, form_filter, inn_filter, country_filter, result_count, results_json
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
            "country_filter": row[5],
            "result_count": row[6],
            "results": json.loads(row[7] or "[]")
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
    writer = csv.DictWriter(output, fieldnames=[
        "Торгівельне найменування",
        "Форма випуску",
        "Міжнародне непатентоване найменування",
        "Країна виробника"
    ])
    writer.writeheader()
    for item in results:
        writer.writerow({
            "Торгівельне найменування": item.get("Торгівельне найменування", ""),
            "Форма випуску": item.get("Форма випуску", ""),
            "Міжнародне непатентоване найменування": item.get("Міжнародне непатентоване найменування", ""),
            "Країна виробника": item.get("Країна виробника", "")
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

    bom = '\ufeff'
    csv_content = bom + "Торгівельне найменування,Форма випуску,МНН,Країна виробника\n"
    for row in records:
        csv_content += f"{row.get('Торгівельне найменування','')},{row.get('Форма випуску','')},{row.get('Міжнародне непатентоване найменування','')},{row.get('Країна виробника','')}\n"

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


@app.route("/charts")
def charts():
    if "user_id" not in session:
        return redirect(url_for("login"))

    source = session.get("source", "ukraine")
    all_data = load_data(source)

    forms = sorted(set(row["Форма випуску"] for row in all_data))
    inns = sorted(set(row["Міжнародне непатентоване найменування"] for row in all_data if row["Міжнародне непатентоване найменування"]))
    countries = sorted(set(row["Країна виробника"] for row in all_data if row["Країна виробника"] and row["Країна виробника"] != "Невідомо"))

    return render_template(
        "charts.html",
        forms=forms,
        inns=inns,
        countries=countries,
        preset_form=request.args.get("form"),
        preset_inn=request.args.get("inn"),
        preset_country=request.args.get("country"),
        source=source
    )




@app.route("/chart-data", methods=["POST"])
def chart_data():
    data = request.get_json()
    selected_forms = data.get("selected_forms", [])
    selected_inns = data.get("selected_inns", [])
    selected_countries = data.get("selected_countries", [])
    chart_type = data.get("chart_type", "bar")

    source = session.get("source", "ukraine")
    all_data = load_data(source)

    result = {}

    for row in all_data:
        form = row["Форма випуску"]
        country = row["Країна виробника"]
        inn = row["Міжнародне непатентоване найменування"]

        if selected_forms and form not in selected_forms:
            continue
        if selected_inns and inn not in selected_inns:
            continue
        if selected_countries and country not in selected_countries:
            continue

        if chart_type in ["pie", "line"]:
            if len(selected_forms) == 1 and not selected_countries:
                result[country] = result.get(country, 0) + 1
            elif len(selected_countries) == 1:
                result[form] = result.get(form, 0) + 1
            else:
                return jsonify({})
        else:
            if form not in result:
                result[form] = {}
            result[form][country] = result[form].get(country, 0) + 1

    return jsonify(result)



# 🔁 Запуск
if __name__ == "__main__":
    import webbrowser
    webbrowser.open("http://127.0.0.1:5000/login")  # відкриє login в браузері
    app.run(debug=True)