// Загрузка страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadAndChangeChoices();
});

async function loadAndChangeChoices() {
    const ticketOption = document.getElementById('Appeal_type_0');
    const chatOption = document.getElementById('Appeal_type_1');

    const chatTab = document.querySelector('.chat-field');
    const ticketTab = document.querySelector('.ticket-field');

    const disableDropDown = (dropDown) => {
        dropDown.style.pointerEvents = 'none';
        dropDown.style.opacity = '0.4';
        dropDown.querySelectorAll('select, input, textarea, button, li, div').forEach(el => el.disabled = true);
    };

    const enableDropDown = (dropDown) => {
        dropDown.style.pointerEvents = 'auto';
        dropDown.style.opacity = '1';
        dropDown.querySelectorAll('select, input, textarea, button, li, div').forEach(el => el.disabled = false);
    };

    const updateDropDowns = () => {
        if(chatOption.checked) {
            enableDropDown(chatTab)
            disableDropDown(ticketTab);
        } else if(ticketOption.checked) {
            enableDropDown(ticketTab);
            disableDropDown(chatTab);
        }
    };

    // Обработчики переключения
    chatOption.addEventListener('change', updateDropDowns);
    ticketOption.addEventListener('change', updateDropDowns);

    updateDropDowns();
}
