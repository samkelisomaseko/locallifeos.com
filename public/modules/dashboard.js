    function getSkeletonTaskItem() {
        return `
            <div class="skeleton-list-item">
                <div class="skeleton-checkbox"></div>
                <div style="flex-grow:1;">
                    <div class="skeleton-text-line long"></div>
                    <div class="skeleton-text-line short"></div>
                </div>
            </div>`;
    }
    function getSkeletonPlaceCard() { 
        return `
            <article class="skeleton-card card no-press">
                <div class="skeleton-avatar" style="width:60px; height:60px; border-radius:var(--border-radius-md);"></div>
                <div class="skeleton-info">
                    <div class="skeleton-item title" style="height:16px; width:70%;"></div>
                    <div class="skeleton-item text" style="height:10px; width:90%;"></div>
                    <div class="skeleton-item text-short" style="height:10px; width:50%;"></div>
                </div>
            </article>`;
    }
    function getSkeletonChannelItem() {
        return `
            <div class="channel-item skeleton-list-item" style="padding: 12px 15px !important; align-items: center; background:var(--card-bg);">
                <div class="skeleton-avatar" style="width:48px; height:48px; border-radius:50%; margin-right: 12px;"></div>
                <div style="flex-grow:1;">
                    <div class="skeleton-text-line long" style="height:16px; width:60%; margin-bottom:4px;"></div>
                    <div class="skeleton-text-line short" style="height:12px; width:80%;"></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                     <div class="skeleton-item" style="height:10px; width:30px; margin-bottom:5px;"></div>
                     <div class="skeleton-item" style="height:18px; width:18px; border-radius:50%;"></div>
                </div>
            </div>`;
    }
    function getSkeletonHabitItem() {
         return `
            <div class="skeleton-list-item">
                 <div style="flex-grow:1;">
                    <div class="skeleton-text-line long"></div>
                    <div class="skeleton-text-line short"></div>
                </div>
                <div class="skeleton-avatar" style="width:40px; height:40px; border-radius:50%;"></div>
            </div>`;
    }
     function getSkeletonPinnedWidget() {
        return `
            <div class="pinned-widget-item">
                <div class="skeleton-item" style="width: 20px; height: 20px; border-radius: 4px; margin-bottom: 8px;"></div>
                <div class="skeleton-item title" style="width: 80%; height: 10px; margin-bottom: 5px;"></div>
                <div class="skeleton-item text-short" style="width: 60%; height: 12px;"></div>
            </div>`;
    }
    function renderDashboardTasks() {
        const container = document.getElementById('dashboardTaskList');
        const aiInsightContainer = document.getElementById('aiDashboardInsight');
        if (!container || !aiInsightContainer) return;
        container.innerHTML = Array(2).fill(getSkeletonTaskItem()).join('');
        container.setAttribute('aria-busy', 'true');
        aiInsightContainer.classList.add('hidden');
        setTimeout(() => {
            container.innerHTML = ''; 
            const today = new Date().toISOString().split('T')[0];
            const upcomingTasks = tasks.filter(t => !t.completed && (t.dueDate === today || t.dueDate === "Today" || !t.dueDate)).slice(0, 3); 
            if (upcomingTasks.length === 0) {
                container.innerHTML = `<div class="empty-state" style="padding:10px 0;"><i class="fas fa-check-circle"></i><p>All tasks done for now!</p></div>`;
                 aiInsightContainer.innerHTML = `<i class="fas fa-brain"></i> AI: Great job clearing your tasks, ${userName}! Time to relax or plan something fun.`;
                 aiInsightContainer.classList.remove('hidden');
            } else {
                upcomingTasks.forEach(task => {
                     const taskEl = document.createElement('div');
                     taskEl.className = 'task-item'; 
                     taskEl.setAttribute('role', 'listitem');
                     taskEl.innerHTML = `
                        <button class="task-checkbox-button" onclick="toggleTaskStatus(${task.id}, true)" aria-label="${task.completed ? 'Mark as incomplete' : 'Mark as complete'} ${task.title}">
                            <div class="task-checkbox ${task.completed ? 'completed' : ''}">${task.completed ? '<i class="fas fa-check"></i>' : ''}</div>
                        </button>
                        <div class="task-info">
                            <div class="task-title">${task.title}</div>
                        </div>
                        <div class="task-time">${task.time}</div>
                     `;
                     container.appendChild(taskEl);
                });
                const todayStr = new Date().toISOString().split('T')[0];
                if(upcomingTasks.some(t => t.category === 'work' && (t.dueDate === todayStr || t.dueDate === "Today") )) {
                     aiInsightContainer.innerHTML = `<i class="fas fa-brain"></i> AI: Looks like a productive day ahead, ${userName}! Focus on those work items.`;
                     aiInsightContainer.classList.remove('hidden');
                } else if (upcomingTasks.some(t => t.category === 'health')) {
                     aiInsightContainer.innerHTML = `<i class="fas fa-brain"></i> AI: Don't forget your wellness goals today, ${userName}!`;
                     aiInsightContainer.classList.remove('hidden');
                } else {
                     aiInsightContainer.classList.add('hidden');
                }
            }
            container.setAttribute('aria-busy', 'false');
            renderPinnedWidgets(); 
        }, 500); 
    }
    function cycleSafetyTicker() {
        currentSafetyTickerIndex = (currentSafetyTickerIndex + 1) % safetyTickerMessages.length;
        const tickerTextEl = document.getElementById('safetyTickerText');
        if(tickerTextEl) {
            tickerTextEl.style.opacity = 0;
            setTimeout(() => {
                tickerTextEl.textContent = safetyTickerMessages[currentSafetyTickerIndex];
                tickerTextEl.style.opacity = 1;
            }, 200);
        }
    }
    function renderPinnedWidgets() {
        const container = document.getElementById('pinnedWidgetsContainer');
        if (!container) return;
        container.innerHTML = Array(2).fill(getSkeletonPinnedWidget()).join('');
        container.setAttribute('aria-busy', 'true');
        setTimeout(() => {
            container.innerHTML = '';
            const widgets = [];
            const today = new Date().toISOString().split('T')[0];
            const nextTask = tasks.find(t => !t.completed && (t.dueDate === today || t.dueDate === "Today" || !t.dueDate));
            if (nextTask) {
                widgets.push({
                    icon: 'fas fa-clipboard-list', color: 'var(--primary-accent)', title: 'Next Task',
                    value: `${nextTask.title.substring(0, 25)}${nextTask.title.length > 25 ? '...' : ''}`,
                    action: () => setActiveScreen('planner')
                });
            } else {
                 widgets.push({
                    icon: 'fas fa-check-circle', color: 'var(--success-color)', title: 'Tasks',
                    value: 'All clear!', action: () => setActiveScreen('planner')
                });
            }
            const waterHabit = habits.find(h => h.isWaterTracker);
            if (waterHabit) {
                widgets.push({
                    icon: 'fas fa-tint', color: 'var(--soft-blue)', title: 'Water Intake',
                    value: `${waterHabit.current}/${waterHabit.goal} ${waterHabit.unit || 'glasses'}`,
                    action: () => setActiveScreen('wellness')
                });
            }
            const unreadChannels = mockChannels.filter(c => c.isJoined && c.unreadCount > 0);
            const totalUnread = unreadChannels.reduce((sum, c) => sum + c.unreadCount, 0);
            if (totalUnread > 0) {
                widgets.push({
                    icon: 'fas fa-comments', color: 'var(--moss-green)', title: 'Community',
                    value: `${totalUnread} unread in ${unreadChannels.length} channel${unreadChannels.length > 1 ? 's' : ''}`,
                    action: () => setActiveScreen('chat')
                });
            }
            const highStreakHabit = habits.find(h => h.streak > 5);
            if(highStreakHabit){
                 widgets.push({
                    icon: 'fas fa-fire', color: '#FF9800', title: `${highStreakHabit.name.substring(0,12)}...`,
                    value: `${highStreakHabit.streak} Day Streak!`, action: () => setActiveScreen('wellness')
                });
            }
            const savedPlace = mockPlaces.all.find(p => p.saved);
            if (savedPlace) {
                widgets.push({
                    icon: 'fas fa-store', color: 'var(--muted-terracotta)', title: `${savedPlace.name.substring(0,15)}...`,
                    value: `${savedPlace.openNow ? 'Open Now' : 'Closed'}`, action: () => showPlaceDetail(savedPlace)
                });
            }
            const shuffledWidgets = widgets.sort(() => 0.5 - Math.random()).slice(0, Math.min(widgets.length, 4));
            if (shuffledWidgets.length === 0) {
                container.innerHTML = `<p class="card-subtitle text-center" style="grid-column: 1 / -1;">No pinned info available. Configure in Settings.</p>`;
            } else {
                shuffledWidgets.forEach(widgetData => {
                    const widgetEl = document.createElement('div');
                    widgetEl.className = 'pinned-widget-item';
                    widgetEl.onclick = widgetData.action;
                    widgetEl.innerHTML = `
                        <i class="${widgetData.icon} widget-icon" style="color:${widgetData.color};"></i>
                        <span class="widget-title">${widgetData.title}</span>
                        <span class="widget-value">${widgetData.value}</span>
                    `;
                    container.appendChild(widgetEl);
                });
            }
            container.setAttribute('aria-busy', 'false');
        }, 300);
    }
    function updateProactiveSuggestions() {
        const container = document.getElementById('proactiveSuggestionsContainer');
        if (!container) return;
        container.innerHTML = '<p class="card-subtitle"><i class="fas fa-spinner fa-spin" style="color: var(--primary-accent);" aria-hidden="true"></i> AI is thinking of suggestions...</p>';
        setTimeout(() => { 
            container.innerHTML = ''; 
            const suggestions = [];
            const today = new Date().toISOString().split('T')[0];
            const overdueWorkTask = tasks.find(t => !t.completed && t.category === 'work' && (t.dueDate === today || t.dueDate === "Today") && (!t.time || new Date().getHours() > parseInt(t.time.split(':'))) );
            if(overdueWorkTask){
                suggestions.push({
                    id: 'overdueWork', priority: 10, icon: 'fa-triangle-exclamation', text: `High Priority: Your task "${overdueWorkTask.title.substring(0,25)}..." seems to be approaching or past its time!`,
                    buttonText: 'View in Planner', buttonIcon: 'fa-calendar-alt', action: () => setActiveScreen('planner')
                });
            }
            const weatherTextEl = document.getElementById('currentWeather');
            if (weatherTextEl) {
                const weatherText = weatherTextEl.textContent.toLowerCase();
                if (weatherText && weatherText.includes('sunny') && tasks.some(t => t.title.toLowerCase().includes('walk') && !t.completed)) {
                    suggestions.push({
                        id: 'sunnyWalk', priority: 5, icon: 'fa-sun', text: `It's sunny, ${userName} – ideal for that walk you planned!`,
                        buttonText: 'Find a Nature Spot', buttonIcon: 'fa-tree',
                        action: () => { setActiveScreen('explore'); setTimeout(() => { const parkFilterButton = document.querySelector('#exploreFilterBar button[data-filter=\'parks\']'); if (parkFilterButton) filterPlaces('parks', parkFilterButton);}, 50);}
                    });
                } else if (weatherText && weatherText.includes('rain') && tasks.some(t => t.title.toLowerCase().includes('outdoor') && !t.completed)) {
                     suggestions.push({
                        id: 'rainyOutdoor', priority: 8, icon: 'fa-cloud-rain', text: "Looks like rain. Maybe reschedule that outdoor activity or find an indoor alternative?",
                        buttonText: 'Indoor Activities', buttonIcon: 'fa-building',
                        action: () => { setActiveScreen('explore'); setTimeout(() => { document.getElementById('exploreSearchInput').value = "cinema"; handleExploreSearch(true);}, 50);}
                    });
                }
            }
            const recentStressedMood = loggedMoods.find(m => ['😞', '🙁'].includes(m.mood) && (new Date() - new Date(m.timestamp) < 24 * 60 * 60 * 1000));
            const wellnessHabit = habits.find(h => h.name.toLowerCase().includes('meditation'));
            if (recentStressedMood && wellnessHabit && aiLearningPreferences.learnMoodLogs) {
                 suggestions.push({
                    id: 'stressedMoodSugg', priority: 7, icon: 'fa-spa', text: `AI noticed you logged a less positive mood recently. A short meditation session might help. Shall I open the Guided Breathing tool?`,
                    buttonText: 'Open Breathing Tool', buttonIcon: 'fa-spa', action: () => { setActiveScreen('wellness'); setTimeout(() => openGuidedExerciseModal(), 50); }
                });
            }
            const savedCafe = mockPlaces.all.find(p => p.saved && p.type === 'food' && (p.name.toLowerCase().includes('cafe') || p.tags.includes('coffee')));
            const coffeeDeal = mockDeals.find(d => d.category === 'food' && d.title.toLowerCase().includes('coffee'));
            if(savedCafe && coffeeDeal && aiLearningPreferences.learnSavedPlaces){
                 suggestions.push({
                    id: 'cafeDeal', priority: 4, icon: 'fa-tags', text: `Since you like ${savedCafe.name.substring(0,15)}..., check out this deal: "${coffeeDeal.title.substring(0,20)}..."!`,
                    buttonText: 'View Deal', buttonIcon: 'fa-compass', action: () => { setActiveScreen('explore'); setTimeout(() => showDealDetailModal(coffeeDeal), 50); }
                });
            }
            const longStreakHabit = habits.find(h => h.streak > 10 && h.current < h.goal);
            if (longStreakHabit && aiLearningPreferences.learnHabitTracking) {
                suggestions.push({
                    id: 'habitStreak', priority: 6, icon: 'fa-fire', text: `Keep up the great work on "${longStreakHabit.name.substring(0,20)}..."! You're on a ${longStreakHabit.streak}-day streak!`,
                    buttonText: 'View Wellness', buttonIcon: 'fa-heartbeat', action: () => setActiveScreen('wellness')
                });
            }
            if (suggestions.length === 0) {
                container.innerHTML = `<div class="empty-state" style="padding:10px 0;"><i class="fas fa-brain"></i><p>AI: No specific suggestions right now, ${userName}. Enjoy your day!</p></div>`;
                return;
            }
            suggestions.sort((a,b) => b.priority - a.priority);
            const firstSugg = suggestions[0]; 
            const suggEl = document.createElement('div');
            suggEl.className = 'mb-3';
            suggEl.innerHTML = `
                <p class="card-subtitle"><i class="fas ${firstSugg.icon}" style="color: var(--primary-accent);" aria-hidden="true"></i> ${firstSugg.text}</p>
                ${firstSugg.buttonText ? `<button class="button button-secondary suggestion-action" data-sugg-id="${firstSugg.id}"><i class="fas ${firstSugg.buttonIcon}" aria-hidden="true"></i> ${firstSugg.buttonText}</button>` : ''}
            `;
            container.appendChild(suggEl);
            if (firstSugg.buttonText) {
                 const btn = suggEl.querySelector('button');
                 if (btn) btn.onclick = firstSugg.action;
            }
            if (suggestions.length > 1) {
                const seeMoreButton = document.createElement('button');
                seeMoreButton.className = 'button button-secondary mt-2';
                seeMoreButton.style.fontSize = '0.8rem';
                seeMoreButton.innerHTML = `<i class="fas fa-layer-group"></i> AI: View ${suggestions.length - 1} More Suggestions`;
                seeMoreButton.onclick = () => {
                    let suggestionHtml = "<ul>";
                    suggestions.forEach(s => suggestionHtml += `<li><i class="fas ${s.icon}"></i> ${s.text}</li>`);
                    suggestionHtml += "</ul><p class='mt-2 card-subtitle'><em>These could be swipeable cards or shown in the AI chat.</em></p>";
                    openGenericModal("AI Proactive Suggestions", suggestionHtml);
                };
                container.appendChild(seeMoreButton);
            }
        }, 800);
    }
    function renderDealsOnDashboard() {
        const container = document.getElementById('dashboardDealsList');
        if (!container) return;
        container.innerHTML = getSkeletonPlaceCard(); 
        container.setAttribute('aria-busy', 'true');
        setTimeout(() => {
            container.innerHTML = '';
            let topDeals = [];
            const savedPlace = mockPlaces.all.find(p => p.saved);
            const wellnessHabit = habits.some(h => h.name.toLowerCase().includes('yoga') || h.name.toLowerCase().includes('gym'));
            if (savedPlace && aiLearningPreferences.learnSavedPlaces) {
                const relatedDeal = mockDeals.find(d => d.businessName.toLowerCase().includes(savedPlace.name.toLowerCase().split(" ")[0]) || d.category === savedPlace.type);
                if (relatedDeal) topDeals.push(relatedDeal);
            }
            if (wellnessHabit && aiLearningPreferences.learnHabitTracking) {
                const wellnessDeal = mockDeals.find(d => d.category === 'wellness');
                if (wellnessDeal) topDeals.push(wellnessDeal);
            }
            const otherDeals = mockDeals.filter(d => !topDeals.some(td => td.id === d.id));
            while (topDeals.length < 2 && otherDeals.length > 0) {
                topDeals.push(otherDeals.shift());
            }
            topDeals = [...new Set(topDeals)].slice(0, 2);
            if (topDeals.length === 0) {
                container.innerHTML = `<div class="empty-state" style="padding:10px 0;"><i class="fas fa-tags"></i><p>AI: No special deals match your profile today, ${userName}. Check Explore!</p></div>`;
            } else {
                topDeals.forEach(deal => {
                    const dealEl = document.createElement('article');
                    dealEl.className = 'card deal-card no-press'; 
                    dealEl.style.marginBottom = '10px'; 
                    dealEl.setAttribute('role', 'button');
                    dealEl.setAttribute('tabindex', '0');
                    dealEl.onclick = () => showDealDetailModal(deal);
                    dealEl.onkeypress = (event) => { if(event.key === 'Enter' || event.key === ' ') showDealDetailModal(deal); };
                    let expiryText = '';
                    if (deal.expiryDate) {
                        const expiry = new Date(deal.expiryDate);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        expiryText = expiry < today ? `<span class="expiry" style="color:var(--danger-color); font-weight:bold;">Expired</span>` : `<span class="expiry">Expires: ${expiry.toLocaleDateString()}</span>`;
                    }
                    dealEl.innerHTML = `
                        <img src="${deal.img}" alt="${deal.title}" loading="lazy">
                        <div class="deal-info">
                            <div class="name">${deal.title}</div>
                            <div class="details">${deal.description.substring(0, 50)}...</div>
                            <div class="business">${deal.businessName}</div>
                            ${expiryText}
                        </div>
                    `;
                    container.appendChild(dealEl);
                });
            }
            container.setAttribute('aria-busy', 'false');
        }, 700);
    }
    window.navigateToExploreDeals = function() {
        setActiveScreen('explore');
        setTimeout(() => {
            const dealFilterButton = document.querySelector('#exploreFilterBar button[data-filter="deals"]');
            if (dealFilterButton) {
                filterPlaces('deals', dealFilterButton);
            }
        }, 100);
    }
