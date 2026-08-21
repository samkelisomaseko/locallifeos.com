    const notificationListContainer = document.getElementById('notificationListContainer');
    const unreadNotificationBadge = document.getElementById('unreadNotificationBadge');
    function updateUnreadNotificationBadge() {
        if (!unreadNotificationBadge) return;
        const unreadCount = mockNotifications.filter(n => !n.read).length;
        unreadNotificationBadge.textContent = unreadCount;
        unreadNotificationBadge.classList.toggle('hidden', unreadCount === 0);
    }
    function renderNotifications() {
        if (!notificationListContainer) return;
        notificationListContainer.innerHTML = '';
        if (mockNotifications.length === 0) {
            notificationListContainer.innerHTML = `<li class="empty-state" style="padding:20px 0;"><i class="fas fa-bell-slash"></i><p>No notifications yet.</p></li>`;
            updateUnreadNotificationBadge();
            return;
        }
        mockNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(notif => {
            const item = document.createElement('li');
            item.className = `notification-item ${notif.read ? '' : 'unread'}`;
            item.setAttribute('role', 'listitem');
            let actionButtonsHtml = '';
            if (notif.type === 'task_reminder' && !tasks.find(t=>t.id === (notif.relatedId || -1))?.completed) {
                actionButtonsHtml = `<div class="action-buttons">
                    <button class="button button-secondary" style="font-size:0.8rem; padding:4px 8px;" onclick="event.stopPropagation(); toggleTaskStatus(${notif.relatedId})">Mark Done</button>
                    <button class="button button-secondary" style="font-size:0.8rem; padding:4px 8px;" onclick="event.stopPropagation(); showToast('Snoozing for 15 mins', 'info')">Snooze</button>
                </div>`;
            }
            item.innerHTML = `
                <i class="notification-icon ${notif.icon}" aria-hidden="true"></i>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-text">${notif.text}</div>
                    <div class="notification-timestamp">${new Date(notif.timestamp).toLocaleString()}</div>
                    ${actionButtonsHtml}
                </div>
            `;
            item.onclick = () => {
                const wasUnread = !notif.read;
                notif.read = true;
                if (notif.action && typeof notif.action === 'function') {
                    closeModal('notificationsModal');
                    notif.action();
                }
                if (wasUnread) {
                    renderNotifications(); 
                    updateUnreadNotificationBadge();
                    saveNotificationsToLocalStorage();
                }
            };
            notificationListContainer.appendChild(item);
        });
        updateUnreadNotificationBadge();
    }
    function showDailyBriefing() {
        if(!notificationPreferences.dailyBriefing) return;
        const weather = document.getElementById('currentWeather')?.textContent || "Partly cloudy";
        const taskCount = tasks.filter(t => t.dueDate === new Date().toISOString().split('T')[0] && !t.completed).length;
        const savedCafe = mockPlaces.all.find(p => p.saved && p.tags.includes('cafe'));
        let dealText = "";
        if (savedCafe) {
            const dealForCafe = mockDeals.find(d => d.businessName === savedCafe.name);
            if (dealForCafe) {
                dealText = ` Also, there's a new '${dealForCafe.title}' deal at '${dealForCafe.businessName}', one of your saved places.`;
            }
        }
        const safetyAlert = safetyTickerMessages.find(m => m.toLowerCase().includes('closure') || m.toLowerCase().includes('outage') || m.toLowerCase().includes('shedding'));
        let briefingText = `Kusile, ${userName}! It's ${weather}. You have ${taskCount} task${taskCount !== 1 ? 's' : ''} today.${dealText}`;
        if(safetyAlert) {
            briefingText += ` Heads up: ${safetyAlert.split('.')[0]}.`
        }
        const briefingNotification = {
            id: nextNotificationId++,
            icon: 'fas fa-sun',
            title: 'Your Daily Briefing',
            text: briefingText,
            timestamp: new Date(),
            read: false,
            type: 'daily_briefing',
            action: () => setActiveScreen('dashboard')
        };
        const existingBriefing = mockNotifications.find(n => n.type === 'daily_briefing' && new Date(n.timestamp).toDateString() === new Date().toDateString());
        if(!existingBriefing){
            mockNotifications.unshift(briefingNotification);
            renderNotifications();
            updateUnreadNotificationBadge();
            showDynamicIslandAlert('fas fa-sun', 'Your Daily Briefing is ready!');
            saveNotificationsToLocalStorage();
        }
    }
    window.showNotificationsPanel = function() {
        renderNotifications();
        openModal('notificationsModal');
    }
    window.markAllNotificationsRead = function() {
        mockNotifications.forEach(n => n.read = true);
        renderNotifications();
        updateUnreadNotificationBadge();
        saveNotificationsToLocalStorage();
        showToast("All notifications marked as read.", "success");
    }
    window.clearAllNotifications = function() {
        openConfirmationModal("Clear All Notifications?", "Are you sure you want to clear all notifications? This cannot be undone.", () => {
            mockNotifications = [];
            nextNotificationId = 1;
            renderNotifications();
            updateUnreadNotificationBadge();
            saveNotificationsToLocalStorage();
            showToast("All notifications cleared.", "success");
        });
    }
    window.showPulseDetailModal = function(itemName, itemIcon, itemDescription) {
        
        const safeItemName = itemName.replace(/'/g, "\\'");
        const safeItemDescription = itemDescription.replace(/'/g, "\\'");

        let modalBodyHtml = `
            <div class="text-center mb-3">
                <i class="${itemIcon} fa-3x" style="color: var(--primary-accent);"></i>
            </div>
            <p>${itemDescription}</p>
            <p class="mt-2 card-subtitle" style="font-size:0.8rem;">AI can provide related events, directions, or allow sharing from here.</p>
            <div class="mt-3" style="display:flex; gap:var(--space-sm);">
                <button class="button" style="flex:1;" onclick="getDirections('${safeItemName}')"><i class="fas fa-directions"></i> Get Directions</button>
                <button class="button button-secondary" style="flex:1;" onclick="shareContent('pulse', { title: '${safeItemName}', text: '${safeItemDescription}' })"><i class="fas fa-share-alt"></i> Share</button>
            </div>
        `;
        openGenericModal(itemName, modalBodyHtml);
    }
    function openFullCalendar(type) {
        currentCalendarType = type;
        calendarCurrentDate = new Date();
        renderFullCalendar();
        openModal('fullCalendarModal');
    }
    function navigateCalendar(monthOffset) {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + monthOffset);
        renderFullCalendar();
    }
    function renderFullCalendar() {
        const gridBody = document.getElementById('calendarGridBody');
        const modalTitle = document.getElementById('fullCalendarModalTitle');
        const detailPanel = document.getElementById('calendarDayDetailPanel');
        if (!gridBody || !modalTitle) return;
        gridBody.innerHTML = '';
        detailPanel.classList.add('hidden');
        const year = calendarCurrentDate.getFullYear();
        const month = calendarCurrentDate.getMonth();
        modalTitle.textContent = calendarCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDayOfMonth; i++) {
            gridBody.innerHTML += `<div class="calendar-day other-month"></div>`;
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            const thisDate = new Date(year, month, day);
            const thisDateString = thisDate.toISOString().split('T')[0];
            if (thisDateString === new Date().toISOString().split('T')[0]) {
                dayEl.classList.add('today');
            }
            let contentHtml = `<div class="day-number">${day}</div>`;
            if (currentCalendarType === 'tasks') {
                const tasksOnDay = tasks.filter(t => t.dueDate === thisDateString);
                if (tasksOnDay.length > 0) {
                    tasksOnDay.slice(0, 2).forEach(task => {
                        contentHtml += `<div class="task-indicator" style="background-color: var(--${{work:'moss-green',health:'soft-blue',errands:'muted-terracotta'}[task.category] || 'primary-accent'}); color: white;">${task.title}</div>`;
                    });
                     if (tasksOnDay.length > 2) contentHtml += `<div class="task-indicator" style="background: var(--warm-gray); color: var(--text-color);">+${tasksOnDay.length - 2} more</div>`;
                }
            } else if (currentCalendarType === 'moods') {
                const moodOnDay = loggedMoods.find(m => new Date(m.timestamp).toDateString() === thisDate.toDateString());
                if (moodOnDay) {
                    contentHtml += `<div class="mood-indicator">${moodOnDay.mood}</div>`;
                }
            }
            dayEl.innerHTML =contentHtml;
            dayEl.onclick = () => showCalendarDayDetails(thisDate);
            gridBody.appendChild(dayEl);
        }
    }
    function showCalendarDayDetails(date) {
        const detailPanel = document.getElementById('calendarDayDetailPanel');
        let detailHtml = `<h4>Details for ${date.toLocaleDateString()}</h4>`;
        let foundContent = false;
        if (currentCalendarType === 'tasks') {
            const tasksOnDay = tasks.filter(t => t.dueDate === date.toISOString().split('T')[0]);
            if (tasksOnDay.length > 0) {
                detailHtml += '<ul>';
                tasksOnDay.forEach(task => detailHtml += `<li>${task.completed ? '✅' : '⬜'} ${task.title}</li>`);
                detailHtml += '</ul>';
                foundContent = true;
            }
        } else if (currentCalendarType === 'moods') {
            const moodsOnDay = loggedMoods.filter(m => new Date(m.timestamp).toDateString() === date.toDateString());
            if(moodsOnDay.length > 0) {
                detailHtml += '<ul>';
                moodsOnDay.forEach(mood => detailHtml += `<li>${mood.mood} ${mood.note ? `- "${mood.note}"` : ''}</li>`);
                detailHtml += '</ul>';
                foundContent = true;
            }
        }
        if (!foundContent) {
            detailHtml += `<p class="card-subtitle">No ${currentCalendarType} logged for this day.</p>`;
        } else if (currentCalendarType === 'moods' && foundContent) {
            const moodsOnDay = loggedMoods.filter(m => new Date(m.timestamp).toDateString() === date.toDateString());
            detailHtml += `<p class="card-subtitle mt-2"><em>AI could analyze mood trends for this day of the week (e.g., "You tend to feel ${moodsOnDay[0].mood} on Mondays").</em></p>`;
        }
        detailPanel.innerHTML = detailHtml;
        detailPanel.classList.remove('hidden');
    }
    function openHabitStatsModal() {
        const statsBody = document.getElementById('habitStatsBody');
        const aiInsight = document.getElementById('habitStatsAIInsight');
        if (!statsBody || !aiInsight) return;
        let totalHabits = habits.length;
        if (totalHabits === 0) {
            statsBody.innerHTML = `<p class="text-center">No habits to show stats for yet.</p>`;
            aiInsight.classList.add('hidden');
            openModal('habitStatsModal');
            return;
        }
        let statsHtml = '';
        let totalCompletion = 0;
        let bestStreak = { name: '', streak: 0 };
        let mostConsistent = { name: '', rate: 0 };
        habits.forEach(habit => {
            const completionRate = habit.goal > 0 ? (habit.current / habit.goal) * 100 : 0;
            totalCompletion += completionRate;
            statsHtml += `
                <div class="habit-stat-item">
                    <div class="stat-title">${habit.name}</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${completionRate}%; background-color: ${habit.color};"></div>
                    </div>
                    <p class="card-subtitle mt-1" style="font-size: 0.8rem;">Today: ${Math.round(completionRate)}% | Streak: ${habit.streak} days</p>
                </div>
            `;
            if (habit.streak > bestStreak.streak) {
                bestStreak = { name: habit.name, streak: habit.streak };
            }
            if(completionRate > mostConsistent.rate) {
                 mostConsistent = { name: habit.name, rate: completionRate };
            }
        });
        const overallCompletion = totalCompletion / totalHabits;
        statsHtml = `<div class="habit-stat-item">
            <div class="stat-title"><strong>Overall Daily Completion</strong></div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${overallCompletion}%;"></div>
            </div>
            <p class="card-subtitle mt-1" style="font-size: 0.8rem;">Today you've completed <strong>${Math.round(overallCompletion)}%</strong> of your goals.</p>
        </div>` + statsHtml;
        statsBody.innerHTML = statsHtml;
        let insightText = `<i class="fas fa-brain"></i> <strong>AI Insight:</strong> `;
        if(bestStreak.streak > 5) {
            insightText += `You have an amazing ${bestStreak.streak}-day streak on "${bestStreak.name}"! This is your strongest habit. `;
        }
        if (overallCompletion < 50 && habits.length > 3) {
            insightText += `It looks like a busy day. To avoid feeling overwhelmed, maybe focus on completing just one key habit, like "${mostConsistent.name}".`;
        } else if (overallCompletion > 80) {
            insightText += `You're on fire today! Fantastic consistency. Consider adding a new, small habit to build on this momentum.`;
        } else {
             insightText += `Keep up the steady progress. Consistency is the key to building lasting habits.`;
        }
        aiInsight.innerHTML = insightText;
        aiInsight.classList.remove('hidden');
        openModal('habitStatsModal');
    }
    function openEmergencyDashboard() {
        openModal('emergencyDashboardModal');
        if (emergencyKeywordRecognition) {
            emergencyKeywordRecognition.start();
            showToast("AI Emergency Listener is active.", "ai_info");
        }
    }
    function alertTrustedCircle() {
        if(trustedContacts.length === 0){
            showToast("No trusted contacts configured. Please add them in Settings > Trusted Circle.", "error", 3000);
            return;
        }
        native.geolocation.getCurrent(
            position => {
                const { latitude, longitude } = position.coords;
                userLocationCoords = { lat: latitude, lng: longitude };
                const contacts = trustedContacts.map(c => c.phone).join(',');
                const message = encodeURIComponent(`Emergency alert from LocalLife OS: I may need help. My last known location is: https://maps.google.com/?q=${latitude},${longitude}`);
                window.location.href = `sms:${contacts}?body=${message}`;
                showToast("Opening messaging app to alert trusted circle...", "success", 3000);
            },
            () => {
                const contacts = trustedContacts.map(c => c.phone).join(',');
                const message = encodeURIComponent(`Emergency alert from LocalLife OS: I may need help. Unable to get current location.`);
                window.location.href = `sms:${contacts}?body=${message}`;
                showToast("Could not get location. Alerting without it...", "error", 3000);
            }
        );
    }
    function shareLiveLocation() {
        native.geolocation.getCurrent(
            position => {
                const { latitude, longitude } = position.coords;
                userLocationCoords = { lat: latitude, lng: longitude };
                const locationText = `Emergency! My live location is being shared from LocalLife OS. Current coordinates: ${latitude}, ${longitude}. Map: https://maps.google.com/?q=${latitude},${longitude}`;
                native.share('location', { text: locationText, title: 'Live Location' });
            }, () => {
                showToast("Could not get location. Please enable location services.", "error");
            }
        );
    }
    function openTrustedCircleModal() {
        renderTrustedContacts();
        openModal('trustedCircleModal');
    }
    function renderTrustedContacts() {
        const listEl = document.getElementById('trustedContactsList');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (trustedContacts.length === 0) {
            listEl.innerHTML = `<div class="setting-item"><span class="setting-label">No contacts added.</span></div>`;
        } else {
            trustedContacts.forEach(contact => {
                const itemEl = document.createElement('div');
                itemEl.className = 'setting-item';
                itemEl.innerHTML = `
                    <span class="setting-label">${contact.name} <span class="text-secondary">(${contact.phone})</span></span>
                    <button class="button danger" style="padding: 4px 8px; font-size: 0.8rem;" onclick="removeTrustedContact(${contact.id})">Remove</button>
                `;
                listEl.appendChild(itemEl);
            });
        }
    }
    function addTrustedContact() {
        const nameInput = document.getElementById('addContactName');
        const phoneInput = document.getElementById('addContactPhone');
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        if (!name || !phone) {
            showToast("Please enter both name and phone number.", "error");
            return;
        }
        trustedContacts.push({ id: nextTrustedContactId++, name, phone });
        nameInput.value = '';
        phoneInput.value = '';
        renderTrustedContacts();
        saveTrustedContactsToLocalStorage();
        showToast("Trusted contact added.", "success");
    }
    function removeTrustedContact(contactId) {
        trustedContacts = trustedContacts.filter(c => c.id !== contactId);
        renderTrustedContacts();
        saveTrustedContactsToLocalStorage();
        showToast("Trusted contact removed.", "info");
    }
    function openCreateBulletinPostModal() {
        document.getElementById('bulletinPostTitleInput').value = '';
        document.getElementById('bulletinPostContentInput').value = '';
        openModal('createBulletinPostModal');
    }
    function submitBulletinPost() {
        const title = document.getElementById('bulletinPostTitleInput').value.trim();
        const content = document.getElementById('bulletinPostContentInput').value.trim();
        const category = document.getElementById('bulletinPostCategorySelect').value;
        if (!title || !content) {
            showToast("Title and content are required.", "error");
            return;
        }

        if (category === 'alert') {
            openConfirmationModal("Submit Safety Alert?",
                "Alerts are reviewed by AI and human moderators for credibility before being shown to the community. Misuse may result in account suspension. Do you want to proceed?",
                () => {
                    finalizeBulletinPost(title, content, category);
                },
                { hideOnOpen: 'createBulletinPostModal' }
            );
        } else {
            finalizeBulletinPost(title, content, category);
        }
    }
    function finalizeBulletinPost(title, content, category) {
        const newPost = {
            id: Date.now(),
            title: title,
            content: content,
            category: category,
            authorId: 'user',
            timestamp: new Date(),
            comments: []
        };
        bulletinPosts.unshift(newPost);
        closeModal('createBulletinPostModal');
        saveBulletinPostsToLocalStorage();
        filterPlaces('my_posts', document.querySelector('[data-filter="my_posts"]'));
        showToast("Bulletin post submitted.", "success");
        addXP(15, 'community');
    }
