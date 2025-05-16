async function performSearch() {
    const data = {
        name: document.getElementById("name").value,
        form: document.getElementById("form").value,
        inn: document.getElementById("inn").value,
        country: document.getElementById("country").value,
        atc: document.getElementById("atc").value
    };

    try {
        const response = await fetch("/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const results = await response.json();
        renderResults(results);
        updateResultsInput(results);
    } catch (error) {
        console.error("Помилка під час пошуку:", error);
        document.getElementById("results").innerHTML = "<p>Сталася помилка при виконанні запиту.</p>";
    }
}

function renderResults(results) {
    const container = document.getElementById("results");
    container.innerHTML = "";

    if (!results || results.length === 0) {
        container.innerHTML = "<p>Нічого не знайдено.</p>";
        return;
    }

    const table = document.createElement("table");
    table.border = "1";

    const headerRow = table.insertRow();
    ["#", "Назва", "Форма", "МНН", "Країна", "ATC"].forEach(header => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
    });

    results.forEach((item, index) => {
        const row = table.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = item["Торгівельне найменування"];
        row.insertCell().textContent = item["Форма випуску"];
        row.insertCell().textContent = item["Міжнародне непатентоване найменування"] || "—";
        row.insertCell().textContent = item["Країна виробника"] || "—";
        row.insertCell().textContent = item["ATC"] || "—";
    });

    container.appendChild(table);
}

function updateResultsInput(data) {
    const input = document.getElementById("resultsInput");
    if (input) {
        input.value = JSON.stringify(data);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("searchForm");
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            performSearch();
        });
    }
});
