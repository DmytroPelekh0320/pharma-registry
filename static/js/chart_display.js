let chartInstance = null;

async function fetchDataAndRenderChart(type = "bar") {
  const formSelect = document.getElementById("formSelect");
  const innSelect = document.getElementById("innSelect");
  const countrySelect = document.getElementById("countrySelect");

  const selectedForms = Array.from(formSelect.selectedOptions).map(opt => opt.value);
  const selectedInns = Array.from(innSelect.selectedOptions).map(opt => opt.value);
  const selectedCountries = Array.from(countrySelect.selectedOptions).map(opt => opt.value);

  const response = await fetch("/chart-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          selected_forms: selectedForms,
          selected_inns: selectedInns,
          selected_countries: selectedCountries
      })
  });

  const data = await response.json(); // { форма: { країна: кількість } }
  const allForms = Object.keys(data);

  const ctx = document.getElementById("releaseChart").getContext("2d");
  if (chartInstance) {
      chartInstance.destroy();
  }

  // ГРУПОВАНА СТОВПЧАСТА
  if (type === "bar") {
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
          options: {
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
                  legend: { position: 'top' }
              },
              scales: {
                  x: { stacked: false },
                  y: {
                      beginAtZero: true,
                      ticks: { precision: 0 }
                  }
              }
          }
      });
  }

  // КРУГОВІ / ЛІНІЙНІ — лише по 1 країні
  else {
      if (selectedCountries.length !== 1) {
          alert("Для цього типу графіка виберіть одну країну.");
          return;
      }

      const country = selectedCountries[0];
      const values = allForms.map(form => data[form][country] || 0);

      chartInstance = new Chart(ctx, {
          type: type,
          data: {
              labels: allForms,
              datasets: [{
                  label: country,
                  data: values,
                  backgroundColor: allForms.map((_, i) => getColor(i))
              }]
          },
          options: {
              responsive: true,
              plugins: {
                  tooltip: {
                      callbacks: {
                          label: function (context) {
                              const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                              const value = context.raw;
                              const percent = ((value / total) * 100).toFixed(1);
                              return `${context.label}: ${value} (${percent}%)`;
                          }
                      }
                  }
              },
              scales: type === "line" ? {
                  y: { beginAtZero: true }
              } : {}
          }
      });
  }
}


function getColor(index) {
    const colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
        "#6366f1", "#ec4899", "#22d3ee", "#a855f7",
        "#14b8a6", "#f97316", "#8b5cf6"
    ];
    return colors[index % colors.length];
}

function saveChartAsImage() {
    const canvas = document.getElementById("releaseChart");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "chart.png";
    link.click();
}

document.addEventListener("DOMContentLoaded", function () {
    const typeSelector = document.getElementById("chartType");
    const formSelector = document.getElementById("formSelect");
    const innSelector = document.getElementById("innSelect");
    const countrySelector = document.getElementById("countrySelect");
    const saveBtn = document.getElementById("saveChartBtn");

    function render() {
        fetchDataAndRenderChart(typeSelector.value);
    }

    typeSelector.addEventListener("change", render);
    formSelector.addEventListener("change", render);
    innSelector.addEventListener("change", render);
    countrySelector.addEventListener("change", render);
    saveBtn.addEventListener("click", saveChartAsImage);

    render(); // Початкове завантаження
});
