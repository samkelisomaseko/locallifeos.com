    function checkRideInputs() {
        const pickup = document.getElementById('ride-pickup').value.trim();
        const destination = document.getElementById('ride-destination').value.trim();
        const findButton = document.getElementById('findRideButton');
        findButton.disabled = !(pickup && destination);
    }

    function openAiItineraryModal() {
        if (!userSubscriptionTier.startsWith('pro')) {
            showToast("AI Itinerary planning is a Pro+ feature.", "info");
            openSubscriptionModal();
            return;
        }
        const itineraryResult = document.getElementById('itinerary-result');
        if(itineraryResult) itineraryResult.innerHTML = '';
        openModal('aiItineraryModal');
    }

    function generateAiItinerary() {
        const occasion = document.getElementById('itinerary-occasion').value;
        const resultContainer = document.getElementById('itinerary-result');
        resultContainer.innerHTML = `<p class="card-subtitle"><i class="fas fa-spinner fa-spin"></i> AI is planning your perfect "${occasion}"...</p>`;

        setTimeout(() => {
            let plan = `
                <h4>AI Itinerary: ${occasion}</h4>
                <ul>
                    <li><strong>Stop 1:</strong> Start with a scenic drive through the Ezulwini Valley.</li>
                    <li><strong>Stop 2:</strong> Visit Mantenga Cultural Village for an authentic experience.</li>
                    <li><strong>Stop 3:</strong> Enjoy dinner at Malandela's Restaurant.</li>
                </ul>
                <button class="button mt-2" style="width:100%" onclick="addItineraryToPlanner()">Add All to Planner</button>
            `;
            resultContainer.innerHTML = plan;
        }, 1500);
    }
    window.addItineraryToPlanner = function() {
        addNewTask("Scenic drive through Ezulwini", "personal", "Afternoon");
        addNewTask("Visit Mantenga Cultural Village", "personal", "Late Afternoon");
        addNewTask("Dinner at Malandela's", "personal", "Evening");
        showToast("Itinerary added to your planner!", "success");
        closeModal('aiItineraryModal');
        setActiveScreen('planner');
    }
    function renderLoadSheddingApplet() {
        const contentEl = document.getElementById('loadSheddingContent');
        contentEl.innerHTML = `
            <p class="card-subtitle">AI has determined you are in <strong>Zone 3 (Mbabane West)</strong> based on your location.</p>
            <h4 class="mt-3">Today's Schedule:</h4>
            <ul class="settings-list" style="padding:0;">
                <li class="setting-item"><span>08:00 - 10:30</span><span class="setting-value" style="color:var(--danger-color);">OFF</span></li>
                <li class="setting-item"><span>18:00 - 20:30</span><span class="setting-value" style="color:var(--danger-color);">OFF</span></li>
            </ul>
            <h4 class="mt-3">Tomorrow's Schedule:</h4>
            <ul class="settings-list" style="padding:0;">
                 <li class="setting-item"><span>10:00 - 12:30</span><span class="setting-value" style="color:var(--danger-color);">OFF</span></li>
            </ul>
            <p class="card-subtitle mt-2" style="font-size:0.8rem;">This is mock data. A real applet would fetch live data from EEC's API.</p>
        `;
    }

    const emergencyKeywords = ['help', 'emergency', 'danger', 'hurt', 'accident', 'call the police', 'fire'];
    
    if (SpeechRecognition) {
        emergencyKeywordRecognition = new SpeechRecognition();
        emergencyKeywordRecognition.continuous = true;
        emergencyKeywordRecognition.lang = 'en-US';
        emergencyKeywordRecognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript.toLowerCase();
                
                if (emergencyKeywords.some(keyword => transcript.includes(keyword))) {
                    triggerEmergencyProtocol(transcript);
                    emergencyKeywordRecognition.stop(); 
                }
            }
        };
        emergencyKeywordRecognition.onerror = (event) => {
        }
    }

    function triggerEmergencyProtocol(context) {
        closeModal('emergencyDashboardModal');
        showToast("EMERGENCY DETECTED!", "error", 5000);
        showDynamicIslandAlert('fas fa-triangle-exclamation', 'Emergency Keyword Detected!');
        
        let message = `EMERGENCY from LocalLife OS for ${userName}. Context: "${context}".`;
        
        native.geolocation.getCurrent(
            position => {
                const { latitude, longitude } = position.coords;
                userLocationCoords = { lat: latitude, lng: longitude };
                message += ` Last known location: https://maps.google.com/?q=${latitude},${longitude}`;
                sendEmergencyAlerts(message);
            },
            () => {
                message += " Could not get current location.";
                sendEmergencyAlerts(message);
            }
        );
    }

    function sendEmergencyAlerts(message) {
        if (trustedContacts.length > 0) {
            const contacts = trustedContacts.map(c => c.phone).join(',');
            const smsUrl = `sms:${contacts}?body=${encodeURIComponent(message)}`;
            window.location.href = smsUrl; 
        } else {
            window.location.href = 'tel:999';
        }
        showToast("Alerting emergency contacts and/or services...", "error", 5000);
    }
    function updateNearbyPulse() {
        const pulseContainer = document.getElementById('nearbyPulseCarousel');
        if (!pulseContainer) return;
        
        const pulseItems = [
            { name: 'Manzini Market', icon: 'fas fa-store', desc: 'Vibrant market with fresh local produce. Try the fruit smoothies!', position: {lat: -26.4947, lng: 31.3787} },
            { name: 'Bushfire Fest', icon: 'fas fa-fire', desc: 'The annual MTN Bushfire festival is approaching! Get tickets now.', position: {lat: -26.4950, lng: 31.1969} },
            { name: 'New Cafe', icon: 'fas fa-mug-saucer', desc: 'Ekhaya Kasi cafe in Mbabane is now open! 10% off today.', position: {lat: -26.3167, lng: 31.1333} },
            { name: 'Bholoja Gig', icon: 'fas fa-guitar', desc: 'Catch local legend Bholoja live at House on Fire tonight.', position: {lat: -26.4950, lng: 31.1969} },
            { name: 'Mlilwane Walk', icon: 'fas fa-hippo', desc: 'Guided nature walks available this weekend at Mlilwane.', position: {lat: -26.4883, lng: 31.1517} },
            { name: 'Cleanup Day', icon: 'fas fa-recycle', desc: 'Join the community cleanup this Saturday in Mbabane.', position: {lat: -26.3250, lng: 31.1417} }
        ];

        
        const haversineDistance = (coords1, coords2) => {
            const toRad = x => x * Math.PI / 180;
            const R = 6371; 
            const dLat = toRad(coords2.lat - coords1.lat);
            const dLon = toRad(coords2.lng - coords1.lng);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; 
        };

        pulseItems.forEach(item => {
            item.distance = haversineDistance(userLocationCoords, item.position);
        });

        
        pulseItems.sort((a, b) => a.distance - b.distance);

        pulseContainer.innerHTML = ''; 
        pulseItems.forEach(item => {
            const itemEl = document.createElement('button');
            itemEl.className = 'story-item';
            itemEl.onclick = () => showPulseDetailModal(item.name, item.icon, item.desc);
            itemEl.setAttribute('aria-label', `View ${item.name} details`);
            itemEl.innerHTML = `
                <div class="story-avatar"><i class="${item.icon}" aria-hidden="true"></i></div>
                <span class="story-label">${item.name}</span>
            `;
            pulseContainer.appendChild(itemEl);
        });
    }
    
    function openNewMessageModal() {
        renderNewMessageUserList();
        openModal('newMessageModal');
    }

    function renderNewMessageUserList() {
        const userListEl = document.getElementById('newMessageUserList');
        const searchInput = document.getElementById('newMessageSearchInput');
        if (!userListEl || !searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        userListEl.innerHTML = '';
        
        let usersToDisplay = Object.values(mockUsers).filter(u => u.id !== 'user' && u.id !== 'defaultBot');

        if (searchTerm) {
            usersToDisplay = usersToDisplay.filter(user => user.name.toLowerCase().includes(searchTerm) || user.username.toLowerCase().includes(searchTerm));
        } else {
            const joinedChannelUserIds = new Set();
            mockChannels.filter(c => c.isJoined && c.messages).forEach(c => {
                c.messages.forEach(m => joinedChannelUserIds.add(m.senderId));
            });
            usersToDisplay.sort((a, b) => {
                const aInJoined = joinedChannelUserIds.has(a.id);
                const bInJoined = joinedChannelUserIds.has(b.id);
                return bInJoined - aInJoined;
            });
        }
        
        if (usersToDisplay.length === 0) {
            userListEl.innerHTML = `<div class="setting-item"><span class="setting-label">No users found.</span></div>`;
            return;
        }

        usersToDisplay.forEach(user => {
            const itemEl = document.createElement('div');
            itemEl.className = 'setting-item';
            itemEl.setAttribute('role', 'button');
            itemEl.setAttribute('tabindex', '0');
            itemEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:var(--space-sm);">
                    <img src="${user.avatarUrl}" alt="${user.name}" style="width:32px; height:32px; border-radius:50%;">
                    <span class="setting-label">${user.name}</span>
                </div>
                <i class="fas fa-chevron-right"></i>`;
            itemEl.onclick = () => {
                closeModal('newMessageModal');
                startDirectMessage(user.id);
            };
            userListEl.appendChild(itemEl);
        });
    }

    function switchModalTab(button, tabId) {
        const modal = button.closest('.modal-content');
        modal.querySelectorAll('.modal-tab-button').forEach(btn => btn.classList.remove('active'));
        modal.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }
    
    function updateUserAccount() {
        const newEmail = document.getElementById('profileEmailInput').value;
        const newPassword = document.getElementById('profilePasswordInput').value;
        localStorage.setItem('userEmail', newEmail);
        if (newPassword) {
            showToast("Password updated successfully.", "success");
        } else {
            showToast("Email updated.", "success");
        }
        closeModal('userProfileModal');
    }

    function downloadReceipt(elementId, receiptId) {
        const receiptNode = document.getElementById(elementId);
        if (receiptNode) {
            html2canvas(receiptNode.querySelector('#receipt-container')).then(canvas => {
                const link = document.createElement('a');
                link.download = `LocalLife_Receipt_${receiptId}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    }
    function setupSiswatiTutor() {
         const contentEl = document.getElementById('siswatiTutorContent');
        if (!contentEl) return;

        const questions = [
            { q: "What is 'Sanibonani' in English?", a: ["Hello (to many)", "Goodbye", "Thank you"], correct: 0 },
            { q: "How do you say 'How are you?'", a: ["Kunjani?", "Ngiyabonga", "Lidla kahle"], correct: 0 },
            { q: "What is the siSwati for 'water'?", a: ["Ematinta", "Inkhosi", "Emanti"], correct: 2 },
            { q: "Translate 'Ngiyakutsandza'.", a: ["I am hungry", "I love you", "Where are you going?"], correct: 1 }
        ];
        let currentQuestionIndex = 0;
        let score = 0;

        function renderQuestion() {
            if (currentQuestionIndex >= questions.length) {
                contentEl.innerHTML = `
                    <h4 class="text-center">Quiz Complete!</h4>
                    <p class="text-center card-subtitle">You scored ${score} out of ${questions.length}.</p>
                    <p class="text-center card-subtitle mt-2">AI suggests practicing greetings and common nouns.</p>
                    <button class="button mt-3" style="width:100%" onclick="setupSiswatiTutor()">Play Again</button>`;
                return;
            }
            const q = questions[currentQuestionIndex];
            let optionsHtml = '';
            q.a.forEach((option, index) => {
                optionsHtml += `<button class="button button-secondary" style="width:100%; margin-bottom:var(--space-sm);" onclick="handleAnswer(${index === q.correct})">${option}</button>`;
            });
            contentEl.innerHTML = `
                <div class="quiz-score">Score: ${score} / ${questions.length}</div>
                <h4 class="card-title mb-3">${q.q}</h4>
                ${optionsHtml}
            `;
        }

        window.handleAnswer = (isCorrect) => {
            if (isCorrect) {
                score++;
                showToast("Correct! Kuhle kakhulu!", "success", 1500);
            } else {
                showToast("That's not quite right. Try the next one!", "error", 1500);
            }
            currentQuestionIndex++;
            renderQuestion();
        };

        renderQuestion();
    }
    function findRide() {
        const pickup = document.getElementById('ride-pickup').value;
        const dest = document.getElementById('ride-destination').value;
        const contentEl = document.getElementById('rideShareContent');
        contentEl.innerHTML = `<p class="card-subtitle text-center"><i class="fas fa-spinner fa-spin"></i> Finding rides from ${pickup} to ${dest}...</p>`;
        setTimeout(() => {
            contentEl.innerHTML = `
                <h4 class="card-title">Available Rides</h4>
                <div class="card service-provider-card">
                    <img src="https://i.pravatar.cc/60?u=driver1" alt="Sipho Dlamini">
                    <div>
                        <p><strong>Sipho Dlamini</strong> <span class="rating"><i class="fas fa-star"></i> 4.8</span></p>
                        <p class="card-subtitle">Toyota Quantum | 5 min away</p>
                    </div>
                    <button class="button" style="margin-left:auto;">E25.00</button>
                </div>
                <button class="button button-secondary mt-3" style="width:100%;" onclick="launchApplet('localRideshare')">Search Again</button>
            `;
        }, 2000);
    }

    function toggleAppLock(button) {
        const isEnabled = !!localStorage.getItem('appPin');
        if (isEnabled) {
            openPinPrompt("disable app lock", (pin) => {
                localStorage.removeItem('appPin');
                localStorage.setItem('appLockEnabled', 'false');
                button.querySelector('.toggle-switch').classList.remove('active');
                showToast("App Lock disabled.", "info");
            });
        } else {
            openSetPinModal("set", (pin) => {
                localStorage.setItem('appPin', CryptoJS.SHA256(pin).toString());
                localStorage.setItem('appLockEnabled', 'true');
                button.querySelector('.toggle-switch').classList.add('active');
                showToast("App Lock PIN set and enabled.", "success");
            });
        }
    }
    function toggleExploreView() {
        const placesList = document.getElementById('placesList');
        const toggleBtnIcon = document.querySelector('#viewToggleBtn i');
        if (placesList.classList.contains('grid-view')) {
            placesList.classList.remove('grid-view');
            placesList.classList.add('list-view');
            toggleBtnIcon.className = 'fas fa-th-large';
        } else {
            placesList.classList.remove('list-view');
            placesList.classList.add('grid-view');
            toggleBtnIcon.className = 'fas fa-list';
        }
    }

    function renderServicesMarketplace() {
        const container = document.getElementById('servicesMarketContent');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tools"></i>
                    <p>Local Services Marketplace</p>
                    <p class="card-subtitle">This feature is under development. Soon you'll be able to find and offer local services like plumbing, tutoring, and gardening right here!</p>
                </div>`;
        }
    }

    function renderGovernanceHub() {
        const container = document.getElementById('governanceHubContent');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-landmark"></i>
                    <p>Civic Engagement Hub</p>
                    <p class="card-subtitle">Coming soon: Connect with your local authorities, participate in polls, view public notices, and use AI to summarize important civic documents.</p>
                </div>`;
        }
    }
    
    function handlePinInput(inputEl) {
        const pinDisplay = document.getElementById('pinDisplay');
        currentPinInput = inputEl.value;
        Array.from(pinDisplay.children).forEach((dot, index) => {
            dot.classList.toggle('filled', index < currentPinInput.length);
        });
        if (currentPinInput.length === 4) {
            verifyPin();
        }
    }

    function verifyPin() {
        const storedPinHash = localStorage.getItem('appPin');
        if (storedPinHash && CryptoJS.SHA256(currentPinInput).toString() === storedPinHash) {
            isAppLocked = false;
            lockScreen.classList.add('hidden');
            document.getElementById('pinInput').value = '';
            currentPinInput = '';
            handlePinInput(document.getElementById('pinInput'));
        } else {
            lockScreen.classList.add('shake');
            document.getElementById('pinErrorMessage').textContent = 'Incorrect PIN. Try again.';
            setTimeout(() => {
                lockScreen.classList.remove('shake');
                document.getElementById('pinErrorMessage').textContent = '';
                document.getElementById('pinInput').value = '';
                currentPinInput = '';
                handlePinInput(document.getElementById('pinInput'));
            }, 800);
        }
    }

    function openSetPinModal(purpose, callback) {
        const setPinModal = document.getElementById('setPinModal');
        const titleEl = document.getElementById('setPinModalTitle');
        const promptEl = document.getElementById('setPinModalPrompt');
        const pinDisplay = document.getElementById('setPinDisplay');
        const pinInput = document.getElementById('setPinInput');
        
        settingPinState = { stage: 'set', firstPin: null, callback: callback };

        titleEl.textContent = 'Set App Lock PIN';
        promptEl.textContent = 'Enter a 4-digit PIN.';
        
        pinInput.value = '';
        pinInput.focus();

        const updateDisplay = () => {
            const val = pinInput.value;
            Array.from(pinDisplay.children).forEach((dot, index) => {
                dot.classList.toggle('filled', index < val.length);
            });
        };
        
        const processPinInput = () => {
            if (pinInput.value.length === 4) {
                if (settingPinState.stage === 'set') {
                    settingPinState.firstPin = pinInput.value;
                    settingPinState.stage = 'confirm';
                    promptEl.textContent = 'Please confirm your new PIN.';
                    pinInput.value = '';
                    updateDisplay();
                } else if (settingPinState.stage === 'confirm') {
                    if (pinInput.value === settingPinState.firstPin) {
                        settingPinState.callback(pinInput.value);
                        closeModal('setPinModal');
                    } else {
                        showToast('PINs do not match. Please start over.', 'error');
                        settingPinState.stage = 'set';
                        promptEl.textContent = 'Enter a 4-digit PIN.';
                        pinInput.value = '';
                        updateDisplay();
                    }
                }
            }
        };

        pinInput.oninput = () => {
            updateDisplay();
            processPinInput();
        };

        openModal('setPinModal');
    }
    
    function initializeSwipeActions(selector) {
        document.querySelectorAll(selector).forEach(item => {
            item.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            item.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                const deltaX = touchEndX - touchStartX;
                if (Math.abs(deltaX) > 100) { 
                    if (touchEndX < touchStartX) {
                        handleSwipe(item, 'left');
                    } else {
                        handleSwipe(item, 'right');
                    }
                }
            });
        });
    }
    
    function initializeLongPress() {
        document.body.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.long-press-target');
            if (target) {
                longPressTimer = setTimeout(() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    showContextMenu(e.touches[0].clientX, e.touches[0].clientY, target.dataset.type, target.dataset.id);
                }, 700);
            }
        });

        document.body.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
        document.body.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });

        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('contextMenu');
            if (contextMenu && !contextMenu.contains(e.target)) {
                contextMenu.classList.add('hidden');
            }
        });
    }
    
    function showContextMenu(x, y, type, id) {
        const contextMenu = document.getElementById('contextMenu');
        contextMenu.innerHTML = ''; 
        let items = [];

        if (type === 'task') {
            items = [
                { label: 'Edit Task', icon: 'fas fa-pencil-alt', action: () => openEditTaskModal(parseInt(id)) },
                { label: 'Delete Task', icon: 'fas fa-trash-alt', class: 'danger', action: () => deleteTask(parseInt(id)) }
            ];
        } else if (type === 'place' || type === 'deal' || type === 'bulletin') {
             items.push({ label: 'View Details', icon: 'fas fa-eye', action: () => {
                if (type === 'place') showPlaceDetail(mockPlaces.all.find(p => p.id == id));
                if (type === 'deal') showDealDetailModal(mockDeals.find(d => d.id == id));
                if (type === 'bulletin') openBulletinCommentsModal(parseInt(id));
             }});
             items.push({ label: 'Share', icon: 'fas fa-share-alt', action: () => shareContent(type, {id: parseInt(id)}) });
             if (type === 'place') {
                 items.push({ label: 'Get Directions', icon: 'fas fa-directions', action: () => getDirections(mockPlaces.all.find(p => p.id == id).name)});
             }
        } else if (type === 'message') {
            items = [
                 { label: 'Reply', icon: 'fas fa-reply', action: () => replyToMessage(currentChatChannelId, parseInt(id)) },
                 { label: 'Copy Text', icon: 'fas fa-copy', action: () => copyMessageText(currentChatChannelId, parseInt(id)) },
                 { label: 'Edit Message', icon: 'fas fa-pencil-alt', action: () => editMessage(currentChatChannelId, parseInt(id)) },
                 { label: 'Delete Message', icon: 'fas fa-trash-alt', class: 'danger', action: () => deleteMessage(currentChatChannelId, parseInt(id)) }
            ];
        } else if (type === 'channel') {
            const channel = mockChannels.find(c => c.id == id);
            if (channel) {
                items.push({ label: channel.isJoined ? 'Leave Channel' : 'Join Channel', icon: channel.isJoined ? 'fas fa-door-open' : 'fas fa-door-closed', action: () => toggleJoinChannel(channel.id) });
                items.push({ label: channel.isFavorite ? 'Unfavorite' : 'Favorite', icon: 'fas fa-star', action: () => toggleFavoriteChannel(channel.id, true) });
                if (channel.ownerId === 'user') {
                    items.push({ label: 'Edit Channel', icon: 'fas fa-edit', action: () => openEditChannelModal(channel.id) });
                    items.push({ label: 'Delete Channel', icon: 'fas fa-trash-alt', class: 'danger', action: () => deleteMyChannel(channel.id) });
                }
            }
        }
         else {
             return;
        }

        items.forEach(item => {
            const button = document.createElement('button');
            button.className = `context-menu-item ${item.class || ''}`;
            button.innerHTML = `<i class="${item.icon}"></i> <span>${item.label}</span>`;
            button.onclick = (e) => {
                e.stopPropagation();
                item.action();
                contextMenu.classList.remove('show');
            };
            contextMenu.appendChild(button);
        });

        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        let finalX = x;
        let finalY = y;
        const safeMargin = 10;

        if (x + menuWidth + safeMargin > window.innerWidth) {
            finalX = window.innerWidth - menuWidth - safeMargin;
        }
        if (y + menuHeight + safeMargin > window.innerHeight) {
            finalY = window.innerHeight - menuHeight - safeMargin;
        }

        contextMenu.style.left = `${finalX}px`;
        contextMenu.style.top = `${finalY}px`;
        contextMenu.classList.remove('hidden');
        setTimeout(() => contextMenu.classList.add('show'), 10);
    }
    
    function openEditChannelModal(channelId = null) {
        let idToEdit = channelId;
        if (!idToEdit && currentChatChannelId) {
            const currentChannel = mockChannels.find(c => c.id === currentChatChannelId);
            if (currentChannel && currentChannel.ownerId === 'user') {
                idToEdit = currentChatChannelId;
            }
        }
        if (!idToEdit) {
            showToast("You can only edit channels you created.", "error");
            return;
        }
        const channel = mockChannels.find(c => c.id === idToEdit);
        if (!channel) return;
        
        closeModal('channelDetailModal');

        document.getElementById('editingChannelId').value = channel.id;
        document.getElementById('createChannelModalTitle').textContent = 'Edit Channel';
        document.getElementById('submitChannelButton').textContent = 'Save Changes';
        document.getElementById('newChannelName').value = channel.name;
        document.getElementById('newChannelDesc').value = channel.description;
        document.getElementById('newChannelType').value = channel.type;
        populateIconSelector('newChannelIconSelector', channel.icon);
        openModal('createChannelModal');
    }
    
    function deleteMyChannel(channelId = null) {
        let idToDelete = channelId;
         if (!idToDelete && currentChatChannelId) {
            const currentChannel = mockChannels.find(c => c.id === currentChatChannelId);
            if (currentChannel && currentChannel.ownerId === 'user') {
                idToDelete = currentChatChannelId;
            }
        }
        if (!idToDelete) {
             showToast("You can only delete channels you created.", "error");
            return;
        }
        const channel = mockChannels.find(c => c.id === idToDelete);

        openConfirmationModal(
            `Delete "${channel.name}"?`,
            "Are you sure? This action is permanent and will remove the channel for all members.",
            () => {
                mockChannels = mockChannels.filter(c => c.id !== idToDelete);
                saveChannelsToLocalStorage();
                if (currentChatChannelId === idToDelete) {
                    showChannelListView();
                } else {
                    renderChannels();
                }
                closeModal('channelDetailModal');
                showToast(`Channel "${channel.name}" has been deleted.`, "success");
            }
        );
    }

    function startCall(userId, type) {
        const user = mockUsers[userId];
        if (!user || !callModal) return;
        
        document.getElementById('callerAvatar').src = user.avatarUrl;
        document.getElementById('callerName').textContent = user.name;
        const callStatusEl = document.getElementById('callStatus');
        callStatusEl.textContent = `${type === 'video' ? 'Video calling' : 'Calling'}...`;

        callModal.classList.add('active');

        let seconds = 0;
        clearInterval(callTimerInterval);
        setTimeout(() => {
            callTimerInterval = setInterval(() => {
                seconds++;
                const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                const secs = (seconds % 60).toString().padStart(2, '0');
                callStatusEl.textContent = `${mins}:${secs}`;
            }, 1000);
        }, 2000);
    }

    function endCall() {
        clearInterval(callTimerInterval);
        if (callModal) callModal.classList.remove('active');
        showToast("Call ended.", "info");
    }

    // --- NEWLY ACTIVATED FUNCTIONS ---
    function openForgotPasswordModal() {
        openModal('forgotPasswordModal');
    }

    function handlePasswordRecovery() {
        const email = document.getElementById('recoveryEmail').value;
        if (!email.includes('@')) {
            showToast("Please enter a valid email address.", "error");
            return;
        }
        showToast(`If an account exists for ${email}, a reset link has been sent.`, "success");
        closeModal('forgotPasswordModal');
    }
    
    // Offline detection
    window.addEventListener('online', () => {
        onlineStatus = true;
        document.getElementById('offline-indicator').classList.remove('show');
        showToast("You are back online!", "success");
    });
    window.addEventListener('offline', () => {
        onlineStatus = false;
        document.getElementById('offline-indicator').classList.add('show');
    });


