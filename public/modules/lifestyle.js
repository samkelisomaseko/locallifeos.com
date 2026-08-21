    const focusQuotes = [
        '"The secret of getting ahead is getting started." - Mark Twain',
        '"Concentrate all your thoughts upon the work at hand. The sun\'s rays do not burn until brought to a focus." - Alexander Graham Bell',
        '"The successful warrior is the average man, with laser-like focus." - Bruce Lee',
        '"That\'s been one of my mantras - focus and simplicity." - Steve Jobs'
    ];
    function openFocusModeModal() {
        const taskSelect = document.getElementById('focusTaskSelect');
        taskSelect.innerHTML = '<option value="">-- No Specific Task --</option>';
        tasks.filter(t => !t.completed).forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.title;
            taskSelect.appendChild(option);
        });
        const nextTask = tasks.find(t => !t.completed);
        if (nextTask) taskSelect.value = nextTask.id;
        applyFocusModeChanges(true); 
        const timerEl = document.getElementById('focusSessionTimer');
        if(timerEl) timerEl.textContent = focusQuotes[0];
        focusQuoteInterval = setInterval(() => {
            if(timerEl) timerEl.textContent = focusQuotes[Math.floor(Math.random() * focusQuotes.length)];
        }, 8000);
        openModal('focusModeModal');
    }
    function stopFocusMode() {
        clearInterval(focusQuoteInterval);
        closeModal('focusModeModal');
        showToast("Focus mode ended.", "info");
    }
    function openEditFocusModeModal() {
        openModal('editFocusModeModal');
    }
    function applyFocusModeChanges(isInitial = false) {
        const taskId = document.getElementById('focusTaskSelect').value;
        const task = tasks.find(t => t.id == taskId);
        const taskLabel = document.getElementById('focusSessionTaskLabel');
        if (taskLabel) {
            taskLabel.textContent = task ? `Focusing on: "${task.title.substring(0, 30)}..."` : "General focus session.";
        }
        if (!isInitial) closeModal('editFocusModeModal');
    }
    function fetchNewsSummary() {
        const newsCard = document.getElementById('newsSummaryCard');
        const newsContent = document.getElementById('newsSummaryContent');
        if (!newsCard || !newsContent) return;
        if (!userSubscriptionTier.startsWith('pro')) {
            newsContent.innerHTML = `<div class="empty-state" style="padding:10px 0;">
                <i class="fas fa-lock"></i>
                <p>AI News Summary is a Pro feature.</p>
                <button class="button mt-2" style="font-size:0.8rem; padding: 4px 8px;" onclick="openSubscriptionModal()">Upgrade to Pro</button>
            </div>`;
            return;
        }
        const userInterests = (mockUsers.user.interests || "eswatini").split(',').map(i => i.trim());
        const mockNews = [
            { headline: "EEC Announces Stage 2 Load Shedding for the Week", link: "https://www.times.co.sz/", category: "utilities" },
            { headline: "Ministry of Health Launches Vaccination Drive in Shiselweni", link: "https://www.observer.org.sz/", category: "health" },
            { headline: "Manzini-Mbabane Highway Bypass Construction Ahead of Schedule", link: "https://www.eswatinipost.co.sz/", category: "infrastructure" },
            { headline: "Local Hiking Club Discovers New Trail near Sibebe Rock", link: "https://www.eswatinipost.co.sz/", category: "outdoors" }
        ];

        const personalizedNews = mockNews.filter(item => userInterests.some(interest => item.headline.toLowerCase().includes(interest) || item.category.includes(interest))).slice(0, 3);
        if(personalizedNews.length < 3) {
            personalizedNews.push(...mockNews.filter(item => !personalizedNews.includes(item)).slice(0, 3 - personalizedNews.length));
        }

        newsContent.innerHTML = `<ul>${personalizedNews.map(item => `<li><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.headline}</a></li>`).join('')}</ul><p class="card-subtitle mt-2" style="font-size:0.8rem;">AI Summary of top Eswatini headlines, personalized for you.</p>`;
    }
    function openPrivacySettingsModal() {
        const toggle = document.getElementById('appLockToggle')?.querySelector('.toggle-switch');
        if(toggle) toggle.classList.toggle('active', !!localStorage.getItem('appPin'));
        openModal('privacySettingsModal');
    }
    function openIntegrationSettingsModal() {
        renderIntegrationSettings();
        openModal('integrationSettingsModal');
    }
    function openDataImportModal() {
        openModal('dataImportModal');
    }

    function handleDataImport() {
        const fileInput = document.getElementById('importFileInput');
        fileInput.onchange = () => {
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const encryptedData = event.target.result;
                closeModal('dataImportModal'); 
                openPinPrompt("import", (pin) => {
                    try {
                        const decryptedString = CryptoJS.AES.decrypt(encryptedData, pin).toString(CryptoJS.enc.Utf8);
                        if(!decryptedString) throw new Error("Decryption failed");
                        const importedData = JSON.parse(decryptedString);
                        if (Array.isArray(importedData.tasks)) tasks = importedData.tasks;
                        if (Array.isArray(importedData.habits)) habits = importedData.habits;
                        if (Array.isArray(importedData.loggedMoods)) loggedMoods = importedData.loggedMoods;
                        if (importedData.gamification) {
                            userLevel = importedData.gamification.userLevel || 1;
                            userXP = importedData.gamification.userXP || 0;
                            xpToNextLevel = importedData.gamification.xpToNextLevel || 100;
                            unlockedBadges = new Set(importedData.gamification.unlockedBadges || []);
                        }
                        if (importedData.settings) {
                            Object.keys(importedData.settings).forEach(key => {
                                localStorage.setItem(key, typeof importedData.settings[key] === 'object' ? JSON.stringify(importedData.settings[key]) : importedData.settings[key]);
                            });
                        }
                        if (importedData.savedPlacesIds) {
                             mockPlaces.all.forEach(p => p.saved = importedData.savedPlacesIds.includes(p.id));
                        }
                        showToast("Data imported successfully! The app will now reload.", "success");
                        setTimeout(() => window.location.reload(), 2000);
                    } catch (error) {
                        showToast("Invalid file or incorrect PIN.", "error");
                    }
                });
            };
            reader.readAsText(file);
        };
        fileInput.click();
    }
    function openBulletinCommentsModal(postId) {
        const post = bulletinPosts.find(p => p.id === postId);
        if (!post) return;
        const modalTitle = document.getElementById('bulletinCommentsModalTitle');
        const commentsList = document.getElementById('bulletinCommentsList');
        const submitBtn = document.getElementById('bulletinCommentSubmit');
        modalTitle.textContent = `Comments on "${post.title.substring(0, 20)}..."`;
        commentsList.innerHTML = '';
        if (post.comments && post.comments.length > 0) {
            post.comments.forEach(comment => {
                 const senderDetails = mockUsers[comment.senderId] || mockUsers.defaultBot;
                 const bubble = document.createElement('div');
                 bubble.className = 'chat-message-wrapper other';
                 bubble.innerHTML = `
                    <img src="${senderDetails.avatarUrl}" alt="${senderDetails.name}" class="chat-avatar other-avatar" loading="lazy">
                    <div class="chat-bubble other">
                        <strong class="chat-sender-name">${senderDetails.name}</strong>
                        <div class="chat-bubble-text">${comment.text}</div>
                    </div>
                 `;
                 commentsList.appendChild(bubble);
            });
        } else {
            commentsList.innerHTML = `<div class="empty-state" style="padding:10px;"><p>No comments yet.</p></div>`;
        }
        submitBtn.onclick = () => submitBulletinComment(postId);
        openModal('bulletinCommentsModal');
}
    function submitBulletinComment(postId) {
        const input = document.getElementById('bulletinCommentInput');
        const text = input.value.trim();
        if (!text) return;
        const post = bulletinPosts.find(p => p.id === postId);
        if (post) {
            if (!post.comments) post.comments = [];
            post.comments.push({ senderId: 'user', text: text, timestamp: new Date() });
            input.value = '';
            autoGrowTextarea(input);
            openBulletinCommentsModal(postId); 
            saveBulletinPostsToLocalStorage();
        }
    }
