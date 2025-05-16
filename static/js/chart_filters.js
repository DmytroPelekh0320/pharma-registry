document.addEventListener("DOMContentLoaded", function () {
    const formSelect = new TomSelect("#formSelect", { plugins: ['remove_button'] });
    const innSelect = new TomSelect("#innSelect", { plugins: ['remove_button'] });
    const countrySelect = new TomSelect("#countrySelect", { plugins: ['remove_button'] });
    const atcSelect = new TomSelect("#atcGroupSelect", { plugins: ['remove_button'] });


    let filtersSet = false;

    if (window.presetForm) {
        formSelect.setValue([window.presetForm]);
        filtersSet = true;
    }
    if (window.presetInn) {
        innSelect.setValue([window.presetInn]);
        filtersSet = true;
    }
    if (window.presetCountry) {
        countrySelect.setValue([window.presetCountry]);
        filtersSet = true;
    }
    
    if (window.presetAtc) {
        atcSelect.setValue([window.presetAtc]);
        filtersSet = true;
    }

    // Автоматичний рендер після встановлення фільтрів
    if (filtersSet && typeof window.fetchDataAndRenderChart === "function") {
        const chartType = document.getElementById("chartType").value;
        fetchDataAndRenderChart(chartType);
    }
});
