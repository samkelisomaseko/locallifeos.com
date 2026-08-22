/**
 * @module storage
 * localStorage-backed persistence helpers used across modules.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: none assigned explicitly; top-level function/var declarations become
 * browser globals consumed by inline handler attributes.
 */
    function saveTasksToLocalStorage() { localStorage.setItem('localLifeTasks', JSON.stringify(tasks)); }
    function loadTasksFromLocalStorage() {
        const storedTasks = localStorage.getItem('localLifeTasks');
        if (storedTasks) { tasks = JSON.parse(storedTasks); nextTaskId = Math.max(0, ...tasks.map(t=>t.id)) + 1; }
    }
    function saveHabitsToLocalStorage() { localStorage.setItem('localLifeHabits', JSON.stringify(habits)); }
    function loadHabitsFromLocalStorage() {
        const storedHabits = localStorage.getItem('localLifeHabits');
        if (storedHabits) { habits = JSON.parse(storedHabits); nextHabitId = Math.max(0, ...habits.map(h=>h.id)) + 1; }
    }
    function saveLoggedMoodsToLocalStorage() { localStorage.setItem('localLifeMoods', JSON.stringify(loggedMoods)); }
    function loadLoggedMoodsToLocalStorage() {
        const storedMoods = localStorage.getItem('localLifeMoods');
        if (storedMoods) { loggedMoods = JSON.parse(storedMoods); }
    }
    function saveDealsToLocalStorage() { localStorage.setItem('localLifeDeals', JSON.stringify(mockDeals)); }
    function loadDealsFromLocalStorage() {
        const storedDeals = localStorage.getItem('localLifeDeals');
        if (storedDeals) {
            mockDeals = JSON.parse(storedDeals);
            nextDealId = Math.max(0, ...mockDeals.map(d => d.id)) + 1;
        }
    }
    function savePlacesToLocalStorage() {
        localStorage.setItem('localLifePlaces', JSON.stringify(mockPlaces.all));
    }
    function loadPlacesFromLocalStorage() {
        const storedPlaces = localStorage.getItem('localLifePlaces');
        if (storedPlaces) {
            mockPlaces.all = JSON.parse(storedPlaces);
        }
        mockPlaces.saved = mockPlaces.all.filter(p => p.saved);
        mockPlaces.all.forEach(p => {
             if (!mockPlaces[p.type]) mockPlaces[p.type] = [];
             if (!mockPlaces[p.type].find(i => i.id === p.id)) mockPlaces[p.type].push(p);
        });
    }
    function saveChannelsToLocalStorage() { localStorage.setItem('localLifeChannels', JSON.stringify(mockChannels));}
    function loadChannelsFromLocalStorage() {
        const storedChannels = localStorage.getItem('localLifeChannels');
        if(storedChannels) {
            mockChannels = JSON.parse(storedChannels);
            nextChannelId = Math.max(0, ...mockChannels.map(c => c.id)) + 1;
            let maxMid = 0;
            mockChannels.forEach(c => {
                if(c.messages) c.messages.forEach(m => { 
                    if(m.mid > maxMid) maxMid = m.mid;
                    m.timestamp = new Date(m.timestamp);
                });
                if(c.lastMessageTimestamp) c.lastMessageTimestamp = new Date(c.lastMessageTimestamp);
            });
            nextMessageId = maxMid + 1;
        }
    }
    function saveUsersToLocalStorage() { localStorage.setItem('localLifeUsers', JSON.stringify(mockUsers));}
    function loadUsersFromLocalStorage() {
        const storedUsers = localStorage.getItem('localLifeUsers');
        if(storedUsers) {
            mockUsers = JSON.parse(storedUsers);
        }
        const userProfile = JSON.parse(localStorage.getItem('userProfile'));
        if(userProfile && mockUsers['user']){
            mockUsers['user'].name = userProfile.name;
            mockUsers['user'].username = userProfile.username;
            mockUsers['user'].bio = userProfile.bio;
            userName = userProfile.name.split(' ')[0]; 
        } else if (mockUsers['user']) {
            userName = mockUsers['user'].name.split(' ')[0];
        } else {
            userName = 'User';
        }
    }
    function loadAILearningPrefsFromLocalStorage() {
        const storedPrefs = localStorage.getItem('aiLearningPreferences');
        if(storedPrefs) {
            aiLearningPreferences = JSON.parse(storedPrefs);
        }
    }
    function saveNotificationsToLocalStorage() { localStorage.setItem('localLifeNotifications', JSON.stringify(mockNotifications));}
    function loadNotificationsFromLocalStorage() {
        const storedNotifications = localStorage.getItem('localLifeNotifications');
        if (storedNotifications) {
            mockNotifications = JSON.parse(storedNotifications).map(n => ({...n, timestamp: new Date(n.timestamp)}));
            nextNotificationId = Math.max(0, ...mockNotifications.map(n => n.id)) + 1;
        }
    }
    function loadNotificationPreferencesFromLocalStorage() {
        const storedPrefs = localStorage.getItem('notificationPreferences');
        if (storedPrefs) {
            notificationPreferences = JSON.parse(storedPrefs);
        }
    }
    function loadDashboardConfigFromLocalStorage() {
        const storedConfig = localStorage.getItem('dashboardCardConfig');
        if(storedConfig) {
            dashboardCardConfig = JSON.parse(storedConfig);
        }
    }
    function saveTrustedContactsToLocalStorage() { localStorage.setItem('localLifeTrustedContacts', JSON.stringify(trustedContacts)); }
    function loadTrustedContactsFromLocalStorage() {
        const stored = localStorage.getItem('localLifeTrustedContacts');
        if (stored) { trustedContacts = JSON.parse(stored); nextTrustedContactId = Math.max(0, ...trustedContacts.map(c => c.id)) + 1; }
    }
    function saveBulletinPostsToLocalStorage() { localStorage.setItem('localLifeBulletinPosts', JSON.stringify(bulletinPosts)); }
    function loadBulletinPostsFromLocalStorage() {
        const stored = localStorage.getItem('localLifeBulletinPosts');
        if (stored) { bulletinPosts = JSON.parse(stored); nextBulletinPostId = Math.max(0, ...bulletinPosts.map(p => p.id)) + 1; }
    }
    function saveSleepDataToLocalStorage() { localStorage.setItem('localLifeSleepData', JSON.stringify(sleepData)); }
    function loadSleepDataFromLocalStorage() {
        const stored = localStorage.getItem('localLifeSleepData');
        if (stored) { sleepData = JSON.parse(stored); }
        const storedDate = localStorage.getItem('lastSleepLogDate');
        if (storedDate) lastSleepLogDate = storedDate;
    }
    function saveGamificationDataToLocalStorage() {
        const data = { userLevel,userXP, xpToNextLevel, unlockedBadges: Array.from(unlockedBadges) };
        localStorage.setItem('localLifeGamification', JSON.stringify(data));
    }
    function loadGamificationDataFromLocalStorage() {
        const stored = localStorage.getItem('localLifeGamification');
        if (stored) {
            const data = JSON.parse(stored);
            userLevel = data.userLevel || 1;
            userXP = data.userXP || 0;
            xpToNextLevel = data.xpToNextLevel || 100;
            unlockedBadges = new Set(data.unlockedBadges || []);
        }
    }
    function saveAppletsToLocalStorage() { localStorage.setItem('localLifeApplets', JSON.stringify(mockApplets)); }
    function loadAppletsFromLocalStorage() {
        const stored = localStorage.getItem('localLifeApplets');
        if (stored) { mockApplets = JSON.parse(stored); }
    }
     function saveSubscriptionToLocalStorage() { localStorage.setItem('userSubscriptionTier', userSubscriptionTier); }
    function loadSubscriptionFromLocalStorage() {
        const stored = localStorage.getItem('userSubscriptionTier');
        if (stored) { userSubscriptionTier = stored; }
    }
    function saveIntegratedAppsToLocalStorage() { localStorage.setItem('localLifeIntegratedApps', JSON.stringify(integratedApps)); }
    function loadIntegratedAppsFromLocalStorage() {
        const stored = localStorage.getItem('localLifeIntegratedApps');
        if (stored) { integratedApps = JSON.parse(stored); }
    }
