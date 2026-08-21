    function showDynamicIslandAlert(icon, text, duration = 4000) {
        if (!dynamicIsland) return;
        clearTimeout(dynamicIslandTimeout);
        document.getElementById('dynamicIslandIcon').className = `icon ${icon}`;
        document.getElementById('dynamicIslandText').textContent = text;
        dynamicIsland.classList.add('show');
        dynamicIslandTimeout = setTimeout(() => {
            dynamicIsland.classList.remove('show');
        }, duration);
    }
    const badges = {
        task_master: { icon: 'fa-clipboard-check', title: "Task Master", desc: "Complete 10 tasks." },
        planner_pro: { icon: 'fa-calendar-alt', title: "Planner Pro", desc: "Complete 50 tasks." },
        hydration_pro: { icon: 'fa-tint', title: "Hydration Pro", desc: "Maintain a 7-day water streak." },
        zen_master: { icon: 'fa-brain', title: "Zen Master", desc: "Maintain a 7-day meditation streak." },
        contributor: { icon: 'fa-plus-circle', title: "Contributor", desc: "Submit your first place or deal." },
        social_butterfly: { icon: 'fa-comments', title: "Social Butterfly", desc: "Join 5 channels." },
        focus_master: { icon: 'fa-stopwatch-20', title: "Focus Master", desc: "Complete a Focus Mode session." }
    };
    function addXP(amount, category) {
        userXP += amount;
        showToast(`+${amount} XP (${category})`, 'xp', 1500);
        if (userXP >= xpToNextLevel) {
            userLevel++;
            userXP -= xpToNextLevel;
            xpToNextLevel = Math.round(xpToNextLevel * 1.5);
            showDynamicIslandAlert('fas fa-arrow-up', `Level Up! You are now Level ${userLevel}!`);
            unlockBadge('task_master');
        }
        updateGamificationUI();
        saveGamificationDataToLocalStorage();
    }
    function unlockBadge(badgeId) {
        if (!unlockedBadges.has(badgeId)) {
            unlockedBadges.add(badgeId);
            const badge = badges[badgeId];
            showToast(`Badge Unlocked: ${badge.title}!`, 'xp', 4000);
            showDynamicIslandAlert(`fas ${badge.icon}`, `Badge Unlocked: ${badge.title}`);
            updateGamificationUI();
            saveGamificationDataToLocalStorage();
        }
    }
    function updateGamificationUI(context = 'all') {
        if(context === 'wellness' || context === 'all') {
            const wellnessLevelEl = document.getElementById('wellnessLevel');
            if (wellnessLevelEl) wellnessLevelEl.textContent = userLevel;
        }
        if(context === 'user' || context === 'all') {
            const userLevelEl = document.getElementById('userLevel');
            if (userLevelEl) userLevelEl.textContent = userLevel;
            const userXPEl = document.getElementById('userXP');
            if (userXPEl) userXPEl.textContent = userXP;
            const userXPToNextLevelEl = document.getElementById('userXPToNextLevel');
            if (userXPToNextLevelEl) userXPToNextLevelEl.textContent = xpToNextLevel;
            const xpBar = document.getElementById('userXPBar');
            if (xpBar) xpBar.style.width = `${(userXP / xpToNextLevel) * 100}%`;
            const badgesContainer = document.getElementById('userBadgesContainer');
            if (badgesContainer) {
                badgesContainer.innerHTML = '';
                unlockedBadges.forEach(badgeId => {
                    const badge = badges[badgeId];
                    if (badge) {
                        const badgeEl = document.createElement('div');
                        badgeEl.className = 'gamification-badge';
                        badgeEl.title = `${badge.title}: ${badge.desc}`;
                        badgeEl.innerHTML = `<i class="fas ${badge.icon}"></i>`;
                        badgesContainer.appendChild(badgeEl);
                    }
                });
            }
        }
    }
