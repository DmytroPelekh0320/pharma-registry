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
    return countryTranslation[original] || original;
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
    return translationMap[original] || original;
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

    if (
      selectedForms.length === 0 &&
      selectedInns.length === 0 &&
      selectedCountries.length === 0 &&
      selectedAtcGroups.length === 0 &&
      !compare // дозвіл на побудову лише якщо НЕ порівняння
    ) {
    showAlert("Щоб побудувати графік, оберіть хоча б один фільтр.");
    return;
    }

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

    // 🔹 Порівняння за формами
if (compare === "form" && type === "bar") {
    const ukraineRaw = data["Україна"] || {};
    const polandRaw = data["Польща"] || {};

    const formCounts = {};
    const labelsSet = new Set();

    // Збір даних по Україні
    for (const [form, count] of Object.entries(ukraineRaw)) {
        const unified = unifyFormName(form, "ukraine");
        if (!formCounts[unified]) formCounts[unified] = { ua: 0, pl: 0 };
        formCounts[unified].ua += count;
        labelsSet.add(unified);
    }

    // Збір даних по Польщі
    for (const [form, count] of Object.entries(polandRaw)) {
        const unified = unifyFormName(form, "poland");
        if (!formCounts[unified]) formCounts[unified] = { ua: 0, pl: 0 };
        formCounts[unified].pl += count;
        labelsSet.add(unified);
    }

    // Прибираємо ті, де обидві країни мають 0
    const labels = Array.from(labelsSet).filter(label =>
        formCounts[label].ua > 0 || formCounts[label].pl > 0
    );

    const uaData = labels.map(label => formCounts[label].ua);
    const plData = labels.map(label => formCounts[label].pl);

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Україна",
                    data: uaData,
                    backgroundColor: getColor(0)
                },
                {
                    label: "Польща",
                    data: plData,
                    backgroundColor: getColor(1)
                }
            ]
        },
        options: getOptions(true, "form")
    });
    return;
}


    // 🔹 Порівняння за країнами
    if (compare === "country" && type === "bar") {
    const ukraineRaw = data["Україна"] || {};
    const polandRaw = data["Польща"] || {};

    const countryCounts = {};
    const labelsSet = new Set();

    // Обробка України
    for (const [country, count] of Object.entries(ukraineRaw)) {
        const unified = unifyCountryName(country, "ukraine");
        if (!countryCounts[unified]) countryCounts[unified] = { ua: 0, pl: 0 };
        countryCounts[unified].ua += count;
        labelsSet.add(unified);
    }

    // Обробка Польщі
    for (const [country, count] of Object.entries(polandRaw)) {
        const unified = unifyCountryName(country, "poland");
        if (!countryCounts[unified]) countryCounts[unified] = { ua: 0, pl: 0 };
        countryCounts[unified].pl += count;
        labelsSet.add(unified);
    }

    // Відфільтровуємо країни без жодного значення
    const labels = Array.from(labelsSet).filter(label =>
        countryCounts[label].ua > 0 || countryCounts[label].pl > 0
    );

    const uaData = labels.map(label => countryCounts[label].ua);
    const plData = labels.map(label => countryCounts[label].pl);

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Україна",
                    data: uaData,
                    backgroundColor: getColor(0)
                },
                {
                    label: "Польща",
                    data: plData,
                    backgroundColor: getColor(1)
                }
            ]
        },
        options: getOptions(true, "country")
    });
    return;
}



    // 🔹 Порівняння за ATC-кодами
if (compare === "atc" && type === "bar") {
    const allAtcs = Array.from(new Set([
        ...Object.keys(data["Україна"] || {}),
        ...Object.keys(data["Польща"] || {})
    ])).sort();

    const ukraineData = allAtcs.map(code => data["Україна"]?.[code] || 0);
    const polandData = allAtcs.map(code => data["Польща"]?.[code] || 0);

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: allAtcs,
            datasets: [
                {
                    label: "Україна",
                    data: ukraineData,
                    backgroundColor: getColor(0)
                },
                {
                    label: "Польща",
                    data: polandData,
                    backgroundColor: getColor(1)
                }
            ]
        },
        options: getOptions(compare)
    });
    return;
}

 if (selectedAtcGroups.length > 0 && !compare) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Кількість",
                data: values,
                backgroundColor: labels.map((_, i) => getColor(i))
            }]
        },
        options: getOptions(true)
    });
    return;
}

        // 🔹 Універсальна перевірка для pie/line
    const isPieOrLine = type === "pie" || type === "line";
    const exactlyOneForm = selectedForms.length === 1 && selectedCountries.length === 0 && selectedAtcGroups.length === 0;
    const exactlyOneCountry = selectedCountries.length === 1 && selectedForms.length === 0 && selectedAtcGroups.length === 0;
    const exactlyOneAtc = selectedAtcGroups.length === 1 && selectedForms.length === 0 && selectedCountries.length === 0;

    if (isPieOrLine) {
        if (!(exactlyOneForm || exactlyOneCountry || exactlyOneAtc)) {
            showAlert("Щоб побудувати кругову або лінійну діаграму, оберіть рівно одну форму, або одну країну, або одну ATC-групу.");
            return;
        }

        const labels = Object.keys(data);
        const values = Object.values(data);
        const label =
            exactlyOneForm ? selectedForms[0] :
            exactlyOneCountry ? selectedCountries[0] :
            "Повні ATC-коди";

        if (labels.length === 0) {
            showAlert("Немає даних для побудови графіка за обраними фільтрами.");
            return;
        }

        chartInstance = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: values,
                    backgroundColor: labels.map((_, i) => getColor(i))
                }]
            },
            options: getOptions(compare, false)
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
            options: getOptions(compare)
        });
        return;
    }

    showAlert("Невідома комбінація параметрів.");
}


