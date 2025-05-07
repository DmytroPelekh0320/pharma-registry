let chartInstance = null;

async function fetchDataAndRenderChart(type = "bar") {
    const formSelect = document.getElementById("formSelect");
    const selectedForms = Array.from(formSelect.selectedOptions).map(opt => opt.value);

    const response = await fetch("/chart-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_forms: selectedForms })
    });

    const data = await response.json();
    const labels = Object.keys(data);
    const values = Object.values(data);

    const ctx = document.getElementById("releaseChart").getContext("2d");

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: "Кількість",
                data: values,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: type === "bar" || type === "line" ? {
                y: { beginAtZero: true }
            } : {}
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const typeSelector = document.getElementById("chartType");
    const formSelector = document.getElementById("formSelect");

    function render() {
        fetchDataAndRenderChart(typeSelector.value);
    }

    typeSelector.addEventListener("change", render);
    formSelector.addEventListener("change", render);

    render(); // Початкове завантаження
});
