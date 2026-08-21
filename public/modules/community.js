    const communityChannelListEl = document.getElementById('communityChannelList');
    const typingIndicatorArea = document.getElementById('typingIndicatorArea');
    const mockUserSuggestionPopup = document.getElementById('mockUserSuggestionPopup');
    let typingTimeout;
    let lastMessageDate = null;
    function formatChannelTimestamp(timestamp) {
        if (!timestamp) return '';
        const messageDate = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (messageDate.toDateString() === today.toDateString()) {
            return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (messageDate.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else if (today.getFullYear() === messageDate.getFullYear()) {
            return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } else {
            return messageDate.toLocaleDateString([], { year:'2-digit', month: 'numeric', day: 'numeric' });
        }
    }
    function toggleChannelListType(type, buttonEl) {
        document.querySelectorAll('.channel-list-toggle button').forEach(btn => btn.classList.remove('active'));
        if (buttonEl) buttonEl.classList.add('active');
        renderChannels(type);
    }
    function findOrCreateDMChannel(otherUserId) {
        const otherUser = mockUsers[otherUserId];
        if (!otherUser) return null;
        const dmId = ['user', otherUserId].sort().join('-');
        let dmChannel = mockChannels.find(c => c.dmId === dmId);
        if (!dmChannel) {
            dmChannel = {
                id: nextChannelId++,
                dmId: dmId,
                name: otherUser.name,
                icon: 'fas fa-user-secret',
                color: otherUser.color || 'var(--primary-accent)',
                type: 'direct_message',
                participantIds: ['user', otherUserId],
                lastMessage: "No messages yet.",
                lastMessageTimestamp: new Date(),
                unreadCount: 0,
                isJoined: true,
                isFavorite: false,
                ownerId: 'system',
                messages: [{
                    mid: nextMessageId++,
                    senderId: 'defaultBot',
                    text: `This is the beginning of your direct message history with ${otherUser.name}.`,
                    timestamp: new Date()
                }]
            };
            const triggeringNotification = mockNotifications.find(n => n.type === 'dm' && n.text.includes(otherUser.name));
            if(triggeringNotification) {
                 dmChannel.messages.push({
                    mid: nextMessageId++,
                    senderId: otherUserId,
                    text: triggeringNotification.text,
                    timestamp: new Date(triggeringNotification.timestamp)
                });
                dmChannel.lastMessage = triggeringNotification.text;
                dmChannel.lastMessageTimestamp = new Date(triggeringNotification.timestamp);
            }
            mockChannels.push(dmChannel);
            saveChannelsToLocalStorage();
        }
        return dmChannel;
    }
    function renderChannels(type = 'joined') {
        if (!communityChannelListEl) { return; }
        communityChannelListEl.innerHTML = Array(3).fill(getSkeletonChannelItem()).join('');
        communityChannelListEl.setAttribute('aria-busy', 'true');
        setTimeout(() => {
            communityChannelListEl.innerHTML = '';
            let channelsToRender;
            const searchTerm = document.getElementById('communitySearchInput').value.toLowerCase();

            if (type === 'all') {
                channelsToRender = mockChannels.filter(c => c.type !== 'direct_message');
            } else if (type === 'dms') {
                channelsToRender = mockChannels.filter(c => c.type === 'direct_message' && c.isJoined);
            } else if (type === 'favorites') {
                channelsToRender = mockChannels.filter(c => c.isFavorite && c.isJoined);
            } else if (type === 'recent') {
                channelsToRender = mockChannels.filter(c => c.isJoined).sort((a,b) => (b.lastOpened || 0) - (a.lastOpened || 0)).slice(0, 10);
            } else { 
                channelsToRender = mockChannels.filter(c => c.type !== 'direct_message' && c.isJoined);
            }

            if (searchTerm) {
                channelsToRender = channelsToRender.filter(c => 
                    c.name.toLowerCase().includes(searchTerm) ||
                    (c.lastMessage && c.lastMessage.toLowerCase().includes(searchTerm))
                );
            }

            if (channelsToRender.length === 0) {
                const emptyStateHTML = `<div class="empty-state" style="padding: 20px 0; background-color: var(--card-bg);"><i class="fas fa-${type === 'dms' ? 'paper-plane' : 'comments'}"></i><p>No ${searchTerm ? 'matching ' : ''}${type} channels yet.</p></div>`;
                communityChannelListEl.innerHTML = emptyStateHTML;
            } else {
                if (type !== 'recent') {
                    channelsToRender.sort((a,b) => (b.isFavorite - a.isFavorite) || (new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp)) );
                }
                channelsToRender.forEach(channel => {
                    const channelEl = document.createElement('div');
                    channelEl.className = 'channel-item long-press-target';
                    channelEl.dataset.id = channel.id;
                    channelEl.dataset.type = 'channel';
                    channelEl.setAttribute('role', 'button');
                    channelEl.setAttribute('tabindex', '0');
                    channelEl.setAttribute('aria-label', `Open ${channel.name} channel. ${channel.unreadCount > 0 ? channel.unreadCount + ' unread messages.' : ''} ${channel.isFavorite ? 'Favorite channel.' : ''}`);
                    channelEl.onclick = () => showSpecificChatView(channel.id);
                    let favoriteIconClass = channel.isFavorite ? 'fas fa-star favorited' : 'far fa-star';
                    const formattedTimestamp = formatChannelTimestamp(channel.lastMessageTimestamp);
                    let avatarHtml;
                    if (channel.type === 'direct_message') {
                        const otherUserId = channel.participantIds.find(id => id !== 'user');
                        const otherUser = mockUsers[otherUserId];
                        avatarHtml = `<img src="${otherUser.avatarUrl}" alt="${otherUser.name}" class="channel-icon" style="width:48px; height:48px; object-fit: cover;" loading="lazy" />`;
                    } else if (channel.customIconUrl) {
                        avatarHtml = `<img src="${channel.customIconUrl}" alt="${channel.name}" class="channel-icon" style="width:48px; height:48px; object-fit: cover;" loading="lazy" />`;
                    } else {
                         const tempAvatarText = channel.name.split(' ').map(w => w[0]).join('').substring(0,2);
                         const colorCode = (channel.color || 'var(--primary-accent)').replace('var(--','').replace(')','').trim();
                         const hexColor = getComputedStyle(document.documentElement).getPropertyValue(colorCode).trim().replace('#', '');
                         avatarHtml = `<div class="channel-icon" style="background-color: #${hexColor};"><i class="${channel.icon}" aria-hidden="true"></i></div>`;
                    }
                    channelEl.innerHTML = `
                        ${avatarHtml}
                        <div class="channel-info-wrapper">
                             <div class="channel-info">
                                <div class="name">${channel.name}</div>
                                <div class="-message">${channel.lastMessage || 'No messages yet.'}</div>
                            </div>
                            <div class="channel-actions-container">
                                <span class="-message-timestamp">${formattedTimestamp}</span>
                                ${channel.unreadCount > 0 ? `<span class="unread-badge">${channel.unreadCount}</span>` : `<i class="channel-favorite-icon ${favoriteIconClass}" onclick="event.stopPropagation(); toggleFavoriteChannel(${channel.id}, false, this);" aria-label="${channel.isFavorite ? 'Unfavorite' : 'Favorite'} channel ${channel.name}"></i>`}
                            </div>
                        </div>
                    `;
                    communityChannelListEl.appendChild(channelEl);
                });
            }
            communityChannelListEl.setAttribute('aria-busy', 'false');
            renderPinnedWidgets();
        }, 500);
    }
    function updateChannelDescPlaceholder(channelType) {
        const descInput = document.getElementById('newChannelDesc');
        if (descInput) {
            if (channelType === 'skill_swap') {
                descInput.placeholder = "e.g., Offering: Web design help. Seeking: Guitar lessons. Clearly state if you're offering or seeking a skill.";
            } else if (channelType === 'hobby') {
                descInput.placeholder = "e.g., For local photography enthusiasts to share tips and organize meetups.";
            } else if (channelType === 'announcements') {
                descInput.placeholder = "e.g., Important updates for the Oakwood neighborhood association.";
            } else if (channelType === 'local_events') {
                descInput.placeholder = "e.g., Discussing the upcoming Summer Fest, planning carpools, sharing photos afterwards.";
            }
             else {
                descInput.placeholder = "e.g., Share gardening tips, or discuss local news.";
            }
        }
    }
    function openCreateChannelModal(nameFromAI = "", typeFromAI = "general", descFromAI = "") {
        document.getElementById('editingChannelId').value = '';
        document.getElementById('createChannelModalTitle').textContent = 'Create New Channel';
        document.getElementById('submitChannelButton').textContent = 'Create Channel';
        document.getElementById('newChannelName').value = nameFromAI;
        document.getElementById('newChannelDesc').value = descFromAI;
        const channelTypeSelect = document.getElementById('newChannelType');
        if(channelTypeSelect) channelTypeSelect.value = typeFromAI;
        updateChannelDescPlaceholder(typeFromAI);
        populateIconSelector('newChannelIconSelector');
        openModal('createChannelModal');
    }
    function submitNewChannel(isAIInitiated = false) {
        const nameInput = document.getElementById('newChannelName');
        const descInput = document.getElementById('newChannelDesc');
        const typeInput = document.getElementById('newChannelType');
        const editingId = parseInt(document.getElementById('editingChannelId').value);
        const name = nameInput.value.trim();
        const desc = descInput.value.trim();
        const type = typeInput.value;
        const selectedIconEl = document.querySelector('#newChannelIconSelector .icon-option.selected');
        const customIconFile = document.getElementById('channelIconUpload').files[0];
        if (!name) { 
            if(!isAIInitiated) showToast("Channel name is required.", "error", 2000, true); nameInput.focus(); 
            return false; 
        }
        if (!editingId && !selectedIconEl && !customIconFile) { 
            if(!isAIInitiated) showToast("Please select an icon or upload a custom one.", "error", 2000, true); 
            return false; 
        }

        if (editingId) {
            const channel = mockChannels.find(c => c.id === editingId);
            if (channel && channel.ownerId === 'user') {
                channel.name = name;
                channel.description = desc;
                channel.type = type;
                if(selectedIconEl) channel.icon = selectedIconEl.dataset.icon;
                if(customIconFile) channel.customIconUrl = URL.createObjectURL(customIconFile);
                showToast(`Channel "${name}" updated.`, "success");
            }
        } else {
            let firstMessageText = `Welcome to ${name}! ${desc ? 'About: ' + desc : ''}`;
            if (type === 'skill_swap') {
                firstMessageText = `This is a Skill Swap channel! Please start your posts with "OFFERING:" or "SEEKING:" to make it clear. Example: "OFFERING: Basic plumbing help." or "SEEKING: Someone to teach Spanish." AI can help match users!`;
            }
            const now = new Date();
            const newChannel = {
                id: nextChannelId++, name: name, description: desc, icon: selectedIconEl?.dataset.icon, type: type,
                customIconUrl: customIconFile ? URL.createObjectURL(customIconFile) : null,
                color: availableColors[Math.floor(Math.random() * availableColors.length)], 
                lastMessage: "Channel created! Start the conversation.", lastMessageTimestamp: now,
                unreadCount: 0, 
                isJoined: true, isFavorite: false, ownerId: 'user',
                messages: [{ mid: nextMessageId++, senderId: 'defaultBot', text: firstMessageText, timestamp: now, reactions: {} }]
            };
            mockChannels.unshift(newChannel); 
            showToast(`AI: Channel "${name}" created and joined!`, "ai_info", 2000);
            addXP(20, 'community');
            if(mockChannels.filter(c => c.isJoined).length >= 5) unlockBadge('social_butterfly');
            triggerFabSuggestion();
        }
        renderChannels();
        if(!isAIInitiated) closeModal('createChannelModal');
        saveChannelsToLocalStorage();
        return true;
    }
    const channelListView = document.getElementById('channelListView');
    const specificChatView = document.getElementById('specificChatView');
    const specificChatTitle = document.getElementById('specificChatTitle');
    const specificChatMessagesArea = document.getElementById('specificChatMessagesArea');
    const specificChatInput = document.getElementById('specificChatInput');
    const aiChatSummaryButtonContainer = document.getElementById('aiChatSummaryButtonContainer');
    const specificChatAvatar = document.getElementById('specificChatAvatar');
    const specificChatStatus = document.getElementById('specificChatStatus');
    let currentChatChannelId = null;
    function showSpecificChatView(channelId) { 
        const channel = mockChannels.find(c => c.id === channelId);
        if (!channel) { showToast("Error: Channel not found.", "error", 2000, true); return; }
        currentChatChannelId = channelId;
        channel.lastOpened = new Date();
        lastMessageDate = null;
        appContainer.classList.add('full-page-active'); 
        if (specificChatTitle) specificChatTitle.textContent = channel.name;

        const voiceCallBtn = document.getElementById('voiceCallButton');
        const videoCallBtn = document.getElementById('videoCallButton');
        if (channel.type === 'direct_message') {
            const otherUserId = channel.participantIds.find(id => id !== 'user');
            const otherUser = mockUsers[otherUserId];
            voiceCallBtn.onclick = () => startCall(otherUserId, 'voice');
            videoCallBtn.onclick = () => startCall(otherUserId, 'video');
            voiceCallBtn.style.display = 'block';
            videoCallBtn.style.display = 'block';
        } else {
            voiceCallBtn.style.display = 'none';
            videoCallBtn.style.display = 'none';
        }

        if (specificChatAvatar) {
            if(channel.type === 'direct_message') {
                const otherUserId = channel.participantIds.find(id => id !== 'user');
                const otherUser = mockUsers[otherUserId];
                specificChatAvatar.src = otherUser.avatarUrl;
                specificChatAvatar.alt = otherUser.name;
                specificChatStatus.textContent = otherUser.location || "Online";
            } else if (channel.customIconUrl) {
                specificChatAvatar.src = channel.customIconUrl;
                specificChatAvatar.alt = channel.name;
            } else {
                 const tempAvatarText = channel.name.split(' ').map(w => w[0]).join('').substring(0,2);
                 const colorCode = (channel.color || 'var(--primary-accent)').replace('var(--','').replace(')','').trim();
                 const hexColor = getComputedStyle(document.documentElement).getPropertyValue(colorCode).trim().replace('#', '');
                 specificChatAvatar.src = `https://via.placeholder.com/40/${hexColor}/FFFFFF?text=${tempAvatarText}`;
                 specificChatAvatar.alt = channel.name;
                 const members = new Set(channel.messages?.map(m => m.senderId) || []);
                 specificChatStatus.textContent = `${members.size} member${members.size !== 1 ? 's' : ''}, ${Math.floor(Math.random() * (members.size -1))} online`;
            }
        }
        if (specificChatMessagesArea) specificChatMessagesArea.innerHTML = ''; 
        if (channel.unreadCount > 5 && aiChatSummaryButtonContainer && userSubscriptionTier.startsWith('pro')) {
            aiChatSummaryButtonContainer.innerHTML = `<button class="button button-secondary" onclick="summarizeChannel(${channel.id})"><i class="fas fa-brain"></i> AI: Summarize What I Missed</button>`;
            aiChatSummaryButtonContainer.classList.remove('hidden');
        } else if (aiChatSummaryButtonContainer) {
            aiChatSummaryButtonContainer.classList.add('hidden');
        }
        (channel.messages || []).forEach((msg) => addMessageToSpecificChatDOM(msg, true));
        if (specificChatMessagesArea) specificChatMessagesArea.scrollTop = specificChatMessagesArea.scrollHeight;
        if (channelListView) channelListView.style.display = 'none';
        if (specificChatView) {
            specificChatView.classList.remove('hidden');
            specificChatView.classList.add('active'); 
        }
        if (specificChatInput) {
            specificChatInput.focus();
            autoGrowTextarea(specificChatInput);
        }
        if (channel.unreadCount > 0) {
            channel.unreadCount = 0; 
            renderChannels(document.querySelector('.channel-list-toggle button.active')?.id.replace('show','').replace('Btn','').toLowerCase() || 'joined');
            saveChannelsToLocalStorage();
        }
    }
    function summarizeChannel(channelId) {
        const channel = mockChannels.find(c => c.id === channelId);
        if (!channel || !channel.messages) return;
        const unreadMessages = channel.messages.slice(-channel.unreadCount);
        let summaryText = `Summary of the  ${unreadMessages.length} messages: `;
        let topics = new Set();
        let questions = 0;
        unreadMessages.forEach(msg => {
            if (msg.text.includes('?')) questions++;
            if (msg.senderId !== 'user') topics.add(`@${(mockUsers[msg.senderId] || mockUsers.defaultBot).name} talked about something.`);
        });
        const mainTopic = channel.messages.slice(-1)[0].text.substring(0, 30) + '...';
        summaryText += `Main conversation is about "${mainTopic}". `;
        if(questions > 0) summaryText += `${questions} question${questions > 1 ? 's were' : ' was'} asked.`;
        showToast(summaryText, 'ai_info', 5000);
        aiChatSummaryButtonContainer.classList.add('hidden');
    }
    function showChannelListView(silent = false) { 
        appContainer.classList.remove('full-page-active');
        if (channelListView) channelListView.style.display = 'block';
        if (specificChatView) {
            specificChatView.classList.add('hidden');
            specificChatView.classList.remove('active');
        }
        currentChatChannelId = null;
        if(!silent) renderChannels(document.querySelector('.channel-list-toggle button.active')?.id.replace('show','').replace('Btn','').toLowerCase() || 'joined');
    }
    window.showChannelDetailModal = function() {
        if (!currentChatChannelId) return;
        const channel = mockChannels.find(c => c.id === currentChatChannelId);
        if (!channel) return;
        if(channel.type === 'direct_message') {
            const otherUserId = channel.participantIds.find(id => id !== 'user');
            if(otherUserId) showOtherUserProfile(otherUserId);
            return;
        }
        document.getElementById('channelDetailModalTitle').textContent = channel.name;
        const iconEl = document.getElementById('channelDetailIcon');
        if (channel.customIconUrl) {
            iconEl.innerHTML = `<img src="${channel.customIconUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            iconEl.style.backgroundColor = 'transparent';
        } else {
            iconEl.innerHTML = `<i class="${channel.icon}"></i>`;
            iconEl.style.backgroundColor = channel.color;
        }
        document.getElementById('channelDetailType').textContent = channelTypeLabels[channel.type] || "General";
        document.getElementById('channelDetailDescription').textContent = channel.description || "No description provided.";
        document.getElementById('channelDetailMemberCount').textContent = (new Set((channel.messages || []).map(m=>m.senderId))).size;
        const joinButton = document.getElementById('channelDetailJoinButton');
        joinButton.textContent = channel.isJoined ? 'Leave Channel' : 'Join Channel';
        joinButton.onclick = () => toggleJoinChannel(channel.id, true);
        const favButton = document.getElementById('channelDetailFavoriteButton');
        favButton.innerHTML = channel.isFavorite ? `<i class="fas fa-star"></i> Favorited` : `<i class="far fa-star"></i> Add to Favorites`;
        favButton.onclick = () => toggleFavoriteChannel(channel.id, true, favButton.querySelector('i'));
        
        const ownerActions = document.getElementById('channelOwnerActions');
        if (channel.ownerId === 'user') {
            ownerActions.classList.remove('hidden');
        } else {
            ownerActions.classList.add('hidden');
        }

        openModal('channelDetailModal');
    }
    window.toggleJoinChannel = function(channelId, fromModal = false) {
        const channel = mockChannels.find(c => c.id === channelId);
        if (channel) {
            channel.isJoined = !channel.isJoined;
            showToast(channel.isJoined ? `Joined "${channel.name}"!` : `Left "${channel.name}".`, 'success');
            renderChannels();
            saveChannelsToLocalStorage();
            if (fromModal && currentOpenModalId === 'channelDetailModal') { 
                document.getElementById('channelDetailJoinButton').textContent = channel.isJoined ? 'Leave Channel' : 'Join Channel';
            }
        }
    }
    window.toggleFavoriteChannel = function(channelId, fromModalOrIcon = false, iconElement = null) {
        const channel = mockChannels.find(c => c.id === channelId);
        if (channel) {
            channel.isFavorite = !channel.isFavorite;
            showToast(channel.isFavorite ? `"${channel.name}" added to favorites!` : `"${channel.name}" removed from favorites.`, 'success');
            if (fromModalOrIcon && currentOpenModalId === 'channelDetailModal') { 
                const modalFavButtonIcon = document.querySelector('#channelDetailFavoriteButton i');
                if(modalFavButtonIcon) {
                    modalFavButtonIcon.className = channel.isFavorite ? 'fas fa-star' : 'far fa-star';
                    document.getElementById('channelDetailFavoriteButton').innerHTML = channel.isFavorite ? `<i class="fas fa-star"></i> Favorited` : `<i class="far fa-star"></i> Add to Favorites`;
                }
            }
            renderChannels(document.querySelector('.channel-list-toggle button.active')?.id.replace('show','').replace('Btn','').toLowerCase() || 'joined');
            saveChannelsToLocalStorage();
        }
    }
    function addMessageToSpecificChatDOM(message, isHistory = false) {
        if (!specificChatMessagesArea) return;
        const messageDate = new Date(message.timestamp);
        if (!lastMessageDate || messageDate.toDateString() !== lastMessageDate.toDateString()) {
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'chat-date-separator';
            if (messageDate.toDateString() === new Date().toDateString()) {
                dateSeparator.textContent = 'Today';
            } else if (messageDate.toDateString() === new Date(Date.now() - 86400000).toDateString()) {
                dateSeparator.textContent = 'Yesterday';
            } else {
                dateSeparator.textContent = messageDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
            }
            specificChatMessagesArea.appendChild(dateSeparator);
        }
        lastMessageDate = messageDate;
        const senderIsUser = message.senderId === 'user';
        const senderDetails = mockUsers[message.senderId] || mockUsers.defaultBot; 
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('chat-message-wrapper', senderIsUser ? 'user' : 'other', 'long-press-target');
        messageWrapper.dataset.id = message.mid;
        messageWrapper.dataset.type = 'message';
        const avatarImg = document.createElement('img');
        if (!senderIsUser) {
            avatarImg.src = senderDetails.avatarUrl;
            avatarImg.alt = senderDetails.name;
            avatarImg.classList.add('chat-avatar', 'other-avatar');
            avatarImg.onclick = () => showOtherUserProfile(message.senderId);
            avatarImg.loading = 'lazy';
        }
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', senderIsUser ? 'user' : 'other');
        if (message.isAIIntervention && !senderIsUser) {
            bubble.classList.add('ai-intervention');
        }
        const messageTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let reactionsHtml = '<div class="message-reactions">';
        if(message.reactions && Object.keys(message.reactions).length > 0) {
            Object.entries(message.reactions).forEach(([emoji, data]) => {
                const reactedByUser = data.users.includes('user');
                reactionsHtml += `<button class="reaction-button ${reactedByUser ? 'reacted-by-user' : ''}" onclick="toggleReaction(${currentChatChannelId}, ${message.mid}, '${emoji}')" aria-label="React with ${emoji}">${emoji} ${data.count > 0 ? data.count : ''}</button>`;
            });
        }
        reactionsHtml += '</div>';
        let senderNameHtml = '';
        const currentChannel = mockChannels.find(c => c.id === currentChatChannelId);
        if (!senderIsUser && currentChannel?.type !== 'direct_message') {
            senderNameHtml = `<strong class="chat-sender-name" onclick="showOtherUserProfile('${message.senderId}')">${senderDetails.name}</strong>`;
        }
        let messageMetaHtml = `<span class="message-meta"><span class="timestamp">${messageTime}</span>`;
        if(senderIsUser) { 
            const ticksIcon = message.readByRecipient_mock ? 'fa-check-double' : 'fa-check'; 
            const ticksColor = message.readByRecipient_mock ? 'var(--info-color)' : 'var(--chat-user-timestamp-color)';
            messageMetaHtml += `<span class="status-ticks" style="color: ${ticksColor};"><i class="fas ${ticksIcon}"></i></span>`;
        }
        messageMetaHtml += `</span>`;
        
        let bubbleContentHtml = `
            <div class="chat-bubble-content">
                <span class="chat-bubble-text">${message.text.replace(/\n/g, '<br>')}</span>
                ${messageMetaHtml}
            </div>
        `;

        bubble.innerHTML = `
            ${senderNameHtml}
            ${bubbleContentHtml}
            ${reactionsHtml}
        `;
        if (senderIsUser) {
            messageWrapper.appendChild(bubble);
        } else {
            messageWrapper.appendChild(avatarImg); 
            messageWrapper.appendChild(bubble);
        }
        specificChatMessagesArea.appendChild(messageWrapper);
        if (!isHistory) {
             specificChatMessagesArea.scrollTop = specificChatMessagesArea.scrollHeight;
        }
    }
    window.replyToMessage = function(channelId, messageId) {
        const channel = mockChannels.find(c => c.id === channelId);
        if (channel && channel.messages) {
            const msg = channel.messages.find(m => m.mid === messageId);
            if (msg && specificChatInput) {
                const senderName = (mockUsers[msg.senderId] || mockUsers.defaultBot).name;
                specificChatInput.value = `> @${senderName}: ${msg.text.substring(0,30)}...\n\n` + specificChatInput.value;
                specificChatInput.focus();
                autoGrowTextarea(specificChatInput);
                showToast("Quoted message for reply.", "info");
            }
        }
    }
    window.editMessage = function(channelId, messageId) {
        const channel = mockChannels.find(c => c.id === channelId);
        if (channel && channel.messages) {
            const msgIndex = channel.messages.findIndex(m => m.mid === messageId);
            if (msgIndex !== -1 && channel.messages[msgIndex].senderId === 'user') {
                const newText = prompt("Edit your message:", channel.messages[msgIndex].text);
                if (newText !== null && newText.trim() !== "") {
                    channel.messages[msgIndex].text = newText.trim();
                    channel.messages[msgIndex].edited = true;
                    channel.lastMessage = `You: ${newText.trim().substring(0,25)}... (edited)`;
                    channel.lastMessageTimestamp = new Date();
                    lastMessageDate = null;
                    specificChatMessagesArea.innerHTML = ''; 
                    (channel.messages || []).forEach((m) => addMessageToSpecificChatDOM(m, true));
                    specificChatMessagesArea.scrollTop = specificChatMessagesArea.scrollHeight;
                    renderChannels(channel.type === 'direct_message' ? 'dms' : 'channels');
                    saveChannelsToLocalStorage();
                    showToast("Message edited.", "success");
                }
            }
        }
    }
    window.deleteMessage = function(channelId, messageId) {
        const channel = mockChannels.find(c => c.id === channelId);
        if (channel && channel.messages) {
             const msgIndex = channel.messages.findIndex(m => m.mid === messageId);
             if (msgIndex !== -1 && channel.messages[msgIndex].senderId === 'user') {
                openConfirmationModal(
                    "Delete Message?", 
                    "Are you sure you want to delete this message? This action cannot be undone.", 
                    () => {
                        channel.messages.splice(msgIndex, 1);
                        if (channel.messages.length > 0) {
                             const lastMsg = channel.messages[channel.messages.length -1];
                             const senderName = (mockUsers[lastMsg.senderId] || mockUsers.defaultBot).name;
                             channel.lastMessage = `${senderName}: ${lastMsg.text.substring(0,25)}...`;
                             channel.lastMessageTimestamp = new Date(lastMsg.timestamp);
                        } else {
                            channel.lastMessage = "No messages yet.";
                            channel.lastMessageTimestamp = new Date();
                        }
                        lastMessageDate = null;
                        specificChatMessagesArea.innerHTML = ''; 
                        (channel.messages || []).forEach((m) => addMessageToSpecificChatDOM(m, true));
                        specificChatMessagesArea.scrollTop = specificChatMessagesArea.scrollHeight;
                        renderChannels(channel.type === 'direct_message' ? 'dms' : 'channels');
                        saveChannelsToLocalStorage();
                        showToast("Message deleted.", "success");
                    }
                );
            }
        }
    }
    window.showOtherUserProfile = function(userId) {
        const user = mockUsers[userId];
        if (!user) { showToast("User profile not found.", "error", 2000, true); return; }
        document.getElementById('otherUserAvatar').src = user.avatarUrl;
        document.getElementById('otherUserAvatar').alt = user.name;
        document.getElementById('otherUserProfileModalTitle').textContent = user.name;
        document.getElementById('otherUserUsername').textContent = user.username;
        document.getElementById('otherUserBio').textContent = user.bio || "No bio available.";
        document.getElementById('otherUserInterests').textContent = user.interests || "No interests listed.";
        const userChannels = mockChannels.filter(c => c.isJoined && c.type !== 'direct_message').map(c => c.id);
        const otherUserChannels = mockChannels.filter(c => Math.random() > 0.3).map(c => c.id);
        const mutualChannelIds = userChannels.filter(id => otherUserChannels.includes(id));
        const mutualChannels = mockChannels.filter(c => mutualChannelIds.includes(c.id));
        document.getElementById('otherUserMutualChannels').textContent = mutualChannels.length > 0 ? mutualChannels.map(c => c.name).join(', ') : "No mutual channels found.";
        const messageButton = document.getElementById('otherUserMessageButton');
        messageButton.onclick = () => {
            closeModal('otherUserProfileModal');
            startDirectMessage(userId);
        };
        openModal('otherUserProfileModal');
    }
    function startDirectMessage(otherUserId) {
        const dmChannel = findOrCreateDMChannel(otherUserId);
        if(dmChannel) {
            setActiveScreen('chat');
            setTimeout(() => {
                toggleChannelListType('dms', document.getElementById('showDMsBtn'));
                showSpecificChatView(dmChannel.id);
            }, 100);
        } else {
            showToast("Could not start a direct message.", "error");
        }
    }
    function toggleReaction(channelId, messageId, reactionEmoji) {
        const channel = mockChannels.find(c => c.id === channelId);
        if (channel && channel.messages) {
            const message = channel.messages.find(m => m.mid === messageId);
            if (message) {
                if (!message.reactions) message.reactions = {};
                if (!message.reactions[reactionEmoji]) message.reactions[reactionEmoji] = { count: 0, users: [] };
                const userIndex = message.reactions[reactionEmoji].users.indexOf('user');
                if (userIndex > -1) {
                    message.reactions[reactionEmoji].count--;
                    message.reactions[reactionEmoji].users.splice(userIndex, 1);
                } else {
                    message.reactions[reactionEmoji].count++;
                    message.reactions[reactionEmoji].users.push('user');
                    addXP(1, 'community');
                }
                if (message.reactions[reactionEmoji].count === 0) {
                    delete message.reactions[reactionEmoji];
                }
                const messageWrapper = specificChatMessagesArea.querySelector(`.chat-message-wrapper[data-id="${messageId}"]`);
                if (messageWrapper) {
                    const reactionContainer = messageWrapper.querySelector('.message-reactions');
                    let reactionsHtml = '';
                    if(message.reactions && Object.keys(message.reactions).length > 0) {
                        Object.entries(message.reactions).forEach(([emoji, data]) => {
                             const reactedByUser = data.users.includes('user');
                             reactionsHtml += `<button class="reaction-button ${reactedByUser ? 'reacted-by-user' : ''}" onclick="toggleReaction(${currentChatChannelId}, ${message.mid}, '${emoji}')" aria-label="React with ${emoji}">${emoji} ${data.count > 0 ? data.count : ''}</button>`;
                        });
                    }
                    reactionContainer.innerHTML = reactionsHtml;
                } else {
                    lastMessageDate = null; 
                    specificChatMessagesArea.innerHTML = ''; 
                    (channel.messages || []).forEach((msg) => addMessageToSpecificChatDOM(msg, true));
                    specificChatMessagesArea.scrollTop = specificChatMessagesArea.scrollHeight;
                }
                saveChannelsToLocalStorage();
            }
        }
    }
    function handleChatInputTyping(textarea, type = 'specific') {
        const container = textarea.closest('.chat-input-container');
        const wrapper = container.querySelector('.chat-input-wrapper');
        const actionBtn = container.querySelector('.chat-input-action-button');
        const actionIcon = actionBtn.querySelector('i');
        const hasText = textarea.value.trim().length > 0;
        wrapper.classList.toggle('typing-active', hasText);
        if (hasText) {
            actionIcon.className = 'fas fa-paper-plane';
            actionBtn.setAttribute('aria-label', 'Send message');
            actionBtn.onclick = (type === 'specific') ? sendSpecificChatMessage : sendAIChatMessage;
        } else {
            actionIcon.className = 'fas fa-microphone';
            actionBtn.setAttribute('aria-label', 'Use voice input');
            actionBtn.onclick = (type === 'specific') ? () => native.speechToText('specific') : () => native.speechToText('ai');
        }
        if (type === 'specific') {
            handleSpecificChatInputForMentions(textarea);
        } else {
            updateAIChatTypingSuggestion(textarea.value);
        }
    }
    function sendSpecificChatMessage() { 
        if (!specificChatInput) return;
        const messageText = specificChatInput.value.trim();
        if (!messageText || !currentChatChannelId) {
             if (!messageText) native.speechToText('specific');
             return;
        }
        const timestamp = new Date();
        const channel = mockChannels.find(c => c.id === currentChatChannelId);
        if (!channel) return;
        if (!channel.messages) channel.messages = [];
        const newMessage = { mid: nextMessageId++, senderId: 'user', text: messageText, timestamp, reactions: {}, readByRecipient_mock: false };
        channel.messages.push(newMessage);
        addMessageToSpecificChatDOM(newMessage);
        addXP(2, 'community');
        specificChatInput.value = '';
        autoGrowTextarea(specificChatInput);
        handleChatInputTyping(specificChatInput, 'specific');
        if (mockUserSuggestionPopup) mockUserSuggestionPopup.classList.add('hidden');
        channel.lastMessage = `You: ${messageText.substring(0,25)}...`;
        channel.lastMessageTimestamp = timestamp;
        if (typingIndicatorArea) {
            let botName = mockUsers.defaultBot.name.split(' ')[0];
            if(channel.type === 'direct_message') {
                const otherUserId = channel.participantIds.find(id => id !== 'user');
                botName = mockUsers[otherUserId].name.split(' ')[0];
            }
            typingIndicatorArea.textContent = `${botName} is typing...`;
            typingIndicatorArea.classList.remove('hidden');
        }
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            if (typingIndicatorArea) typingIndicatorArea.classList.add('hidden');
            let reply = "Got it!"; 
            let isAIIntervention = false;
            let aiReplySender = 'defaultBot'; 
            if(channel.type === 'direct_message') {
                aiReplySender = channel.participantIds.find(id => id !== 'user');
                const replies = ["Okay, I see.", "That's interesting.", "Thanks for letting me know.", "Haha, that's funny.", "What do you think?"];
                reply = replies[Math.floor(Math.random() * replies.length)];
            } else {
                if (channel.type === 'skill_swap' && messageText.toLowerCase().startsWith("seeking:") && messageText.toLowerCase().includes("garden")) {
                    const gardeningChannel = mockChannels.find(c => c.name.toLowerCase().includes('gardeners'));
                    const gardener = gardeningChannel?.messages.find(m => m.text.toLowerCase().includes("offering:") || m.text.toLowerCase().includes("extra plants"));
                    if (gardener) {
                        reply = `AI Connector: I noticed you're seeking help with a garden. @${(mockUsers[gardener.senderId] || {}).name || 'BenS'} recently mentioned having extra tomato plants in the #Local-Gardeners channel. You might want to connect!`;
                        isAIIntervention = true;
                    }
                } else if (messageText.toLowerCase().includes("remember to") || messageText.toLowerCase().includes("i need to add task")) {
                    const taskMatch = messageText.match(/(remember to|i need to add task)\s+(.*)/i);
                    if (taskMatch && taskMatch[2]) {
                        reply = `AI: I can help with that, ${userName}! Would you like me to add "${taskMatch[2].substring(0,30)}..." as a task for you? <button class="button" onclick="addNewTask('${taskMatch[2].replace(/'/g, "\\'")}')">Yes, Add Task</button>`;
                        isAIIntervention = true;
                    }
                } else if (messageText.toLowerCase().includes("help me draft a reply") && messageText.length > 20 && aiLearningPreferences.learnChatStyle) {
                     reply = `AI: Okay, ${userName}. Based on the context, how about this reply: "That sounds interesting! Can you tell me more about [topic]?"`;
                     isAIIntervention = true;
                }
            }
            newMessage.readByRecipient_mock = true;
            const userMessageBubble = specificChatMessagesArea.querySelector(`.chat-message-wrapper[data-id="${newMessage.mid}"] .chat-bubble.user .status-ticks i`);
            if (userMessageBubble) {
                userMessageBubble.className = 'fas fa-check-double';
                userMessageBubble.parentElement.style.color = 'var(--info-color)';
            }
            const replyTimestamp = new Date();
            const aiReplyMessage = { mid: nextMessageId++, senderId: aiReplySender, text: reply, timestamp: replyTimestamp, reactions: {}, isAIIntervention };
            channel.messages.push(aiReplyMessage);
            const replySenderName = mockUsers[aiReplySender]?.name || 'Bot';
            channel.lastMessage = `${replySenderName}: ${reply.substring(0,25)}...`;
            channel.lastMessageTimestamp = replyTimestamp;
            addMessageToSpecificChatDOM(aiReplyMessage);
            renderChannels(document.querySelector('.channel-list-toggle button.active')?.id.replace('show','').replace('Btn','').toLowerCase() || 'joined'); 
            saveChannelsToLocalStorage();
        }, 800 + Math.random() * 700);
    }
    if (specificChatInput) {
        specificChatInput.addEventListener('keypress', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSpecificChatMessage(); }});
        specificChatInput.addEventListener('input', () => handleChatInputTyping(specificChatInput, 'specific'));
    }
    function handleSpecificChatInputForMentions(textarea) {
        const text = textarea.value;
        const cursorPos = textarea.selectionStart;
        const atMatch = text.substring(0, cursorPos).match(/@(\w*)$/);
        if (atMatch && atMatch[1] && mockUserSuggestionPopup) {
            const searchTerm = atMatch[1].toLowerCase();
            const suggestions = Object.values(mockUsers)
                .filter(u => u.id !== 'user' && u.name.toLowerCase().includes(searchTerm))
                .slice(0, 5);
            if (suggestions.length > 0) {
                mockUserSuggestionPopup.innerHTML = '';
                suggestions.forEach(user => {
                    const btn = document.createElement('button');
                    btn.textContent = user.name;
                    btn.onclick = () => {
                        const newText = text.substring(0, cursorPos - searchTerm.length -1) + `@${user.name} ` + text.substring(cursorPos);
                        textarea.value = newText;
                        textarea.focus();
                        textarea.setSelectionRange(cursorPos - searchTerm.length + user.name.length + 2, cursorPos - searchTerm.length + user.name.length + 2);
                        mockUserSuggestionPopup.classList.add('hidden');
                        autoGrowTextarea(textarea);
                    };
                    mockUserSuggestionPopup.appendChild(btn);
                });
                mockUserSuggestionPopup.classList.remove('hidden');
            } else {
                mockUserSuggestionPopup.classList.add('hidden');
            }
        } else if (mockUserSuggestionPopup) {
            mockUserSuggestionPopup.classList.add('hidden');
        }
    }
    document.addEventListener('click', function(event) {
        if (mockUserSuggestionPopup && !mockUserSuggestionPopup.contains(event.target) && event.target !== specificChatInput) {
            mockUserSuggestionPopup.classList.add('hidden');
        }
    });
    function autoGrowTextarea(textarea) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        if(scrollHeight > 0) {
             textarea.style.height = scrollHeight + 'px';
        }
        if (textarea.value.trim().length > 0) {
            textarea.style.alignSelf = 'flex-end';
        } else {
            textarea.style.alignSelf = 'center';
        }
    }
