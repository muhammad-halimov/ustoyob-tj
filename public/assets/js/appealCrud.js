// Загрузка страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndChangeChoices();
});

async function loadAndChangeChoices() {
    const ticketAppealOption = document.getElementById('Appeal_ticketAppeal');

    const ticketDropDown = document.querySelector('.ticket-field');
    const respondentDropDown = document.querySelector('.respondent-field');

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
        if (ticketAppealOption.checked) {
            disableDropDown(respondentDropDown);
            enableDropDown(ticketDropDown)
        } else {
            // Если ничего не выбрано — отключаем
            disableDropDown(ticketDropDown);
            enableDropDown(respondentDropDown);
        }
    };

    // Обработчики переключения
    ticketAppealOption.addEventListener('change', updateDropDowns);

    updateDropDowns();
}
