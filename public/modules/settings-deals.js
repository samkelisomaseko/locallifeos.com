    const darkModeToggleContainer = document.getElementById('darkModeToggleContainer');
    const darkModeToggleVisual = document.getElementById('darkModeToggleVisual');
    const aiPersonalitySelect = document.getElementById('aiPersonalitySelect');
    function toggleDarkMode() { 
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (darkModeToggleVisual) darkModeToggleVisual.classList.toggle('active', isDarkMode);
        if (darkModeToggleContainer) darkModeToggleContainer.setAttribute('aria-checked', isDarkMode.toString());
        localStorage.setItem('darkMode', isDarkMode.toString()); 
        renderHabits(); 
        const activeScreenId = document.querySelector('.screen.active')?.id;
        if (activeScreenId === 'explore') {
            renderPlaces(document.querySelector('#exploreFilterBar .filter-button.active')?.dataset.filter || 'all');
            initMap();
        }
        if (activeScreenId === 'dashboard') {
            renderDealsOnDashboard();
            renderPinnedWidgets();
        }
        if (navigator.vibrate) navigator.vibrate(10);
    }
    function changeThemeAccent(color, buttonElement) { 
        document.documentElement.style.setProperty('--primary-accent', color);
        document.querySelectorAll('.theme-selector .theme-color-button').forEach(btn => {
            btn.classList.remove('active'); btn.setAttribute('aria-checked', 'false');
        });
        if (buttonElement) {
            buttonElement.classList.add('active'); buttonElement.setAttribute('aria-checked', 'true');
        }
        localStorage.setItem('themeAccent', color);
    }
    function changeAIPersonality(personality) {
        if (personality.includes('(Pro)') && !userSubscriptionTier.startsWith('pro')) {
            showToast(`The ${personality.replace(' (Pro)', '')} personality is a Pro feature.`, "info");
            openSubscriptionModal();
            aiPersonalitySelect.value = currentAiPersonality;
            return;
        }
        currentAiPersonality = personality;
        localStorage.setItem('aiPersonality', personality);
        showToast(`AI Personality set to ${personality.replace(' (Pro)', '')}.`, "ai_info", 2000);
        addMessageToAIChat('other', `${getAIPersonalityPrefix()}${personality.replace(' (Pro)', '').charAt(0).toUpperCase() + personality.replace(' (Pro)', '').slice(1)} AI ready. ${personality === 'witty' ? 'Try not to bore me.' : 'How can I assist?'}`);
    }
    function openGenericModal(title, bodyHtml) {
        const modalTitleEl = document.getElementById('genericModalTitle');
        const modalBodyEl = document.getElementById('genericModalBody');
        if (modalTitleEl) modalTitleEl.textContent = title;
        if (modalBodyEl) modalBodyEl.innerHTML = bodyHtml;
        openModal('genericModal');
    }
    function openConfirmationModal(title, message, confirmCallback, options = {}) {
        const modal = document.getElementById('confirmationModal');
        if(options.hideOnOpen) {
            const modalToHide = document.getElementById(options.hideOnOpen);
            if(modalToHide) modalToHide.style.display = 'none';
            modal.dataset.hiddenModal = options.hideOnOpen;
        }
        document.getElementById('confirmationModalTitle').textContent = title;
        document.getElementById('confirmationModalMessage').innerHTML = message;
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.style.display = '';
        confirmButton.onclick = () => {
            confirmCallback();
            closeModal('confirmationModal');
        };
        openModal('confirmationModal');
    }
    function openUserProfileModal() {
        const user = mockUsers['user'];
        if(!user) return;
        const userAvatarEl = document.getElementById('userProfileAvatar');
        if(userAvatarEl) userAvatarEl.src = user.avatarUrl;
        document.getElementById('profileNameInput').value = user.name;
        document.getElementById('profileUsernameInput').value = user.username;
        document.getElementById('profileLocationInput').value = user.location || '';
        document.getElementById('profileBioInput').value = user.bio;
        document.getElementById('profileInterestsInput').value = user.interests || '';
        document.getElementById('profileEmailInput').value = localStorage.getItem('userEmail') || 'test@example.com';
        document.getElementById('accountSubscriptionStatus').textContent = userSubscriptionTier.replace('_', '+').replace(/^\w/, c => c.toUpperCase());
        updateGamificationUI('user');
        switchModalTab(document.querySelector('#userProfileModal .modal-tab-button'), 'profileTab');
        openModal('userProfileModal');
    }
    function saveUserProfile() {
        if(!mockUsers['user']) return;
        const newName = document.getElementById('profileNameInput').value;
        const newUsername = document.getElementById('profileUsernameInput').value;
        const newBio = document.getElementById('profileBioInput').value;
        const newLocation = document.getElementById('profileLocationInput').value;
        const newInterests = document.getElementById('profileInterestsInput').value;
        userName = newName.split(' ')[0];
        mockUsers['user'].name = newName;
        mockUsers['user'].username = newUsername;
        mockUsers['user'].bio = newBio;
        mockUsers['user'].location = newLocation;
        mockUsers['user'].interests = newInterests;
        const aiGreetingEl = document.getElementById('aiGreeting');
        if(aiGreetingEl) {
             const currentGreeting = aiGreetingEl.textContent;
             const namePart = currentGreeting.substring(currentGreeting.indexOf(',') + 2, currentGreeting.lastIndexOf('!'));
             aiGreetingEl.textContent = currentGreeting.replace(namePart, userName);
        }
        saveUsersToLocalStorage(); 
        localStorage.setItem('userProfile', JSON.stringify({ name: newName, username: newUsername, bio: newBio, location: newLocation, interests: newInterests }));
        showToast("Profile saved. AI can use this for better personalization.", "success");
        closeModal('userProfileModal');
    }
    function openDashboardCustomizationModal() {
        const container = document.getElementById('dashboardCardToggleContainer');
        if(!container) return;
        container.innerHTML = '';
        const savedConfig = JSON.parse(localStorage.getItem('dashboardCardConfig')) || dashboardCardConfig;
        dashboardCardConfig.forEach(defaultCard => {
            const currentCardState = savedConfig.find(sc => sc.id === defaultCard.id) || defaultCard;
            const itemDiv = document.createElement('div');
            itemDiv.className= 'setting-item';
            const isDisabled = defaultCard.id === 'newsSummaryCard' && !userSubscriptionTier.startsWith('pro');
            itemDiv.innerHTML = `
                <span class="setting-label ${isDisabled ? 'text-secondary' : ''}">${currentCardState.name} ${isDisabled ? '(Pro)' : ''}</span>
                <button class="toggle-switch-button" data-card-id="${currentCardState.id}" ${isDisabled ? 'disabled' : ''} onclick="this.querySelector('.toggle-switch').classList.toggle('active')" role="switch" aria-checked="${currentCardState.visible}">
                    <span class="toggle-switch ${currentCardState.visible ? 'active' : ''}"></span>
                </button>
            `;
            container.appendChild(itemDiv);
        });
        openModal('dashboardCustomizationModal');
    }
    function saveDashboardCustomization() {
        const toggles = document.querySelectorAll('#dashboardCardToggleContainer .toggle-switch-button');
        let newConfig = [];
        toggles.forEach(toggleButton => {
            const cardId = toggleButton.dataset.cardId;
            const cardData = dashboardCardConfig.find(c => c.id === cardId);
            if(cardData) {
                const isVisible = toggleButton.querySelector('.toggle-switch')?.classList.contains('active') ?? false;
                newConfig.push({ id: cardId, name: cardData.name, visible: isVisible });
            }
        });
        dashboardCardConfig = newConfig;
        localStorage.setItem('dashboardCardConfig', JSON.stringify(newConfig));
        applyDashboardCustomization(newConfig);
        showToast("Dashboard customization saved. AI will adapt.", "success");
        closeModal('dashboardCustomizationModal');
    }
    function applyDashboardCustomization(configToApply) {
        const currentConfig = configToApply || JSON.parse(localStorage.getItem('dashboardCardConfig')) || dashboardCardConfig;
        dashboardCardConfig.forEach(cardConf => {
            const cardElement = document.getElementById(cardConf.id);
            const isVisible = currentConfig.find(c => c.id === cardConf.id)?.visible ?? true;
            if (cardElement) {
                cardElement.style.display = isVisible ? '' : 'none';
            }
        });
    }
    function openNotificationSettingsModal(){
        const modal = document.getElementById('notificationSettingsModal');
        if(modal){
            Object.keys(notificationPreferences).forEach(key => {
                const toggle = modal.querySelector(`[data-pref="${key}"] .toggle-switch`);
                if(toggle) toggle.classList.toggle('active', notificationPreferences[key]);
            });
            openModal('notificationSettingsModal');
        }
    }
    function saveNotificationPreferences() {
        const modal = document.getElementById('notificationSettingsModal');
        if(modal) {
             Object.keys(notificationPreferences).forEach(key => {
                const toggle = modal.querySelector(`[data-pref="${key}"] .toggle-switch`);
                if(toggle) notificationPreferences[key] = toggle.classList.contains('active');
            });
            localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences));
            showToast('Notification preferences saved!', 'success');
            closeModal('notificationSettingsModal');
        }
    }
    function openHelpAboutModal(){
        openModal('helpAboutModal');
    }
    function openAILearningPrefsModal(){
        const prefs = JSON.parse(localStorage.getItem('aiLearningPreferences')) || aiLearningPreferences;
        const modal = document.getElementById('aiLearningPrefsModal');
        if(!modal) return;
        Object.keys(prefs).forEach(key => {
            const toggleButtonContainer = modal.querySelector(`.toggle-switch-button[data-pref="${key}"]`);
            if(toggleButtonContainer){
                const visualSwitch = toggleButtonContainer.querySelector('.toggle-switch');
                if(visualSwitch) visualSwitch.classList.toggle('active', prefs[key]);
            }
        });
        openModal('aiLearningPrefsModal');
    }
    window.toggleAILearningPref = function(buttonElement) {
        const prefKey = buttonElement.dataset.pref;
        const visualSwitch = buttonElement.querySelector('.toggle-switch');
        if(visualSwitch) {
            visualSwitch.classList.toggle('active');
            aiLearningPreferences[prefKey] = visualSwitch.classList.contains('active');
            localStorage.setItem('aiLearningPreferences', JSON.stringify(aiLearningPreferences));
            showToast(`AI Learning for '${prefKey.replace(/([A-Z])/g, ' $1').toLowerCase()}' ${aiLearningPreferences[prefKey] ? 'enabled' : 'disabled'}.`, "ai_info");
        }
    }
    function exportUserData() {
        openPinPrompt("export", (pin) => {
            const dataToExport = {
                tasks: tasks, habits: habits, loggedMoods: loggedMoods, sleepData: sleepData, bulletinPosts: bulletinPosts, trustedContacts: trustedContacts, mockDeals: mockDeals, mockChannels: mockChannels, mockUsers: mockUsers, mockNotifications: mockNotifications,
                savedPlacesIds: mockPlaces.all.filter(p => p.saved).map(p=>p.id),
                gamification: { userLevel, userXP, xpToNextLevel, unlockedBadges: Array.from(unlockedBadges) },
                settings: {
                    darkMode: localStorage.getItem('darkMode') === 'true', themeAccent: localStorage.getItem('themeAccent'), aiPersonality: localStorage.getItem('aiPersonality'),
                    dashboardConfig: JSON.parse(localStorage.getItem('dashboardCardConfig')), notificationPreferences: JSON.parse(localStorage.getItem('notificationPreferences')),
                    userProfile: JSON.parse(localStorage.getItem('userProfile')), aiLearningPreferences: JSON.parse(localStorage.getItem('aiLearningPreferences'))
                }
            };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const encryptedString = CryptoJS.AES.encrypt(jsonString, pin).toString();
            const blob = new Blob([encryptedString], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'LocalLifeOS_encrypted_data.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            showToast("Encrypted user data exported.", "success");
        });
    }
    function clearAllDataWithConfirmation() {
        openConfirmationModal(
            "Clear All Data?",
            "<p>This will reset all your tasks, habits, mood logs, custom settings, and other application data. This action cannot be undone.</p><p><strong>Are you absolutely sure?</strong></p>",
            () => {
                localStorage.clear();
                showToast("All application data has been cleared. Please log in again.", "success", 3000);
                setTimeout(() => {
                    window.location.reload();
                }, 3100);
            }
        );
    }
    function showDealDetailModal(deal) {
        if (!deal) { showToast("Error: Deal details not available.", "error", 2000, true); return; }
        
        const contentContainer = document.getElementById('dealDetailContent');
        if (!contentContainer) return;
        
        let bodyHtml = `<p><strong>Business:</strong> ${deal.businessName}</p>`;
        bodyHtml += `<p>${deal.description}</p>`;
        let priceHtml = `<p><strong>Price:</strong> <span class="price-tag">E${deal.discountPrice ? deal.discountPrice.toFixed(2) : deal.price.toFixed(2)}</span>`;
        if(deal.discountPrice) priceHtml += `<span class="original-price">E${deal.price.toFixed(2)}</span>`;
        priceHtml += `</p>`;
        bodyHtml += priceHtml;

        if (deal.expiryDate) {
             const expiry = new Date(deal.expiryDate);
             const today = new Date();
             today.setHours(0,0,0,0);
             if (expiry < today) {
                bodyHtml += `<p><strong>Status:</strong> <span style="color:var(--danger-color); font-weight:bold;">Expired on ${expiry.toLocaleDateString()}</span></p>`;
             } else {
                bodyHtml += `<p><strong>Expires:</strong> ${expiry.toLocaleDateString()}</p>`;
             }
        } else {
            bodyHtml += `<p><strong>Expires:</strong> No expiration date (ongoing)</p>`;
        }
        if (deal.terms) {
            bodyHtml += `<h4 class="mt-2 card-subtitle" style="font-size:0.9rem; font-weight:500;">Terms & Conditions:</h4><p style="font-size:0.8rem;">${deal.terms}</p>`;
        }

        contentContainer.innerHTML = `
            <h3 id="modalDealTitle" class="modal-title">${deal.title}</h3>
            <img id="modalDealImage" src="${deal.img}" alt="${deal.title}" style="width:100%; max-height:clamp(120px, 30vh, 150px); object-fit:cover; border-radius:var(--border-radius-md); margin-bottom:var(--space-sm);" loading="lazy">
            <div id="modalDealBody" class="modal-body">${bodyHtml}</div>
            <div id="dealRedemptionContainer" class="mt-3" style="display:flex; gap:var(--space-sm);">
                <button id="redeemDealButton" class="button" style="flex:1;"><i class="fas fa-ticket-alt" aria-hidden="true"></i> Redeem</button>
                <button class="button button-secondary" style="flex:1;" onclick="shareContent('deal', {id: ${deal.id}})"><i class="fas fa-share-alt" aria-hidden="true"></i> Share</button>
            </div>
        `;
        
        const redeemButton = contentContainer.querySelector('#redeemDealButton');
        redeemButton.onclick = () => redeemDeal(deal, contentContainer);
        
        openModal('dealDetailModal');
    }
    function redeemDeal(deal, contentContainer) {
        let step = 1;
        const updateRedemptionUI = () => {
            let html = '';
            switch (step) {
                case 1: 
                    html = `
                        <h4 class="modal-title text-center">Confirm Redemption</h4>
                        <p class="text-center card-subtitle">You are about to redeem:</p>
                        <p class="text-center" style="font-weight: 600; font-size: 1.1rem;">${deal.title}</p>
                        <p class="text-center card-subtitle mt-2">AI is verifying your eligibility for this offer...</p>
                        <div class="mt-3" style="display:flex; gap:var(--space-sm);">
                            <button class="button" style="flex-grow:1;" onclick="redeemDealStep(2)">Confirm</button>
                            <button class="button button-secondary" style="flex-grow:1;" onclick="closeModal('dealDetailModal')">Cancel</button>
                        </div>`;
                    break;
                case 2:
                    const receiptId = `LL-${Date.now()}`;
                    html = `
                        <h4 class="modal-title text-center" style="color:var(--success-color);">Deal Redeemed!</h4>
                        <p class="text-center card-subtitle">Show this screen to the merchant for verification.</p>
                        <div class="text-center my-3" id="receiptContent">
                           <div id="receipt-container">
                                <h3>LocalLife OS Receipt</h3>
                                <p class="text-center">${new Date().toLocaleString()}</p>
                                <div class="divider"></div>
                                <p><strong>Item:</strong> ${deal.title}</p>
                                <p><strong>Merchant:</strong> ${deal.businessName}</p>
                                <div class="divider"></div>
                                <p><strong>Ref:</strong> ${receiptId}</p>
                                <div class="divider"></div>
                                <p class="text-center">Thank You!</p>
                           </div>
                        </div>
                        <p class="text-center card-subtitle">A confirmation has been sent to your notifications.</p>
                        <button class="button mt-3" style="width:100%" onclick="downloadReceipt('receiptContent', '${receiptId}')">Download Receipt</button>
                        <button class="button button-secondary mt-2" style="width:100%" onclick="closeModal('dealDetailModal')">Done</button>
                    `;
                    showDynamicIslandAlert('fas fa-ticket-alt', 'Deal Redeemed!');
                    addXP(10, 'explore');
                    break;
            }
            contentContainer.innerHTML = html;
        };

        window.redeemDealStep = (nextStep) => {
            step = nextStep;
            updateRedemptionUI();
        };

        updateRedemptionUI();
    }
    function openSubmitDealModal() {
        const form = document.getElementById('submitDealForm');
        form.reset();
        document.getElementById('editingDealId').value = '';
        document.getElementById('submitDealButton').textContent = 'Submit Deal for Review';
        const categorySelect = document.getElementById('dealCategorySelect');
        if (categorySelect) {
            categorySelect.innerHTML = '';
            dealCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                categorySelect.appendChild(option);
            });
             if(dealCategories.length > 0) {
                 categorySelect.value = dealCategories[0];
             }
        }
        document.getElementById('dealImagePreview').classList.add('hidden');
        document.getElementById('dealImageUploadText').textContent = 'Click to Upload or Open Camera';
        openModal('submitDealModal');
    }
    function submitNewDeal() {
        const titleInput = document.getElementById('dealTitleInput');
        const businessNameInput = document.getElementById('dealBusinessNameInput');
        const descriptionInput = document.getElementById('dealDescriptionInput');
        const priceInput = document.getElementById('dealPriceInput');
        const discountPriceInput = document.getElementById('dealDiscountPriceInput');
        const categorySelect = document.getElementById('dealCategorySelect');
        const expiryDateInput = document.getElementById('dealExpiryDateInput');
        const termsInput = document.getElementById('dealTermsInput');
        const imageFile = document.getElementById('dealImageFileInput').files[0];
        const editingId = parseInt(document.getElementById('editingDealId').value);

        const title = titleInput.value.trim();
        const businessName = businessNameInput.value.trim();
        const description = descriptionInput.value.trim();
        const price = parseFloat(priceInput.value);
        const discountPrice = parseFloat(discountPriceInput.value) || null;
        const category = categorySelect.value;
        const imageUrl = imageFile ? URL.createObjectURL(imageFile) : `https://source.unsplash.com/random/80x80/?${encodeURIComponent(category)}`;
        const expiryDate = expiryDateInput.value;
        const terms = termsInput.value.trim();

        if (!title || !businessName ||!description || !category || isNaN(price)) {
            showToast("Please fill in all required fields (*) with valid data.", "error", 2000, true);
            return;
        }

        if (editingId) {
            const deal = mockDeals.find(d => d.id === editingId);
            if(deal && deal.createdBy === 'user') {
                deal.title = title; deal.businessName = businessName; deal.description = description; deal.price = price; deal.discountPrice = discountPrice;
                deal.category = category; deal.expiryDate = expiryDate || null; deal.terms = terms || "N/A";
                if(imageFile) deal.img = imageUrl;
                showToast("Your deal has been updated!", "success");
            }
        } else {
            const newDeal = {
                id: Date.now(), title: title, description: description, businessName: businessName, category: category,
                img: imageUrl, expiryDate: expiryDate || null, terms: terms || "N/A", price: price, discountPrice: discountPrice, createdBy: 'user'
            };
            mockDeals.unshift(newDeal);
            addXP(20, 'community');
            unlockBadge('contributor');
            showToast("Deal submitted! It will appear under 'My Posts' and relevant filters.", "success", 2500);
        }
        
        closeModal('submitDealModal');
        saveDealsToLocalStorage();
        filterPlaces('my_posts', document.querySelector('[data-filter="my_posts"]'));
    }
