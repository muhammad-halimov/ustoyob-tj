export const disableDropDown = (dropDown) => {
    dropDown.style.pointerEvents = 'none';
    dropDown.style.opacity = '0.4';
    dropDown.querySelectorAll('select, input, textarea').forEach(el => el.disabled = true);
};

export const enableDropDown = (dropDown) => {
    dropDown.style.pointerEvents = 'auto';
    dropDown.style.opacity = '1';
    dropDown.querySelectorAll('select, input, textarea').forEach(el => el.disabled = false);
};
