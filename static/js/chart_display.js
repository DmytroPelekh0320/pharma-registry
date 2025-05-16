let chartInstance = null;

function getColor(index) {
    const colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
        "#6366f1", "#ec4899", "#22d3ee", "#a855f7",
        "#14b8a6", "#f97316", "#8b5cf6", "#0ea5e9",
        "#e11d48", "#7c3aed", "#059669", "#d97706",
        "#4b5563", "#d946ef", "#0d9488", "#f43f5e"
    ];
    return colors[index % colors.length];
}


const countryTranslation = {
    "Australia": "Австралія", "Austria": "Австрія", "Belgia": "Бельгія", "Bułgaria": "Болгарія",
    "Chorwacja": "Хорватія", "Cypr": "Кіпр", "Czechy": "Чехія", "Dania": "Данія", "Estonia": "Естонія",
    "Finlandia": "Фінляндія", "Francja": "Франція", "Grecja": "Греція", "Hiszpania": "Іспанія",
    "Holandia": "Нідерланди", "Indie": "Індія", "Irlandia": "Ірландія", "Irlandia Północna": "Північна Ірландія",
    "Islandia": "Ісландія", "Litwa": "Литва", "Malta": "Мальта", "Niemcy": "Німеччина",
    "Norwegia": "Норвегія", "Polska": "Польща", "Portugalia": "Португалія", "Rumunia": "Румунія",
    "Szwajcaria": "Швейцарія", "Szwecja": "Швеція", "Słowacja": "Словаччина", "Słowenia": "Словенія",
    "Wielka Brytania": "Велика Британія", "Węgry": "Угорщина", "Włochy": "Італія", "Łotwa": "Латвія",
    "Невідомо": "Невідомо"
};

function unifyCountryName(original, source) {
    if (source === "ukraine") return original;
    return countryTranslation[original] || `(${original})`;
}

const translationMap = {
    "Aerozol": "Аерозоль", "Balsam": "Бальзам", "Gaz": "Газ", "Żel": "Гель",
    "Granulat": "Гранули", "Drażetki": "Драже", "Ekstrakt": "Екстракт", "Emulsja": "Емульсія",
    "Tabletki": "Таблетки", "Kapsułki": "Капсули", "Maść": "Мазь", "Syrop": "Сироп",
    "Krople": "Краплі", "Roztwór": "Розчин", "Zawiesina": "Суспензія", "Pasta": "Паста",
    "Płyn": "Рідина", "Liofilizat": "Ліофілізат", "Czopki": "Супозиторії", "Spray": "Спрей",
    "Substancja": "Субстанція", "Implant": "Підшкірні імплантати", "Plaster": "Пластир",
    "Szampon": "Шампунь", "Koncentrat": "Концентрат", "Proszek": "Порошок", "Zioła": "Трава",
    "Globulki": "Песарії", "Pastylki": "Пастилки"
};

function unifyFormName(original, source) {
    if (source === "ukraine") return original;
    return translationMap[original] || `(${original})`;
}

