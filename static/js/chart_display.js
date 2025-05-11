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
            scales: type === "bar" || type === "line" ? {
                y: { beginAtZero: true }
            } : {}
        }
    });
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
    const saveBtn = document.getElementById("saveChartBtn");

    function render() {
        fetchDataAndRenderChart(typeSelector.value);
    }

    typeSelector.addEventListener("change", render);
    formSelector.addEventListener("change", render);
    saveBtn.addEventListener("click", saveChartAsImage);

    render(); // Початкове завантаження
});
