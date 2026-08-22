/**
 * @module ai-assistant
 * AI assistant bottom sheet UI wiring and chat interactions.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: sendAIChatMessage, toggleAIChat, updateAIChatTypingSuggestion.
 */
    function aiSuggestChannelToJoin() {
        if (mockChannels.length > 2) {
            const potentialChannels = mockChannels.filter(ch => !ch.isJoined && ch.type !== 'announcements' && ch.id !== currentChatChannelId);
            if(potentialChannels.length > 0) {
                const randomChannel = potentialChannels[Math.floor(Math.random() * potentialChannels.length)];
                 openGenericModal("AI Channel Suggestion", `<p>Based on local activity and your interests, ${userName}, you might like the channel: <strong>${randomChannel.name}</strong>.</p><p><em>Description: ${randomChannel.description || 'General discussions.'}</em></p><button class="button mt-2" onclick="closeModal('genericModal'); toggleJoinChannel(${randomChannel.id}); showSpecificChatView(${randomChannel.id});">Join & View Channel</button>`);
            } else {
                 showToast("AI: You've already joined most relevant channels or there aren't many new ones yet!", "ai_info");
            }
        } else {
            showToast("AI: Not enough channels to make a suggestion yet. Explore existing ones!", "ai_info");
        }
    }
    window.toggleAIChat = function() { 
        if (!aiBottomSheet || !aiFab) return;
        const isActive = aiBottomSheet.classList.toggle('active');
        appContainer.classList.toggle('full-page-active', isActive && window.innerWidth <= 450);
        aiFab.classList.remove('has-suggestion');
        aiFab.style.animation = '';
        aiFab.setAttribute('aria-expanded', isActive.toString());
        if(isActive && aiChatInputText) {
            const activeScreen = document.querySelector('.screen.active');
            let placeholder = "Ask or command...";
            let quickAction = "Plan my day";
            switch(activeScreen?.id) {
                case 'planner': placeholder = "e.g., Optimize my schedule..."; quickAction = "Optimize My Day"; break;
                case 'explore': placeholder = "e.g., Build an itinerary for tonight..."; quickAction = "Plan an evening"; break;
                case 'wellness': placeholder = "e.g., Review my wellness patterns..."; quickAction = "Wellness summary"; break;
            }
            aiChatInputText.placeholder = placeholder;
            const quickPlanButton = document.querySelector('.ai-quick-action-button[onclick*="Plan my day"]');
            if (quickPlanButton) quickPlanButton.textContent = quickAction;
            aiChatInputText.focus();
        }
        if (navigator.vibrate) navigator.vibrate(10); 
    }
    function addMessageToAIChat(sender, text, isHTML = false) { 
        if (!aiChatArea) return;
        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.className = `chat-message-wrapper ${sender === 'user' ? 'user' : 'other'}`;
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', sender === 'user' ? 'user' : 'other');
        const bubbleContent = document.createElement('div');
        bubbleContent.className = 'chat-bubble-content';
        const textSpan = document.createElement('span');
        textSpan.className = 'chat-bubble-text';
        if (isHTML) {
            textSpan.innerHTML = text; 
        } else {
            textSpan.textContent = text;
        }
        bubbleContent.appendChild(textSpan);
        bubble.appendChild(bubbleContent);
        bubbleWrapper.appendChild(bubble);
        aiChatArea.appendChild(bubbleWrapper);
        aiChatArea.scrollTop = aiChatArea.scrollHeight;
    }
    window.sendAIChatMessage = function() { 
        if (!aiChatInputText) return;
        const command = aiChatInputText.value.trim();
        if (!command) {
            native.speechToText('ai');
            return;
        }
        if (aiConversationContext) {
            processAICommand(command, true);
        } else {
            processAICommand(command);
        }
        addMessageToAIChat('user', command);
        aiChatInputText.value = '';
        autoGrowTextarea(aiChatInputText);
        handleChatInputTyping(aiChatInputText, 'ai');
        if (aiChatTypingSuggestionEl) aiChatTypingSuggestionEl.textContent = '';
    }
    if (aiChatInputText) aiChatInputText.addEventListener('keypress', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIChatMessage(); }});
    window.updateAIChatTypingSuggestion = function(text) {
        if (!aiChatTypingSuggestionEl) return;
        text = text.toLowerCase();
        let suggestion = "";
        if (text.startsWith("add task")) suggestion = "e.g., add task Meeting with Sbu at The Gables Tomorrow at 2pm";
        else if (text.startsWith("find")) suggestion = "e.g., find places with braai spots OR find deals on mobile data";
        else if (text.startsWith("plan my")) suggestion = "e.g., plan my day OR plan my weekend trip to Ezulwini";
        else if (text.startsWith("set reminder")) suggestion = "e.g., set reminder to call Gogo in 1 hour";
        else if (text.startsWith("log mood")) suggestion = "e.g., log mood happy with note: Great day!";
        else if (text.startsWith("summarize channel")) suggestion = "e.g., summarize channel \"Eswatini Foodies\"";
        else if (text.startsWith("suggest habit for")) suggestion = "e.g., suggest habit for stress relief";
        else if (text.startsWith("analyze my  journal")) suggestion = "e.g., analyze my  journal entry";
        aiChatTypingSuggestionEl.textContent = suggestion;
    }
    function clearAIChat() {
        if (aiChatArea) aiChatArea.innerHTML = '';
        aiConversationContext = null; aiExpectedResponseType = null;
        addMessageToAIChat('other', getAIPersonalityPrefix() + "Chat cleared. How can I help?");
        showToast("AI Chat cleared.", "info");
    }
    function getAIPersonalityPrefix() {
        let prefix = ""; 
        switch(currentAiPersonality) {
            case 'friendly': prefix = "Your friendly AI: "; break;
            case 'professional': prefix = "Assistant: "; break;
            case 'witty': prefix = "Your (slightly snarky) AI: "; break;
            case 'coach': prefix = "Your Calm Coach: "; break;
            case 'mentor': prefix = "Your Business Mentor: "; break;
            case 'helpful': prefix = "Helpful Bot: "; break;
        }
        return prefix;
    }
    function triggerFabSuggestion(isContextual = true, newIconClass = 'fa-lightbulb') { 
        if (aiFab && aiFabIcon && !aiBottomSheet.classList.contains('active') && !appContainer.classList.contains('full-page-active') && notificationPreferences.aiSuggestions) {
            aiFab.classList.add('has-suggestion');
            aiFab.style.backgroundColor = 'var(--info-color)';
            aiFabIcon.className = `fas ${newIconClass}`;
            clearTimeout(fabSuggestionTimeout);
            fabSuggestionTimeout = setTimeout(() => {
                aiFab.classList.remove('has-suggestion');
                aiFab.style.backgroundColor = '';
                updateContextualFabIcon();
            }, 3000);
            if (isContextual) {
                showToast("AI has a contextual suggestion! (Tap the icon)", "ai_info", 2500);
            }
        }
    }
    function processAICommand(originalCommand, isFollowUp = false) {
        const command = originalCommand.toLowerCase();
        let response = "I'm processing that. ";
        let aiPrefix = getAIPersonalityPrefix();
        let isHTMLResponse = false;
        let requiresFollowUpInResponse = false;
        let currentScreenId = document.querySelector('.screen.active')?.id;
        let contextMessage = "";
        if(currentScreenId === 'explore' && (command.includes("any of these") || command.includes("about this area"))){
            const currentFilter = document.querySelector('#exploreFilterBar .filter-button.active')?.dataset.filter || 'all';
            contextMessage = `(Context: Explore, filter: ${currentFilter}) `;
        } else if (currentScreenId === 'planner' && (command.includes("this task") || command.includes("my schedule"))){
             contextMessage = `(Context: Planner) `;
        } else if (currentScreenId === 'wellness' && (command.includes("my mood") || command.includes("my habits"))){
             contextMessage = `(Context: Wellness Hub) `;
        }
        if (isFollowUp && aiConversationContext) {
            if (aiConversationContext === "party_planning_date") {
                aiConversationContext = "party_planning_guests";
                aiExpectedResponseType = "number";
                response = `Great, party on ${originalCommand}! How many guests are you expecting, ${userName}?`;
                requiresFollowUpInResponse = true;
            } else if (aiConversationContext === "party_planning_guests") {
                aiConversationContext = "party_planning_venue";
                aiExpectedResponseType = "text";
                response = `${originalCommand} guests, noted! Will it be at home, or should I search for venues?`;
                requiresFollowUpInResponse = true;
            } else if (aiConversationContext === "party_planning_venue") {
                aiConversationContext = null;
                aiExpectedResponseType = null;
                if (command.includes("search") || command.includes("venue")) {
                     setActiveScreen('explore');
                     setTimeout(() => {
                        const searchInput = document.getElementById('exploreSearchInput');
                        if (searchInput) searchInput.value = "party venue";
                        filterPlaces('services', document.querySelector('#exploreFilterBar button[data-filter="services"]'));
                        handleExploreSearch(true);
                    }, 100);
                    response = "Okay, searching for party venues in Explore. Let me know what else for the party!";
                } else {
                    response = "Sounds good. We can look into food and themes next for your party at home!";
                }
            } else if (aiConversationContext === "plan_route_place1") {
                const place1Name = originalCommand;
                const place1 = mockPlaces.all.find(p => p.name.toLowerCase().includes(place1Name.toLowerCase()));
                if (place1) {
                    aiConversationContext = { state: "plan_route_place2", place1: place1.name };
                    aiExpectedResponseType = "text";
                    response = `Okay, starting route from "${place1.name}". What's the destination?`;
                    requiresFollowUpInResponse = true;
                } else {
                    response = `I couldn't find a place called "${place1Name}". Please try again with a known place name.`;
                    aiConversationContext = "plan_route_place1";
                    requiresFollowUpInResponse = true;
                }
            } else if (aiConversationContext && aiConversationContext.state === "plan_route_place2") {
                const place2Name = originalCommand;
                const place2 = mockPlaces.all.find(p => p.name.toLowerCase().includes(place2Name.toLowerCase()));
                if (place2) {
                    const fromPlaceName = aiConversationContext.place1;
                    aiConversationContext = null; aiExpectedResponseType = null;
                    response = `Planning route from "${fromPlaceName}" to "${place2.name}"... This opens a native map app with directions.`;
                    setActiveScreen('explore');
                    getDirections(place2.name, fromPlaceName);
                } else {
                    response = `I couldn't find a place called "${place2Name}". What's the destination from "${aiConversationContext.place1}"?`;
                    requiresFollowUpInResponse = true;
                }
            } else {
                aiConversationContext = null; aiExpectedResponseType = null;
                response = "Sorry, I lost the thread of our conversation. Let's start over. How can I help?";
            }
            addMessageToAIChat('other', aiPrefix + response, isHTMLResponse);
            if (!requiresFollowUpInResponse) {
                aiConversationContext = null;
                aiExpectedResponseType = null;
            }
            return;
        }
        aiConversationContext = null; aiExpectedResponseType = null;
        setTimeout(() => {
            if (command.startsWith("add task ")) {
                const taskDetails = originalCommand.substring(9).trim(); 
                if(taskDetails) {
                    let taskTitle = taskDetails;
                    let taskTime, taskDate, parsedAIAgain = {};
                    const timeMatch = taskDetails.match(/at\s+(\d{1,2}(:\d{2})?\s*(am|pm)?)/i);
                    if (timeMatch && timeMatch[0]) {
                        taskTime = timeMatch[0].trim().toUpperCase();
                        taskTitle = taskTitle.replace(timeMatch[0], '').trim(); 
                        parsedAIAgain.time = taskTime;
                    }
                    const dateMatch = taskDetails.match(/on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)/i);
                     if(dateMatch && dateMatch[0]) {
                        taskDate = dateMatch[0].trim();
                        taskTitle = taskTitle.replace(dateMatch[0], '').trim(); 
                        parsedAIAgain.date = taskDate;
                    }
                     const locationMatch = taskTitle.match(/(?:at|in|from)\s+([A-Z][a-zA-Z\s]+(?:Cafe|Park|Store|Cleaners|Market|Library|Office|Hub|Center|Plaza|Square))/);
                    if (locationMatch && locationMatch[1]) {
                        parsedAIAgain.location = locationMatch[1].trim();
                    }
                    const personMatch = taskTitle.match(/(?:with|for|call|meet)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
                    if (personMatch && personMatch[1] && !taskCategories.includes(personMatch[1].toLowerCase())) {
                        parsedAIAgain.person = personMatch[1].trim();
                    }
                    if (addNewTask(taskTitle, null, taskTime, taskDate, parsedAIAgain)) response = `Okay, I've added "${taskTitle}" ${taskTime ? 'at '+taskTime : ''} ${taskDate ? 'on '+taskDate : ''} to your planner and synced it with your device calendar.`;
                    else response = "Hmm, I couldn't add that task. Maybe try again with just the title?";
                } else {
                    response = "What task would you like to add? Example: 'add task Call Gogo at 2pm on Tuesday'";
                }
            } else if (command.startsWith("clear completed tasks")) {
                const completedCount = tasks.filter(t => t.completed).length;
                if (completedCount > 0) {
                    tasks = tasks.filter(t => !t.completed);
                    renderTasks();
                    response = `Alright, I've cleared ${completedCount} completed task${completedCount > 1 ? 's' : ''}.`;
                } else {
                    response = "No completed tasks to clear right now.";
                }
            } else if (command.includes("top 3 tasks") || command.includes("my top tasks")) {
                const topTasks = tasks.filter(t => !t.completed).slice(0, 3);
                if (topTasks.length > 0) {
                    isHTMLResponse = true;
                    response = `${contextMessage}Here are your top tasks, ${userName}:<ul>`;
                    topTasks.forEach(t => response += `<li>${t.title} (${t.time || 'anytime'}) ${t.dueDate ? '(Due: '+t.dueDate+')':''}</li>`);
                    response += "</ul>";
                } else {
                    response = `${contextMessage}Looks like you're all caught up on tasks!`;
                }
            } else if (command.includes("what's my next task") && currentScreenId === 'planner') {
                const nextTask = tasks.find(t => !t.completed);
                if (nextTask) response = `${contextMessage}Your next task is: "${nextTask.title}" at ${nextTask.time || 'anytime'}.`;
                else response = `${contextMessage}You have no upcoming tasks!`;
            } else if (command.includes("log") && command.includes("water") && currentScreenId === 'wellness') {
                const waterAmountMatch = command.match(/log\s+(\d+)\s+glass(es)?\s+of\s+water/i);
                const waterHabit = habits.find(h => h.isWaterTracker);
                if(waterAmountMatch && waterAmountMatch[1] && waterHabit){
                    const amount = parseInt(waterAmountMatch[1]);
                    incrementWater(waterHabit.id, amount);
                    response = `${contextMessage}Logged ${amount} glass(es) of water. Your total is now ${waterHabit.current}/${waterHabit.goal}.`;
                } else {
                    response = `${contextMessage}How many glasses of water would you like to log? e.g., "log 2 glasses of water"`;
                }
            } else if (command.startsWith("plan my day") || command.startsWith("create an itinerary")) {
                 if (!userSubscriptionTier.startsWith('pro')) {
                    response = `Itinerary planning is a Pro+ feature. Would you like to view subscription options?`;
                    aiConversationContext = "prompt_subscription";
                    requiresFollowUpInResponse = true;
                } else {
                    const coffeePlace = mockPlaces.food.find(p => p.name.toLowerCase().includes("vickery"));
                    const naturePlace = mockPlaces.parks.find(p => p.name.toLowerCase().includes("mlilwane"));
                    const lunchPlace = mockPlaces.food.find(p => p.name.toLowerCase().includes("malandela"));
                    const eventPlace = mockPlaces.events.find(p => p.name.toLowerCase().includes("bushfire"));
                    isHTMLResponse = true;
                    response = `${contextMessage}Okay, ${userName}, here's a plan for a day out in Eswatini:<ul>`;
                    if(coffeePlace) response += `<li>Morning: Start with coffee at <strong>${coffeePlace.name}</strong>. <button class="button-secondary" style="font-size:0.7rem;padding:2px 4px;" onclick="addNewTask('Coffee at ${coffeePlace.name}', 'personal', 'Morning')">Add to Planner</button></li>`;
                    if(naturePlace) response += `<li>Mid-morning: A relaxing walk in <strong>${naturePlace.name}</strong>. <button class="button-secondary" style="font-size:0.7rem;padding:2px 4px;" onclick="addNewTask('Walk in ${naturePlace.name}', 'health', 'Mid-morning')">Add to Planner</button></li>`;
                    if(lunchPlace) response += `<li>Lunch: Grab a bite at <strong>${lunchPlace.name}</strong>. <button class="button-secondary" style="font-size:0.7rem;padding:2px 4px;" onclick="addNewTask('Lunch at ${lunchPlace.name}', 'personal', 'Lunchtime')">Add to Planner</button></li>`;
                    if(eventPlace) response += `<li>Afternoon: Check for tickets for <strong>${eventPlace.name}</strong>. <button class="button-secondary" style="font-size:0.7rem;padding:2px 4px;" onclick="addNewTask('Buy tickets for ${eventPlace.name}', 'personal', 'Afternoon')">Add to Planner</button></li>`;
                    response += `</ul><p>Would you like me to search for any of these in Explore?</p>`;
                    requiresFollowUpInResponse = true;
                }
            } else if (command.startsWith("summarize channel") || command.startsWith("catch me up on")) {
                 const channelNameMatch = command.match(/(summarize channel|catch me up on)\s+"?([^"]+)"?/i);
                 const channelName = channelNameMatch ? channelNameMatch[2].trim() : "";
                 const channel = mockChannels.find(c => c.name.toLowerCase().includes(channelName.toLowerCase()));
                 if (channel && channel.messages && channel.messages.length > 0) {
                    isHTMLResponse = true;
                    response = `Here's a quick summary for "${channel.name}":<ul>`;
                    channel.messages.slice(-Math.min(3, channel.messages.length)).forEach(msg => {
                        let senderDetails = mockUsers[msg.senderId] || mockUsers.defaultBot;
                        response += `<li><strong>${senderDetails.name}:</strong> ${msg.text.substring(0,40)}...</li>`;
                    });
                    response += "</ul><p><em>This is a brief summary. Full history in the channel.</em></p>";
                } else if (channel) {
                    response = `The channel "${channel.name}" doesn't have much activity to summarize yet.`;
                } else {
                    response = `I couldn't find a channel named "${channelName}" to summarize.`;
                }
            } else if (command.startsWith("plan my party")) {
                isHTMLResponse = true;
                response = `${contextMessage}Okay, ${userName}, let's plan your party! Here are some steps we can take:
                    <ul>
                        <li><strong>Set Date & Time:</strong> When do you want the party?</li>
                        <li><strong>Guest List:</strong> Who are you inviting? (Rough number)</li>
                        <li><strong>Venue:</strong> At home, or need to find a place? I can search Explore for venues.</li>
                        <li><strong>Food & Drinks:</strong> Catering, potluck, or DIY? I can look for deals on supplies or restaurants.</li>
                        <li><strong>Theme/Decorations:</strong> Any specific theme?</li>
                        <li><strong>Activities/Entertainment:</strong> Music, games, etc.?</li>
                    </ul>
                    <p>Let's start with the <strong>date and time</strong> for your party. What did you have in mind?</p>`;
                aiConversationContext = "party_planning_date";
                aiExpectedResponseType = "date_time_text";
                requiresFollowUpInResponse = true;
            } else if (command.startsWith("plan a route")) {
                response = "Sure, I can help with that. What's the starting point for your route?";
                aiConversationContext = "plan_route_place1";
                aiExpectedResponseType = "text";
                requiresFollowUpInResponse = true;
            } else if (command.startsWith("global search")) {
                const searchTerm = originalCommand.substring(13).trim();
                if(searchTerm){
                    isHTMLResponse = true;
                    response = `Global Search for "${searchTerm}":<ul>`;
                    tasks.filter(t => t.title.toLowerCase().includes(searchTerm)).forEach(t => response += `<li>Task: ${t.title.substring(0,30)}...</li>`);
                    mockPlaces.all.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.tags && p.tags.includes(searchTerm))).forEach(p => response += `<li>Place: ${p.name.substring(0,30)}...</li>`);
                    mockDeals.filter(d => d.title.toLowerCase().includes(searchTerm) || d.businessName.toLowerCase().includes(searchTerm)).forEach(d => response += `<li>Deal: ${d.title.substring(0,30)}...</li>`);
                    mockChannels.filter(c => c.name.toLowerCase().includes(searchTerm)).forEach(c => response += `<li>Channel: ${c.name.substring(0,30)}...</li>`);
                    response += `</ul><p><em>Clicking these would navigate to the item.</em></p>`;
                } else {
                    response = "What would you like to search for globally?";
                }
            } else if (command.includes("call") || command.includes("video call")) {
                const userMatch = command.match(/(?:call|video call)\s+([a-z\s]+)/i);
                if (userMatch && userMatch[1]) {
                    const userNameToCall = userMatch[1].trim();
                    const userToCall = Object.values(mockUsers).find(u => u.name.toLowerCase() === userNameToCall);
                    if (userToCall) {
                        const callType = command.includes("video") ? 'video' : 'voice';
                        startCall(userToCall.id, callType);
                        response = `Starting a ${callType} call with ${userToCall.name}.`;
                    } else {
                        response = `I couldn't find a user named "${userNameToCall}".`;
                    }
                } else {
                    response = "Who would you like to call? For example, 'call Sbu Dlamini'.";
                }
            }
            else if (command.includes("hello") || command.includes("hi") || command.includes("hey")) {
                response = currentAiPersonality === 'witty' ? "Well, hello there. What marvels shall we NOT accomplish today?" : `Sanibonani, ${userName}! How can I assist you today?`;
            } else if (command.includes("time")) {
                response = `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
            } else if (command.includes("date")) {
                response = `Today's date is ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
            } else if (command.includes("weather")) {
                const weatherTextEl = document.getElementById('currentWeather');
                response = `Currently, it's ${weatherTextEl ? weatherTextEl.textContent : "lovely outside"}.`;
            } else if (command.includes("what's on my dashboard") || command.includes("dashboard summary")) {
                const upcomingTasks = tasks.filter(t => !t.completed).slice(0, 2);
                const pulseItems = Array.from(document.querySelectorAll('.nearby-pulse-carousel .story-label')).slice(0, 2).map(el => el.textContent);
                isHTMLResponse = true;
                response = "On your dashboard:<br>";
                if (upcomingTasks.length > 0) response += `Top tasks: ${upcomingTasks.map(t=>t.title.substring(0,20)+"...").join(', ')}.<br>`;
                else response += "No pressing tasks visible on dashboard.<br>";
                if (pulseItems.length > 0) response += `Nearby Pulse: ${pulseItems.join(' & ')}.<br>`;
                response += `Weather: ${document.getElementById('currentWeather')?.textContent || 'N/A'}.<br>`;
                response += `<em>This is a brief summary.</em>`;
            } else if (command.includes("summarize my day") || command.includes("what's my day look like")) {
                const incompleteTasks = tasks.filter(t => !t.completed);
                isHTMLResponse = true;
                if (incompleteTasks.length > 0) {
                    response = `You have ${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's' : ''} remaining, ${userName}. Key ones:<ul>`;
                    incompleteTasks.slice(0,3).forEach(t => response += `<li>${t.title}</li>`);
                    response += "</ul>";
                } else {
                    response = "All tasks completed! Great job!";
                }
                response += `<br>Current weather: ${document.getElementById('currentWeather')?.textContent || 'N/A'}.`;
            } else if (command.includes("event") || command.includes("happening")) {
                const upcomingEvents = mockPlaces.events.slice(0,2).map(e => e.name).join(' and ');
                response = upcomingEvents ? `Some upcoming events are: ${upcomingEvents}. Interested? I can show you the Explore tab.` : "I don't see any major events right now. Check the Explore tab for more!";
            } else if (command.includes("what's good for") && command.includes("?")){
                const forWhomMatch = command.match(/what's good for\s+([^?]+)\??/i);
                const forWhom = forWhomMatch ? forWhomMatch[1].trim() : "";
                if (forWhom === "kids" || forWhom === "children" || forWhom === "family") {
                    const kidFriendlyPlaces = mockPlaces.all.filter(p => p.tags && p.tags.includes("family"));
                    if (kidFriendlyPlaces.length > 0) {
                        isHTMLResponse = true;
                        response = `For ${forWhom}, I'd suggest:<ul>`;
                        kidFriendlyPlaces.slice(0,3).forEach(p => response += `<li>${p.name} (${p.type})</li>`);
                        response += `</ul><p>You can search for "family" in Explore for more.</p>`;
                    } else {
                        response = `I don't have specific "family" tagged places right now, but you could try searching for "parks" or "playgrounds" in Explore.`;
                    }
                } else {
                     response = `I can try to find places for "${forWhom}". What type of place are you looking for (e.g., food, park, activity)?`;
                }
            }
            else if (command.includes("deal on") || command.includes("offer on") || command.includes("deals for") || command.includes("offers for")) {
                
                const dealQueryMatch = command.match(/(deal|offer)s?\s+(on|for)\s+(.+)/i);
                const dealQuery = dealQueryMatch ? dealQueryMatch[3].trim() : "";
                const filteredDeals = mockDeals.filter(d => d.title.toLowerCase().includes(dealQuery) || d.category.toLowerCase().includes(dealQuery) || d.businessName.toLowerCase().includes(dealQuery));
                if (filteredDeals.length > 0) {
                    isHTMLResponse = true;
                    response = `Found these deals for "${dealQuery}":<ul>`;
                    filteredDeals.slice(0,3).forEach(d => response += `<li>${d.title} at ${d.businessName}</li>`);
                    response += `</ul>Would you like to search for "${dealQuery}" in Explore Deals?`;
                    requiresFollowUpInResponse = true; 
                } else {
                    response = `Sorry, I couldn't find specific deals for "${dealQuery}". You can browse all deals in Explore.`;
                }
            } else if (command.includes("show ") || command.includes("open ")) {
                const target = command.replace("show ", "").replace("open ", "");
                const screenMap = { "dashboard": "dashboard", "home": "dashboard", "planner": "planner", "schedule": "planner", "explore": "explore", "map": "explore", "chat": "chat", "community": "chat", "wellness": "wellness", "hub": "wellness", "settings": "settings", "config": "settings", "services": "servicesMarket", "governance": "governance", "app store": "appStore", "applets": "appStore", "privacy": "privacyDashboard" };
                const targetScreen = screenMap[target];
                if (targetScreen) {
                    setActiveScreen(targetScreen);
                    if (targetScreen === 'explore' && (target.includes("deals") || target.includes("offers"))) {
                       setTimeout(() => {
                           const dealFilterButton = document.querySelector('#exploreFilterBar button[data-filter="deals"]');
                           if (dealFilterButton) filterPlaces('deals', dealFilterButton);
                       }, 50);
                    }
                    if (aiBottomSheet.classList.contains('active')) toggleAIChat(); 
                    showToast(`AI: Navigated to ${targetScreen.charAt(0).toUpperCase() + targetScreen.slice(1)}`, "ai_info", 1500); return; 
                } else if (target.includes("create task") || target.includes("new task")) {
                    setActiveScreen('planner');
                    setTimeout(() => newTaskInputEl?.focus(), 100);
                    if (aiBottomSheet.classList.contains('active')) toggleAIChat();
                    response = "Switched to Planner. You can add a new task there.";
                } else if (target.includes("journal")) {
                     openJournalModal();
                     if (aiBottomSheet.classList.contains('active')) toggleAIChat();
                     response = "Opened your journal.";
                }
                else {
                    response = `I can't directly open or show "${target}". Try a screen name like 'planner' or 'explore'.`;
                }
            } else if (command.includes("how am i doing") || command.includes("wellness check")) {
                response = "Based on data, you're doing okay! For a more detailed summary, you can check the Wellness Hub. Would you like to see the AI Wellness Summary?";
            } else if (command.startsWith("find ") || command.startsWith("search for ")) {
                const query = originalCommand.replace(/find|search for/i, '').trim();
                if (query) {
                    let targetFilter = 'all'; 
                    let searchInputContent = query;
                    if (query.toLowerCase().includes("deal") || query.toLowerCase().includes("offer")) {
                        targetFilter = 'deals';
                        searchInputContent = query.replace(/deals?|offers?/gi, '').trim();
                        if (!searchInputContent && query.toLowerCase().includes("food")) searchInputContent = "food"; 
                        else if (!searchInputContent && query.toLowerCase().includes("service")) searchInputContent = "services";
                    } else if (query.toLowerCase().includes("food") || query.toLowerCase().includes("restaurant")) targetFilter = 'food';
                    else if (query.toLowerCase().includes("park")) targetFilter = 'parks';
                    response = `${contextMessage}Sure, opening Explore and searching for "${searchInputContent}" under the "${targetFilter}" filter.`;
                    setActiveScreen('explore');
                    setTimeout(() => {
                        const searchInput = document.getElementById('exploreSearchInput');
                        if (searchInput) {
                            searchInput.value = searchInputContent; 
                            document.getElementById('clearExploreSearchInput')?.classList.remove('hidden');
                        }
                        const filterButton = document.querySelector(`#exploreFilterBar button[data-filter="${targetFilter}"]`);
                        if (filterButton) filterPlaces(targetFilter, filterButton);
                        else renderPlaces(targetFilter); 
                        handleExploreSearch(true); 
                    }, 100); 
                    if (aiBottomSheet.classList.contains('active')) toggleAIChat();
                    showToast(`AI: Searching for "${searchInputContent}" in Explore.`, "ai_info", 2000); return;
                } else {
                    response = "What would you like me to find? e.g., 'find cafes' or 'find food deals'";
                }
            } else if (command.includes("schedule for tomorrow") || command.includes("tomorrow's tasks")) {
                const tomorrowsTasks = tasks.filter(t => t.dueDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] && !t.completed);
                if(tomorrowsTasks.length > 0){
                    isHTMLResponse = true;
                    response = `For tomorrow, ${userName}, you have:<ul>${tomorrowsTasks.map(t => `<li>${t.title} (${t.time || 'anytime'})</li>`).join('')}</ul>`;
                } else {
                    response = "Looks like your schedule for tomorrow is clear so far!";
                }
            } else if (command.startsWith("set reminder") || command.startsWith("remind me to")) {
                const reminderText = originalCommand.replace(/set reminder|remind me to/i, '').trim();
                if (reminderText) {
                    tasks.push({ id: nextTaskId++, title: `Reminder: ${reminderText}`, time: "Now", category: "personal", completed: false, createdBy: 'user' });
                    renderTasks();
                    showToast("Reminder set as a task.", "success");
                    response = `Okay, I've set a reminder for: "${reminderText}". I've added it to your planner.`;
                } else {
                    response = "What would you like me to remind you about?";
                }
            } else if (command.startsWith("create channel")) {
                const channelNameMatch = originalCommand.match(/create channel\s+"?([^"]+)"?/i);
                const channelName = channelNameMatch ? channelNameMatch[1].trim() : "";
                if (channelName) {
                    setActiveScreen('chat');
                    openCreateChannelModal(channelName);
                    response = `Okay, I've opened the 'Create Channel' form with the name "${channelName}". Please select an icon and type.`;
                } else {
                    response = "What name would you like for the new channel? e.g., 'create channel My Hobby Group'";
                }
            } else if (command.startsWith("log mood")) {
                const moodMatch = command.match(/log mood\s+(happy|sad|neutral|excited|relaxed|🙂|😄|🤩|😌|😐|🙁|😞)/i);
                const noteMatch = command.match(/with note\s+(.+)/i);
                const note = noteMatch ? noteMatch[1].trim() : "";
                if (moodMatch && moodMatch[1]) {
                    const moodSymbol = { happy: '😄', sad: '😞', neutral: '😐', excited: '🤩', relaxed: '😌' }[moodMatch[1].toLowerCase()] || moodMatch[1];
                    const moodButton = document.querySelector(`.mood-emoji-button[data-mood="${moodSymbol}"]`);
                    if (moodButton) {
                        selectMood(moodButton);
                        if(logMood(moodSymbol, note)){
                            response = `Mood logged as ${moodSymbol}${note ? ' with note.' : ''}. Anything else?`;
                        } else {
                            response = `Could not log mood ${moodSymbol}. Try again.`;
                        }
                    } else {
                        response = `Sorry, I couldn't find an emoji for "${moodMatch[1]}". Try 😄, 😞, 😐, etc.`;
                    }
                } else {
                    response = "How are you feeling? e.g., 'log mood happy' or 'log mood 😞 with note feeling tired'";
                }
            } else if (command.startsWith("how am i doing with") && command.includes("habit")) {
                const habitNameMatch = command.match(/how am i doing with\s+"?([^"]+)"?\s+habit/i);
                const habitName = habitNameMatch ? habitNameMatch[1].trim() : "";
                const habit = habits.find(h => h.name.toLowerCase().includes(habitName.toLowerCase()));
                if (habit) {
                    response = `For your "${habit.name}" habit: You're at ${habit.current}/${habit.goal} ${habit.unit || ''} with a streak of ${habit.streak} day(s).`;
                } else {
                    response = `I couldn't find a habit called "${habitName}".`;
                }
            } else if (command.startsWith("set habit") || command.startsWith("create habit")) {
                 const habitDetailsMatch = originalCommand.match(/(set|create) habit\s+"?([^"]+)"?\s+for\s+(\d+)\s*([a-zA-Z]*)/i);
                 if (habitDetailsMatch) {
                    const habitName = habitDetailsMatch[2].trim();
                    const goal = parseInt(habitDetailsMatch[3]);
                    const unit = habitDetailsMatch[4].trim();
                    setActiveScreen('wellness');
                    openCreateHabitModal(habitName, goal, unit); 
                    response = `Okay, opening the habit creation form for "${habitName}" with goal ${goal} ${unit}. Please select an icon and color.`;
                 } else {
                    response = "To set a habit, try: 'set habit \"Drink Water\" for 8 glasses'";
                 }
            } else if (command.startsWith("analyze my  journal entry") && currentScreenId === 'wellness') {
                const journalEntries = loggedMoods.filter(m => m.type === 'journal');
                if (journalEntries.length > 0) {
                    const lastEntry = journalEntries[journalEntries.length - 1];
                    isHTMLResponse = true;
                    response = `Analyzing your  journal entry ("${lastEntry.note.substring(0,20)}..."):<br> `;
                    if (lastEntry.note.toLowerCase().includes("happy") || lastEntry.note.toLowerCase().includes("great")) response += "It seems you had a positive experience! ";
                    if (lastEntry.note.toLowerCase().includes("challenge") || lastEntry.note.toLowerCase().includes("difficult")) response += "It sounds like you overcame something. ";
                    if (lastEntry.note.toLowerCase().includes("learn") || lastEntry.note.toLowerCase().includes("discovered")) response += "Glad to see you're learning! ";
                    response += "Reflecting on entries can provide good insights. Keep it up!";
                } else {
                    response = "You don't have any journal entries yet for me to analyze.";
                }
            } else if (command.startsWith("find services for")) {
                const serviceTypeMatch = command.match(/find services for\s+(.+)/i);
                const serviceType = serviceTypeMatch ? serviceTypeMatch[1].trim() : "";
                if (serviceType) {
                    setActiveScreen('servicesMarket');
                    response = `Okay, I'm searching the Local Services Marketplace for "${serviceType}".`;
                } else {
                    response = "What kind of service are you looking for? e.g., 'find services for plumbing'";
                }
            }
            else if (command.includes("latest in") && command.includes("channel")) {
                const channelNameMatch = command.match(/latest in\s+"?([^"]+)"?\s+channel/i);
                const channelName = channelNameMatch ? channelNameMatch[1].trim() : "";
                const channel = mockChannels.find(c => c.name.toLowerCase().includes(channelName.toLowerCase()));
                if (channel && channel.messages && channel.messages.length > 0) {
                    isHTMLResponse = true;
                    response = `Latest in "${channel.name}":<ul>`;
                    channel.messages.slice(-2).forEach(msg => {
                        const senderDetails = mockUsers[msg.senderId] || mockUsers.defaultBot;
                        response += `<li><strong>${senderDetails.name}</strong>: ${msg.text.substring(0,30)}...</li>`
                    });
                    response += "</ul>";
                } else if (channel) {
                    response = `The channel "${channel.name}" has no messages yet.`;
                } else {
                    response = `I couldn't find a channel called "${channelName}".`;
                }
            } else if (command.includes("is") && command.includes("open") && command.includes("?")) {
                const placeNameMatch = command.match(/is\s+"?([^"]+)"?\s+open/i);
                const placeName = placeNameMatch ? placeNameMatch[1].trim() : "";
                const place = mockPlaces.all.find(p => p.name.toLowerCase().includes(placeName.toLowerCase()));
                if (place) {
                    response = `${place.name} is ${place.openNow ? 'currently open.' : 'currently closed.'} ${place.sub || ''}`;
                } else {
                    response = `I don't have information on "${placeName}". Try searching in Explore.`;
                }
            } else if (command.includes("what's the emergency number") || command.includes("emergency call")) {
                response = "In an emergency, please dial 999. You can also use the Emergency Dashboard from the home screen for more tools.";
            } else if (command.includes("how to submit a deal") || command.includes("submit offer")) {
                response = "You can submit a deal or offer by going to the 'Explore' screen and tapping the 'Submit a Deal' button at the bottom. I can take you there if you like.";
            } else if (command.includes("how to submit a tip") || command.includes("community tip")) {
                response = "To submit a community tip, go to the 'Explore' screen and tap the 'Add a Place/Tip' button. I can navigate there for you.";
            } else if (command.includes("who is shamase")) {
                response = currentAiPersonality === 'witty' ? "Shamase? Sounds like someone important. Or maybe just the person testing me. You tell me." : `Shamase is the user of this LocalLife OS concept! That's you, ${userName}, right?`;
            } else if (command.includes("tell me a joke") || command.includes("joke")) {
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "Why did the scarecrow win an award? Because he was outstanding in his field!",
                    "Why don't eggs tell jokes? They'd crack each other up!",
                    "I told my wife she was drawing her eyebrows too high. She seemed surprised."
                ];
                response = jokes[Math.floor(Math.random() * jokes.length)];
            } else if (command.includes("give me a quote") || command.includes("quote")) {
                 const quotes = [
                    "The only way to do great work is to love what you do. - Steve Jobs",
                    "The purpose of our lives is to be happy. - Dalai Lama",
                    "Get busy living or get busy dying. - Stephen King",
                    "You only live once, but if you do it right, once is enough. - Mae West"
                ];
                response = quotes[Math.floor(Math.random() * quotes.length)];
            } else if (command.includes("relax") || command.includes("stressed") || command.includes("calm down")) {
                response = `I understand, ${userName}. How about some deep breaths? You can also try the Journaling feature in the Wellness Hub for reflection. Or I can use the device's voice to guide you.`;
            } else if (command.includes("help") || command.includes("what can you do")) {
                isHTMLResponse = true;
                response = `${contextMessage}I can help you with various tasks, ${userName}! Try things like:
                    <ul>
                         <li>General: "hello", "time", "date", "weather", "tell me a joke", "global search [term]"</li>
                        <li>Planner: "add task Go to gym at 6pm on Friday", "clear completed tasks", "top 3 tasks", "what's my next task?" (when on planner)</li>
                        <li>Navigation: "show planner", "open explore deals", "go to settings"</li>
                        <li>Explore: "find pizza places", "search for parks", "any food deals?", "is The Gables open?", "plan a day for me", "plan a route", "what's good for kids?"</li>
                        <li>Chat: "create channel My Garden Club", "latest in Mbabane Community Updates channel?", "summarize Eswatini Hikers channel"</li>
                        <li>Wellness: "log mood happy", "how am i doing with water habit?", "set habit Meditate for 10 minutes", "log 2 glasses of water" (when on wellness), "suggest habit for stress relief", "analyze my  journal entry"</li>
                        <li>App Info: "how to submit a deal?", "what's the emergency number?"</li>
                        <li>"Clear chat"</li>
                    </ul>
                    <p class="card-subtitle" style="font-size:0.8rem">I leverage native device features like voice input, text-to-speech, camera, and calendar linking.</p>`;
            } else if (command.includes("what's the community safety alert") || command.includes("safety alert")) {
                const safetyText = document.getElementById('safetyTickerText')?.textContent;
                response = safetyText ? `Current safety alert: "${safetyText}"` : "No active safety alerts displayed right now.";
            }
            else {
                response = `${contextMessage}${currentAiPersonality === 'witty' ? "I'm not sure I understand. And frankly, at this point, I'm too afraid to ask. Try something simpler, like 'add task groceries'." : "That's an interesting command! I'm still learning. Try 'help' to see what I can do."}`;
            }
            addMessageToAIChat('other', aiPrefix + response, isHTMLResponse);
            if(requiresFollowUpInResponse || command.includes("?")) triggerFabSuggestion(false); 
            if (aiConversationContext && !requiresFollowUpInResponse) {
                 aiConversationContext = null;
                 aiExpectedResponseType = null;
            }
        }, 600 + Math.random() * 400);
    }
