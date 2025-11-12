// Загрузка страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndChangeChoices();
});

async function loadAndChangeChoices() {
    const reviewerOption = document.getElementById('Review_forReviewer');
    const serviceDropDown = document.querySelector('.services-field');

    const disableDropDown = (dropDown) => {
        dropDown.style.pointerEvents = 'none';
        dropDown.style.opacity = '0.4';
        dropDown.querySelectorAll('select, input, textarea').forEach(el => el.disabled = true);
    };

    const enableDropDown = (dropDown) => {
        dropDown.style.pointerEvents = 'auto';
        dropDown.style.opacity = '1';
        dropDown.querySelectorAll('select, input, textarea').forEach(el => el.disabled = false);
    };

    const updateDropDowns = () => {
        if (reviewerOption.checked) {
            disableDropDown(serviceDropDown);
        } else {
            // Если ничего не выбрано — отключаем
            enableDropDown(serviceDropDown);
        }
    };

    // Обработчики переключения
    reviewerOption.addEventListener('change', updateDropDowns);

    updateDropDowns();
}
