// Загрузка страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndChangeChoices();
});

async function loadAndChangeChoices() {
    const serviceOption = document.getElementById('Ticket_service');

    const authorDropDown = document.querySelector('.author-field');
    const masterDropDown = document.querySelector('.master-field');

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
        if (serviceOption.checked) {
            disableDropDown(authorDropDown);
            enableDropDown(masterDropDown);
        } else {
            // Если ничего не выбрано — отключаем
            enableDropDown(authorDropDown);
            disableDropDown(masterDropDown);
        }
    };

    // Обработчики переключения
    serviceOption.addEventListener('change', updateDropDowns);

    updateDropDowns();
}