function getOptions(enableLegend = true, compareMode = null) {
    return {
        responsive: true,
        plugins: {
            tooltip: {
                mode: 'index',
                callbacks: {
                    label: function (context) {
                        if (compareMode === "form" || compareMode === "country" || compareMode === "atc") {
                            const value = context.raw;
                            return `${context.dataset.label}: ${value}`;
                        }
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
    const atcBtn = document.getElementById("compareAtcBtn");
    const typeSelector = document.getElementById("chartType");
    const atcSelector = document.getElementById("atcGroupSelect");

    if (formBtn) {
        formBtn.addEventListener("click", () => {
            const isActive = formBtn.classList.toggle("active");
            countryBtn.classList.remove("active");
            atcBtn.classList.remove("active");
            atcBtn.textContent = "Порівняти реєстри за ATC";

            if (isActive) {
                formBtn.textContent = "Повернутись до загальної побудови графіків";
                hideAllFiltersExceptForm();
                hideChartTypeSelector();
                hideOtherButtons(formBtn);
                fetchDataAndRenderChart("bar", "form");
            } else {
                formBtn.textContent = "Порівняти реєстри за формами";
                showAllFilters();
                showChartTypeSelector();
                showAllCompareButtons();
                fetchDataAndRenderChart(typeSelector.value, false);
            }
        });
    }

    if (countryBtn) {
        countryBtn.addEventListener("click", () => {
            const isActive = countryBtn.classList.toggle("active");
            formBtn.classList.remove("active");
            atcBtn.classList.remove("active");
            atcBtn.textContent = "Порівняти реєстри за ATC";

            if (isActive) {
                countryBtn.textContent = "Повернутись до загальної побудови графіків";
                hideAllFiltersExceptCountry();
                hideChartTypeSelector();
                hideOtherButtons(countryBtn);
                fetchDataAndRenderChart("bar", "country");
            } else {
                countryBtn.textContent = "Порівняти реєстри за країнами";
                showAllFilters();
                showChartTypeSelector();
                showAllCompareButtons();
                fetchDataAndRenderChart(typeSelector.value, false);
            }
        });
    }

    if (atcBtn) {
        atcBtn.addEventListener("click", () => {
            const isActive = atcBtn.classList.toggle("active");
            formBtn.classList.remove("active");
            countryBtn.classList.remove("active");

            if (isActive) {
                atcBtn.textContent = "Повернутись до загальної побудови графіків";
                hideAllFiltersExceptATC();
                hideChartTypeSelector();
                hideOtherButtons(atcBtn);
                fetchDataAndRenderChart("bar", "atc");

                atcSelector.addEventListener("change", () => {
                    fetchDataAndRenderChart("bar", "atc");
                });

            } else {
                atcBtn.textContent = "Порівняти реєстри за ATC";
                showAllFilters();
                showChartTypeSelector();
                showAllCompareButtons();
                fetchDataAndRenderChart(typeSelector.value, false);
            }
        });
    }

    // 🔹 Додаткові функції:
    function hideOtherButtons(activeBtn) {
        [formBtn, countryBtn, atcBtn].forEach(btn => {
            if (btn !== activeBtn) {
                btn.style.display = "none";
            }
        });
    }

    function showAllCompareButtons() {
        [formBtn, countryBtn, atcBtn].forEach(btn => {
            btn.style.display = "inline-block";
        });
    }

    function hideChartTypeSelector() {
        document.getElementById("chartTypeWrapper").style.display = "none";
    }

    function showChartTypeSelector() {
        document.getElementById("chartTypeWrapper").style.display = "block";
    }

    function hideAllFiltersExceptForm() {
        document.getElementById("formWrapper").style.display = "block";
        document.getElementById("innWrapper").style.display = "none";
        document.getElementById("countryWrapper").style.display = "none";
        document.getElementById("atcWrapper").style.display = "none";
    }

    function hideAllFiltersExceptCountry() {
        document.getElementById("formWrapper").style.display = "none";
        document.getElementById("innWrapper").style.display = "none";
        document.getElementById("countryWrapper").style.display = "block";
        document.getElementById("atcWrapper").style.display = "none";
    }

    function hideAllFiltersExceptATC() {
        document.getElementById("formWrapper").style.display = "none";
        document.getElementById("innWrapper").style.display = "none";
        document.getElementById("countryWrapper").style.display = "none";
        document.getElementById("atcWrapper").style.display = "block";
    }
}

function showAllFilters() {
        document.getElementById("formWrapper").style.display = "block";
        document.getElementById("innWrapper").style.display = "block";
        document.getElementById("countryWrapper").style.display = "block";
        document.getElementById("atcWrapper").style.display = "block";
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
    const atcActive = document.getElementById("compareAtcBtn")?.classList.contains("active");

    const mode = formActive ? "form" :
                 countryActive ? "country" :
                 atcActive ? "atc" : false;

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


function hideChartTypeSelector() {
    document.getElementById("chartTypeWrapper").style.display = "none";
}

function showChartTypeSelector() {
    document.getElementById("chartTypeWrapper").style.display = "block";
}
