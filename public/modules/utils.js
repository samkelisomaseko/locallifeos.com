/**
 * @module utils
 * Shared UI utilities: modal Escape handling, icon/color pickers, input clear buttons.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: none assigned explicitly; top-level function/var declarations become
 * browser globals consumed by inline handler attributes.
 */
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && currentOpenModalId) closeModal(currentOpenModalId); });
    function trackUserAction(action) {
        lastUserAction = action;
    }
    function populateIconSelector(selectorId, selectedIconClass = null) {
        const selector = document.getElementById(selectorId);
        if(!selector) return;
        selector.innerHTML = '';
        availableIcons.forEach(iconClass => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'icon-option';
            if (iconClass === selectedIconClass) option.classList.add('selected');
            option.innerHTML = `<i class="${iconClass}"></i>`;
            option.dataset.icon = iconClass;
            option.setAttribute('role', 'radio');
            option.setAttribute('aria-checked', iconClass === selectedIconClass ? 'true' : 'false');
            option.setAttribute('aria-label', iconClass.replace('fas fa-', '')); 
            option.onclick = () => {
                selector.querySelectorAll('.icon-option').forEach(el => {
                    el.classList.remove('selected');
                    el.setAttribute('aria-checked', 'false');
                });
                option.classList.add('selected');
                option.setAttribute('aria-checked', 'true');
            };
            selector.appendChild(option);
        });
    }
     function populateColorSelector(selectorId, selectedColorValue = null) {
        const selector = document.getElementById(selectorId);
        if(!selector) return;
        selector.innerHTML = '';
        availableColors.forEach(colorValue => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'icon-option'; 
            if (colorValue === selectedColorValue) option.classList.add('selected');
            
            const colorDot = document.createElement('div');
            colorDot.style.width = '24px';
            colorDot.style.height = '24px';
            colorDot.style.borderRadius = '50%';
            colorDot.style.backgroundColor = colorValue;
            colorDot.style.border = '1px solid rgba(0,0,0,0.1)'; 

            option.appendChild(colorDot);
            option.dataset.color = colorValue;
            option.setAttribute('role', 'radio');
            option.setAttribute('aria-checked', colorValue === selectedColorValue ? 'true' : 'false');
            option.setAttribute('aria-label', `Color ${colorValue}`); 
            option.onclick = () => {
                selector.querySelectorAll('.icon-option').forEach(el => {
                    el.classList.remove('selected');
                    el.setAttribute('aria-checked', 'false');
                });
                option.classList.add('selected');
                option.setAttribute('aria-checked', 'true');
            };
            selector.appendChild(option);
        });
    }
    function clearInputField(inputId, buttonEl) {
        const inputField = document.getElementById(inputId);
        if (inputField) inputField.value = '';
        if (buttonEl) buttonEl.classList.add('hidden');
        if (inputField) inputField.focus();
        if (inputId === 'exploreSearchInput') handleExploreSearch(true);
    }
    function setupInputClearButtons() {
        const inputsWithClear = [
            { inputId: 'newTaskInput', clearBtnId: 'clearNewTaskInput' },
            { inputId: 'exploreSearchInput', clearBtnId: 'clearExploreSearchInput' }
        ];
        inputsWithClear.forEach(item => {
            const input = document.getElementById(item.inputId);
            const btn = document.getElementById(item.clearBtnId);
            if (input && btn) {
                input.addEventListener('input', () => {
                    btn.classList.toggle('hidden', input.value === '');
                });
                btn.classList.toggle('hidden', input.value === '');
            }
        });
    }
    navItems.forEach(item => item.addEventListener('click', () => {
        trackUserAction(`Tapped Nav: ${item.dataset.screen}`);
        setActiveScreen(item.dataset.screen);
        if (navigator.vibrate) navigator.vibrate(10); 
    }));
