async function performSearch() {
  const name = document.getElementById("name").value;
  const form = document.getElementById("form").value;
  const inn = document.getElementById("inn").value;

  try {
      const response = await fetch("/search", {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({ name, form, inn })
      });

      const data = await response.json();
      renderResults(data);
      updateResultsInput(data);
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
  ["Назва", "Форма", "МНН"].forEach(header => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
  });

  results.forEach(item => {
      const row = table.insertRow();
      row.insertCell().textContent = item["Торгівельне найменування"];
      row.insertCell().textContent = item["Форма випуску"];
      row.insertCell().textContent = item["Міжнародне непатентоване найменування"] || "—";
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
          e.preventDefault(); // Забороняємо стандартну відправку
          performSearch();
      });
  }
});