// Загрузка страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndChangeChoices();
});

async function loadAndChangeChoices() {
    const ticketAppealOption = document.getElementById('Appeal_ticketAppeal');
    const compliantOption = document.getElementById('Appeal_type_0');
    const supportOption = document.getElementById('Appeal_type_1');

    const ticketDropDown = document.querySelector('.ticket-field');
    const respondentDropDown = document.querySelector('.respondent-field');
    const supportDropDown = document.querySelector('.support-field');
    const compliantDropDown = document.querySelector('.compliant-field');
    const statusDropDown = document.querySelector('.status-field');
    const priorityDropDown = document.querySelector('.priority-field');
    const administrantDropDown = document.querySelector('.administrant-field');

    const disableDropDown = (dropDown) => {
        dropDown.style.pointerEvents = 'none';
        dropDown.style.opacity = '0.4';
        dropDown.querySelectorAll('select, input, textarea, button').forEach(el => el.disabled = true);
    };

    const enableDropDown = (dropDown) => {
        dropDown.style.pointerEvents = 'auto';
        dropDown.style.opacity = '1';
        dropDown.querySelectorAll('select, input, textarea, button').forEach(el => el.disabled = false);
    };

    const updateDropDowns = () => {
        if (ticketAppealOption.checked) {
            disableDropDown(respondentDropDown);
            enableDropDown(ticketDropDown);
        } else {
            // Если ничего не выбрано — отключаем
            disableDropDown(ticketDropDown);
            enableDropDown(respondentDropDown);
        }

        if(supportOption.checked) {
            disableDropDown(ticketAppealOption);
            disableDropDown(compliantDropDown);
            disableDropDown(respondentDropDown);
            disableDropDown(ticketDropDown);

            enableDropDown(supportDropDown);
            enableDropDown(statusDropDown);
            enableDropDown(priorityDropDown);
            enableDropDown(administrantDropDown);
        } else if(compliantOption.checked) {
            enableDropDown(ticketAppealOption);
            enableDropDown(compliantDropDown);
            enableDropDown(respondentDropDown);

            disableDropDown(supportDropDown);
            disableDropDown(statusDropDown);
            disableDropDown(priorityDropDown);
            disableDropDown(administrantDropDown);
        }
    };

    // Обработчики переключения
    ticketAppealOption.addEventListener('change', updateDropDowns);
    supportOption.addEventListener('change', updateDropDowns);
    compliantOption.addEventListener('change', updateDropDowns);

    updateDropDowns();
}
