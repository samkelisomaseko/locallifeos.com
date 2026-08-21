    const loginScreen = document.getElementById('loginScreen');
    const signupScreen = document.getElementById('signupScreen');
    function showLoginScreen() {
        if (loginScreen) loginScreen.classList.add('active');
        if (signupScreen) signupScreen.classList.remove('active');
    }
    function showSignupScreen() {
        if (signupScreen) signupScreen.classList.add('active');
        if (loginScreen) loginScreen.classList.remove('active');
    }
    function handleLoginAttempt() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) {
            showToast("Please enter both email/username and password.", "error");
            return;
        }
        if ((email === "test@example.com" || email === (localStorage.getItem('userEmail') || 'test@example.com')) && password === "password") {
            localStorage.setItem('isLoggedIn', 'true');
            const storedProfile = JSON.parse(localStorage.getItem('userProfile'));
            if (storedProfile && storedProfile.name) {
                 userName = storedProfile.name.split(' ')[0];
            } else {
                 userName = "User";
                 localStorage.setItem('userProfile', JSON.stringify({ name: 'Demo User', username: '@demo_user', bio: 'New to LocalLife OS!' }));
            }
            authContainer.style.display = 'none';
            appContainer.classList.remove('hidden');
            initializeAppPostLogin();
            showToast(`Welcome back, ${userName}!`, "success");
        } else {
            showToast("Invalid credentials (Use: test@example.com / password)", "error");
        }
    }
    function handleSignupAttempt() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        if (!name || !email || !password || !confirmPassword) {
            showToast("Please fill all fields for signup.", "error");
            return;
        }
        if (password !== confirmPassword) {
            showToast("Passwords do not match.", "error");
            return;
        }
        const newUserName = name.split(' ')[0];
        const newUsernameHandle = '@' + newUserName.toLowerCase() + '_local';
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userProfile', JSON.stringify({ name: name, username: newUsernameHandle, bio: `Hi, I'm ${newUserName}!` }));
        userName = newUserName;
        if (!mockUsers['user']) {
            mockUsers['user'] = { id: 'user', name: name, username: newUsernameHandle, avatarUrl: `https://i.pravatar.cc/40?u=user`, bio: `Hi, I'm ${newUserName}!` };
            saveUsersToLocalStorage();
        } else {
            mockUsers['user'].name = name;
            mockUsers['user'].username = newUsernameHandle;
            mockUsers['user'].bio = `Hi, I'm ${newUserName}!`;
            saveUsersToLocalStorage();
        }
        authContainer.style.display = 'none';
        appContainer.classList.remove('hidden');
        initializeAppPostLogin();
        showToast(`Welcome to LocalLife OS, ${userName}! Account created.`, "success");
    }
    function handleLogout() {
        openConfirmationModal("Log Out?", "Are you sure you want to log out?", () => {
            localStorage.setItem('isLoggedIn', 'false');
            authContainer.style.display = 'flex';
            appContainer.classList.add('hidden');
            showLoginScreen();
            showToast("Logged out successfully.", "success");
        });
    }
    function initializeAppPostLogin() {
        loadUsersFromLocalStorage(); 
        loadTasksFromLocalStorage();
        loadHabitsFromLocalStorage();
        loadLoggedMoodsToLocalStorage();
        loadDealsFromLocalStorage();
        loadPlacesFromLocalStorage();
        loadChannelsFromLocalStorage(); 
        loadAILearningPrefsFromLocalStorage();
        loadNotificationPreferencesFromLocalStorage();
        loadNotificationsFromLocalStorage();
        loadDashboardConfigFromLocalStorage();
        loadTrustedContactsFromLocalStorage();
        loadBulletinPostsFromLocalStorage();
        loadSleepDataFromLocalStorage();
        loadGamificationDataFromLocalStorage();
        loadAppletsFromLocalStorage();
        loadSubscriptionFromLocalStorage();
        loadIntegratedAppsFromLocalStorage();
        if (typeof google !== 'undefined') initMap();
        native.requestNotificationPermission();
        const isDarkModeSaved = localStorage.getItem('darkMode') === 'true';
        if (isDarkModeSaved) {
            document.body.classList.add('dark-mode');
            if (darkModeToggleVisual) darkModeToggleVisual.classList.add('active');
            if (darkModeToggleContainer) darkModeToggleContainer.setAttribute('aria-checked', 'true');
        } else {
            if (darkModeToggleContainer) darkModeToggleContainer.setAttribute('aria-checked', 'false');
        }
        const savedTheme = localStorage.getItem('themeAccent');
        const defaultThemeColor = '#4DB6AC';
        let defaultThemeButton = Array.from(document.querySelectorAll('.theme-selector .theme-color-button i.theme-color-dot'))
                                .find(dot => dot.style.color.toUpperCase().includes(defaultThemeColor.toUpperCase()))?.parentElement;
        if (!defaultThemeButton && document.querySelector('.theme-selector .theme-color-button')) {
             defaultThemeButton = document.querySelector('.theme-selector .theme-color-button');
        }
        if (savedTheme) {
            const matchingButton = Array.from(document.querySelectorAll('.theme-selector .theme-color-button')).find(btn => {
                 const dot = btn.querySelector('.theme-color-dot');
                 return dot && dot.style.color.toUpperCase().includes(savedTheme.toUpperCase());
            });
            if (matchingButton) changeThemeAccent(savedTheme, matchingButton);
            else if (defaultThemeButton) changeThemeAccent(defaultThemeColor, defaultThemeButton);
        } else if (defaultThemeButton) changeThemeAccent(defaultThemeColor, defaultThemeButton);
        const savedAIPersonality = localStorage.getItem('aiPersonality');
        if (savedAIPersonality && aiPersonalitySelect) {
            currentAiPersonality = savedAIPersonality;
            aiPersonalitySelect.value = savedAIPersonality;
        }
        setActiveScreen('dashboard', true);
        updateAIData();
        setInterval(updateAIData, 30000);
        setInterval(cycleSafetyTicker, 7000);
        setInterval(checkTaskReminders, 60000);
        updateUnreadNotificationBadge();
        renderDashboardTasks();
        renderDealsOnDashboard();
        renderPinnedWidgets();
        renderTasks();
        generateCalendarPlaceholder();
        renderPlaces('all');
        renderChannels();
        renderHabits();
        updateProactiveSuggestions();
        showAIExploreSuggestion();
        updateWellnessTimeline();
        setupInputClearButtons();
        applyDashboardCustomization();
        fetchNewsSummary();
        updateGamificationUI('all');
        updateSubscriptionStatusUI();
        renderInstalledAppletsOnDashboard();
        renderServicesMarketplace();
        renderGovernanceHub();
        setDynamicTheme();
        if (aiChatArea.children.length === 0) {
            addMessageToAIChat('other', getAIPersonalityPrefix() + `Sanibonani ${userName}! I'm LocalLife AI. How can I help you? Try 'help'.`);
        }
        if (aiBottomSheet) aiBottomSheet.setAttribute('aria-hidden', 'true');
        if (aiFab) aiFab.setAttribute('aria-expanded', 'false');
        const lastBriefingDate = localStorage.getItem('lastBriefingDate');
        const todayDateString = new Date().toDateString();
        if (lastBriefingDate !== todayDateString) {
            showDailyBriefing();
            localStorage.setItem('lastBriefingDate', todayDateString);
        }
        document.getElementById('communitySearchInput').addEventListener('input', () => {
             const activeFilterButton = document.querySelector('.channel-list-toggle button.active');
             const currentFilter = activeFilterButton ? activeFilterButton.id.replace('show','').replace('Btn','').toLowerCase() : 'joined';
             renderChannels(currentFilter);
        });
        document.getElementById('newMessageSearchInput').addEventListener('input', renderNewMessageUserList);
        initializeLongPress();
    }
    document.addEventListener('DOMContentLoaded', () => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            authContainer.style.display = 'none';
            appContainer.classList.remove('hidden');
            initializeAppPostLogin();
        } else {
            authContainer.style.display = 'flex';
            appContainer.classList.add('hidden');
            showLoginScreen();
        }
    });
    showToast = function(message, type = "info", duration = 3000, isError = false) {
        if (!toastNotification) return;
        clearTimeout(toastTimeout);
        toastNotification.textContent = message;
        toastNotification.className = 'toast-notification';
        toastNotification.style.backgroundColor = '';
        toastNotification.style.color = '';
        if (type === "success") {
            toastNotification.style.backgroundColor = 'var(--success-color)';
            toastNotification.style.color = 'white';
        } else if (type === "error" || isError) {
            toastNotification.style.backgroundColor = 'var(--danger-color)';
            toastNotification.style.color = 'white';
        } else if (type === "ai_info") { 
            toastNotification.classList.add('ai-info-toast');
        } else if (type === "xp") {
            toastNotification.style.backgroundColor = 'var(--xp-color)';
            toastNotification.style.color = 'white';
        }
        toastNotification.classList.add('show');
        toastTimeout = setTimeout(() => {
            toastNotification.classList.remove('show');
        }, duration);
    }
    openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            
            const event = new CustomEvent('show', { bubbles: true });
            modal.dispatchEvent(event);
            
            currentOpenModalId = modalId;
            const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            const firstFocusableElement = modal.querySelector(focusableElements);
            if (firstFocusableElement) firstFocusableElement.focus();
        }
    }
    closeModal = function(modalIdToClose) {
        const modalToActOn = modalIdToClose || currentOpenModalId;
        if (!modalToActOn) return;
        const modal = document.getElementById(modalToActOn);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                if(modal.dataset.hiddenModal){
                    document.getElementById(modal.dataset.hiddenModal).style.display = '';
                    delete modal.dataset.hiddenModal;
                }
            }, 400); 
            if (modalToActOn === currentOpenModalId) currentOpenModalId = null;
            if (modalIdToClose === 'arViewModal') {
                const arVideo = document.getElementById('arVideo');
                if (arVideo && arVideo.srcObject) {
                    arVideo.srcObject.getTracks().forEach(track => track.stop());
                    arVideo.srcObject = null;
                }
            }
        }
    }
    function updateContextualFabIcon() {
        if (!aiFabIcon) return;
        const activeScreenId = document.querySelector('.screen.active')?.id;
        let newIcon = 'fa-brain';
        switch (activeScreenId) {
            case 'planner': newIcon = 'fa-wand-magic-sparkles'; break;
            case 'explore': newIcon = 'fa-route'; break;
            case 'wellness': newIcon = 'fa-chart-line'; break;
        }
        aiFabIcon.className = `fas ${newIcon}`;
    }
    setActiveScreen = function(screenId, skipScroll = false) {
        if (appContainer.classList.contains('full-page-active') && window.innerWidth <= 450) {
            appContainer.classList.remove('full-page-active');
            if (aiBottomSheet.classList.contains('active')) {
                aiBottomSheet.classList.remove('active');
                aiBottomSheet.setAttribute('aria-hidden', 'true');
            }
            if (specificChatView.classList.contains('active')) {
                specificChatView.classList.remove('active');
                specificChatView.classList.add('hidden');
            }
        }
        screens.forEach(screen => screen.classList.remove('active'));
        navItems.forEach(item => {
            item.classList.remove('active'); item.setAttribute('aria-selected', 'false');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
             if (screenId === 'chat') {
                channelListView.style.display = 'block';
                specificChatView.classList.add('hidden');
                specificChatView.classList.remove('active'); 
            }
        }
        else {
            document.getElementById('dashboard')?.classList.add('active');
            screenId = 'dashboard';
        }
        const targetNavItem = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active'); targetNavItem.setAttribute('aria-selected', 'true');
        }
        updateContextualFabIcon();
        if (!skipScroll) {
            const contentArea = document.querySelector('.content');
            if(contentArea) contentArea.scrollTop = 0;
        }
        if (currentOpenModalId && currentOpenModalId !== "aiBottomSheet" && currentOpenModalId !== "notificationsModal") {
            closeModal(currentOpenModalId);
        }
        if (screenId === 'chat' && document.getElementById('newChannelIconSelector') && !document.getElementById('newChannelIconSelector').hasChildNodes()) {
            populateIconSelector('newChannelIconSelector');
        }
        if (screenId === 'wellness') {
            if (document.getElementById('newHabitIconSelector') && !document.getElementById('newHabitIconSelector').hasChildNodes()) {
                populateIconSelector('newHabitIconSelector');
            }
            if (document.getElementById('newHabitColorSelector') && !document.getElementById('newHabitColorSelector').hasChildNodes()){
                 populateColorSelector('newHabitColorSelector');
            }
            updateWellnessTimeline();
            checkForWellnessPatterns();
        }
        if (screenId === 'explore') showAIExploreSuggestion();
        if (screenId === 'dashboard') {
            updateProactiveSuggestions();
            renderDealsOnDashboard();
            renderPinnedWidgets();
            applyDashboardCustomization();
        }
        if (screenId === 'planner' && aiPlannerSuggestionEl) {
            aiPlannerSuggestionEl.classList.add('hidden'); 
        }
        if (screenId === 'appStore') {
            renderApplets();
        }
        if (screenId === 'privacyDashboard') {
            renderPrivacyDashboard();
        }
    }
    updateAIData = function() {
        const aiGreetingEl = document.getElementById('aiGreeting');
        const localTimeDateEl = document.getElementById('localTimeDate');
        const now = new Date();
        const hours = now.getHours();
        let greeting = `Sanibonani, ${userName}!`;
        if (hours < 12) greeting = `Kusile, ${userName}!`;
        else if (hours < 18) greeting = `Good Afternoon, ${userName}!`;
        else greeting = `Good Evening, ${userName}!`;
        if (aiGreetingEl) aiGreetingEl.textContent = greeting;
        if (localTimeDateEl) {
             const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
             localTimeDateEl.textContent = now.toLocaleTimeString('en-US', options).replace(',', ' -');
        }
        setDynamicTheme();
        updateUnreadNotificationBadge();
        updateLiveLocationInfo();
    }
    function setDynamicTheme() {
        const hour = new Date().getHours();
        document.body.classList.remove('theme-evening', 'theme-night');
        if (hour >= 18 && hour < 22) {
            document.body.classList.add('theme-evening');
        } else if (hour >= 22 || hour < 5) {
            document.body.classList.add('theme-night');
        }
    }
    generateCalendarPlaceholder = function() {
        const calendarEl = document.getElementById('calendarPlaceholder');
        if (!calendarEl) return;
        calendarEl.innerHTML = '';
        const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day'; dayHeader.style.fontWeight = 'bold';
            dayHeader.textContent = day; calendarEl.appendChild(dayHeader);
        });
        const today = new Date().getDate();
        const currentMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
        for(let i=0; i < firstDayOfMonth; i++){
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day'; calendarEl.appendChild(emptyCell);
        }
        for (let i = 1; i <= currentMonthDays ; i++) {
            if (calendarEl.childElementCount >= 35 + daysOfWeek.length) break;
            const dayCell = document.createElement('div');
            dayCell.className = 'day'; dayCell.textContent = i;
            if (i === today) {
                dayCell.classList.add('today'); dayCell.setAttribute('aria-current', 'date');
                dayCell.setAttribute('aria-label', `Today, ${i}`);
            } else { dayCell.setAttribute('aria-label', `Date ${i}`); }
            const thisDateString = new Date(new Date().getFullYear(), new Date().getMonth(), i).toISOString().split('T')[0];
            const hasTask = tasks.some(t => t.dueDate === thisDateString && !t.completed);
            if (hasTask) {
                const dot = document.createElement('div');
                dot.className = 'calendar-task-dot';
                dayCell.appendChild(dot);
            }
            dayCell.onclick = () => openFullCalendar('tasks');
            calendarEl.appendChild(dayCell);
        }
    }
