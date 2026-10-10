/**
 * @module storage
 * localStorage-backed persistence helpers used across modules.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: none assigned explicitly; top-level function/var declarations become
 * browser globals consumed by inline handler attributes.
 */
    function saveTasksToLocalStorage() { LLOS_Cache.rawSet('localLifeTasks', JSON.stringify(tasks)); }
    function loadTasksFromLocalStorage() {
        const storedTasks = LLOS_Cache.rawGet('localLifeTasks');
        if (storedTasks) { tasks = JSON.parse(storedTasks); nextTaskId = Math.max(0, ...tasks.map(t=>t.id)) + 1; }
    }
    function saveHabitsToLocalStorage() { LLOS_Cache.rawSet('localLifeHabits', JSON.stringify(habits)); }
    function loadHabitsFromLocalStorage() {
        const storedHabits = LLOS_Cache.rawGet('localLifeHabits');
        if (storedHabits) { habits = JSON.parse(storedHabits); nextHabitId = Math.max(0, ...habits.map(h=>h.id)) + 1; }
    }
    function saveLoggedMoodsToLocalStorage() { LLOS_Cache.rawSet('localLifeMoods', JSON.stringify(loggedMoods)); }
    function loadLoggedMoodsToLocalStorage() {
        const storedMoods = LLOS_Cache.rawGet('localLifeMoods');
        if (storedMoods) { loggedMoods = JSON.parse(storedMoods); }
    }
    function saveDealsToLocalStorage() { LLOS_Cache.rawSet('localLifeDeals', JSON.stringify(mockDeals)); }
    function loadDealsFromLocalStorage() {
        const storedDeals = LLOS_Cache.rawGet('localLifeDeals');
        if (storedDeals) {
            mockDeals = JSON.parse(storedDeals);
            nextDealId = Math.max(0, ...mockDeals.map(d => d.id)) + 1;
        }
    }
    function savePlacesToLocalStorage() {
        LLOS_Cache.rawSet('localLifePlaces', JSON.stringify(mockPlaces.all));
    }
    function loadPlacesFromLocalStorage() {
        const storedPlaces = LLOS_Cache.rawGet('localLifePlaces');
        if (storedPlaces) {
            mockPlaces.all = JSON.parse(storedPlaces);
        }
        mockPlaces.saved = mockPlaces.all.filter(p => p.saved);
        mockPlaces.all.forEach(p => {
             if (!mockPlaces[p.type]) mockPlaces[p.type] = [];
             if (!mockPlaces[p.type].find(i => i.id === p.id)) mockPlaces[p.type].push(p);
        });
    }
    function saveChannelsToLocalStorage() { LLOS_Cache.rawSet('localLifeChannels', JSON.stringify(mockChannels));}
    function loadChannelsFromLocalStorage() {
        const storedChannels = LLOS_Cache.rawGet('localLifeChannels');
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
    function saveUsersToLocalStorage() { LLOS_Cache.rawSet('localLifeUsers', JSON.stringify(mockUsers));}
    function loadUsersFromLocalStorage() {
        const storedUsers = LLOS_Cache.rawGet('localLifeUsers');
        if(storedUsers) {
            mockUsers = JSON.parse(storedUsers);
        }
        const userProfile = JSON.parse(LLOS_Cache.rawGet('userProfile'));
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
        const storedPrefs = LLOS_Cache.rawGet('aiLearningPreferences');
        if(storedPrefs) {
            aiLearningPreferences = JSON.parse(storedPrefs);
        }
    }
    function saveNotificationsToLocalStorage() { LLOS_Cache.rawSet('localLifeNotifications', JSON.stringify(mockNotifications));}
    function loadNotificationsFromLocalStorage() {
        const storedNotifications = LLOS_Cache.rawGet('localLifeNotifications');
        if (storedNotifications) {
            mockNotifications = JSON.parse(storedNotifications).map(n => ({...n, timestamp: new Date(n.timestamp)}));
            nextNotificationId = Math.max(0, ...mockNotifications.map(n => n.id)) + 1;
        }
    }
    function loadNotificationPreferencesFromLocalStorage() {
        const storedPrefs = LLOS_Cache.rawGet('notificationPreferences');
        if (storedPrefs) {
            notificationPreferences = JSON.parse(storedPrefs);
        }
    }
    function loadDashboardConfigFromLocalStorage() {
        const storedConfig = LLOS_Cache.rawGet('dashboardCardConfig');
        if(storedConfig) {
            dashboardCardConfig = JSON.parse(storedConfig);
        }
    }
    function saveTrustedContactsToLocalStorage() { LLOS_Cache.rawSet('localLifeTrustedContacts', JSON.stringify(trustedContacts)); }
    function loadTrustedContactsFromLocalStorage() {
        const stored = LLOS_Cache.rawGet('localLifeTrustedContacts');
        if (stored) { trustedContacts = JSON.parse(stored); nextTrustedContactId = Math.max(0, ...trustedContacts.map(c => c.id)) + 1; }
    }
    function saveBulletinPostsToLocalStorage() { LLOS_Cache.rawSet('localLifeBulletinPosts', JSON.stringify(bulletinPosts)); }
    function loadBulletinPostsFromLocalStorage() {
        const stored = LLOS_Cache.rawGet('localLifeBulletinPosts');
        if (stored) { bulletinPosts = JSON.parse(stored); nextBulletinPostId = Math.max(0, ...bulletinPosts.map(p => p.id)) + 1; }
    }
    function saveSleepDataToLocalStorage() { LLOS_Cache.rawSet('localLifeSleepData', JSON.stringify(sleepData)); }
    function loadSleepDataFromLocalStorage() {
        const stored = LLOS_Cache.rawGet('localLifeSleepData');
        if (stored) { sleepData = JSON.parse(stored); }
        const storedDate = LLOS_Cache.rawGet('lastSleepLogDate');
        if (storedDate) lastSleepLogDate = storedDate;
    }
    function saveGamificationDataToLocalStorage() {
        const data = { userLevel,userXP, xpToNextLevel, unlockedBadges: Array.from(unlockedBadges) };
        LLOS_Cache.rawSet('localLifeGamification', JSON.stringify(data));
    }
    function loadGamificationDataFromLocalStorage() {
        const stored = LLOS_Cache.rawGet('localLifeGamification');
        if (stored) {
            const data = JSON.parse(stored);
            userLevel = data.userLevel || 1;
            userXP = data.userXP || 0;
            xpToNextLevel = data.xpToNextLevel || 100;
            unlockedBadges = new Set(data.unlockedBadges || []);
        }
    }
    function saveAppletsToLocalStorage() { LLOS_Cache.rawSet('localLifeApplets', JSON.stringify(mockApplets)); }
    function loadAppletsFromLocalStorage() {
        const stored = LLOS_Cache.rawGet('localLifeApplets');
        if (stored) { mockApplets = JSON.parse(stored); }
    }
     function saveSubscriptionToLocalStorage() { LLOS_Cache.rawSet('userSubscriptionTier', userSubscriptionTier); }
    function loadSubscriptionFromLocalStorage() {
        const stored = LLOS_Cache.rawGet('userSubscriptionTier');
        if (stored) { userSubscriptionTier = stored; }
    }
    function saveIntegratedAppsToLocalStorage() { LLOS_Cache.rawSet('localLifeIntegratedApps', JSON.stringify(integratedApps)); }
    function loadIntegratedAppsFromLocalStorage() {
        const stored = LLOS_Cache.rawGet('localLifeIntegratedApps');
        if (stored) { integratedApps = JSON.parse(stored); }
    }
