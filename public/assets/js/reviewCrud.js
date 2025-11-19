// Загрузка страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndChangeChoices();
});

async function loadAndChangeChoices() {
    const clientOption = document.getElementById('Review_type_0');
    const masterOption = document.getElementById('Review_type_1');
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
        if (clientOption.checked) {
            disableDropDown(serviceDropDown);
        } else {
            // Если ничего не выбрано — отключаем
            enableDropDown(serviceDropDown);
        }
    };

    // Обработчики переключения
    clientOption.addEventListener('change', updateDropDowns);
    masterOption.addEventListener('change', updateDropDowns);

    updateDropDowns();
}
