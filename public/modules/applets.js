    function renderApplets() {
        const container = document.getElementById('appletStoreContainer');
        if (!container) return;
        container.innerHTML = ''; 
        mockApplets.forEach(applet => {
            const card = document.createElement('div');
            card.className = 'applet-card';
            card.innerHTML = `
                <div class="applet-header">
                    <div class="applet-icon" style="background-color: ${applet.color};"><i class="${applet.icon}"></i></div>
                    <h4 class="applet-title">${applet.name}</h4>
                </div>
                <p class="applet-desc">${applet.desc}</p>
                <div class="applet-ai-insight"><i class="fas fa-brain"></i> AI suggests this for users interested in 'community' and 'productivity'.</div>
                <div class="applet-actions">
                    <button class="button install-button ${applet.installed ? 'danger' : ''}" data-applet-id="${applet.id}" onclick="handleAppletInstallToggle(this, '${applet.id}')">
                        <span class="button-text">${applet.installed ? 'Uninstall' : 'Install'}</span>
                        <div class="loader"></div>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }
    function renderInstalledAppletsOnDashboard() {
        const container = document.getElementById('dashboardAppletsContainer');
        if (!container) return;
        const installed = mockApplets.filter(a => a.installed);
        if (installed.length === 0) {
            container.innerHTML = `<p class="card-subtitle">No applets installed. Visit the Applet Store in Settings to add more functionality!</p>`;
            return;
        }
        let html = '<div class="wellness-tools-grid">';
        installed.forEach(applet => {
            html += `
                <button class="wellness-tool-card" onclick="launchApplet('${applet.id}')">
                    <i class="${applet.icon}" style="color:${applet.color};"></i>
                    <span class="tool-title">${applet.name}</span>
                </button>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }
    function handleAppletInstallToggle(button, appletId) {
        const applet = mockApplets.find(a => a.id === appletId);
        if (!applet) return;
        const buttonText = button.querySelector('.button-text');
        button.classList.add('loading');
        button.disabled = true;
        setTimeout(() => {
            applet.installed = !applet.installed;
            button.classList.remove('loading');
            button.disabled = false;
            button.classList.toggle('danger', applet.installed);
            buttonText.textContent = applet.installed ? 'Uninstall' : 'Install';
            showToast(`${applet.name} ${applet.installed ? 'installed' : 'uninstalled'}!`, 'success');
            saveAppletsToLocalStorage();
            renderInstalledAppletsOnDashboard();
        }, 1500);
    }
    function renderPrivacyDashboard() {
        const container = document.getElementById('privacyDashboardContent');
        if (!container) return;
        const privacyScore = calculatePrivacyScore();
        const scoreColor = privacyScore > 75 ? 'var(--success-color)' : privacyScore > 40 ? 'var(--favorite-color)' : 'var(--danger-color)';
        container.innerHTML = `
            <article class="card">
                <h3 class="card-title">Your Privacy Score</h3>
                <div class="privacy-score-container">
                    <div class="privacy-score-dial">
                        <svg viewBox="0 0 36 36">
                            <path class="dial-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path class="dial-value" id="privacyScoreDial" stroke-dasharray="${privacyScore}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div id="privacyScoreText" class="privacy-score-text">${privacyScore}</div>
                    </div>
                    <p class="card-subtitle">This score reflects how your privacy settings are configured. Higher is better.</p>
                    <button class="button mt-2" style="width:100%;" onclick="openPrivacySettingsModal()">Privacy & Security Settings</button>
                </div>
            </article>
            <article class="card">
                <h3 class="card-title">Data Usage by Module</h3>
                <div class="data-usage-bar">
                    <div class="label">Planner</div>
                    <div class="bar-container"><div class="bar-fill" style="width: 70%;"></div></div>
                </div>
                <div class="data-usage-bar">
                    <div class="label">Explore</div>
                    <div class="bar-container"><div class="bar-fill" style="width: 90%; background-color: var(--muted-terracotta);"></div></div>
                </div>
                 <div class="data-usage-bar">
                    <div class="label">Wellness</div>
                    <div class="bar-container"><div class="bar-fill" style="width: 50%; background-color: var(--soft-blue);"></div></div>
                </div>
                <p class="card-subtitle mt-2" style="font-size:0.8rem;">Data access frequency. You control what the AI can see.</p>
            </article>
            <article class="card">
                <h3 class="card-title">AI Awareness Map (What I've Learned)</h3>
                <div id="aiMemoryList" class="settings-list" style="padding:0;"></div>
            </article>
        `;
        document.getElementById('privacyScoreDial').style.stroke = scoreColor;
        document.getElementById('privacyScoreText').style.color = scoreColor;
        renderAIMemoryList();
    }
    function calculatePrivacyScore() {
        let score = 100;
        if(aiLearningPreferences.learnSavedPlaces) score -= 10;
        if(aiLearningPreferences.learnMoodLogs) score -= 15;
        if(aiLearningPreferences.learnTaskPatterns) score -= 10;
        if(aiLearningPreferences.learnHabitTracking) score -= 10;
        if(aiLearningPreferences.learnChatStyle) score -= 5;
        return Math.max(0, score);
    }
    function renderAIMemoryList() {
        const container = document.getElementById('aiMemoryList');
        if(!container) return;
        container.innerHTML = '';
        let memories = [];
        if(aiLearningPreferences.learnSavedPlaces) {
            const savedPlace = mockPlaces.all.find(p => p.saved);
            if(savedPlace) memories.push(`You like the place: <strong>${savedPlace.name}</strong>.`);
        }
         if(aiLearningPreferences.learnMoodLogs) {
            const lastMood = loggedMoods[loggedMoods.length -1];
            if(lastMood) memories.push(`Your last logged mood was: ${lastMood.mood}`);
        }
         if(aiLearningPreferences.learnTaskPatterns) {
            const workTasks = tasks.filter(t => t.category === 'work').length;
            if(workTasks > 2) memories.push(`You seem to have many <strong>work-related</strong> tasks.`);
        }
        if(memories.length === 0) {
            container.innerHTML = `<div class="setting-item"><span class="setting-label">AI hasn't learned any specific preferences yet.</span></div>`;
        } else {
            memories.forEach(mem => {
                const item = document.createElement('div');
                item.className = 'ai-memory-item';
                item.innerHTML = `<span class="ai-memory-text">${mem}</span> <button class="button danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="showToast('AI will forget this preference.', 'info')">Forget</button>`;
                container.appendChild(item);
            });
        }
    }
    function openFeedbackModal() {
        trackUserAction(`Opened Feedback Modal`);
        let modalBody = `
            <p>Help us improve LocalLife OS! Please describe the issue you encountered.</p>
            <div class="input-group">
                <label for="feedbackType">Type of Issue</label>
                <select id="feedbackType" class="input-field">
                    <option value="bug">Bug Report</option>
                    <option value="suggestion">Feature Suggestion</option>
                    <option value="ui_ux">UI/UX Feedback</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="input-group">
                <label for="feedbackContent">Description*</label>
                <textarea id="feedbackContent" class="input-field" rows="4" placeholder="e.g., The add task button did not work when I..." required></textarea>
            </div>
            <div class="input-group">
                <label for="feedbackScreenshot">Screenshot (Optional)</label>
                <input type="file" id="feedbackScreenshot" class="input-field" accept="image/*">
            </div>
            <div class="input-group">
                <label>Diagnostic Info (Auto-attached)</label>
                <p class="card-subtitle" style="background-color:var(--placeholder-bg); padding:var(--space-sm); border-radius: var(--border-radius-sm); font-size:0.8rem;">
                    <strong>Last Action:</strong> ${lastUserAction}<br>
                    <strong>Version:</strong> v15.0 Production
                </p>
            </div>
            <button class="button mt-2" style="width:100%" onclick="submitFeedback()">Submit Feedback</button>
        `;
        openGenericModal("Assist & Report Bug", modalBody);
    }
    function submitFeedback() {
        const feedback = document.getElementById('feedbackContent')?.value.trim();
        if(!feedback) {
            showToast("Please provide a description of the issue.", "error");
            return;
        }
        showToast("Thank you! Your feedback has been submitted.", "success");
        closeModal('genericModal');
    }
    function updateSubscriptionStatusUI() {
        const statusEl = document.getElementById('subscriptionStatus');
        if (statusEl) {
            let tierText = "Free";
            if (userSubscriptionTier === 'pro') tierText = "Pro Tier";
            else if (userSubscriptionTier === 'pro_plus') tierText = "Pro+ Tier";
            statusEl.textContent = tierText;
        }
        const newsCard = document.getElementById('newsSummaryCard');
        if (newsCard) {
            fetchNewsSummary(); 
        }
        const personalitySelect = document.getElementById('aiPersonalitySelect');
        if (personalitySelect) {
            Array.from(personalitySelect.options).forEach(option => {
                if (option.text.includes('(Pro)')) {
                    option.disabled = !userSubscriptionTier.startsWith('pro');
                }
            });
            if (currentAiPersonality.endsWith('(Pro)') && !userSubscriptionTier.startsWith('pro')) {
                changeAIPersonality('neutral');
                personalitySelect.value = 'neutral';
            }
        }
    }
    function openSubscriptionModal() {
        const modal = document.getElementById('subscriptionModal');
        if (!modal) return;
        document.querySelectorAll('.tier-card').forEach(card => card.classList.remove('active-plan'));
        const activeCard = document.getElementById(`tier-${userSubscriptionTier.replace('_plus', '-plus')}`);
        if (activeCard) {
            activeCard.classList.add('active-plan');
            const button = activeCard.querySelector('button');
            if (button) {
                button.textContent = "Current Plan";
                button.disabled = true;
            }
        }
        document.querySelectorAll('.tier-card button').forEach(button => {
            const tier = button.dataset.tier;
            if (tier && tier !== userSubscriptionTier) {
                const tierOrder = { free: 0, pro: 1, pro_plus: 2 };
                const currentTierLevel = tierOrder[userSubscriptionTier];
                const buttonTierLevel = tierOrder[tier];
                if (buttonTierLevel > currentTierLevel) {
                    button.textContent = `Upgrade to ${tier.replace('_', '+').replace(/^\w/, c => c.toUpperCase())}`;
                    button.disabled = false;
                } else {
                    button.textContent = `Downgrade to ${tier.replace('_', '+').replace(/^\w/, c => c.toUpperCase())}`;
                    button.disabled = false;
                }
            }
        });
        openModal('subscriptionModal');
    }
    function handleSubscriptionChange(newTier) {
        userSubscriptionTier = newTier;
        saveSubscriptionToLocalStorage();
        updateSubscriptionStatusUI();
        closeModal('subscriptionModal');
        showToast(`Successfully subscribed to ${newTier.replace('_', '+').replace(/^\w/, c => c.toUpperCase())} tier! Features unlocked.`, 'success');
    }
