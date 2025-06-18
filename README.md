# UkrPolPharmSearch

**UkrPolPharmSearch** is a web-based application for automated processing of pharmaceutical drug registry data from Ukraine and Poland.

The system allows users to:
- perform advanced multifactor searches across drug names, forms, INNs, ATC codes, and countries;
- visualize aggregated data using dynamic charts (powered by Chart.js);
- save search history and download results in CSV format;
- switch between Ukrainian and Polish registries with automatic data unification.

## 🔧 Technologies Used

- **Backend**: Python (Flask, pandas)
- **Frontend**: HTML, CSS, JavaScript, Chart.js, Tom Select
- **Database**: SQLite (for user auth and query history)
- **Security**: Hashed passwords, email-based 2FA using Flask-Mail

## 📂 Project Structure

- `app.py` – main Flask application
- `templates/` – HTML templates (login, search, charts, etc.)
- `static/` – static assets (CSS, JS)
- `.gitignore` – Git exclusions
- `init_db.py` – database initializer (ignored in production)

## 📊 Features

- Drug comparison and filtering by multiple parameters
- Data unification across countries (forms, producers, ATC classification)
- Search result visualization in bar, pie, or line chart format
- Export results or download from previous queries
- Real-time validation of login via email-confirmation codes

## ⚙️ How to Run

1. Clone the repository
2. Create a `.env` file with your email credentials and secret key
3. Run `init_db.py` to initialize the SQLite database
4. Launch `app.py` and open `http://localhost:5000` in your browser

## 📌 Notes

- CSV (Ukraine) and XLSX (Poland) registry files should be present in the project root
- Works locally but can be deployed to cloud environments (e.g., Heroku, PythonAnywhere)

---

**Author**: Dmytro Pelekh  
**Bachelor's Thesis**, Lviv Polytechnic National University, 2025