async function fetchDataAndRenderChart(type = "bar", compare = false) {
    const formSelect = document.getElementById("formSelect");
    const innSelect = document.getElementById("innSelect");
    const countrySelect = document.getElementById("countrySelect");
    const atcSelect = document.getElementById("atcGroupSelect");

    const selectedForms = Array.from(formSelect.selectedOptions).map(opt => opt.value);
    const selectedInns = Array.from(innSelect.selectedOptions).map(opt => opt.value);
    const selectedCountries = Array.from(countrySelect.selectedOptions).map(opt => opt.value);
    const selectedAtcGroups = Array.from(atcSelect.selectedOptions).map(opt => opt.value);

    const response = await fetch("/chart-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            selected_forms: selectedForms,
            selected_inns: selectedInns,
            selected_countries: selectedCountries,
            selected_atc_groups: selectedAtcGroups,
            chart_type: type,
            compare_mode: compare
        })
    });

    const data = await response.json();
    const ctx = document.getElementById("releaseChart").getContext("2d");
    if (chartInstance) chartInstance.destroy();

        // 🔹 Якщо обрано ATC-групу — малюємо по повних ATC-кодах
    if (selectedAtcGroups.length > 0 && Object.keys(data).length > 0) {
        const labels = Object.keys(data);
        const values = Object.values(data);

        chartInstance = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: "Повні ATC-коди",
                    data: values,
                    backgroundColor: labels.map((_, i) => getColor(i))
                }]
            },
            options: getOptions(false)
        });
        return;
    }

    // 🔹 Порівняння за формами
    if (compare === "form" && type === "bar") {
        const allFormsSet = new Set();
        const ukraineForms = {};
        const polandForms = {};

        for (const [form, count] of Object.entries(data["Україна"])) {
            const unified = unifyFormName(form, "ukraine");
            ukraineForms[unified] = count;
            allFormsSet.add(unified);
        }

        for (const [form, count] of Object.entries(data["Польща"])) {
            const unified = unifyFormName(form, "poland");
            polandForms[unified] = count;
            allFormsSet.add(unified);
        }

        const allForms = Array.from(allFormsSet);

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: allForms,
                datasets: [
                    {
                        label: "Україна",
                        data: allForms.map(f => ukraineForms[f] || 0),
                        backgroundColor: getColor(0)
                    },
                    {
                        label: "Польща",
                        data: allForms.map(f => polandForms[f] || 0),
                        backgroundColor: getColor(1)
                    }
                ]
            },
            options: getOptions()
        });
        return;
    }

    // 🔹 Порівняння за країнами
    if (compare === "country" && type === "bar") {
        const allCountriesSet = new Set();
        const ukraine = {};
        const poland = {};

        for (const [country, count] of Object.entries(data["Україна"])) {
            const unified = unifyCountryName(country, "ukraine");
            ukraine[unified] = count;
            allCountriesSet.add(unified);
        }

        for (const [country, count] of Object.entries(data["Польща"])) {
            const unified = unifyCountryName(country, "poland");
            poland[unified] = count;
            allCountriesSet.add(unified);
        }

        const allCountries = Array.from(allCountriesSet);

        const datasets = [
            {
                label: "Україна",
                data: allCountries.map(c => ukraine[c] || 0),
                backgroundColor: getColor(0)
            },
            {
                label: "Польща",
                data: allCountries.map(c => poland[c] || 0),
                backgroundColor: getColor(1)
            }
        ];

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: allCountries,
                datasets: datasets
            },
            options: getOptions()
        });
        return;
    }

    // 🔹 Стовпчикова діаграма за формами/країнами
    if (type === "bar") {
        const allForms = Object.keys(data);
        const allCountries = Array.from(new Set(
            allForms.flatMap(form => Object.keys(data[form]))
        ));

        const datasets = allCountries.map((country, i) => ({
            label: country,
            data: allForms.map(form => data[form][country] || 0),
            backgroundColor: getColor(i)
        }));

        chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: allForms,
                datasets: datasets
            },
            options: getOptions()
        });
        return;
    }

    // 🔹 Кругова або лінійна діаграма
    if (selectedForms.length === 1 && selectedCountries.length !== 1) {
        const labels = Object.keys(data);
        const values = Object.values(data);

        chartInstance = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: selectedForms[0],
                    data: values,
                    backgroundColor: labels.map((_, i) => getColor(i))
                }]
            },
            options: getOptions(false)
        });
        return;
    }

    if (selectedCountries.length === 1 && selectedForms.length !== 1) {
        const labels = Object.keys(data);
        const values = Object.values(data);

        chartInstance = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: selectedCountries[0],
                    data: values,
                    backgroundColor: labels.map((_, i) => getColor(i))
                }]
            },
            options: getOptions(false)
        });
        return;
    }

    showAlert("Щоб побудувати кругову або лінійну діаграму, виберіть лише одну форму або одну країну.");
}


function getOptions(enableLegend = true) {
    return {
        responsive: true,
        plugins: {
            tooltip: {
                mode: 'index',
                callbacks: {
                    label: function (context) {
                        const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                        const value = context.raw;
                        const percent = ((value / total) * 100).toFixed(1);
                        return `${context.dataset.label}: ${value} (${percent}%)`;
                    }
                }
            },
            legend: enableLegend ? { position: 'top' } : false
        },
        scales: {
            x: { stacked: false },
            y: { beginAtZero: true, ticks: { precision: 0 } }
        }
    };
}

function saveChartAsImage() {
    const canvas = document.getElementById("releaseChart");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "chart.png";
    link.click();
}

function showAlert(message) {
    const alertBox = document.getElementById("alertBox");
    alertBox.textContent = message;
    alertBox.style.display = "block";
    setTimeout(() => {
        alertBox.style.display = "none";
    }, 5000);
}

function setupCompareButtons() {
    const formBtn = document.getElementById("compareFormBtn");
    const countryBtn = document.getElementById("compareCountryBtn");

    if (formBtn) {
        formBtn.addEventListener("click", () => {
            formBtn.classList.toggle("active");
            countryBtn.classList.remove("active");
            fetchDataAndRenderChart(
                document.getElementById("chartType").value,
                formBtn.classList.contains("active") ? "form" : false
            );
        });
    }

    if (countryBtn) {
        countryBtn.addEventListener("click", () => {
            countryBtn.classList.toggle("active");
            formBtn.classList.remove("active");
            fetchDataAndRenderChart(
                document.getElementById("chartType").value,
                countryBtn.classList.contains("active") ? "country" : false
            );
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupCompareButtons();

    const typeSelector = document.getElementById("chartType");
    const formSelector = document.getElementById("formSelect");
    const innSelector = document.getElementById("innSelect");
    const countrySelector = document.getElementById("countrySelect");
    const saveBtn = document.getElementById("saveChartBtn");
    const atcSelect = document.getElementById("atcGroupSelect");


    function render() {
        const formActive = document.getElementById("compareFormBtn")?.classList.contains("active");
        const countryActive = document.getElementById("compareCountryBtn")?.classList.contains("active");
        const mode = formActive ? "form" : (countryActive ? "country" : false);
        fetchDataAndRenderChart(typeSelector.value, mode);
    }

    typeSelector.addEventListener("change", render);
    formSelector.addEventListener("change", render);
    innSelector.addEventListener("change", render);
    countrySelector.addEventListener("change", render);
    atcSelect.addEventListener("change", render);
    saveBtn.addEventListener("click", saveChartAsImage);

    render();
});