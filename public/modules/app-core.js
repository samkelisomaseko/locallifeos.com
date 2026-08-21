    
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.querySelector('.app-container');
    const contentContainer = document.querySelector('.content');
    const screens = document.querySelectorAll('.screen');
    const navItems = document.querySelectorAll('.nav-item');
    const aiFab = document.getElementById('aiFab');
    const aiFabIcon = document.getElementById('aiFabIcon');
    const aiBottomSheet = document.getElementById('aiBottomSheet');
    const aiChatArea = document.getElementById('aiChatArea');
    const aiChatInputText = document.getElementById('aiChatInputText');
    const aiChatTypingSuggestionEl = document.getElementById('aiChatTypingSuggestion');
    const toastNotification = document.getElementById('toastNotification');
    const dynamicIsland = document.getElementById('dynamicIslandAlert');
    const lockScreen = document.getElementById('lockScreen');
    const callModal = document.getElementById('callModal');
    let dynamicIslandTimeout;
    let currentOpenModalId = null;
    let toastTimeout;
    let currentAiPersonality = 'neutral'; 
    let aiConversationContext = null; 
    let aiExpectedResponseType = null;
    let exploreSearchDebounceTimeout;
    let fabSuggestionTimeout;
    let mockUserSuggestionPopupTimeout;
    let userName = 'Shamase';
    let userLocationCoords = { lat: -26.3056, lng: 31.1428 }; 
    let calendarCurrentDate = new Date();
    let currentCalendarType = 'tasks';
    let breathingInterval, breathingTimerInterval, breathingSessionEndTimeout;
    let breathingPace = { name: 'relax', inhale: 4000, hold1: 4000, exhale: 6000, hold2: 1000 };
    let breathingIsActive = false;
    let focusQuoteInterval;
    let userLevel = 1;
    let userXP = 0;
    let xpToNextLevel = 100;
    let unlockedBadges = new Set();
    let userSubscriptionTier = 'free';
    let map;
    let currentPositionMarker;
    let heatmap;
    let mapPolygons = [];
    let mapMarkers = [];
    let isAppLocked = false;
    let emergencyKeywordRecognition;
    let lastSleepLogDate = null;
    let currentPinInput = '';
    let settingPinState = { stage: null, firstPin: null };
    let learnedRoutines = {};
    let pendingSyncQueue = [];
    let onlineStatus = navigator.onLine;
    let callTimerInterval;
    
    const native = {
        geolocation: {
            getCurrent: (success, error) => {
                 if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(success, error);
                } else {
                    showToast("Geolocation is not supported by this browser.", "error");
                    if(error) error();
                }
            }
        },
        speechToText: (context) => {
            startVoiceRecognition(context === 'specific' ? 'specificChatInput' : 'aiChatInputText', context === 'specific' ? sendSpecificChatMessage : sendAIChatMessage);
        },
        textToSpeech: (text) => {
            speakText(text);
        },
        filePicker: (context, useCamera = false) => {
            document.getElementById('nativeFileUpload').click();
        },
        showNotification: (title, options) => {
            if (!("Notification" in window)) {
                showToast(`Notification (blocked): ${title} - ${options.body}`, 'info');
                return;
            }
            if (Notification.permission === "granted") {
                try {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(title, options);
                    });
                } catch (e) {
                     new Notification(title, options);
                }
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        try {
                           navigator.serviceWorker.ready.then(registration => {
                                registration.showNotification(title, options);
                           });
                        } catch(e) {
                            new Notification(title, options);
                        }
                    }
                });
            } else {
                 showToast(`Push notifications are disabled in your browser settings.`, 'error');
            }
        },
        requestNotificationPermission: () => {
             if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
        },
        addToCalendar: (task) => {
            createCalendarEvent(task);
        },
        share: (type, data) => {
            shareContent(type, data);
        },
        authenticate: (callback) => {
            
            setTimeout(() => {
                const success = true; 
                callback(success);
            }, 500);
        }
    };

    let tasks = [
        { id: 1, title: "Submit ERS Tax Returns", time: "Before 5 PM", category: "work", completed: false, notes: "Ensure all income sources are declared.", dueDate: "2024-07-26", recurrence: "none", aiParsedDetails: { project: "Tax Returns", entity: "ERS"}, createdBy: 'system' },
        { id: 2, title: "Morning walk at Mlilwane Sanctuary", time: "7:00 AM - 8:00 AM", category: "health", completed: true, notes: "Look for zebras near the camp.", dueDate: new Date().toISOString().split('T')[0], recurrence: "daily", aiParsedDetails: {location: "Mlilwane"}, createdBy: 'system' },
        { id: 3, title: "Pay EEC bill at The Gables", time: "Geo: Near \"The Gables\"", category: "errands", completed: false, notes: "Account #12345", dueDate: new Date().toISOString().split('T')[0], recurrence: "none", aiParsedDetails: {item: "EEC bill", location: "The Gables"}, createdBy: 'system'},
        { id: 4, title: "Read 'Long Walk to Freedom' Chapter 5", time: "Evening", category: "learning", completed: false, notes: "Reflect on the themes of resilience.", dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], recurrence: "none", aiParsedDetails: {book: "Long Walk to Freedom"}, createdBy: 'system'},
        { id: 5, title: "Call Gogo about weekend plans", time: "After 5 PM", category: "personal", completed: false, notes: "Ask if she needs anything from town.", dueDate: new Date().toISOString().split('T')[0], recurrence: "none", aiParsedDetails: {person: "Gogo", topic: "weekend plans"}, createdBy: 'system'}
    ];
    let nextTaskId = 6;
    let projects = {};
    const mockPlaces = {
        all: [
            { id: 1, name: "Malandela's Restaurant", details: "Farm-to-table dining, local ingredients - <span class='rating'><i class='fas fa-star'></i> 4.6</span> (150 reviews)", sub: "Open until 9 PM", type: "food", img: "https://source.unsplash.com/random/60x60/?restaurant,farmhouse", saved:false, openNow: true, rating: 4.6, aiSummary: "Visitors praise the atmosphere and fresh food. A local favorite for special occasions.", tags: ["restaurant", "local-cuisine", "dinner", "scenic", "popular"], position: {lat: -26.4950, lng: 31.1969}, createdBy: 'system' },
            { id: 2, name: "Mlilwane Wildlife Sanctuary", details: "Nature reserve with zebras, antelope, hiking & biking trails.", sub: "Open 6 AM - 6 PM", type: "parks", img: "https://source.unsplash.com/random/60x60/?zebra,savannah", saved:true, openNow: true, rating: 4.8, aiSummary: "Perfect for family outings and experiencing Eswatini's nature up close. The sunset drives are a must-do.", tags: ["nature", "hiking", "family", "wildlife", "outdoors", "scenic", "adventure", "must-see"], position: {lat: -26.4883, lng: 31.1517}, createdBy: 'system' },
            { id: 3, name: "MTN Bushfire Festival", details: "Annual international music & arts festival - <span class='rating'><i class='fas fa-fire'></i> Major Event</span>", sub: "Annually in May @ House on Fire", type: "events", img: "https://source.unsplash.com/random/60x60/?music,festival", saved:false, openNow: false, rating: 4.9, aiSummary: "A world-renowned event celebrating music, arts, and culture. AI recommends booking accommodation far in advance.", tags: ["event", "music", "festival", "international", "vibrant"], position: {lat: -26.4950, lng: 31.1969}, createdBy: 'system' }, 
            { id: 4, name: "The Gables Shopping Centre", details: "Shopping mall with cinema, restaurants, and various stores.", sub: "Closes at 7 PM", type: "shops", img: "https://source.unsplash.com/random/60x60/?shopping,mall", saved:false, openNow: true, rating: 4.3, aiSummary: "The main hub for shopping and entertainment in the Ezulwini valley.", tags: ["shopping", "cinema", "food", "services", "family"], position: {lat: -26.4172, lng: 31.1764}, createdBy: 'system' },
            { id: 5, name: "Vickery Seedlings", details: "Garden centre with a wide variety of plants, seeds, and tools.", sub: "Open 8 AM - 5 PM", type: "shops", img: "https://source.unsplash.com/random/60x60/?garden,plants", saved:false, openNow: true, rating: 4.5, aiSummary: "Highly rated for its healthy plants and knowledgeable staff. A must-visit for gardeners.", tags: ["gardening", "plants", "nursery", "local", "hobby"], position: {lat: -26.4421, lng: 31.1895}, createdBy: 'system' },
            { id: 6, name: "Sibebe Rock", details: "World's second-largest monolith. Challenging hiking trail.", sub: "Best hiked in the morning", type: "parks", img: "https://source.unsplash.com/random/60x60/?rock,mountain", saved: true, openNow: true, rating: 4.7, aiSummary: "Offers breathtaking views from the top. The hike is strenuous but rewarding. AI suggests taking plenty of water.", tags: ["hiking", "nature", "adventure", "scenic", "challenging"], position: {lat: -26.2653, lng: 31.1444}, createdBy: 'system' }, 
            { id: 7, name: "Manzini Market", details: "Bustling market with crafts, fresh produce, and local goods.", sub: "Busiest on Thursdays", type: "events", img: "https://source.unsplash.com/random/60x60/?market,africa", saved: false, openNow: true, rating: 4.4, aiSummary: "An authentic local experience. Great for souvenirs and fresh food. Be prepared for crowds.", tags: ["market", "local", "crafts", "food", "shopping", "vibrant"], position: {lat: -26.4947, lng: 31.3787}, createdBy: 'system'},
            { id: 8, name: "Ngwenya Glass", details: "Glassblowing factory creating unique items from recycled glass.", sub: "Factory tours available", type: "shops", img: "https://source.unsplash.com/random/60x60/?glass,blowing", saved:false, openNow: true, rating: 4.6, aiSummary: "Fascinating to watch the artisans at work. The products are beautiful and eco-friendly.", tags: ["crafts", "art", "local", "recycled", "tourist"], position: {lat: -26.2167, lng: 31.0333}, createdBy: 'system' },
        ],
        events: [], food: [], shops: [], parks: [], services: [], open_now: [], ai_recommended: [], bulletin: [], saved: []
    };
    mockPlaces.all.forEach(place => {
        if (!mockPlaces[place.type]) mockPlaces[place.type] = [];
        mockPlaces[place.type].push(place);
        if (place.openNow) mockPlaces.open_now.push(place);
        if (place.rating >= 4.5 && place.type !== 'events') mockPlaces.ai_recommended.push(place);
        if (place.saved) mockPlaces.saved.push(place);
    });
    let mockUsers = {
        'user': { id: 'user', name: 'Shamase Local', username: '@shamase_local', avatarUrl: 'https://i.pravatar.cc/40?u=user', bio: 'Exploring the beauty of Eswatini!', location: 'Mbabane', interests: 'hiking, local music, technology' },
        'sbuD': { id: 'sbuD', name: 'Sbu Dlamini', username: '@sbu_d', avatarUrl: 'https://i.pravatar.cc/40?u=sbuD', bio: 'Into photography and nature.', location: 'Manzini', interests: 'outdoors, photography, cars' },
        'nomsaM': { id: 'nomsaM', name: 'Nomsa M.', username: '@nomsaM', avatarUrl: 'https://i.pravatar.cc/40?u=nomsaM', bio: 'Foodie and market lover, new to Ezulwini.', location: 'Ezulwini', interests: 'cooking, markets, gardening' },
        'thaboK': { id: 'thaboK', name: 'Thabo Khumalo', username: '@thaboK', avatarUrl: 'https://i.pravatar.cc/40?u=thaboK', bio: 'Tech enthusiast and community volunteer.', location: 'Mbabane', interests: 'volunteering, gadgets, community events' },
        'defaultBot': { id: 'defaultBot', name: 'LocalLife AI', username: '@ai_assistant', avatarUrl: 'https://i.pravatar.cc/40?u=aiBot', bio: 'Your friendly neighborhood AI assistant.', location: 'The Cloud', interests: 'efficiency, data, helping people'}
    };
    let mockChannels = [
        { id: 1, name: 'Mbabane Community Updates', icon: 'fas fa-bullhorn', color: 'var(--moss-green)', type: 'announcements', description: "Official news and updates for Mbabane residents.", lastMessage: "City Council: Roadworks on Gwamile St.", lastMessageTimestamp: new Date(Date.now() - 3600000 * 1), unreadCount: 1, isJoined: true, isFavorite: false, lastOpened: new Date(Date.now() - 86400000 * 2), messages: [{ mid: 101, senderId: 'defaultBot', text: 'City Council: Roadworks on Gwamile St this weekend. Plan alternative routes.', timestamp: new Date(Date.now() - 3600000 * 2), reactions:{'👍': {count:1, users:['sbuD']}} }, { mid: 102, senderId: 'user', text: 'Thanks for the update!', timestamp: new Date(Date.now() - 3600000 * 1.5), reactions:{} }, { mid: 103, senderId: 'defaultBot', text: 'You are welcome.', timestamp: new Date(Date.now() - 3600000 * 1), reactions:{'👍':{count:1, users:['user']}} }], ownerId: 'system' },
        { id: 2, name: 'Eswatini Hikers Club', icon: 'fas fa-hiking', color: 'var(--soft-blue)', type: 'hobby', description: "Planning hikes to Sibebe, Malolotja, and more.", lastMessage: "Sbu: Anyone for a Sibebe hike Saturday?", lastMessageTimestamp: new Date(Date.now() - 1800000), unreadCount: 3, isJoined: true, isFavorite: true, lastOpened: new Date(Date.now() - 3600000 * 5), messages: [{ mid: 201, senderId: 'sbuD', text: "Anyone for a Sibebe hike Saturday morning?", timestamp: new Date(Date.now() - 1800000), reactions:{} }, { mid: 202, senderId: 'thaboK', text: "I'm in! What time?", timestamp: new Date(Date.now() - 1700000), reactions:{'👍': {count:1, users:['sbuD']}} }, { mid: 203, senderId: 'user', text: "Sounds great, count me in!", timestamp: new Date(Date.now() - 1500000), reactions:{'👍': {count:1, users:['thaboK']}} }], ownerId: 'sbuD' },
        { id: 3, name: 'Eswatini Foodies', icon: 'fas fa-utensils', color: 'var(--muted-terracotta)', type: 'general', description: "Discover new restaurants, share recipes, and talk all things food!", lastMessage: "Nomsa: Malandela's was amazing  night!", lastMessageTimestamp: new Date(Date.now() - 7200000), unreadCount: 8, isJoined: true, isFavorite: false, lastOpened: new Date(Date.now() - 86400000), messages: [{ mid: 301, senderId: 'nomsaM', text: "Malandela's was amazing  night! The steak was perfect.", timestamp: new Date(Date.now() - 7200000), reactions:{'❤️':{count:2, users:['user', 'sbuD']}} } ], ownerId: 'nomsaM' },
        { id: 4, name: 'Eswatini Events', icon: 'fas fa-calendar-check', color: 'var(--primary-accent)', type: 'local_events', description: "Discussions about upcoming events like Bushfire, festivals, and local gigs.", lastMessage: "New: Thabo: Bushfire early bird tickets are live!", lastMessageTimestamp: new Date(Date.now() - 30000), unreadCount: 0, isJoined: false, isFavorite: false, messages: [{ mid: 401, senderId: 'thaboK', text: "Bushfire early bird tickets are live on their website!", timestamp: new Date(Date.now() - 30000), reactions:{}}], ownerId: 'thaboK'},
    ];
    let nextChannelId = mockChannels.length + 1;
    let nextMessageId = 502;
    const channelTypeLabels = {
        general: "General", skill_swap: "Skill Swap", hobby: "Hobby Group", announcements: "Announcements", local_events: "Local Events", direct_message: "Direct Message"
    };
    let habits = [
        { id: 1, name: "Drink 2 litres of water daily", goal: 8, current: 6, unit: "glasses", streak: 5, icon: "fas fa-glass-water", color: "var(--soft-blue)", isWaterTracker: true},
        { id: 2, name: "Read for 30 minutes before bed", goal: 1, current: 1, unit: "session", streak: 12, icon: "fas fa-book-open", color: "var(--moss-green)"},
        { id: 3, name: "10 min Morning Meditation", goal: 1, current: 0, unit: "session", streak: 0, icon: "fas fa-brain", color: "var(--muted-terracotta)"},
        { id: 4, name: "Practice SiSwati for 10 mins", goal: 1, current: 1, unit: "lesson", streak: 25, icon: "fas fa-language", color: "#FFC107"},
    ];
    let nextHabitId = habits.length + 1;
    let loggedMoods = []; 
    let sleepData = []; 
    const availableIcons = ['fas fa-star', 'fas fa-heart', 'fas fa-tree', 'fas fa-building', 'fas fa-bicycle', 'fas fa-gamepad', 'fas fa-music', 'fas fa-paint-brush', 'fas fa-users', 'fas fa-comments', 'fas fa-lightbulb', 'fas fa-briefcase', 'fas fa-code', 'fas fa-language', 'fas fa-wrench', 'fas fa-seedling', 'fas fa-graduation-cap', 'fas fa-dumbbell', 'fas fa-apple-alt', 'fas fa-person-walking', 'fas fa-book-open', 'fas fa-brain', 'fas fa-glass-water', 'fas fa-wine-bottle'];
    const availableColors = ['var(--primary-accent)', 'var(--moss-green)', 'var(--soft-blue)', 'var(--muted-terracotta)', '#FFC107', '#9575CD', '#9CCC65', '#F06292'];
    const journalPrompts = [
        "What's one small thing that brought you joy today, and how can you invite more of it into your week?",
        "Describe a challenge you faced recently. How did you handle it, and what did you learn?",
        "What are you grateful for right now? List three things.",
        "If you could give your younger self one piece of advice, what would it be?",
        "What's a skill you'd like to learn or improve, and what's one step you can take towards it?"
    ];
    const safetyTickerMessages = [
        "Load shedding scheduled for Zone 3 (Mbabane West) from 6 PM - 8 PM.",
        "Traffic alert: congestion on the MR3 highway near Matsapha Industrial Site.",
        "High pollen count today in the Ezulwini Valley. Take precautions.",
        "Reminder: Eswatini Mobile is doing network maintenance tonight from 1 AM - 4 AM.",
        "Public health reminder: Stay hydrated during the heatwave."
    ];
    let currentSafetyTickerIndex = 0;
    let dashboardCardConfig = [
        { id: "localContextCard", name: "Local Context", visible: true }, 
        { id: "nearbyPulseSection", name: "Nearby Pulse", visible: true },
        { id: "newsSummaryCard", name: "AI News Summary", visible: true },
        { id: "dashboardTaskListCard", name: "Dynamic Day View", visible: true },
        { id: "pinnedWidgetsCard", name: "Pinned Widgets", visible: true },
        { id: "proactiveSuggestionsCard", name: "Smart Suggestions", visible: true },
        { id: "myAppletsCard", name: "My Applets", visible: true },
        { id: "topDealsCard", name: "Today's Top Deals", visible: true },
    ];
    let aiLearningPreferences = {
        learnSavedPlaces: true, learnMoodLogs: true, learnTaskPatterns: true, learnHabitTracking: true, learnChatStyle: false
    };
    let notificationPreferences = {
        dailyBriefing: true, aiSmartAlerts: true, allChatMessages: false, chatMentions: true, aiSuggestions: false, dealAlerts: false, taskReminders: true
    };
    let mockDeals = [
        { id: 1, title: "Two-for-One Pizza Tuesdays", description: "Buy any large pizza and get a second one of equal or lesser value free! Every Tuesday.", businessName: "Pizza Inn, Mbabane", category: "food", img: "https://source.unsplash.com/random/80x80/?pizza,deal", expiryDate: null, terms: "Valid on Tuesdays only. In-store or for collection.", price: 150.00, discountPrice: 75.00, createdBy: 'system' },
        { id: 2, title: "15% Off All MTN Bundles", description: "Get 15% off when you purchase any data or voice bundle through the LocalLife App this week.", businessName: "MTN Eswatini",category: "services", img: "https://source.unsplash.com/random/80x80/?mobile,phone", expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], terms: "Must be purchased via the app. Limited time offer.", price: 100.00, discountPrice: 85.00, createdBy: 'system' },
        { id: 3, title: "Happy Hour at The Pub & Grill", description: "Half-price on all local beers and ciders from 4 PM - 6 PM daily.", businessName: "The Gables Pub & Grill", category: "food", img: "https://source.unsplash.com/random/80x80/?beer,pub", expiryDate: null, terms: "Daily 4 PM - 6 PM.", price: 30.00, discountPrice: 15.00, createdBy: 'system' },
        { id: 4, title: "10% Off at Swazi Candles", description: "Get 10% off your entire purchase when you spend E300 or more at the Swazi Candles Centre.", businessName: "Swazi Candles Centre", category: "retail", img: "https://source.unsplash.com/random/80x80/?candles", expiryDate: "2024-08-04", terms: "Valid this weekend only.", price: 300.00, discountPrice: 270.00, createdBy: 'system' },
    ];
    let nextDealId = mockDeals.length + 1;
    const dealCategories = ["food", "services", "retail", "wellness", "other"]; 
    let mockNotifications = [
        { id: 1, icon: 'fas fa-comments', title: 'New message in "Eswatini Hikers"', text: 'SbuD: "Anyone for a Sibebe hike Saturday morning?"', timestamp: new Date(Date.now() - 3600000), read: false, type: 'chat_mention', action: () => { setActiveScreen('chat'); setTimeout(() => showSpecificChatView(2), 50); } },
        { id: 2, icon: 'fas fa-calendar-check', title: 'Task Reminder: Submit ERS Returns', text: 'Due today before 5 PM.', timestamp: new Date(Date.now() - 7200000), read: true, type: 'task_reminder', relatedId: 1, action: () => { setActiveScreen('planner'); } },
        { id: 3, icon: 'fas fa-brain', title: 'AI Suggestion: Lunch Spot', text: 'It\'s nearly lunchtime! Based on your preference for local cuisine, how about "e-Dladleni" in Malkerns?', timestamp: new Date(Date.now() - 10800000), read: false, type: 'ai_suggestion', action: () => { const place = mockPlaces.all.find(p=>p.name.includes("Malandela")); if(place) { setActiveScreen('explore'); setTimeout(() => showPlaceDetail(place), 50);} } },
    ];
    let nextNotificationId = mockNotifications.length + 1;
    let trustedContacts = [
        { id: 1, name: "Gogo", phone: "76021234" },
        { id: 2, name: "Sbu (Friend)", phone: "76056789" }
    ];
    let nextTrustedContactId = 3;
    let bulletinPosts = [
        { id: 1, title: "Lost: Brown Goat near Mantenga", content: "Our brown goat with a white spot on its head went missing near Mantenga cultural village yesterday. Answers to 'Mbali'. Please call 76XXXXXX if you see her!", category: "lost_found", authorId: "nomsaM", timestamp: new Date(Date.now() - 86400000 * 0.5), comments: [{senderId: 'thaboK', text: 'Hope you find her!', timestamp: new Date()}] },
        { id: 2, title: "Community Market This Saturday!", content: "Multi-family market at the Malkerns Club this Saturday from 8 AM to 2 PM. Fresh produce, crafts, and food stalls!", category: "event_promo", authorId: "thaboK", timestamp: new Date(Date.now() - 86400000 * 1.2), comments: [] }
    ];
    let nextBulletinPostId = 3;
    let mockApplets = [
        { id: 'loadShedding', name: 'Load Shedding', icon: 'fas fa-power-off', color: '#E07A5F', desc: 'Get real-time load shedding schedules for your area from EEC.', installed: true },
        { id: 'localRideshare', name: 'Local Rideshare', icon: 'fas fa-car', color: '#FFC107', desc: 'A community-based rideshare service (kombis & private).', installed: true },
        { id: 'siswatiTutor', name: 'SiSwati Tutor AI', icon: 'fas fa-language', color: '#9575CD', desc: 'Practice SiSwati with an AI tutor that knows local phrases.', installed: true },
        { id: 'groupExpenseSplitter', name: 'Group Expense Splitter', icon: 'fas fa-receipt', color: '#66BB6A', desc: 'Easily split bills and expenses with friends. Generates a shareable receipt.', installed: true },
        { id: 'servicesMarket', name: 'Services Marketplace', icon: 'fas fa-store', color: '#64B5F6', desc: 'Find or offer local services like plumbing, tutoring, etc.', installed: false },
        { id: 'governanceHub', name: 'Civic Engagement Hub', icon: 'fas fa-landmark', color: '#8FBC8F', desc: 'Connect with local governance, participate in polls, and view notices.', installed: false },
    ];
    let integratedApps = [
        { id: 'google_calendar', name: 'Google Calendar', icon: 'fab fa-google', connected: false },
        { id: 'whatsapp', name: 'WhatsApp', icon: 'fab fa-whatsapp', connected: false },
        { id: 'health_kit', name: 'HealthKit / Google Fit', icon: 'fas fa-heart-pulse', connected: false }
    ];
    let lastUserAction = "None recorded";
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && currentOpenModalId) closeModal(currentOpenModalId); });
    function trackUserAction(action) {
        lastUserAction = action;
    }
    function populateIconSelector(selectorId, selectedIconClass = null) {
        const selector = document.getElementById(selectorId);
        if(!selector) return;
        selector.innerHTML = '';
        availableIcons.forEach(iconClass => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'icon-option';
            if (iconClass === selectedIconClass) option.classList.add('selected');
            option.innerHTML = `<i class="${iconClass}"></i>`;
            option.dataset.icon = iconClass;
            option.setAttribute('role', 'radio');
            option.setAttribute('aria-checked', iconClass === selectedIconClass ? 'true' : 'false');
            option.setAttribute('aria-label', iconClass.replace('fas fa-', '')); 
            option.onclick = () => {
                selector.querySelectorAll('.icon-option').forEach(el => {
                    el.classList.remove('selected');
                    el.setAttribute('aria-checked', 'false');
                });
                option.classList.add('selected');
                option.setAttribute('aria-checked', 'true');
            };
            selector.appendChild(option);
        });
    }
     function populateColorSelector(selectorId, selectedColorValue = null) {
        const selector = document.getElementById(selectorId);
        if(!selector) return;
        selector.innerHTML = '';
        availableColors.forEach(colorValue => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'icon-option'; 
            if (colorValue === selectedColorValue) option.classList.add('selected');
            
            const colorDot = document.createElement('div');
            colorDot.style.width = '24px';
            colorDot.style.height = '24px';
            colorDot.style.borderRadius = '50%';
            colorDot.style.backgroundColor = colorValue;
            colorDot.style.border = '1px solid rgba(0,0,0,0.1)'; 

            option.appendChild(colorDot);
            option.dataset.color = colorValue;
            option.setAttribute('role', 'radio');
            option.setAttribute('aria-checked', colorValue === selectedColorValue ? 'true' : 'false');
            option.setAttribute('aria-label', `Color ${colorValue}`); 
            option.onclick = () => {
                selector.querySelectorAll('.icon-option').forEach(el => {
                    el.classList.remove('selected');
                    el.setAttribute('aria-checked', 'false');
                });
                option.classList.add('selected');
                option.setAttribute('aria-checked', 'true');
            };
            selector.appendChild(option);
        });
    }
    function clearInputField(inputId, buttonEl) {
        const inputField = document.getElementById(inputId);
        if (inputField) inputField.value = '';
        if (buttonEl) buttonEl.classList.add('hidden');
        if (inputField) inputField.focus();
        if (inputId === 'exploreSearchInput') handleExploreSearch(true);
    }
    function setupInputClearButtons() {
        const inputsWithClear = [
            { inputId: 'newTaskInput', clearBtnId: 'clearNewTaskInput' },
            { inputId: 'exploreSearchInput', clearBtnId: 'clearExploreSearchInput' }
        ];
        inputsWithClear.forEach(item => {
            const input = document.getElementById(item.inputId);
            const btn = document.getElementById(item.clearBtnId);
            if (input && btn) {
                input.addEventListener('input', () => {
                    btn.classList.toggle('hidden', input.value === '');
                });
                btn.classList.toggle('hidden', input.value === '');
            }
        });
    }
    navItems.forEach(item => item.addEventListener('click', () => {
        trackUserAction(`Tapped Nav: ${item.dataset.screen}`);
        setActiveScreen(item.dataset.screen);
        if (navigator.vibrate) navigator.vibrate(10); 
    }));
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
    const taskListEl = document.getElementById('taskList');
    const newTaskInputEl = document.getElementById('newTaskInput');
    const taskCategories = ["personal", "work", "errands", "learning", "health", "general"];
    const aiPlannerSuggestionEl = document.getElementById('aiPlannerSuggestion');
    function renderTasks(fromDashboardToggle = false) { 
        if (!taskListEl) { return; }
        taskListEl.innerHTML = Array(3).fill(getSkeletonTaskItem()).join('');
        taskListEl.setAttribute('aria-busy', 'true');
        setTimeout(() => {
            taskListEl.innerHTML = '';
            const today = new Date().toDateString();
            if (tasks.length === 0) {
                taskListEl.innerHTML = `<li class="empty-state"><i class="fas fa-calendar-check"></i><p>Your day is clear! Add a task to get started.</p></li>`;
            } else {
                tasks.sort((a,b) => { 
                    if (a.completed !== b.completed) return a.completed - b.completed;
                    const aDate = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
                    const bDate = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
                    if (aDate.getTime() !== bDate.getTime()) return aDate - bDate;
                    const categoryOrder = { "work": 1, "learning": 2, "health": 3, "errands": 4, "personal": 5, "general": 6 };
                    return (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
                }).forEach(task => { 
                    const taskItem = document.createElement('li');
                    taskItem.className = `task-card task-category-${task.category || 'general'} long-press-target`;
                    taskItem.dataset.id = task.id;
                    taskItem.dataset.type = 'task';
                    let aiMetaHtml = '';
                    if(task.aiParsedDetails && Object.keys(task.aiParsedDetails).length > 0){
                        aiMetaHtml = `<div class="task-meta-ai"><i class="fas fa-brain"></i> AI Parsed: ${Object.entries(task.aiParsedDetails).map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`).join('; ')}</div>`;
                    }
                    const dueDateString = task.dueDate ? `<span class="task-duedate"><i class="fas fa-calendar-day"></i>${new Date(task.dueDate).toLocaleDateString([], {month: 'short', day: 'numeric'})}</span>`: '';
                    const timeString = task.time ? `<span class="task-time"><i class="fas fa-clock"></i>${task.time}</span>` : '';
                    const locationString = task.aiParsedDetails?.location ? `<span class="task-location"><i class="fas fa-map-marker-alt"></i>${task.aiParsedDetails.location}</span>` : '';
                    taskItem.innerHTML = `
                        <div class="task-category-color-bar"></div>
                        <button class="task-checkbox-button" onclick="toggleTaskStatus(${task.id})" aria-label="${task.completed ? 'Mark as incomplete' : 'Mark as complete'} ${task.title}">
                            <div class="task-checkbox ${task.completed ? 'completed' : ''}">
                                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                            </div>
                        </button>
                        <div class="task-info">
                            <div class="task-title ${task.completed ? 'completed' : ''}">${task.title}</div>
                            <div class="task-meta">${timeString} ${dueDateString} ${locationString}</div>
                            ${aiMetaHtml}
                        </div>
                    `;
                    taskListEl.appendChild(taskItem);
                });
            }
            taskListEl.setAttribute('aria-busy', 'false');
            initializeSwipeActions('#taskList .task-card');
            renderDashboardTasks(); 
            updateProactiveSuggestions();
            renderPinnedWidgets();
            saveTasksToLocalStorage();
        }, 500);
    }
    function decomposeTask(taskId) {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        const originalTask = tasks[taskIndex];
        tasks.splice(taskIndex, 1);
        const subTasks = [
            { title: `Set budget for ${originalTask.title}`, category: "personal", time: "ASAP" },
            { title: `Create guest list for ${originalTask.title}`, category: "personal", time: "Soon" },
            { title: `Research and book venue for party`, category: "errands", time: "This week" },
            { title: `Send out invitations for ${originalTask.title}`, category: "personal", time: "Next week" },
        ];
        subTasks.forEach(st => {
            tasks.push({ id: nextTaskId++, title: st.title, time: st.time, category: st.category, completed: false, notes: `Sub-task of '${originalTask.title}'`, dueDate: new Date().toISOString().split('T')[0], recurrence: "none", aiParsedDetails: { project: originalTask.title }, createdBy: 'user' });
        });
        renderTasks();
        showToast("AI has broken down the task for you!", "success");
        addXP(15, 'planner');
    }
    function addNewTask(titleFromAI = null, categoryFromAI = null, timeFromAI = null, dateFromAI = null, parsedDetailsFromAI = null) { 
        if (!newTaskInputEl && !titleFromAI) { return false; }
        const taskTitle = titleFromAI || newTaskInputEl.value.trim();
        if (!taskTitle) {
            showToast("Please enter a task title.", "error", 2000);
            if (newTaskInputEl) newTaskInputEl.focus();
            return false;
        }
        const isComplex = taskTitle.toLowerCase().startsWith('plan ') || taskTitle.toLowerCase().startsWith('organize ');
        if(isComplex && !titleFromAI){
            const tempId = Date.now();
            tasks.push({ id: tempId, title: taskTitle, time: "Project", category: "personal", completed: false, notes: "", dueDate: new Date().toISOString().split('T')[0], recurrence: "none", createdBy: 'user' });
            renderTasks();
            if (aiPlannerSuggestionEl) {
                aiPlannerSuggestionEl.innerHTML = `<i class="fas fa-brain"></i> This looks like a multi-step project. Can I break it down for you? <button class="button-secondary" style="padding:2px 5px; font-size:0.7rem; margin-left:5px;" onclick="decomposeTask(${tempId})">Yes, Please!</button>`;
                aiPlannerSuggestionEl.classList.remove('hidden');
            }
            if (newTaskInputEl) {
                newTaskInputEl.value = '';
                document.getElementById('clearNewTaskInput')?.classList.add('hidden');
            }
            return;
        }
        let category = categoryFromAI || "personal"; 
        let time = timeFromAI || "Anytime";
        let dueDate = dateFromAI || new Date().toISOString().split('T')[0];
        let aiParsedDetails = parsedDetailsFromAI || {};
        if(!titleFromAI) {
            const lowerTitle = taskTitle.toLowerCase();
            if (lowerTitle.includes("meeting") || lowerTitle.includes("report") || lowerTitle.includes("call client") || lowerTitle.includes("work on") || lowerTitle.includes("submit proposal")) category = "work";
            else if (lowerTitle.includes("buy ") || lowerTitle.includes("pick up") || lowerTitle.includes("groceries") || lowerTitle.includes("errand for")) category = "errands";
            else if (lowerTitle.includes("learn ") || lowerTitle.includes("study for") || lowerTitle.includes("read book")) category = "learning";
            else if (lowerTitle.includes("gym") || lowerTitle.includes("workout") || lowerTitle.includes("doctor appt") || lowerTitle.includes("meditation") || lowerTitle.includes("jog")) category = "health";
            const timeMatch = taskTitle.match(/at\s+(\d{1,2}(:\d{2})?\s*(am|pm)?)/i);
            if (timeMatch && timeMatch[0]) {
                time = timeMatch[0].trim().toUpperCase();
                aiParsedDetails.time = time;
            }
            const dateMatch = taskTitle.match(/on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i);
            if(dateMatch && dateMatch[1]) {
                const day = dateMatch[1].toLowerCase();
                let dateObj = new Date();
                if(day === 'tomorrow') dateObj.setDate(dateObj.getDate() + 1);
                else if (day !== 'today') {
                    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    let dayIndex = weekdays.indexOf(day);
                    while(dateObj.getDay() !== dayIndex) {
                        dateObj.setDate(dateObj.getDate() + 1);
                    }
                }
                dueDate = dateObj.toISOString().split('T')[0];
                aiParsedDetails.date = dueDate;
            } else {
                 const explicitDateMatch = taskTitle.match(/(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)/);
                 if(explicitDateMatch && explicitDateMatch[0]) {
                     dueDate = new Date(explicitDateMatch[0]).toISOString().split('T')[0];
                     aiParsedDetails.date = dueDate;
                 }
            }
            const locationMatch = taskTitle.match(/(?:at|in|from)\s+([A-Z][a-zA-Z\s]+(?:Cafe|Park|Store|Cleaners|Market|Library|Office|Hub|Center|Plaza|Square))/);
            if (locationMatch && locationMatch[1]) {
                aiParsedDetails.location = locationMatch[1].trim();
            }
            const personMatch = taskTitle.match(/(?:with|for|call|meet)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
            if (personMatch && personMatch[1] && !taskCategories.includes(personMatch[1].toLowerCase()) && personMatch[1].toLowerCase() !== "mom" && personMatch[1].toLowerCase() !== "dad") {
                aiParsedDetails.person = personMatch[1].trim();
            }
            if (aiPlannerSuggestionEl) {
                if(Object.keys(aiParsedDetails).length > 0){
                    aiPlannerSuggestionEl.innerHTML = `<i class="fas fa-brain"></i> AI parsed: ${Object.entries(aiParsedDetails).map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`).join('; ')}. <button class="button-secondary" style="padding:2px 5px; font-size:0.7rem;" onclick="this.parentElement.classList.add('hidden')">Dismiss</button>`;
                    aiPlannerSuggestionEl.classList.remove('hidden');
                } else {
                    aiPlannerSuggestionEl.classList.add('hidden');
                }
            }
        } else {
             if (timeFromAI) aiParsedDetails.time = timeFromAI;
             if (dateFromAI) aiParsedDetails.date = dateFromAI;
        }
        const conflictingTask = tasks.find(t => t.dueDate === dueDate && t.time === time && !t.completed);
        if (conflictingTask) {
            openConfirmationModal(
                "AI: Schedule Conflict Detected",
                `<p>You already have a task: "<strong>${conflictingTask.title}</strong>" scheduled at ${time} on this day.</p><p>How would you like to resolve this?</p>`,
                () => {
                    const newTime = prompt("Enter a new time for the original task (e.g., '11:00 AM')", "11:00 AM");
                    if (newTime) {
                        conflictingTask.time = newTime;
                        tasks.push({ id: nextTaskId++, title: taskTitle, time: time, category: category, completed: false, notes: "", dueDate: dueDate, recurrence: "none", aiParsedDetails: Object.keys(aiParsedDetails).length > 0 ? aiParsedDetails : null, createdBy: 'user' });
                        renderTasks();
                        showToast("AI has rescheduled the original task and added the new one.", "success");
                    }
                }
            );
            const confirmBtn = document.getElementById('confirmActionButton');
            if(confirmBtn) confirmBtn.textContent = 'Reschedule Original Task';
            return;
        }
        const newTask = { id: nextTaskId++, title: taskTitle, time: time, category: category, completed: false, notes: "", dueDate: dueDate, recurrence: "none", aiParsedDetails: Object.keys(aiParsedDetails).length > 0 ? aiParsedDetails : null, createdBy: 'user' };
        tasks.push(newTask);
        renderTasks();
        addXP(5, 'planner');
        if (!titleFromAI && newTaskInputEl) {
            newTaskInputEl.value = '';
            document.getElementById('clearNewTaskInput')?.classList.add('hidden');
        }
        showToast("Task added!", "success", 1500);
        triggerFabSuggestion();
        scheduleTaskNotification(tasks[tasks.length - 1]);
        native.addToCalendar(newTask);
        return true; 
    }
    window.toggleTaskStatus = function(taskId, fromDashboard = false) { 
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const wasIncomplete = !task.completed;
            task.completed = !task.completed;
            if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
            if(wasIncomplete && task.completed) {
                addXP(10, 'planner');
                showDynamicIslandAlert('fas fa-check', `Task Complete! +10 XP`);
            }
            if (fromDashboard && document.getElementById('dashboard').classList.contains('active')) {
                renderDashboardTasks(); 
            } else if (!fromDashboard && document.getElementById('planner').classList.contains('active')) {
                renderTasks();
            }
            showToast(task.completed ? `Task "${task.title.substring(0,15)}..." completed!` : `Task "${task.title.substring(0,15)}..." marked incomplete.`, "info", 1800);
            checkForWellnessPatterns();
        } else {
            showToast("Error: Task not found.", "error", 2000, true);
        }
    }
    window.deleteTask = function(taskId) { 
        openConfirmationModal("Delete Task?", "Are you sure you want to delete this task?", () => {
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex > -1) {
                const deletedTaskTitle = tasks[taskIndex].title;
                tasks.splice(taskIndex, 1);
                renderTasks();
                showToast(`Task "${deletedTaskTitle.substring(0,20)}..." deleted.`, "info", 1500);
            } else {
                showToast("Error: Task not found for deletion.", "error", 2000, true);
            }
        });
    }
    function openEditTaskModal(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) { showToast("Error: Task not found.", "error", 2000, true); return; }
        document.getElementById('editingTaskId').value = task.id;
        document.getElementById('editTaskTitleInput').value = task.title;
        document.getElementById('editTaskTimeInput').value = task.time;
        let dateValue = task.dueDate;
        if (dateValue === "Today") dateValue = new Date().toISOString().split('T')[0];
        else if (dateValue === "Tomorrow") {
            let tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
            dateValue = tomorrow.toISOString().split('T')[0];
        }
        document.getElementById('editTaskDueDateInput').value = dateValue || '';
        document.getElementById('editTaskRecurrenceSelect').value = task.recurrence || 'none';
        document.getElementById('editTaskNotesInput').value = task.notes || '';
        const categorySelect = document.getElementById('editTaskCategorySelect');
        categorySelect.innerHTML = ''; 
        taskCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            categorySelect.appendChild(option);
        });
        categorySelect.value = task.category || 'general';
        openModal('editTaskModal');
    }
    function saveEditedTask() {
        const taskId = parseInt(document.getElementById('editingTaskId').value);
        const task = tasks.find(t => t.id === taskId);
        if (!task) { showToast("Error: Could not save, task not found.", "error", 2000, true); return; }
        const newTitle = document.getElementById('editTaskTitleInput').value.trim();
        if (!newTitle) { showToast("Task title cannot be empty.", "error", 2000, true); return; }
        task.title = newTitle;
        task.time = document.getElementById('editTaskTimeInput').value.trim();
        task.category = document.getElementById('editTaskCategorySelect').value;
        task.dueDate = document.getElementById('editTaskDueDateInput').value.trim();
        task.recurrence = document.getElementById('editTaskRecurrenceSelect').value;
        task.notes = document.getElementById('editTaskNotesInput').value.trim();
        if (task.title !== newTitle && !task.aiParsedDetails) {
            const lowerTitle = newTitle.toLowerCase();
            task.aiParsedDetails = {};
            const timeMatch = newTitle.match(/at\s+(\d{1,2}(:\d{2})?\s*(am|pm)?)/i);
            if (timeMatch && timeMatch[0]) task.aiParsedDetails.time = timeMatch[0].trim().toUpperCase();
             const dateMatch = newTitle.match(/on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)/i);
            if(dateMatch && dateMatch[0]) task.aiParsedDetails.date = dateMatch[0].trim();
        }
        renderTasks();
        closeModal('editTaskModal');
        showToast("Task updated successfully!", "success", 1500);
        scheduleTaskNotification(task);
        native.addToCalendar(task);
    }
    function optimizeMyDay() { 
        const today = new Date().toISOString().split('T')[0];
        const tasksToOptimize = tasks.filter(t => !t.completed && (t.dueDate === today || t.dueDate === "Today" || !t.dueDate));

        if (tasksToOptimize.length < 2) {
            showToast("AI: Not enough tasks for today to optimize!", "ai_info");
            return;
        }

        const modalBody = document.getElementById('aiOptimizationBody');
        modalBody.innerHTML = `<p class="card-subtitle text-center"><i class="fas fa-spinner fa-spin"></i> Analyzing your day...</p>`;
        openModal('aiOptimizationModal');

        setTimeout(() => {
            const originalOrder = [...tasksToOptimize];
            
            const categoryOrder = { "work": 1, "health": 2, "learning": 3, "errands": 4, "personal": 5, "general": 6 };
            tasksToOptimize.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));

            let currentTime = new Date();
            currentTime.setHours(9, 0, 0, 0); 

            let optimizedSchedule = tasksToOptimize.map(task => {
                const startTime = new Date(currentTime);
                let durationMinutes = 60; 
                if(task.category === 'work' && task.title.toLowerCase().includes('report')) durationMinutes = 90;
                if(task.category === 'health') durationMinutes = 45;
                
                currentTime.setMinutes(currentTime.getMinutes() + durationMinutes);
                const endTime = new Date(currentTime);
                
                currentTime.setMinutes(currentTime.getMinutes() + 15); 

                return {
                    id: task.id,
                    title: task.title,
                    category: task.category,
                    startTime: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    endTime: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
            });

            document.getElementById('aiOptimizationSummary').textContent = `I've created a focused, time-blocked schedule for you, prioritizing work and wellness.`;
            modalBody.innerHTML = optimizedSchedule.map(item => `
                <div class="optimized-task-card">
                    <p class="optimized-task-time">${item.startTime} - ${item.endTime}</p>
                    <p><strong>${item.title}</strong></p>
                    <p class="card-subtitle" style="margin-bottom:0;">Category: ${item.category}</p>
                </div>
            `).join('');

            document.getElementById('applyOptimizationButton').onclick = () => {
                optimizedSchedule.forEach(optTask => {
                    const taskToUpdate = tasks.find(t => t.id === optTask.id);
                    if (taskToUpdate) {
                        taskToUpdate.time = `${optTask.startTime} - ${optTask.endTime}`;
                    }
                });
                tasks.sort((a, b) => { 
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    const aTimeMatch = a.time.match(/(\d+):(\d+)\s*(AM|PM)/);
                    const bTimeMatch = b.time.match(/(\d+):(\d+)\s*(AM|PM)/);
                    if (aTimeMatch && bTimeMatch) {
                        let aHour = parseInt(aTimeMatch[1]);
                        if (aTimeMatch[3] === 'PM' && aHour !== 12) aHour += 12;
                        if (aTimeMatch[3] === 'AM' && aHour === 12) aHour = 0;
                        let bHour = parseInt(bTimeMatch[1]);
                        if (bTimeMatch[3] === 'PM' && bHour !== 12) bHour += 12;
                        if (bTimeMatch[3] === 'AM' && bHour === 12) bHour = 0;
                        return aHour - bHour;
                    }
                    return 0;
                });
                renderTasks();
                closeModal('aiOptimizationModal');
                showToast("AI schedule applied!", "success");
            };

        }, 1500);
    }
    function getAIDayBrief() {
        let brief = ""; 
        const incompleteTasks = tasks.filter(t => !t.completed);
        if (incompleteTasks.length > 0) {
            brief += `You have ${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's' : ''} remaining, ${userName}. `;
            const keyTasks = incompleteTasks.filter(t => t.category === 'work' || t.dueDate === new Date().toISOString().split('T')[0]).slice(0,2);
            if (keyTasks.length > 0) {
                 brief += `Key tasks include: ${keyTasks.map(t => `${t.title.substring(0,25)}...`).join(', ')}.`;
            } else {
                 brief += `Top tasks: ${incompleteTasks.slice(0,2).map(t => `${t.title.substring(0,25)}...`).join(', ')}.`;
            }
            if (incompleteTasks.length > 3 && aiLearningPreferences.learnTaskPatterns) {
                 brief += ` It looks like a busy day! Try to focus on one task at a time or use Focus Mode.`;
            }
        } else {
            brief += `All tasks completed! Great job, ${userName}! 🎉 How about planning something fun for tomorrow or exploring local deals?`;
        }
        const weatherTextEl = document.getElementById('currentWeather');
        const weatherText = weatherTextEl ? weatherTextEl.textContent : "not available";
        brief += ` Current weather is ${weatherText}.`;
         const currentSafetyMsg = document.getElementById('safetyTickerText')?.textContent;
         if (currentSafetyMsg && (currentSafetyMsg.toLowerCase().includes("outage") || currentSafetyMsg.toLowerCase().includes("closure") || currentSafetyMsg.toLowerCase().includes("alert"))) {
            brief += ` Important Alert: ${currentSafetyMsg}`;
        }
        speakText(brief);
        showToast("Playing AI Day Brief...", "ai_info");
    }
    function aiScheduleMyDay() {
        const today = new Date().toISOString().split('T')[0];
        const incompleteTasksToday = tasks.filter(t => !t.completed && (t.dueDate === today || t.dueDate === "Today" || !t.dueDate));
        if (incompleteTasksToday.length === 0) {
            showToast("No tasks for today to schedule!", "info");
            return;
        }
        let scheduleHtml = `<p>Here's a potential schedule for today, ${userName}:</p><ul>`;
        let currentTime = 9;
        incompleteTasksToday.forEach(task => {
            let taskDuration = 1;
            if (task.category === 'work') taskDuration = 1.5;
            if (task.title.toLowerCase().includes('report')) taskDuration = 2;
            if (task.title.toLowerCase().includes('meeting')) taskDuration = 1;
            const timeMatch = task.time.match(/(\d{1,2})(:(\d{2}))?\s*(am|pm)?/i);
            let startHour = currentTime;
            if (timeMatch && timeMatch[1]) {
                let parsedHour = parseInt(timeMatch[1]);
                if (timeMatch[4] && timeMatch[4].toLowerCase() === 'pm' && parsedHour < 12) parsedHour += 12;
                if (timeMatch[4] && timeMatch[4].toLowerCase() === 'am' && parsedHour === 12) parsedHour = 0;
                if (parsedHour >= currentTime) startHour = parsedHour;
            }
            const endHour = startHour + taskDuration;
            scheduleHtml += `<li><strong>${startHour % 12 || 12}:00 ${startHour < 12 || startHour === 24 ? 'AM' : 'PM'} - ${endHour % 12 || 12}:00 ${endHour < 12 || endHour === 24 ? 'AM' : 'PM'}:</strong> ${task.title}</li>`;
            currentTime = Math.ceil(endHour);
        });
        scheduleHtml += "</ul><p class='mt-2 card-subtitle'>This is a time-blocking suggestion. I can update your task times if you approve.</p>";
        const modalBody = `${scheduleHtml}<button class='button mt-3' style='width:100%' onclick="applyAISchedule('${JSON.stringify(incompleteTasksToday.map(t => t.id))}')">Looks Good, Apply to Tasks</button>`;
        openGenericModal("AI Proposed Schedule", modalBody);
    }
    window.applyAISchedule = function(taskIdsJson) {
        const taskIdsToUpdate = JSON.parse(taskIdsJson);
        let currentTime = 9;
        taskIdsToUpdate.forEach(id => {
            const task = tasks.find(t => t.id === id);
            if (task) {
                let taskDuration = 1;
                if (task.category === 'work') taskDuration = 1.5;
                const startHour = currentTime;
                const endHour = startHour + taskDuration;
                task.time = `${startHour % 12 || 12}:00 ${startHour < 12 ? 'AM' : 'PM'} - ${endHour % 12 || 12}:00 ${endHour < 12 ? 'AM' : 'PM'}`;
                currentTime = Math.ceil(endHour);
            }
        });
        renderTasks();
        closeModal('genericModal');
        showToast('AI schedule applied to your tasks!', 'success');
        saveTasksToLocalStorage();
    }
    const placesListEl = document.getElementById('placesList');
    function renderPlaces(filter = 'all') { 
        if (!placesListEl) { return; }
        placesListEl.innerHTML = Array(4).fill(getSkeletonPlaceCard()).join(''); 
        placesListEl.setAttribute('aria-busy', 'true');
        setTimeout(() => {
            placesListEl.innerHTML = '';
            let itemsToRender = [];
            let itemType = 'place'; 
            const searchTerm = document.getElementById('exploreSearchInput')?.value.toLowerCase() || '';
            const now = new Date();

            if (filter === 'bulletin') {
                itemType = 'bulletin';
                itemsToRender = [...bulletinPosts];
            } else if (filter === 'deals') {
                itemType = 'deal';
                itemsToRender = mockDeals.filter(d => {
                    if (!d.expiryDate) return true;
                    const expiry = new Date(d.expiryDate);
                    return expiry >= now;
                });
            } else if (filter === 'my_posts') {
                const myDeals = mockDeals.filter(d => d.createdBy === 'user');
                const myPlaces = mockPlaces.all.filter(p => p.createdBy === 'user');
                const myBulletins = bulletinPosts.filter(b => b.authorId === 'user');
                itemsToRender = [...myDeals, ...myPlaces, ...myBulletins];
                itemType = 'mixed';
            } else { 
                itemType = 'place';
                let sourceArray;
                if (filter === 'saved') {
                    sourceArray = mockPlaces.all.filter(p => p.saved);
                }
                else if (filter === 'ai_recommended') { 
                    sourceArray = [...mockPlaces.ai_recommended]; 
                    if (aiLearningPreferences.learnSavedPlaces && mockPlaces.all.some(p=>p.saved)) {
                        const savedPlaceType = mockPlaces.all.find(p=>p.saved)?.type;
                        if(savedPlaceType) sourceArray = sourceArray.filter(p => p.type === savedPlaceType || p.rating > 4.6);
                    }
                    if (loggedMoods.some(m => m.mood === '🤩' || m.mood === '😄') && aiLearningPreferences.learnMoodLogs) {
                        sourceArray.push(...mockPlaces.events.filter(e => !sourceArray.find(s => s.id === e.id && s.type === e.type)));
                        sourceArray.push(...mockPlaces.all.filter(p => p.tags.includes("fun") && !sourceArray.find(s => s.id === p.id && s.type === p.type)));
                    }
                } else if (filter === 'all') {
                    sourceArray = [...mockPlaces.all]; 
                } else if (mockPlaces[filter] && Array.isArray(mockPlaces[filter])) {
                    sourceArray = [...mockPlaces[filter]];
                } else { 
                    sourceArray = [...mockPlaces.all]; 
                }
                itemsToRender = [...sourceArray];
            }

            if (searchTerm) {
                itemsToRender = itemsToRender.filter(item => {
                    const name = item.name || item.title || '';
                    const details = item.details || item.description || item.content || '';
                    const business = item.businessName || '';
                    const tags = item.tags || [];
                    return name.toLowerCase().includes(searchTerm) ||
                           details.toLowerCase().includes(searchTerm) ||
                           business.toLowerCase().includes(searchTerm) ||
                           tags.some(tag => tag.toLowerCase().includes(searchTerm));
                });
            }

            if (itemsToRender.length === 0) {
                placesListEl.classList.remove('grid-view', 'list-view');
                let emptyMessage = `No items found`;
                if(filter === 'my_posts') emptyMessage = 'You haven\'t posted anything yet.';
                else if (filter === 'saved') emptyMessage = 'You haven\'t saved any places yet.';
                placesListEl.innerHTML = `<div class="empty-state"><i class="fas fa-map-signs"></i><p>${emptyMessage}</p><p class="card-subtitle mt-1" style="font-size:0.8rem;">Try a broader search or different filters.</p></div>`;
            } else {
                itemsToRender.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).forEach(item => {
                    const article = document.createElement('article');
                    article.className = 'card long-press-target'; 
                    article.setAttribute('role', 'button');
                    article.setAttribute('tabindex', '0');
                    
                    let currentItemType = itemType;
                    if(itemType === 'mixed') {
                        if(item.hasOwnProperty('businessName')) currentItemType = 'deal';
                        else if(item.hasOwnProperty('content')) currentItemType = 'bulletin';
                        else currentItemType = 'place';
                    }

                    article.dataset.id = item.id;
                    article.dataset.type = currentItemType;

                    if (currentItemType === 'bulletin') {
                        article.classList.add('bulletin-post-card');
                        const author = mockUsers[item.authorId] || mockUsers.defaultBot;
                        let actionsHtml = `<button onclick="event.stopPropagation(); addXP(2, 'community')"><i class="far fa-thumbs-up"></i> Helpful</button>
                                          <button onclick="event.stopPropagation(); openBulletinCommentsModal(${item.id})"><i class="far fa-comment-dots"></i> Comment</button>
                                          <button onclick="event.stopPropagation(); shareContent('bulletin', {id: ${item.id}})"><i class="fas fa-share-alt"></i> Share</button>`;
                        
                        article.innerHTML = `
                            <div class="bulletin-post-header">
                                <img src="${author.avatarUrl}" alt="${author.name}" class="bulletin-post-avatar" loading="lazy">
                                <div class="bulletin-post-meta">
                                    <div class="name">${author.name}</div>
                                    <div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div>
                                </div>
                            </div>
                            <h4 class="card-title" style="margin-bottom: var(--space-xs);">${item.title}</h4>
                            <div class="bulletin-post-body">${item.content}</div>
                            <div class="bulletin-post-actions">${actionsHtml}</div>
                        `;
                        article.onclick = () => openBulletinCommentsModal(item.id);
                    } else if (currentItemType === 'deal') {
                        article.classList.add('deal-card');
                        article.onclick = () => showDealDetailModal(item);
                        article.onkeypress = (event) => { if(event.key === 'Enter' || event.key === ' ') showDealDetailModal(item); };
                        let expiryText = '';
                        if (item.expiryDate) {
                            const expiry = new Date(item.expiryDate);
                            expiryText = `<span class="expiry">Expires: ${expiry.toLocaleDateString()}</span>`;
                        }
                        let priceHtml = `<span class="price-tag">E${item.discountPrice ? item.discountPrice.toFixed(2) : item.price.toFixed(2)}</span>`;
                        if(item.discountPrice) priceHtml += `<span class="original-price">E${item.price.toFixed(2)}</span>`;

                        article.innerHTML = `
                            <img src="${item.img}" alt="${item.title}" loading="lazy">
                            <div class="deal-info">
                                <div class="name">${item.title}</div>
                                <div class="details">${priceHtml}</div>
                                <div class="business">${item.businessName}</div>
                                ${expiryText}
                            </div>
                        `;
                    } else {
                        article.classList.add('place-card');
                        article.onclick = () => showPlaceDetail(item);
                        article.onkeypress = (event) => { if(event.key === 'Enter' || event.key === ' ') showPlaceDetail(item); };
                        let tagsHtml = "";
                        if(item.tags && item.tags.length > 0) {
                            tagsHtml = `<div class="tags">${item.tags.slice(0,3).map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>`;
                        }
                        article.innerHTML = `
                            <img src="${item.img}" alt="${item.name}" loading="lazy">
                            <div class="place-info">
                                <div class="name">${item.name}</div>
                                <div class="details">${item.details}</div>
                                <div class="details">${item.sub || ''}</div>
                                ${tagsHtml}
                            </div>
                            <button class="save-place-button ${item.saved ? 'saved' : ''}" onclick="event.stopPropagation(); toggleSavePlace(${item.id}, this)" aria-label="${item.saved ? 'Unsave' : 'Save'} ${item.name}" aria-pressed="${item.saved ? 'true' : 'false'}">
                                <i class="fas fa-bookmark"></i>
                            </button>
                        `;
                    }
                    placesListEl.appendChild(article);
                });
            }
            placesListEl.setAttribute('aria-busy', 'false');
            updateMapMarkers(itemsToRender.filter(item => item.position));
        }, 600);
    }
    window.filterPlaces = function(filterType, buttonEl) { 
        document.querySelectorAll('#exploreFilterBar .filter-button').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        if (buttonEl) {
            buttonEl.classList.add('active');
            buttonEl.setAttribute('aria-selected', 'true');
        } else { 
            const targetBtn = document.querySelector(`#exploreFilterBar .filter-button[data-filter="${filterType}"]`);
            if (targetBtn) {
                targetBtn.classList.add('active');
                targetBtn.setAttribute('aria-selected', 'true');
            }
        }
        renderPlaces(filterType);
        showAIExploreSuggestion(); 
    }
    function handleExploreSearch(instant = false) {
        clearTimeout(exploreSearchDebounceTimeout);
        exploreSearchDebounceTimeout = setTimeout(() => {
            const activeFilterButton = document.querySelector('#exploreFilterBar .filter-button.active');
            const currentFilter = activeFilterButton ? activeFilterButton.dataset.filter : 'all';
            renderPlaces(currentFilter);
            showAIExploreSuggestion();
            if(!instant) showToast('AI refined search results.', "ai_info", 1500);
        }, instant ? 0 : 400); 
    }
    function showPlaceDetail(place) { 
        if (!place) { showToast("Error: Place details not available.", "error", 2000, true); return; }
        document.getElementById('modalPlaceName').textContent = place.name;
        document.getElementById('modalPlaceImage').src = place.img;
        document.getElementById('modalPlaceImage').alt = place.name;
        document.getElementById('modalPlaceDetails').innerHTML = `<p>${place.details}</p><p>${place.sub}</p>`;
        const tagsContainer = document.getElementById('modalPlaceTags');
        if (tagsContainer) {
            if (place.tags && place.tags.length > 0) {
                tagsContainer.innerHTML = place.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');
                tagsContainer.classList.remove('hidden');
            } else {
                tagsContainer.innerHTML = '';
                tagsContainer.classList.add('hidden');
            }
        }
        const aiSummaryEl = document.getElementById('aiPlaceReviewSummary');
        if(place.aiSummary && aiSummaryEl){
            let enhancedSummary = place.aiSummary;
            if (place.rating > 4.5 && aiLearningPreferences.learnSavedPlaces) enhancedSummary += " Many consider this a top-tier local spot.";
            else if (place.rating < 3.5 && aiLearningPreferences.learnSavedPlaces) enhancedSummary += " Reviews suggest some mixed experiences here.";
            aiSummaryEl.innerHTML = `<i class="fas fa-brain"></i> <strong>AI Summary:</strong> ${enhancedSummary}`;
            aiSummaryEl.classList.remove('hidden');
        } else if (aiSummaryEl) {
            aiSummaryEl.classList.add('hidden');
        }
        const ratingStarsContainer = document.getElementById('placeRatingStars');
        ratingStarsContainer.dataset.placeId = place.id; 
        ratingStarsContainer.querySelectorAll('.fa-star').forEach(star => {
            star.classList.remove('selected');
            if (star.dataset.value <= (place.userRating || 0)) { 
                star.classList.add('selected');
            }
        });
        document.getElementById('placeReviewInput').value = place.userReview || "";
        const actionsContainer = document.getElementById('placeActionsContainer');
        if(place.type === 'events'){
             actionsContainer.innerHTML = `
                <button class="button" style="flex:1;" onclick="showToast('RSVP Confirmed!', 'success')"><i class="fas fa-check-circle" aria-hidden="true"></i> RSVP</button>
                <button class="button button-secondary" style="flex:1;" onclick="showToast('Ticketing page would open', 'info')"><i class="fas fa-ticket-alt" aria-hidden="true"></i> Buy Tickets</button>
            `;
        } else {
            actionsContainer.innerHTML = `
                <button class="button" style="flex:1;" onclick="getDirections(document.getElementById('modalPlaceName').textContent)"><i class="fas fa-directions" aria-hidden="true"></i> Directions</button>
                <button class="button button-secondary" style="flex:1;" onclick="shareContent('place')"><i class="fas fa-share-alt" aria-hidden="true"></i> Share</button>
            `;
        }
        openModal('placeDetailModal');
    }
    window.toggleSavePlace = function(placeId, buttonEl) {
        const mainPlace = mockPlaces.all.find(p => p.id === placeId);
        if (mainPlace) {
            mainPlace.saved = !mainPlace.saved;
            if(mainPlace.saved) {
                mockPlaces.saved.push(mainPlace);
                addXP(5, 'explore');
            } else {
                mockPlaces.saved = mockPlaces.saved.filter(p => p.id !== placeId);
            }
            if (mockPlaces[mainPlace.type]) {
                const catPlace = mockPlaces[mainPlace.type].find(p => p.id === placeId);
                if (catPlace) catPlace.saved = mainPlace.saved;
            }
            if(mockPlaces.open_now){ 
                const openPlace = mockPlaces.open_now.find(p => p.id === placeId);
                if(openPlace) openPlace.saved = mainPlace.saved;
            }
            if(mockPlaces.ai_recommended){ 
                const aiRecPlace = mockPlaces.ai_recommended.find(p => p.id === placeId);
                if(aiRecPlace) aiRecPlace.saved = mainPlace.saved;
            }
            buttonEl.classList.toggle('saved', mainPlace.saved);
            buttonEl.setAttribute('aria-pressed', mainPlace.saved.toString());
            buttonEl.setAttribute('aria-label', `${mainPlace.saved ? 'Unsave' : 'Save'} ${mainPlace.name}`);
            showToast(mainPlace.saved ? `AI: ${mainPlace.name.substring(0,20)}... saved! I'll consider this for future suggestions, ${userName}.` : `${mainPlace.name.substring(0,20)}... unsaved.`, "ai_info", 2000);
            showAIExploreSuggestion(); 
            renderPinnedWidgets();
            savePlacesToLocalStorage();
        } else {
            showToast("Error: Could not save place.", "error", 2000, true);
        }
    }
    document.getElementById('exploreSearchInput')?.addEventListener('input', () => {
        handleExploreSearch();
        document.getElementById('clearExploreSearchInput')?.classList.toggle('hidden', document.getElementById('exploreSearchInput').value === '');
    });
    window.ratePlace = function(starElement) {
        const rating = starElement.dataset.value;
        const stars = starElement.parentElement.querySelectorAll('.fa-star');
        stars.forEach(s => {
            s.classList.toggle('selected', s.dataset.value <= rating);
        });
    }
    window.submitPlaceReview = function() {
        const placeId = document.getElementById('placeRatingStars').dataset.placeId;
        const reviewText = document.getElementById('placeReviewInput').value;
        const selectedRating = document.querySelectorAll('#placeRatingStars .fa-star.selected').length;
        const place = mockPlaces.all.find(p => p.id == placeId);
        if(place){
            place.userRating = selectedRating; 
            place.userReview = reviewText;
            if(reviewText.length > 10) place.aiSummary = `Recent review highlights: "${reviewText.substring(0,30)}..." (Rating: ${selectedRating}/5).`;
        }
        addXP(15, 'community');
        savePlacesToLocalStorage();
        showToast(`Review for ${place ? place.name.substring(0,15) + "..." : "place"} submitted (AI processing). Rating: ${selectedRating} stars.`, "success", 2500);
    }
    function showAIExploreSuggestion() {
        const suggestionCard = document.getElementById('aiExploreSuggestion');
        const suggestionText = document.getElementById('aiExploreSuggestionText');
        const suggestionActionButton = document.getElementById('aiExploreSuggestionAction');
        if (!suggestionCard || !suggestionText || !suggestionActionButton || !notificationPreferences.aiSuggestions) {
            if(suggestionCard) suggestionCard.classList.add('hidden');
            return;
        }
        const activeFilter = document.querySelector('#exploreFilterBar .filter-button.active')?.dataset.filter || 'all';
        let suggestion = null;
        const weatherText = document.getElementById('currentWeather')?.textContent.toLowerCase();
        const isRaining = weatherText && weatherText.includes('rain');
        if (isRaining && new Date().getHours() > 13) {
            const cinema = mockPlaces.all.find(p => p.tags.includes("cinema"));
            const cafe = mockPlaces.all.find(p => p.tags.includes("cafe") && p.id !== cinema?.id);
            if (cinema && cafe) {
                suggestion = {
                    title: "A Perfect Rainy Afternoon",
                    text: `1. Catch a movie at '${cinema.name}'. 2. Then, warm up with a specialty coffee nearby at '${cafe.name}'.`,
                    buttonText: "View Itinerary",
                    action: () => openGenericModal("AI Itinerary: Rainy Afternoon", `<p>Here is your suggested plan:</p><ul><li><strong>Step 1:</strong> Visit <strong>${cinema.name}</strong>.</li><li><strong>Step 2:</strong> Warm up at <strong>${cafe.name}</strong>.</li></ul><p class="mt-2 card-subtitle">I've checked and both are open now. I can add these to your planner if you'd like.</p>`)
                };
            }
        } else if (new Date().getDay() >= 5 && new Date().getHours() > 15) {
             suggestion = {
                title: "AI Weekend Plan",
                text: "It's the weekend! How about dinner at 'Malandela's' followed by live music at 'House on Fire'?",
                buttonText: "Sounds Fun!",
                action: () => {
                    const dinnerTask = "Dinner at Malandela's";
                    const musicTask = "Live music at House on Fire";
                    if(!tasks.some(t => t.title === dinnerTask)) addNewTask(dinnerTask, 'personal', '7:00 PM');
                    if(!tasks.some(t => t.title === musicTask)) addNewTask(musicTask, 'personal', '8:30 PM');
                    showToast("Added weekend plans to your planner!", "success");
                    setActiveScreen('planner');
                }
            };
        }
        if (suggestion) {
            suggestionCard.querySelector('.card-title').innerHTML = `<i class="fas fa-lightbulb"></i> ${suggestion.title}`;
            suggestionText.textContent = suggestion.text;
            suggestionActionButton.textContent = suggestion.buttonText;
            suggestionActionButton.onclick = suggestion.action;
            suggestionCard.classList.remove('hidden');
            suggestionCard.style.opacity = 1; suggestionCard.style.transform = 'translateY(0)';
        } else {
            suggestionCard.style.opacity = 0; suggestionCard.style.transform = 'translateY(10px)';
            setTimeout(() => suggestionCard.classList.add('hidden'), 300);
        }
    }
    function openSubmitTipModal() {
        const form = document.getElementById('submitTipForm');
        form.reset();
        document.getElementById('editingTipId').value = '';
        document.getElementById('submitTipButton').textContent = 'Submit Tip (AI Moderated)';
        document.getElementById('tipImagePreview').classList.add('hidden');
        document.getElementById('tipImageUploadText').textContent = 'Click to Upload or Open Camera';
        openModal('submitTipModal');
    }
    function previewImage(event, previewElId, textElId) {
        const reader = new FileReader();
        const preview = document.getElementById(previewElId);
        const uploadText = document.getElementById(textElId);
        if (!event.target.files[0]) return;
        reader.onload = function(){
            preview.src = reader.result;
            preview.classList.remove('hidden');
            if (uploadText) uploadText.textContent = 'Change image';
        };
        reader.readAsDataURL(event.target.files[0]);
    }
    function submitCommunityTip() {
        const title = document.getElementById('tipTitleInput').value.trim();
        const description = document.getElementById('tipDescriptionInput').value.trim();
        const subDetails = document.getElementById('tipSubDetailsInput').value.trim();
        const category = document.getElementById('tipCategorySelect').value;
        const tags = document.getElementById('tipTagsInput').value.split(',').map(t => t.trim()).filter(Boolean);
        const imgFile = document.getElementById('tipImageFileInput').files[0];
        const editingId = parseInt(document.getElementById('editingTipId').value);

        if (!title || !description) {
            showToast("Please fill in both title and description.", "error", 2000, true);
            return;
        }

        if (editingId) {
            const place = mockPlaces.all.find(p => p.id === editingId);
            if (place && place.createdBy === 'user') {
                place.name = title;
                place.details = description;
                place.sub = subDetails;
                place.type = category;
                place.tags = tags;
                if (imgFile) place.img = URL.createObjectURL(imgFile);
                showToast("Your post has been updated!", "success");
            }
        } else {
            const newPlace = {
                id: Date.now(),
                name: title,
                details: description,
                sub: subDetails,
                type: category,
                img: imgFile ? URL.createObjectURL(imgFile) : `https://source.unsplash.com/random/60x60/?${encodeURIComponent(tags[0] || category || 'eswatini')}`,
                saved: false,
                openNow: subDetails.toLowerCase().includes("open"),
                rating: 0,
                aiSummary: "A new community submission. Awaiting more reviews.",
                tags: tags,
                createdBy: 'user'
            };
            mockPlaces.all.push(newPlace);
            if(!mockPlaces[category]) mockPlaces[category] = [];
            mockPlaces[category].push(newPlace);
            addXP(20, 'community');
            unlockBadge('contributor');
            showToast("Community tip submitted! It will appear under 'My Posts' and relevant filters.", "success", 2500);
        }
        
        closeModal('submitTipModal');
        savePlacesToLocalStorage();
        filterPlaces('my_posts', document.querySelector('[data-filter="my_posts"]'));
    }
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
    const habitListContainerEl = document.getElementById('habitListContainer');
    const moodHabitTimelineEl = document.getElementById('moodHabitTimeline');
    const aiWellnessInsightEl = document.getElementById('aiWellnessInsight');
    function renderHabits() {
        if (!habitListContainerEl) { return; }
        habitListContainerEl.innerHTML = Array(3).fill(getSkeletonHabitItem()).join('');
        habitListContainerEl.setAttribute('aria-busy', 'true');
        let allHabitsDone = habits.length > 0 && habits.every(h => h.current >= h.goal);
        if(aiWellnessInsightEl && aiLearningPreferences.learnHabitTracking){
            if(allHabitsDone){
                aiWellnessInsightEl.innerHTML = `<i class="fas fa-brain"></i> AI: Amazing, ${userName}! You've completed all your habits for today! 🎉 Consider setting a new challenge or enjoying your progress.`;
                aiWellnessInsightEl.classList.remove('hidden');
            } else if (habits.some(h => h.streak > 5)) {
                const highStreakHabit = habits.find(h => h.streak > 5);
                aiWellnessInsightEl.innerHTML = `<i class="fas fa-brain"></i> AI: You're on a great ${highStreakHabit.streak}-day streak with "${highStreakHabit.name.substring(0,20)}..."! Keep up the momentum!`;
                aiWellnessInsightEl.classList.remove('hidden');
            } else if(sleepData.length > 0) {
                const lastSleep = sleepData[sleepData.length -1];
                if(lastSleep.sleep && lastSleep.sleep < 6) {
                     aiWellnessInsightEl.innerHTML = `<i class="fas fa-brain"></i> AI: I noticed you logged less than 6 hours of sleep. Prioritizing rest can boost your ability to stick to habits.`;
                     aiWellnessInsightEl.classList.remove('hidden');
                }
            } else if (lastSleepLogDate !== new Date().toDateString()) {
                 aiWellnessInsightEl.innerHTML = `<i class="fas fa-brain"></i> AI: Remember to log your sleep and screen time for today to get personalized insights.`;
                 aiWellnessInsightEl.classList.remove('hidden');
            }
            else {
                aiWellnessInsightEl.classList.add('hidden');
            }
        }
        setTimeout(() => {
            habitListContainerEl.innerHTML = ''; 
            if (habits.length === 0) {
                habitListContainerEl.innerHTML = `<div class="empty-state"><i class="fas fa-seedling"></i><p>No habits being tracked yet.</p><p class="card-subtitle mt-1">Add a new habit to start your wellness journey!</p></div>`;
            } else {
                habits.forEach(habit => {
                    const habitEl = document.createElement('div');
                    habitEl.className = 'habit-card';
                    habitEl.dataset.habitId = habit.id;
                    const progress = habit.goal > 0 ? habit.current / habit.goal : 0;
                    const circumference = 150.7; 
                    let extraControls = '';
                    if (habit.isWaterTracker) {
                        extraControls = `
                        <div class="water-tracker-buttons">
                            <button class="button button-secondary water-add-button" onclick="incrementWater(${habit.id}, 1)">+1 ${habit.unit || 'glass'}</button>
                            <button class="button button-secondary water-add-button" onclick="incrementWater(${habit.id}, 2)">+2 ${habit.unit || 'glass'}</button>
                        </div>`;
                    }
                    habitEl.innerHTML = `
                        <button class="progress-ring-button ${habit.current >= habit.goal ? 'completed' : ''}" onclick="toggleHabitProgress(${habit.id})" aria-label="Update progress for ${habit.name}">
                            <svg width="56" height="56" viewBox="0 0 52 52" aria-hidden="true">
                                <circle cx="26" cy="26" r="24" fill="transparent" stroke="${document.body.classList.contains('dark-mode') ? 'var(--warm-gray)' : 'var(--placeholder-bg)'}" stroke-width="4"/>
                                <circle class="progress-ring-circle" cx="26" cy="26" r="24" fill="transparent" stroke="${habit.color}" stroke-width="4" transform="rotate(-90 26 26)" style="stroke-dashoffset: ${circumference * (1 - Math.min(progress,1))};"/>
                            </svg>
                            <i class="fas fa-check completion-check" aria-hidden="true"></i>
                        </button>
                        <div class="habit-info">
                            <div class="habit-name"><i class="${habit.icon}" style="color:${habit.color}; margin-right:8px;"></i>${habit.name}</div>
                            <div class="habit-meta">
                                <span class="habit-streak"><i class="fas fa-fire"></i> ${habit.streak} day${habit.streak !== 1 ? 's' : ''}</span>
                                <span class="habit-progress-info">${habit.current}/${habit.goal} ${habit.unit || ''}</span>
                            </div>
                            ${extraControls}
                        </div>
                        <div class="habit-actions">
                            <button class="habit-action-button edit" onclick="openEditHabitModal(${habit.id})" aria-label="Edit habit: ${habit.name}"><i class="fas fa-pencil-alt"></i></button>
                            <button class="habit-action-button delete" onclick="deleteHabit(${habit.id})" aria-label="Delete habit: ${habit.name}"><i class="fas fa-times"></i></button>
                        </div>
                    `;
                    habitListContainerEl.appendChild(habitEl);
                });
            }
            habitListContainerEl.setAttribute('aria-busy', 'false');
            updateWellnessTimeline();
            renderPinnedWidgets();
            saveHabitsToLocalStorage();
        }, 500);
    }
    function openCreateHabitModal(nameFromAI = "", goalFromAI = 1, unitFromAI = "") {
        document.getElementById('editingHabitId').value = '';
        document.getElementById('newHabitName').value = nameFromAI;
        document.getElementById('newHabitGoal').value = goalFromAI;
        document.getElementById('newHabitUnit').value = unitFromAI;
        document.getElementById('submitHabitButton').textContent = 'Create Habit';
        document.getElementById('createHabitModalTitle').textContent = 'Create New Habit';
        populateIconSelector('newHabitIconSelector');
        populateColorSelector('newHabitColorSelector');
        openModal('createHabitModal');
    }
    function openEditHabitModal(habitId) {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) { showToast("Error: Habit not found.", "error", 2000, true); return; }
        document.getElementById('editingHabitId').value = habit.id;
        document.getElementById('newHabitName').value = habit.name;
        document.getElementById('newHabitGoal').value = habit.goal;
        document.getElementById('newHabitUnit').value = habit.unit || '';
        document.getElementById('submitHabitButton').textContent = 'Save Changes';
        document.getElementById('createHabitModalTitle').textContent = 'Edit Habit';
        populateIconSelector('newHabitIconSelector', habit.icon);
        populateColorSelector('newHabitColorSelector', habit.color);
        openModal('createHabitModal');
    }
    function submitNewHabit(isAIInitiated = false) {
        const nameInput = document.getElementById('newHabitName');
        const goalInput = document.getElementById('newHabitGoal');
        const unitInput = document.getElementById('newHabitUnit');
        const name = nameInput.value.trim();
        const goal = parseInt(goalInput.value) || 1;
        const unit = unitInput.value.trim();
        const selectedIconEl = document.querySelector('#newHabitIconSelector .icon-option.selected');
        const selectedColorEl = document.querySelector('#newHabitColorSelector .icon-option.selected');
        const editingHabitId = parseInt(document.getElementById('editingHabitId').value);
        if (!name) { 
            if(!isAIInitiated) showToast("Habit name is required.", "error", 2000, true); nameInput.focus(); 
            return false; 
        }
        if (goal <= 0) { 
            if(!isAIInitiated) showToast("Goal must be a positive number.", "error", 2000, true); goalInput.focus(); 
            return false;
        }
        if (!selectedIconEl) { 
            if(!isAIInitiated) showToast("Please select an icon.", "error", 2000, true); 
            return false; 
        }
        if (!selectedColorEl) { 
            if(!isAIInitiated) showToast("Please select a color.", "error", 2000, true); 
            return false; 
        }
        const isWater = name.toLowerCase().includes("water") && (unit.toLowerCase().includes("glass") || unit.toLowerCase().includes("ml"));
        if (editingHabitId) { 
            const habit = habits.find(h => h.id === editingHabitId);
            if (habit) {
                habit.name = name; habit.goal = goal; habit.unit = unit;
                habit.icon = selectedIconEl.dataset.icon; habit.color = selectedColorEl.dataset.color;
                if(isWater) habit.isWaterTracker = true; else delete habit.isWaterTracker;
                showToast(`Habit "${name}" updated!`, "success", 2000);
            } else { showToast("Error updating habit.", "error", 2000, true); return false; }
        } else { 
            const newHabit = {
                id: nextHabitId++, name: name, goal: goal, current: 0, unit: unit, streak: 0,
                icon: selectedIconEl.dataset.icon, color: selectedColorEl.dataset.color
            };
            if(isWater) newHabit.isWaterTracker = true;
            habits.unshift(newHabit); 
            showToast(`Habit "${name}" created! AI will help track it.`, "ai_info", 2000);
            addXP(10, 'wellness');
        }
        renderHabits();
        if(!isAIInitiated) closeModal('createHabitModal');
        return true;
    }
    window.incrementWater = function(habitId, amount) {
        const habit = habits.find(h => h.id === habitId && h.isWaterTracker);
        if (habit) {
            habit.current += amount;
            if (habit.current >= habit.goal && (habit.current - amount < habit.goal)) { 
                 habit.streak++;
                 showToast(`Nice! "${habit.name.substring(0,20)}..." completed! Streak: ${habit.streak} days.`, "success", 2500);
                 addXP(10, 'wellness');
                 if(habit.streak % 7 === 0) unlockBadge('hydration_pro');
                 checkForWellnessPatterns();
            } else if (habit.current < habit.goal) {
                 showToast(`Progress for "${habit.name.substring(0,20)}..." updated!`, "info", 1500);
                 addXP(1, 'wellness');
            } else { 
                 showToast(`Extra water logged for "${habit.name.substring(0,20)}..."!`, "info", 1500);
            }
            if (navigator.vibrate) navigator.vibrate(10);
            renderHabits();
        }
    }
    window.toggleHabitProgress = function(habitId) {
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
            if (habit.isWaterTracker) { 
                showToast("Use +1 / +2 buttons for water tracking.", "info");
                return;
            }
            if (habit.current < habit.goal) {
                habit.current++;
                if (habit.current === habit.goal) {
                     habit.streak++;
                     showToast(`Nice! "${habit.name.substring(0,20)}..." completed! Streak: ${habit.streak} days.`, "success", 2500);
                     showDynamicIslandAlert('fas fa-trophy', `Habit Complete! +10 XP`);
                     addXP(10, 'wellness');
                     checkForWellnessPatterns();
                } else {
                    showToast(`Progress for "${habit.name.substring(0,20)}..." updated!`, "info", 1500);
                }
            } else { 
                habit.current = 0; 
                showToast(`"${habit.name.substring(0,20)}..." progress reset.`, "info", 1500);
            }
            if (navigator.vibrate) navigator.vibrate(10);
            renderHabits(); 
        } else { showToast("Error: Habit not found.", "error", 2000, true); }
    }
    window.deleteHabit = function(habitId) {
        openConfirmationModal("Delete Habit?", "Are you sure you want to delete this habit? All progress will be lost.", () => {
            const habitIndex = habits.findIndex(h => h.id === habitId);
            if (habitIndex > -1) {
                const deletedHabitName = habits[habitIndex].name;
                habits.splice(habitIndex, 1);
                renderHabits();
                showToast(`Habit "${deletedHabitName.substring(0,20)}..." deleted.`, "info", 1500);
            } else { showToast("Error: Habit not found for deletion.", "error", 2000, true);}
        });
    }
    let selectedMoodValue = null;
    const moodNoteInputEl = document.getElementById('moodNoteInput');
    const journalInputEl = document.getElementById('journalInput');
    window.selectMood = function(moodElement) {
        document.querySelectorAll('#moodSelector .mood-emoji-button.selected').forEach(el => {
            el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false');
        });
        moodElement.classList.add('selected'); moodElement.setAttribute('aria-pressed', 'true');
        selectedMoodValue = moodElement.dataset.mood;
        if (navigator.vibrate) navigator.vibrate(10);
    }
    window.logMood = function(moodFromAI = null, noteFromAI = "") {
        const moodToLog = moodFromAI || selectedMoodValue;
        const noteToLog = noteFromAI || (moodNoteInputEl ? moodNoteInputEl.value.trim() : "");
        if (!moodToLog) { 
            if(!moodFromAI) showToast("Please select a mood first.", "error", 2000, true); 
            return false;
        }
        loggedMoods.push({ id: Date.now(), mood: moodToLog, note: noteToLog, timestamp: new Date(), type: 'mood' });
        showToast(`Mood logged: ${moodToLog} ${noteToLog ? 'with note.' : ''} AI will analyze this.`, "success", 2000);
        addXP(5, 'wellness');
        if (['😞', '🙁'].includes(moodToLog) && !moodFromAI && aiLearningPreferences.learnMoodLogs) { 
             setTimeout(() => {
                openConfirmationModal(
                    "AI Wellness Copilot",
                    `<p>I see you're feeling down, ${userName}. It can be helpful to write down what's on your mind.</p><p>Would you like to open a journal entry?</p>`,
                    () => {
                        openJournalModal(null, true);
                    }
                )
             }, 1500);
        }
        if(!moodFromAI) { 
            document.querySelectorAll('#moodSelector .mood-emoji-button.selected').forEach(el => {
                el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false');
            });
            if(moodNoteInputEl) moodNoteInputEl.value = '';
            selectedMoodValue = null;
        }
        updateWellnessTimeline();
        renderPinnedWidgets();
        saveLoggedMoodsToLocalStorage();
        checkForWellnessPatterns();
        return true;
    }
    function checkForWellnessPatterns() {
        const patternCard = document.getElementById('aiPatternCard');
        const patternText = document.getElementById('aiPatternText');
        if (!patternCard || !patternText || !aiLearningPreferences.learnHabitTracking || !aiLearningPreferences.learnMoodLogs) return;
        const jogHabit = habits.find(h => h.name.toLowerCase().includes("walk"));
        if (jogHabit && loggedMoods.length > 3) {
            const daysWithJog = new Set(tasks.filter(t => t.title.toLowerCase().includes("walk") && t.completed).map(t => new Date(t.timestamp || Date.now()).toDateString()));
            const positiveMoodDays = new Set(loggedMoods.filter(m => ['😄', '🙂', '🤩'].includes(m.mood)).map(m => new Date(m.timestamp).toDateString()));
            let correlationCount = 0;
            daysWithJog.forEach(day => {
                if (positiveMoodDays.has(day)) {
                    correlationCount++;
                }
            });
            if (daysWithJog.size > 1 && (correlationCount / daysWithJog.size) >= 0.75) {
                patternText.innerHTML = `On days you complete your '<strong>${jogHabit.name}</strong>' habit, you are <strong>75% more likely</strong> to log a positive mood. Keep up the great work!`;
                patternCard.style.display = 'block';
                return;
            }
        }
        if (sleepData.length > 2) {
            const lastSleep = sleepData[sleepData.length-1];
            if (lastSleep && lastSleep.sleep < 6) {
                const recentSadMood = loggedMoods.find(m => ['😞', '🙁'].includes(m.mood) && new Date(m.timestamp).toDateString() === new Date(lastSleep.timestamp).toDateString());
                if (recentSadMood) {
                    patternText.innerHTML = `I noticed you logged <strong>less than 6 hours of sleep</strong> and also felt <strong>${recentSadMood.mood}</strong>. Quality sleep is key to well-being. Consider a relaxing activity before bed.`;
                    patternCard.style.display = 'block';
                    return;
                }
            }
        }
        patternCard.style.display = 'none';
    }
    function openCreateHabitModal(nameFromAI = "", goalFromAI = 1, unitFromAI = "") {
        document.getElementById('editingHabitId').value = '';
        document.getElementById('newHabitName').value = nameFromAI;
        document.getElementById('newHabitGoal').value = goalFromAI;
        document.getElementById('newHabitUnit').value = unitFromAI;
        document.getElementById('submitHabitButton').textContent = 'Create Habit';
        document.getElementById('createHabitModalTitle').textContent = 'Create New Habit';
        populateIconSelector('newHabitIconSelector');
        populateColorSelector('newHabitColorSelector');
        openModal('createHabitModal');
    }
    function openEditHabitModal(habitId) {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) { showToast("Error: Habit not found.", "error", 2000, true); return; }
        document.getElementById('editingHabitId').value = habit.id;
        document.getElementById('newHabitName').value = habit.name;
        document.getElementById('newHabitGoal').value = habit.goal;
        document.getElementById('newHabitUnit').value = habit.unit || '';
        document.getElementById('submitHabitButton').textContent = 'Save Changes';
        document.getElementById('createHabitModalTitle').textContent = 'Edit Habit';
        populateIconSelector('newHabitIconSelector', habit.icon);
        populateColorSelector('newHabitColorSelector', habit.color);
        openModal('createHabitModal');
    }
    function submitNewHabit(isAIInitiated = false) {
        const nameInput = document.getElementById('newHabitName');
        const goalInput = document.getElementById('newHabitGoal');
        const unitInput = document.getElementById('newHabitUnit');
        const name = nameInput.value.trim();
        const goal = parseInt(goalInput.value) || 1;
        const unit = unitInput.value.trim();
        const selectedIconEl = document.querySelector('#newHabitIconSelector .icon-option.selected');
        const selectedColorEl = document.querySelector('#newHabitColorSelector .icon-option.selected');
        const editingHabitId = parseInt(document.getElementById('editingHabitId').value);
        if (!name) { 
            if(!isAIInitiated) showToast("Habit name is required.", "error", 2000, true); nameInput.focus(); 
            return false; 
        }
        if (goal <= 0) { 
            if(!isAIInitiated) showToast("Goal must be a positive number.", "error", 2000, true); goalInput.focus(); 
            return false;
        }
        if (!selectedIconEl) { 
            if(!isAIInitiated) showToast("Please select an icon.", "error", 2000, true); 
            return false; 
        }
        if (!selectedColorEl) { 
            if(!isAIInitiated) showToast("Please select a color.", "error", 2000, true); 
            return false; 
        }
        const isWater = name.toLowerCase().includes("water") && (unit.toLowerCase().includes("glass") || unit.toLowerCase().includes("ml"));
        if (editingHabitId) { 
            const habit = habits.find(h => h.id === editingHabitId);
            if (habit) {
                habit.name = name; habit.goal = goal; habit.unit = unit;
                habit.icon = selectedIconEl.dataset.icon; habit.color = selectedColorEl.dataset.color;
                if(isWater) habit.isWaterTracker = true; else delete habit.isWaterTracker;
                showToast(`Habit "${name}" updated!`, "success", 2000);
            } else { showToast("Error updating habit.", "error", 2000, true); return false; }
        } else { 
            const newHabit = {
                id: nextHabitId++, name: name, goal: goal, current: 0, unit: unit, streak: 0,
                icon: selectedIconEl.dataset.icon, color: selectedColorEl.dataset.color
            };
            if(isWater) newHabit.isWaterTracker = true;
            habits.unshift(newHabit); 
            showToast(`Habit "${name}" created! AI will help track it.`, "ai_info", 2000);
            addXP(10, 'wellness');
        }
        renderHabits();
        if(!isAIInitiated) closeModal('createHabitModal');
        return true;
    }
    window.incrementWater = function(habitId, amount) {
        const habit = habits.find(h => h.id === habitId && h.isWaterTracker);
        if (habit) {
            habit.current += amount;
            if (habit.current >= habit.goal && (habit.current - amount < habit.goal)) { 
                 habit.streak++;
                 showToast(`Nice! "${habit.name.substring(0,20)}..." completed! Streak: ${habit.streak} days.`, "success", 2500);
                 addXP(10, 'wellness');
                 if(habit.streak % 7 === 0) unlockBadge('hydration_pro');
                 checkForWellnessPatterns();
            } else if (habit.current < habit.goal) {
                 showToast(`Progress for "${habit.name.substring(0,20)}..." updated!`, "info", 1500);
                 addXP(1, 'wellness');
            } else { 
                 showToast(`Extra water logged for "${habit.name.substring(0,20)}..."!`, "info", 1500);
            }
            if (navigator.vibrate) navigator.vibrate(10);
            renderHabits();
        }
    }
    window.toggleHabitProgress = function(habitId) {
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
            if (habit.isWaterTracker) { 
                showToast("Use +1 / +2 buttons for water tracking.", "info");
                return;
            }
            if (habit.current < habit.goal) {
                habit.current++;
                if (habit.current === habit.goal) {
                     habit.streak++;
                     showToast(`Nice! "${habit.name.substring(0,20)}..." completed! Streak: ${habit.streak} days.`, "success", 2500);
                     showDynamicIslandAlert('fas fa-trophy', `Habit Complete! +10 XP`);
                     addXP(10, 'wellness');
                     checkForWellnessPatterns();
                } else {
                    showToast(`Progress for "${habit.name.substring(0,20)}..." updated!`, "info", 1500);
                }
            } else { 
                habit.current = 0; 
                showToast(`"${habit.name.substring(0,20)}..." progress reset.`, "info", 1500);
            }
            if (navigator.vibrate) navigator.vibrate(10);
            renderHabits(); 
        } else { showToast("Error: Habit not found.", "error", 2000, true); }
    }
    window.deleteHabit = function(habitId) {
        openConfirmationModal("Delete Habit?", "Are you sure you want to delete this habit? All progress will be lost.", () => {
            const habitIndex = habits.findIndex(h => h.id === habitId);
            if (habitIndex > -1) {
                const deletedHabitName = habits[habitIndex].name;
                habits.splice(habitIndex, 1);
                renderHabits();
                showToast(`Habit "${deletedHabitName.substring(0,20)}..." deleted.`, "info", 1500);
            } else { showToast("Error: Habit not found for deletion.", "error", 2000, true);}
        });
    }
    window.openJournalModal = function(entry = null, fromMoodLog = false) {
        const promptTextEl = document.getElementById('journalPromptText');
        const modalTitleEl = document.getElementById('journalModalTitle');
        if (entry) {
            modalTitleEl.textContent = `Journal Entry - ${new Date(entry.timestamp).toLocaleDateString()}`;
            promptTextEl.textContent = `You logged this on ${new Date(entry.timestamp).toLocaleString()}`;
            journalInputEl.value = entry.note;
            journalInputEl.readOnly = true;
            document.querySelector('#journalModal .button[onclick="saveJournalEntry()"]').classList.add('hidden');
        } else {
            modalTitleEl.textContent = 'AI Reflection Prompt';
            const lastMood = fromMoodLog ? loggedMoods[loggedMoods.length-1] : null;
            let personalizedPrompt = journalPrompts[Math.floor(Math.random() * journalPrompts.length)];
            if(lastMood && lastMood.mood === '😞' && aiLearningPreferences.learnMoodLogs){
                personalizedPrompt = "Reflect on what's challenging right now. What's one small step you can take to feel a bit better?";
            } else if (tasks.some(t => t.completed && t.category === 'learning') && aiLearningPreferences.learnTaskPatterns) {
                personalizedPrompt = "You've been learning recently! What's the most interesting new idea you've encountered?";
            }
            promptTextEl.textContent = personalizedPrompt;
            journalInputEl.value = "";
            journalInputEl.readOnly = false;
            document.querySelector('#journalModal .button[onclick="saveJournalEntry()"]').classList.remove('hidden');
        }
        openModal('journalModal');
    }
    window.saveJournalEntry = function() {
        if (journalInputEl && journalInputEl.value.trim()=== "") {
            showToast("Please write something in your journal.", "error", 2000, true);
            if (journalInputEl) journalInputEl.focus(); return;
        }
        const entryText = journalInputEl ? journalInputEl.value : "";
        loggedMoods.push({ id: Date.now(), mood: '📝', note: entryText, timestamp: new Date(), type: 'journal' });
        showToast("Journal entry saved. AI will analyze this for insights.", "success", 2000);
        addXP(15, 'wellness');
        if (aiLearningPreferences.learnMoodLogs && entryText.toLowerCase().includes("excited for")) {
            const excitementMatch = entryText.toLowerCase().match(/excited for\s+([^.!]+)/);
            if (excitementMatch && excitementMatch[1]) {
                 setTimeout(() => {
                    addMessageToAIChat('other', `${getAIPersonalityPrefix()}That's great you're excited for ${excitementMatch[1]}! I can help you plan or find related local events if you'd like.`);
                    if(!aiBottomSheet.classList.contains('active')) triggerFabSuggestion();
                }, 1000);
            }
        }
        closeModal('journalModal');
        updateWellnessTimeline(); 
        saveLoggedMoodsToLocalStorage();
    }
    function openGuidedExerciseModal() {
        const modal = document.getElementById('guidedExerciseModal');
        if (modal) {
            setBreathingPace('relax');
            openModal('guidedExerciseModal');
        }
    }
    function setBreathingPace(paceName) {
        stopBreathingExercise();
        const paces = {
            relax: { name: 'relax', inhale: 4000, hold1: 4000, exhale: 6000, hold2: 1000 },
            focus: { name: 'focus', inhale: 4000, hold1: 1000, exhale: 4000, hold2: 1000 },
            calm: { name: 'calm', inhale: 5000, hold1: 0, exhale: 5000, hold2: 0 }
        };
        breathingPace = paces[paceName] || paces.relax;
        showToast(`Pace set to: ${paceName.charAt(0).toUpperCase() + paceName.slice(1)}`, 'info');
    }
    function startBreathingExercise(durationMinutes) {
        if (breathingIsActive) return;
        breathingIsActive = true;
        const circle = document.getElementById('breathing-circle');
        const glow = document.getElementById('breathing-glow');
        const instruction = document.getElementById('breathing-instruction');
        const timerEl = document.getElementById('breathing-timer');
        const progressBarFill = document.getElementById('breathing-progress-bar-fill');
        const durationMillis = durationMinutes * 60 * 1000;
        let elapsed = 0;

        document.querySelectorAll('.breathing-duration-selector button, .breathing-exercise-presets button').forEach(btn => btn.disabled = true);
        
        let currentStep = 0;
        
        const updateTimer = () => {
            const totalSeconds = Math.floor((durationMillis - elapsed) / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            progressBarFill.style.width = `${(elapsed / durationMillis) * 100}%`;
        };
        updateTimer();

        breathingTimerInterval = setInterval(() => {
            elapsed += 1000;
            updateTimer();
        }, 1000);

        breathingSessionEndTimeout = setTimeout(() => {
            stopBreathingExercise();
            addXP(15, 'wellness');
            showDynamicIslandAlert('fas fa-spa', `Breathing exercise complete!`);
        }, durationMillis);

        function runSequence() {
            if (!breathingIsActive) return;
            const sequence = [
                { text: `Inhale...`, duration: breathingPace.inhale, state: 'inhale' },
                ...(breathingPace.hold1 > 0 ? [{ text: `Hold`, duration: breathingPace.hold1, state: 'inhale' }] : []),
                { text: `Exhale...`, duration: breathingPace.exhale, state: 'exhale' },
                ...(breathingPace.hold2 > 0 ? [{ text: `Hold`, duration: breathingPace.hold2, state: 'exhale' }] : [])
            ];
            const step = sequence[currentStep];
            instruction.textContent = step.text;
            circle.className = 'breathing-circle ' + step.state;
            glow.className = 'breathing-glow ' + step.state;
            [circle, glow].forEach(el => el.style.transitionDuration = `${step.duration / 1000}s`);
            breathingInterval = setTimeout(() => {
                currentStep = (currentStep + 1) % sequence.length;
                runSequence();
            }, step.duration);
        }
        runSequence();
    }
    function stopBreathingExercise() {
        clearTimeout(breathingInterval);
        clearTimeout(breathingSessionEndTimeout);
        clearInterval(breathingTimerInterval);
        breathingIsActive = false;
        const circle = document.getElementById('breathing-circle');
        const glow = document.getElementById('breathing-glow');
        const instruction = document.getElementById('breathing-instruction');
        const timerEl = document.getElementById('breathing-timer');
        const progressBarFill = document.getElementById('breathing-progress-bar-fill');

        if (circle) {
            circle.className = 'breathing-circle';
            glow.className = 'breathing-glow';
            [circle, glow].forEach(el => el.style.transitionDuration = '1s');
        }
        if (instruction) instruction.textContent = 'Ready?';
        if (timerEl) timerEl.textContent = '';
        if(progressBarFill) progressBarFill.style.width = '0%';
        document.querySelectorAll('.breathing-duration-selector button, .breathing-exercise-presets button').forEach(btn => btn.disabled = false);
    }
    function logSleepAndScreenTime() {
        if (lastSleepLogDate === new Date().toDateString()) {
            showToast("You've already logged sleep for today.", "info");
            return;
        }
        const sleepInput = document.getElementById('sleepHoursInput');
        const screenInput = document.getElementById('screenTimeInput');
        const sleep = parseFloat(sleepInput.value);
        const screenTime = parseFloat(screenInput.value);
        if (isNaN(sleep) && isNaN(screenTime)) {
            showToast("Please enter either sleep or screen time.", "error");
            return;
        }
        sleepData.push({
            timestamp: new Date().toISOString(),
            sleep: !isNaN(sleep) ? sleep : null,
            screenTime: !isNaN(screenTime) ? screenTime : null,
        });
        
        lastSleepLogDate = new Date().toDateString();
        localStorage.setItem('lastSleepLogDate', lastSleepLogDate);
        showToast("Sleep and screen data logged. AI will analyze patterns.", "success");
        sleepInput.value = '';
        screenInput.value = '';
        saveSleepDataToLocalStorage();
        checkForWellnessPatterns();
        renderHabits();
    }
    window.showAIWellnessSummaryModal = function() {
        const summaryBody = document.getElementById('aiWellnessSummaryBody');
        if (!summaryBody) return;

        let summaryHtml = `<p class="card-subtitle mb-3">Here's a professional breakdown of your recent wellness data, ${userName}:</p>`;
        
        let statsCards = '';
        const positiveMoods = loggedMoods.filter(m => ['🙂', '😄', '🤩', '😌'].includes(m.mood)).length;
        const totalMoods = loggedMoods.length;
        const positivePercentage = totalMoods > 0 ? Math.round((positiveMoods / totalMoods) * 100) : 0;
        statsCards += `<div class="ai-wellness-summary-card">
            <i class="fas fa-smile"></i>
            <p class="stat-title">Positive Mood</p>
            <p class="stat-value">${positivePercentage}%</p>
        </div>`;

        const totalHabitGoals = habits.reduce((sum, h) => sum + h.goal, 0);
        const totalHabitCurrent = habits.reduce((sum, h) => sum + h.current, 0);
        const habitCompletion = totalHabitGoals > 0 ? Math.round((totalHabitCurrent / totalHabitGoals) * 100) : 0;
        statsCards += `<div class="ai-wellness-summary-card">
            <i class="fas fa-check-double"></i>
            <p class="stat-title">Habit Completion</p>
            <p class="stat-value">${habitCompletion}%</p>
        </div>`;
        
        summaryHtml += `<div class="ai-wellness-summary-grid">${statsCards}</div>`;
        
        summaryHtml += `<h4 class="mt-3 card-title" style="font-size:1rem;">AI Insights & Recommendations</h4><div class="settings-list" style="padding:0;">`;
        if (positivePercentage > 70) {
            summaryHtml += `<div class="setting-item"><span class="setting-label">Your mood trend is very positive. Keep doing what you're doing!</span></div>`;
        } else {
            summaryHtml += `<div class="setting-item"><span class="setting-label">Consider journaling to explore mood fluctuations.</span></div>`;
        }
        if (habitCompletion < 50 && habits.length > 2) {
             summaryHtml += `<div class="setting-item"><span class="setting-label">Habit consistency is an opportunity for growth. Try focusing on just one key habit tomorrow.</span></div>`;
        }
        if (sleepData.length > 0 && sleepData[sleepData.length-1].sleep < 7) {
            summaryHtml += `<div class="setting-item"><span class="setting-label">Prioritizing 7-8 hours of sleep could significantly boost your mood and energy.</span></div>`;
        }
        summaryHtml += `</div>`;

        summaryBody.innerHTML = summaryHtml;
        openModal('aiWellnessSummaryModal');
    }
    function updateWellnessTimeline() {
        if (!moodHabitTimelineEl) return;
        moodHabitTimelineEl.innerHTML = '';
        let items = [];
        const today = new Date().toDateString();
        loggedMoods.filter(m => new Date(m.timestamp).toDateString() === today).forEach(mood => {
            items.push({ type: 'mood', data: mood, timestamp: new Date(mood.timestamp) });
        });
        habits.filter(h => h.current >= h.goal).forEach(habit => {
            items.push({ type: 'habit', data: habit, timestamp: new Date() });
        });
        if (items.length === 0) {
            moodHabitTimelineEl.innerHTML = `<p class="card-subtitle" style="width:100%; text-align:center;">No entries yet for today, ${userName}.</p>`;
            return;
        }
        items.sort((a, b) => a.timestamp - b.timestamp).forEach(item => {
            const card = document.createElement('div');
            card.className = 'timeline-card';
            if (item.type === 'mood') {
                card.innerHTML = `<div class="icon">${item.data.mood}</div><div class="title">${item.data.type === 'journal' ? 'Journal Entry' : 'Mood Log'}</div><div class="time">${item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
                card.onclick = () => openJournalModal(item.data);
            } else if (item.type === 'habit') {
                card.innerHTML = `<div class="icon" style="color:${item.data.color};"><i class="${item.data.icon}"></i></div><div class="title">${item.data.name.substring(0, 15)}...</div><div class="time">Completed Today</div>`;
                card.onclick = () => openEditHabitModal(item.data.id);
            }
            moodHabitTimelineEl.appendChild(card);
        });
    }
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
    function saveTasksToLocalStorage() { localStorage.setItem('localLifeTasks', JSON.stringify(tasks)); }
    function loadTasksFromLocalStorage() {
        const storedTasks = localStorage.getItem('localLifeTasks');
        if (storedTasks) { tasks = JSON.parse(storedTasks); nextTaskId = Math.max(0, ...tasks.map(t=>t.id)) + 1; }
    }
    function saveHabitsToLocalStorage() { localStorage.setItem('localLifeHabits', JSON.stringify(habits)); }
    function loadHabitsFromLocalStorage() {
        const storedHabits = localStorage.getItem('localLifeHabits');
        if (storedHabits) { habits = JSON.parse(storedHabits); nextHabitId = Math.max(0, ...habits.map(h=>h.id)) + 1; }
    }
    function saveLoggedMoodsToLocalStorage() { localStorage.setItem('localLifeMoods', JSON.stringify(loggedMoods)); }
    function loadLoggedMoodsToLocalStorage() {
        const storedMoods = localStorage.getItem('localLifeMoods');
        if (storedMoods) { loggedMoods = JSON.parse(storedMoods); }
    }
    function saveDealsToLocalStorage() { localStorage.setItem('localLifeDeals', JSON.stringify(mockDeals)); }
    function loadDealsFromLocalStorage() {
        const storedDeals = localStorage.getItem('localLifeDeals');
        if (storedDeals) {
            mockDeals = JSON.parse(storedDeals);
            nextDealId = Math.max(0, ...mockDeals.map(d => d.id)) + 1;
        }
    }
    function savePlacesToLocalStorage() {
        localStorage.setItem('localLifePlaces', JSON.stringify(mockPlaces.all));
    }
    function loadPlacesFromLocalStorage() {
        const storedPlaces = localStorage.getItem('localLifePlaces');
        if (storedPlaces) {
            mockPlaces.all = JSON.parse(storedPlaces);
        }
        mockPlaces.saved = mockPlaces.all.filter(p => p.saved);
        mockPlaces.all.forEach(p => {
             if (!mockPlaces[p.type]) mockPlaces[p.type] = [];
             if (!mockPlaces[p.type].find(i => i.id === p.id)) mockPlaces[p.type].push(p);
        });
    }
    function saveChannelsToLocalStorage() { localStorage.setItem('localLifeChannels', JSON.stringify(mockChannels));}
    function loadChannelsFromLocalStorage() {
        const storedChannels = localStorage.getItem('localLifeChannels');
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
    function saveUsersToLocalStorage() { localStorage.setItem('localLifeUsers', JSON.stringify(mockUsers));}
    function loadUsersFromLocalStorage() {
        const storedUsers = localStorage.getItem('localLifeUsers');
        if(storedUsers) {
            mockUsers = JSON.parse(storedUsers);
        }
        const userProfile = JSON.parse(localStorage.getItem('userProfile'));
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
        const storedPrefs = localStorage.getItem('aiLearningPreferences');
        if(storedPrefs) {
            aiLearningPreferences = JSON.parse(storedPrefs);
        }
    }
    function saveNotificationsToLocalStorage() { localStorage.setItem('localLifeNotifications', JSON.stringify(mockNotifications));}
    function loadNotificationsFromLocalStorage() {
        const storedNotifications = localStorage.getItem('localLifeNotifications');
        if (storedNotifications) {
            mockNotifications = JSON.parse(storedNotifications).map(n => ({...n, timestamp: new Date(n.timestamp)}));
            nextNotificationId = Math.max(0, ...mockNotifications.map(n => n.id)) + 1;
        }
    }
    function loadNotificationPreferencesFromLocalStorage() {
        const storedPrefs = localStorage.getItem('notificationPreferences');
        if (storedPrefs) {
            notificationPreferences = JSON.parse(storedPrefs);
        }
    }
    function loadDashboardConfigFromLocalStorage() {
        const storedConfig = localStorage.getItem('dashboardCardConfig');
        if(storedConfig) {
            dashboardCardConfig = JSON.parse(storedConfig);
        }
    }
    function saveTrustedContactsToLocalStorage() { localStorage.setItem('localLifeTrustedContacts', JSON.stringify(trustedContacts)); }
    function loadTrustedContactsFromLocalStorage() {
        const stored = localStorage.getItem('localLifeTrustedContacts');
        if (stored) { trustedContacts = JSON.parse(stored); nextTrustedContactId = Math.max(0, ...trustedContacts.map(c => c.id)) + 1; }
    }
    function saveBulletinPostsToLocalStorage() { localStorage.setItem('localLifeBulletinPosts', JSON.stringify(bulletinPosts)); }
    function loadBulletinPostsFromLocalStorage() {
        const stored = localStorage.getItem('localLifeBulletinPosts');
        if (stored) { bulletinPosts = JSON.parse(stored); nextBulletinPostId = Math.max(0, ...bulletinPosts.map(p => p.id)) + 1; }
    }
    function saveSleepDataToLocalStorage() { localStorage.setItem('localLifeSleepData', JSON.stringify(sleepData)); }
    function loadSleepDataFromLocalStorage() {
        const stored = localStorage.getItem('localLifeSleepData');
        if (stored) { sleepData = JSON.parse(stored); }
        const storedDate = localStorage.getItem('lastSleepLogDate');
        if (storedDate) lastSleepLogDate = storedDate;
    }
    function saveGamificationDataToLocalStorage() {
        const data = { userLevel,userXP, xpToNextLevel, unlockedBadges: Array.from(unlockedBadges) };
        localStorage.setItem('localLifeGamification', JSON.stringify(data));
    }
    function loadGamificationDataFromLocalStorage() {
        const stored = localStorage.getItem('localLifeGamification');
        if (stored) {
            const data = JSON.parse(stored);
            userLevel = data.userLevel || 1;
            userXP = data.userXP || 0;
            xpToNextLevel = data.xpToNextLevel || 100;
            unlockedBadges = new Set(data.unlockedBadges || []);
        }
    }
    function saveAppletsToLocalStorage() { localStorage.setItem('localLifeApplets', JSON.stringify(mockApplets)); }
    function loadAppletsFromLocalStorage() {
        const stored = localStorage.getItem('localLifeApplets');
        if (stored) { mockApplets = JSON.parse(stored); }
    }
     function saveSubscriptionToLocalStorage() { localStorage.setItem('userSubscriptionTier', userSubscriptionTier); }
    function loadSubscriptionFromLocalStorage() {
        const stored = localStorage.getItem('userSubscriptionTier');
        if (stored) { userSubscriptionTier = stored; }
    }
    function saveIntegratedAppsToLocalStorage() { localStorage.setItem('localLifeIntegratedApps', JSON.stringify(integratedApps)); }
    function loadIntegratedAppsFromLocalStorage() {
        const stored = localStorage.getItem('localLifeIntegratedApps');
        if (stored) { integratedApps = JSON.parse(stored); }
    }
    const loginScreen = document.getElementById('loginScreen');
    const signupScreen = document.getElementById('signupScreen');
    function showLoginScreen() {
        if (loginScreen) loginScreen.classList.add('active');
        if (signupScreen) signupScreen.classList.remove('active');
    }
    function showSignupScreen() {
        if (signupScreen) signupScreen.classList.add('active');
        if (loginScreen) loginScreen.classList.remove('active');
    }
    function handleLoginAttempt() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) {
            showToast("Please enter both email/username and password.", "error");
            return;
        }
        if ((email === "test@example.com" || email === (localStorage.getItem('userEmail') || 'test@example.com')) && password === "password") {
            localStorage.setItem('isLoggedIn', 'true');
            const storedProfile = JSON.parse(localStorage.getItem('userProfile'));
            if (storedProfile && storedProfile.name) {
                 userName = storedProfile.name.split(' ')[0];
            } else {
                 userName = "User";
                 localStorage.setItem('userProfile', JSON.stringify({ name: 'Demo User', username: '@demo_user', bio: 'New to LocalLife OS!' }));
            }
            authContainer.style.display = 'none';
            appContainer.classList.remove('hidden');
            initializeAppPostLogin();
            showToast(`Welcome back, ${userName}!`, "success");
        } else {
            showToast("Invalid credentials (Use: test@example.com / password)", "error");
        }
    }
    function handleSignupAttempt() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        if (!name || !email || !password || !confirmPassword) {
            showToast("Please fill all fields for signup.", "error");
            return;
        }
        if (password !== confirmPassword) {
            showToast("Passwords do not match.", "error");
            return;
        }
        const newUserName = name.split(' ')[0];
        const newUsernameHandle = '@' + newUserName.toLowerCase() + '_local';
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userProfile', JSON.stringify({ name: name, username: newUsernameHandle, bio: `Hi, I'm ${newUserName}!` }));
        userName = newUserName;
        if (!mockUsers['user']) {
            mockUsers['user'] = { id: 'user', name: name, username: newUsernameHandle, avatarUrl: `https://i.pravatar.cc/40?u=user`, bio: `Hi, I'm ${newUserName}!` };
            saveUsersToLocalStorage();
        } else {
            mockUsers['user'].name = name;
            mockUsers['user'].username = newUsernameHandle;
            mockUsers['user'].bio = `Hi, I'm ${newUserName}!`;
            saveUsersToLocalStorage();
        }
        authContainer.style.display = 'none';
        appContainer.classList.remove('hidden');
        initializeAppPostLogin();
        showToast(`Welcome to LocalLife OS, ${userName}! Account created.`, "success");
    }
    function handleLogout() {
        openConfirmationModal("Log Out?", "Are you sure you want to log out?", () => {
            localStorage.setItem('isLoggedIn', 'false');
            authContainer.style.display = 'flex';
            appContainer.classList.add('hidden');
            showLoginScreen();
            showToast("Logged out successfully.", "success");
        });
    }
    function initializeAppPostLogin() {
        loadUsersFromLocalStorage(); 
        loadTasksFromLocalStorage();
        loadHabitsFromLocalStorage();
        loadLoggedMoodsToLocalStorage();
        loadDealsFromLocalStorage();
        loadPlacesFromLocalStorage();
        loadChannelsFromLocalStorage(); 
        loadAILearningPrefsFromLocalStorage();
        loadNotificationPreferencesFromLocalStorage();
        loadNotificationsFromLocalStorage();
        loadDashboardConfigFromLocalStorage();
        loadTrustedContactsFromLocalStorage();
        loadBulletinPostsFromLocalStorage();
        loadSleepDataFromLocalStorage();
        loadGamificationDataFromLocalStorage();
        loadAppletsFromLocalStorage();
        loadSubscriptionFromLocalStorage();
        loadIntegratedAppsFromLocalStorage();
        if (typeof google !== 'undefined') initMap();
        native.requestNotificationPermission();
        const isDarkModeSaved = localStorage.getItem('darkMode') === 'true';
        if (isDarkModeSaved) {
            document.body.classList.add('dark-mode');
            if (darkModeToggleVisual) darkModeToggleVisual.classList.add('active');
            if (darkModeToggleContainer) darkModeToggleContainer.setAttribute('aria-checked', 'true');
        } else {
            if (darkModeToggleContainer) darkModeToggleContainer.setAttribute('aria-checked', 'false');
        }
        const savedTheme = localStorage.getItem('themeAccent');
        const defaultThemeColor = '#4DB6AC';
        let defaultThemeButton = Array.from(document.querySelectorAll('.theme-selector .theme-color-button i.theme-color-dot'))
                                .find(dot => dot.style.color.toUpperCase().includes(defaultThemeColor.toUpperCase()))?.parentElement;
        if (!defaultThemeButton && document.querySelector('.theme-selector .theme-color-button')) {
             defaultThemeButton = document.querySelector('.theme-selector .theme-color-button');
        }
        if (savedTheme) {
            const matchingButton = Array.from(document.querySelectorAll('.theme-selector .theme-color-button')).find(btn => {
                 const dot = btn.querySelector('.theme-color-dot');
                 return dot && dot.style.color.toUpperCase().includes(savedTheme.toUpperCase());
            });
            if (matchingButton) changeThemeAccent(savedTheme, matchingButton);
            else if (defaultThemeButton) changeThemeAccent(defaultThemeColor, defaultThemeButton);
        } else if (defaultThemeButton) changeThemeAccent(defaultThemeColor, defaultThemeButton);
        const savedAIPersonality = localStorage.getItem('aiPersonality');
        if (savedAIPersonality && aiPersonalitySelect) {
            currentAiPersonality = savedAIPersonality;
            aiPersonalitySelect.value = savedAIPersonality;
        }
        setActiveScreen('dashboard', true);
        updateAIData();
        setInterval(updateAIData, 30000);
        setInterval(cycleSafetyTicker, 7000);
        setInterval(checkTaskReminders, 60000);
        updateUnreadNotificationBadge();
        renderDashboardTasks();
        renderDealsOnDashboard();
        renderPinnedWidgets();
        renderTasks();
        generateCalendarPlaceholder();
        renderPlaces('all');
        renderChannels();
        renderHabits();
        updateProactiveSuggestions();
        showAIExploreSuggestion();
        updateWellnessTimeline();
        setupInputClearButtons();
        applyDashboardCustomization();
        fetchNewsSummary();
        updateGamificationUI('all');
        updateSubscriptionStatusUI();
        renderInstalledAppletsOnDashboard();
        renderServicesMarketplace();
        renderGovernanceHub();
        setDynamicTheme();
        if (aiChatArea.children.length === 0) {
            addMessageToAIChat('other', getAIPersonalityPrefix() + `Sanibonani ${userName}! I'm LocalLife AI. How can I help you? Try 'help'.`);
        }
        if (aiBottomSheet) aiBottomSheet.setAttribute('aria-hidden', 'true');
        if (aiFab) aiFab.setAttribute('aria-expanded', 'false');
        const lastBriefingDate = localStorage.getItem('lastBriefingDate');
        const todayDateString = new Date().toDateString();
        if (lastBriefingDate !== todayDateString) {
            showDailyBriefing();
            localStorage.setItem('lastBriefingDate', todayDateString);
        }
        document.getElementById('communitySearchInput').addEventListener('input', () => {
             const activeFilterButton = document.querySelector('.channel-list-toggle button.active');
             const currentFilter = activeFilterButton ? activeFilterButton.id.replace('show','').replace('Btn','').toLowerCase() : 'joined';
             renderChannels(currentFilter);
        });
        document.getElementById('newMessageSearchInput').addEventListener('input', renderNewMessageUserList);
        initializeLongPress();
    }
    document.addEventListener('DOMContentLoaded', () => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            authContainer.style.display = 'none';
            appContainer.classList.remove('hidden');
            initializeAppPostLogin();
        } else {
            authContainer.style.display = 'flex';
            appContainer.classList.add('hidden');
            showLoginScreen();
        }
    });
    showToast = function(message, type = "info", duration = 3000, isError = false) {
        if (!toastNotification) return;
        clearTimeout(toastTimeout);
        toastNotification.textContent = message;
        toastNotification.className = 'toast-notification';
        toastNotification.style.backgroundColor = '';
        toastNotification.style.color = '';
        if (type === "success") {
            toastNotification.style.backgroundColor = 'var(--success-color)';
            toastNotification.style.color = 'white';
        } else if (type === "error" || isError) {
            toastNotification.style.backgroundColor = 'var(--danger-color)';
            toastNotification.style.color = 'white';
        } else if (type === "ai_info") { 
            toastNotification.classList.add('ai-info-toast');
        } else if (type === "xp") {
            toastNotification.style.backgroundColor = 'var(--xp-color)';
            toastNotification.style.color = 'white';
        }
        toastNotification.classList.add('show');
        toastTimeout = setTimeout(() => {
            toastNotification.classList.remove('show');
        }, duration);
    }
    openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            
            const event = new CustomEvent('show', { bubbles: true });
            modal.dispatchEvent(event);
            
            currentOpenModalId = modalId;
            const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            const firstFocusableElement = modal.querySelector(focusableElements);
            if (firstFocusableElement) firstFocusableElement.focus();
        }
    }
    closeModal = function(modalIdToClose) {
        const modalToActOn = modalIdToClose || currentOpenModalId;
        if (!modalToActOn) return;
        const modal = document.getElementById(modalToActOn);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                if(modal.dataset.hiddenModal){
                    document.getElementById(modal.dataset.hiddenModal).style.display = '';
                    delete modal.dataset.hiddenModal;
                }
            }, 400); 
            if (modalToActOn === currentOpenModalId) currentOpenModalId = null;
            if (modalIdToClose === 'arViewModal') {
                const arVideo = document.getElementById('arVideo');
                if (arVideo && arVideo.srcObject) {
                    arVideo.srcObject.getTracks().forEach(track => track.stop());
                    arVideo.srcObject = null;
                }
            }
        }
    }
    function updateContextualFabIcon() {
        if (!aiFabIcon) return;
        const activeScreenId = document.querySelector('.screen.active')?.id;
        let newIcon = 'fa-brain';
        switch (activeScreenId) {
            case 'planner': newIcon = 'fa-wand-magic-sparkles'; break;
            case 'explore': newIcon = 'fa-route'; break;
            case 'wellness': newIcon = 'fa-chart-line'; break;
        }
        aiFabIcon.className = `fas ${newIcon}`;
    }
    setActiveScreen = function(screenId, skipScroll = false) {
        if (appContainer.classList.contains('full-page-active') && window.innerWidth <= 450) {
            appContainer.classList.remove('full-page-active');
            if (aiBottomSheet.classList.contains('active')) {
                aiBottomSheet.classList.remove('active');
                aiBottomSheet.setAttribute('aria-hidden', 'true');
            }
            if (specificChatView.classList.contains('active')) {
                specificChatView.classList.remove('active');
                specificChatView.classList.add('hidden');
            }
        }
        screens.forEach(screen => screen.classList.remove('active'));
        navItems.forEach(item => {
            item.classList.remove('active'); item.setAttribute('aria-selected', 'false');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
             if (screenId === 'chat') {
                channelListView.style.display = 'block';
                specificChatView.classList.add('hidden');
                specificChatView.classList.remove('active'); 
            }
        }
        else {
            document.getElementById('dashboard')?.classList.add('active');
            screenId = 'dashboard';
        }
        const targetNavItem = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active'); targetNavItem.setAttribute('aria-selected', 'true');
        }
        updateContextualFabIcon();
        if (!skipScroll) {
            const contentArea = document.querySelector('.content');
            if(contentArea) contentArea.scrollTop = 0;
        }
        if (currentOpenModalId && currentOpenModalId !== "aiBottomSheet" && currentOpenModalId !== "notificationsModal") {
            closeModal(currentOpenModalId);
        }
        if (screenId === 'chat' && document.getElementById('newChannelIconSelector') && !document.getElementById('newChannelIconSelector').hasChildNodes()) {
            populateIconSelector('newChannelIconSelector');
        }
        if (screenId === 'wellness') {
            if (document.getElementById('newHabitIconSelector') && !document.getElementById('newHabitIconSelector').hasChildNodes()) {
                populateIconSelector('newHabitIconSelector');
            }
            if (document.getElementById('newHabitColorSelector') && !document.getElementById('newHabitColorSelector').hasChildNodes()){
                 populateColorSelector('newHabitColorSelector');
            }
            updateWellnessTimeline();
            checkForWellnessPatterns();
        }
        if (screenId === 'explore') showAIExploreSuggestion();
        if (screenId === 'dashboard') {
            updateProactiveSuggestions();
            renderDealsOnDashboard();
            renderPinnedWidgets();
            applyDashboardCustomization();
        }
        if (screenId === 'planner' && aiPlannerSuggestionEl) {
            aiPlannerSuggestionEl.classList.add('hidden'); 
        }
        if (screenId === 'appStore') {
            renderApplets();
        }
        if (screenId === 'privacyDashboard') {
            renderPrivacyDashboard();
        }
    }
    updateAIData = function() {
        const aiGreetingEl = document.getElementById('aiGreeting');
        const localTimeDateEl = document.getElementById('localTimeDate');
        const now = new Date();
        const hours = now.getHours();
        let greeting = `Sanibonani, ${userName}!`;
        if (hours < 12) greeting = `Kusile, ${userName}!`;
        else if (hours < 18) greeting = `Good Afternoon, ${userName}!`;
        else greeting = `Good Evening, ${userName}!`;
        if (aiGreetingEl) aiGreetingEl.textContent = greeting;
        if (localTimeDateEl) {
             const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
             localTimeDateEl.textContent = now.toLocaleTimeString('en-US', options).replace(',', ' -');
        }
        setDynamicTheme();
        updateUnreadNotificationBadge();
        updateLiveLocationInfo();
    }
    function setDynamicTheme() {
        const hour = new Date().getHours();
        document.body.classList.remove('theme-evening', 'theme-night');
        if (hour >= 18 && hour < 22) {
            document.body.classList.add('theme-evening');
        } else if (hour >= 22 || hour < 5) {
            document.body.classList.add('theme-night');
        }
    }
    generateCalendarPlaceholder = function() {
        const calendarEl = document.getElementById('calendarPlaceholder');
        if (!calendarEl) return;
        calendarEl.innerHTML = '';
        const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day'; dayHeader.style.fontWeight = 'bold';
            dayHeader.textContent = day; calendarEl.appendChild(dayHeader);
        });
        const today = new Date().getDate();
        const currentMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
        for(let i=0; i < firstDayOfMonth; i++){
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day'; calendarEl.appendChild(emptyCell);
        }
        for (let i = 1; i <= currentMonthDays ; i++) {
            if (calendarEl.childElementCount >= 35 + daysOfWeek.length) break;
            const dayCell = document.createElement('div');
            dayCell.className = 'day'; dayCell.textContent = i;
            if (i === today) {
                dayCell.classList.add('today'); dayCell.setAttribute('aria-current', 'date');
                dayCell.setAttribute('aria-label', `Today, ${i}`);
            } else { dayCell.setAttribute('aria-label', `Date ${i}`); }
            const thisDateString = new Date(new Date().getFullYear(), new Date().getMonth(), i).toISOString().split('T')[0];
            const hasTask = tasks.some(t => t.dueDate === thisDateString && !t.completed);
            if (hasTask) {
                const dot = document.createElement('div');
                dot.className = 'calendar-task-dot';
                dayCell.appendChild(dot);
            }
            dayCell.onclick = () => openFullCalendar('tasks');
            calendarEl.appendChild(dayCell);
        }
    }
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
    }
    function startVoiceRecognition(targetInputId, callback) {
        if (!SpeechRecognition) {
            showToast("Voice recognition is not supported by your browser.", "error");
            return;
        }
        const targetInput = document.getElementById(targetInputId);
        if (!targetInput) return;
        showToast("Listening...", "ai_info", 3000);
        recognition.start();
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            targetInput.value = transcript;
            showToast(`AI heard: "${transcript}"`, "success");
            if (callback && typeof callback === 'function') {
                callback(true); 
            }
        };
        recognition.onspeechend = () => {
            recognition.stop();
        };
        recognition.onerror = (event) => {
            showToast(`Error occurred in recognition: ${event.error}`, "error");
        };
    }
    function speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.pitch = 1;
            utterance.rate = 1;
            window.speechSynthesis.speak(utterance);
        } else {
            showToast("Text-to-speech is not supported by your browser.", "error");
        }
    }
    function shareContent(type, data = {}) {
        let shareData = {
            title: 'LocalLife OS',
            text: 'Check this out from LocalLife OS!',
            url: window.location.href + `#share/${type}/${data.id}`
        };
        if (type === 'place') {
            const place = mockPlaces.all.find(p => p.id === data.id);
            if(place) shareData.text = `Check out this cool place I found on LocalLife OS: ${place.name}`;
        } else if (type === 'deal') {
             const deal = mockDeals.find(d => d.id === data.id);
             if(deal) shareData.text = `Check out this great deal on LocalLife OS: ${deal.title}`;
        } else if (type === 'location') {
            shareData.title = data.title || 'My Live Location';
            shareData.text = data.text;
        } else if (type === 'bulletin') {
            const post = bulletinPosts.find(p => p.id === data.id);
            if(post) {
                shareData.title = `Bulletin Post: ${post.title}`;
                shareData.text = post.content;
            }
        }
        if (navigator.share) {
            navigator.share(shareData);
        } else {
            showToast("Web Share API not supported. Cannot share natively.", "error");
        }
    }
    function scheduleTaskNotification(task) {
        if (!notificationPreferences.taskReminders || !task.dueDate || !task.time || task.completed) return;
        const timeMatch = task.time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
        if (!timeMatch) return;
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2] || '0');
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && hour < 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(hour, minute, 0, 0);
        const timeToTask = taskDate.getTime() - Date.now();
        if (timeToTask > 0) {
            setTimeout(() => {
                const taskStillExists = tasks.find(t => t.id === task.id && !t.completed);
                if (taskStillExists) {
                    native.showNotification('Task Reminder', {
                        body: task.title,
                        icon: 'https://via.placeholder.com/192/4DB6AC/FFFFFF?text=LL' 
                    });
                }
            }, timeToTask);
        }
    }
    function checkTaskReminders() {
        tasks.forEach(task => {
            if (!task.completed && task.dueDate && task.time) {
                const timeMatch = task.time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
                if (timeMatch) {
                    let hour = parseInt(timeMatch[1]);
                    const minute = parseInt(timeMatch[2] || '0');
                    const isPM = timeMatch[3].toLowerCase() === 'pm';
                    if (isPM && hour < 12) hour += 12;
                    if (!isPM && hour === 12) hour = 0;
                    const now = new Date();
                    const taskDate = new Date(task.dueDate);
                    taskDate.setHours(hour, minute, 0, 0);
                    if (taskDate > now && (taskDate.getTime() - now.getTime() < 5 * 60 * 1000) && !task.notified) {
                        native.showNotification('Upcoming Task', { body: `Reminder: ${task.title} is starting soon.`});
                        task.notified = true;
                    }
                }
            }
        });
    }
    function updateLiveLocationInfo() {
        native.geolocation.getCurrent(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                userLocationCoords = { lat, lng };
                if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            const address = results[0].formatted_address;
                            document.getElementById('currentLocation').textContent = address.split(',').slice(0, 2).join(',');
                        } else {
                             document.getElementById('currentLocation').textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                        }
                    });
                }
                fetch(`/api/weather?lat=${lat}&lon=${lng}&units=metric`)
                    .then(response => response.json())
                    .then(data => {
                        const temp = Math.round(data.main.temp);
                        const description = data.weather[0].description;
                        const city = data.name;
                        document.getElementById('currentWeather').textContent = `${temp}°C, ${description} - ${city}`;
                    }).catch(() => {
                        document.getElementById('currentWeather').textContent = `Weather data unavailable`;
                    });
            },
            () => {
                document.getElementById('currentLocation').textContent = 'Eswatini (Location access denied)';
                document.getElementById('currentWeather').textContent = `Weather unavailable`;
            }
        );
    }
    function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatarImg = document.getElementById('userProfileAvatar');
                avatarImg.src = e.target.result;
                mockUsers['user'].avatarUrl = e.target.result;
                saveUsersToLocalStorage();
                showToast("Avatar updated!", "success");
            };
            reader.readAsDataURL(file);
        }
    }
    function launchApplet(appletId) {
        if (appletId === 'loadShedding') {
            renderLoadSheddingApplet();
            openModal('applet-loadShedding-modal');
        } else if (appletId === 'localRideshare' || appletId === 'siswatiTutor' || appletId === 'groupExpenseSplitter') {
            openModal(`applet-${appletId}-modal`);
        } else if (appletId === 'servicesMarket' || appletId === 'governanceHub') {
            setActiveScreen(appletId === 'servicesMarket' ? 'servicesMarket' : 'governance');
        }
         else {
            showToast(`Launching ${appletId} applet...`, 'ai_info');
        }
    }
    function useCurrentLocationForRide() {
        const pickupInput = document.getElementById('ride-pickup');
        if(!pickupInput) return;
        showToast("Getting current location...", "ai_info");
        native.geolocation.getCurrent(
            position => {
                pickupInput.value = `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`;
                checkRideInputs();
            },
            () => { showToast("Could not get location.", "error"); }
        );
    }
    function addExpenseParticipant() {
        const list = document.getElementById('expense-participant-list');
        const count = list.children.length + 1;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-field mb-1';
        input.placeholder = `Participant ${count}`;
        list.appendChild(input);
    }
    function calculateSplit() {
        const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
        const tipPercent = parseFloat(document.getElementById('expense-tip').value) || 0;
        const participantInputs = document.querySelectorAll('#expense-participant-list input');
        const participants = Array.from(participantInputs).map(input => input.value.trim()).filter(Boolean);
        const resultEl = document.getElementById('split-result');
        if (amount <= 0 || participants.length === 0) {
            resultEl.innerHTML = `<p class="text-center" style="color:var(--danger-color);">Please enter a valid amount and at least one participant.</p>`;
            return;
        }
        const tipAmount = amount * (tipPercent / 100);
        const totalAmount = amount + tipAmount;
        const splitAmount = totalAmount / participants.length;
        
        let receiptHtml = `
            <div id="receiptContent">
                <div id="receipt-container" style="font-family: 'Courier New', Courier, monospace; background: #fff; color: #000; padding: 15px; border: 1px solid #ccc; max-width: 300px; margin: 15px auto;">
                    <h3 style="text-align: center; margin: 0; text-transform: uppercase;">Expense Split</h3>
                    <p style="text-align:center; font-size:0.8rem;">via LocalLife OS</p>
                    <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
                    <p><strong>Total Bill:</strong> E ${amount.toFixed(2)}</p>
                    <p><strong>Tip (${tipPercent}%):</strong> E ${tipAmount.toFixed(2)}</p>
                    <p><strong>TOTAL: E ${totalAmount.toFixed(2)}</strong></p>
                    <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
                    <p><strong>Split between ${participants.length} people:</strong></p>
        `;
        participants.forEach(name => {
            receiptHtml += `<p>${name} pays: <strong>E ${splitAmount.toFixed(2)}</strong></p>`;
        });
        receiptHtml += `</div></div>`;
        
        resultEl.innerHTML = `${receiptHtml}<button class="button button-secondary mt-2" style="width:100%;" onclick="shareSplitResults()">Share Results Receipt</button>`;
    }
    async function shareSplitResults() {
        const receiptEl = document.getElementById('receiptContent');
        if (receiptEl) {
            try {
                const canvas = await html2canvas(receiptEl.querySelector('#receipt-container'));
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], 'split-receipt.png', { type: 'image/png' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'Expense Split Receipt',
                            text: 'Here is the split for our bill.'
                        });
                    } else {
                        showToast("Sharing files not supported on this browser.", "error");
                    }
                }, 'image/png');
            } catch (err) {
                showToast("Could not generate receipt image.", "error");
            }
        }
    }
    function renderIntegrationSettings() {
        const listEl = document.getElementById('integrationSettingsList');
        if (!listEl) return;
        listEl.innerHTML = '';
        integratedApps.forEach(app => {
            const itemEl = document.createElement('div');
            itemEl.className = 'setting-item';
            itemEl.innerHTML = `
                <span class="setting-label"><i class="${app.icon}" style="margin-right:var(--space-sm);"></i> ${app.name}</span>
                <button class="toggle-switch-button" data-app-id="${app.id}" onclick="toggleAppIntegration(this, '${app.id}')">
                    <span class="toggle-switch ${app.connected ? 'active' : ''}"></span>
                </button>
            `;
            listEl.appendChild(itemEl);
        });
    }
    function toggleAppIntegration(button, appId) {
        const app = integratedApps.find(a => a.id === appId);
        if(app) {
            app.connected = !app.connected;
            button.querySelector('.toggle-switch').classList.toggle('active', app.connected);
            showToast(`${app.name} ${app.connected ? 'connected' : 'disconnected'}.`, 'success');
            if (app.connected) {
                showToast(`AI can now use your ${app.name} data for richer suggestions (e.g., creating playlists, analyzing workouts).`, 'ai_info', 4000);
            }
            saveIntegratedAppsToLocalStorage();
        }
    }
    function addAppIntegration() {
        const input = document.getElementById('newAppIntegrationInput');
        const appName = input.value.trim();
        if(!appName) {
            showToast("Please enter an app name.", "error");
            return;
        }
        const newApp = { id: appName.toLowerCase().replace(/\s/g, '_'), name: appName, icon: 'fas fa-puzzle-piece', connected: false };
        if (integratedApps.some(app => app.id === newApp.id)) {
            showToast(`${appName} is already in the list.`, 'info');
            return;
        }
        integratedApps.push(newApp);
        renderIntegrationSettings();
        input.value = '';
        showToast(`${appName} added. You can now connect it.`, 'success');
        saveIntegratedAppsToLocalStorage();
    }
    window.initMap = function() {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer || typeof google === 'undefined' || !google.maps) return;
        const defaultLocation = { lat: -26.3056, lng: 31.1428 }; 
        const isDarkMode = document.body.classList.contains('dark-mode');
        const mapStyles = isDarkMode ? [ { "elementType": "geometry", "stylers": [ { "color": "#242f3e" } ] }, { "elementType": "labels.text.fill", "stylers": [ { "color": "#746855" } ] }, { "elementType": "labels.text.stroke", "stylers": [ { "color": "#242f3e" } ] }, { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "poi.park", "elementType": "geometry", "stylers": [ { "color": "#263c3f" } ] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [ { "color": "#6b9a76" } ] }, { "featureType": "road", "elementType": "geometry", "stylers": [ { "color": "#38414e" } ] }, { "featureType": "road", "elementType": "geometry.stroke", "stylers": [ { "color": "#212a37" } ] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#9ca5b3" } ] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [ { "color": "#746855" } ] }, { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [ { "color": "#1f2835" } ] }, { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [ { "color": "#f3d19c" } ] }, { "featureType": "transit", "elementType": "geometry", "stylers": [ { "color": "#2f3948" } ] }, { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#17263c" } ] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [ { "color": "#515c6d" } ] }, { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [ { "color": "#17263c" } ] } ] : [];

        map = new google.maps.Map(mapContainer, {
            center: defaultLocation, zoom: 11, disableDefaultUI: true, styles: mapStyles,
        });
        native.geolocation.getCurrent(position => {
            const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            userLocationCoords = userLocation;
            map.setCenter(userLocation);
            if(currentPositionMarker) currentPositionMarker.setMap(null);
            currentPositionMarker = new google.maps.Marker({
                position: userLocation, map: map, title: "Your Location",
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#4285F4', fillOpacity: 1, strokeWeight: 2, strokeColor: 'white' }
            });
            updateLiveLocationInfo();
            updateNearbyPulse();
        }, () => {
             updateLiveLocationInfo();
             updateNearbyPulse();
        });
        updateMapMarkers(mockPlaces.all);
    }
    function updateMapMarkers(placesToShow) {
        if (!map) return;
        mapMarkers.forEach(marker => marker.setMap(null));
        mapMarkers = [];
        const bounds = new google.maps.LatLngBounds();
        
        placesToShow.forEach(place => {
            if (!place.position) return;
            const marker = new google.maps.Marker({
                position: place.position,
                map: map,
                title: place.name
            });
             const infowindow = new google.maps.InfoWindow({ content: `<strong>${place.name}</strong><br><button onclick="showPlaceDetailById(${place.id})">View Details</button>` });
             marker.addListener('click', () => { infowindow.open(map, marker); });
             mapMarkers.push(marker);
             bounds.extend(place.position);
        });

        if (placesToShow.length === 1 && placesToShow[0].position) {
            map.setCenter(placesToShow[0].position);
            map.setZoom(15);
        } else if (placesToShow.length > 1) {
            map.fitBounds(bounds);
        }
    }
    function showPlaceDetailById(placeId) {
        const place = mockPlaces.all.find(p => p.id === placeId);
        if (place) {
            showPlaceDetail(place);
        }
    }
    function getDirections(destination, origin = null) {
        let url;
        if (origin) {
            url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
        } else {
            url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
        }
        window.open(url, '_blank');
        showToast("Opening Google Maps for directions...", "ai_info");
    }
    function openArView() {
        openModal('arViewModal');
        const arVideo = document.getElementById('arVideo');
        const arOverlay = document.getElementById('arOverlay');
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                .then(stream => { 
                    arVideo.srcObject = stream; 
                    setTimeout(() => {
                        const nearbyPlace = mockPlaces.all[0]; 
                        arOverlay.innerHTML = `<h4><i class="fas fa-store"></i> ${nearbyPlace.name}</h4><p>${nearbyPlace.sub} - ${nearbyPlace.rating} <i class="fas fa-star" style="color:var(--favorite-color);"></i></p>`;
                    }, 3000);
                })
                .catch(() => {
                    showToast("Could not access camera for AR view.", "error");
                    closeModal('arViewModal');
                });
        }
    }
    function openAILayersModal() { openModal('aiLayersModal'); }
    function applyAILayer(layerType) {
        closeModal('aiLayersModal');
        clearAILayers();
        if (layerType === 'reset') {
            showToast("Map layers reset to default.", "info");
            return;
        }
        showToast(`Applying AI Layer: ${layerType}`, "ai_info");
        switch (layerType) {
            case 'heatmap':
                const heatmapData = mockPlaces.all.map(p => ({ location: new google.maps.LatLng(p.position.lat, p.position.lng), weight: p.rating }));
                heatmap = new google.maps.visualization.HeatmapLayer({ data: heatmapData, map: map, radius: 20 });
                break;
            case 'danger':
                mapPolygons.push(new google.maps.Polygon({
                    paths: [{lat: -26.495, lng: 31.375}, {lat: -26.500, lng: 31.378}, {lat: -26.498, lng: 31.380}],
                    strokeColor: "#FF0000", strokeWeight: 0, fillColor: "#FF0000", fillOpacity: 0.35, map: map
                }));
                break;
            case 'quiet':
                mockPlaces.all.filter(p=>p.tags.includes('scenic')).forEach(p => {
                    mapPolygons.push(new google.maps.Circle({
                        strokeColor: 'var(--soft-blue)', strokeOpacity: 0.8, strokeWeight: 2,
                        fillColor: 'var(--soft-blue)', fillOpacity: 0.35, map: map,
                        center: p.position, radius: 200
                    }));
                });
                break;
        }
    }
    function clearAILayers() {
        if(heatmap) heatmap.setMap(null);
        mapPolygons.forEach(p => p.setMap(null));
        mapPolygons = [];
    }
    function findNearbyHelp() {
        setActiveScreen('explore');
        setTimeout(() => {
            const searchInput = document.getElementById('exploreSearchInput');
            if (searchInput) searchInput.value = "hospital, police station";
            handleExploreSearch(true);
        }, 100);
        showToast("Searching for nearby emergency services...", "ai_info");
        closeModal('emergencyDashboardModal');
    }
    function createCalendarEvent(task = null) {
        let currentTask = task;
        if (!currentTask) {
            const taskId = parseInt(document.getElementById('editingTaskId')?.value);
            if (taskId) {
                currentTask = tasks.find(t => t.id === taskId);
            }
        }
        if (!currentTask) {
            showToast("No task selected to add to calendar.", "error");
            return;
        }
        let startDate, endDate;
        if (currentTask.dueDate) {
            const date = new Date(currentTask.dueDate);
            let startTime = [9, 0]; 
            let endTime = [10, 0]; 

            const timeMatch = currentTask.time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1]);
                let minute = parseInt(timeMatch[2] || '0');
                const isPM = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
                if (isPM && hour < 12) hour += 12;
                if (!isPM && hour === 12) hour = 0;
                startTime = [hour, minute];
                endTime = [hour + 1, minute];
            }
            startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startTime[0], startTime[1]);
            endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endTime[0], endTime[1]);
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            startDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0);
            endDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0);
        }

        const formatDateForGoogle = (date) => date.toISOString().replace(/-|:|\.\d+/g, '');
        
        const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(currentTask.title)}&dates=${formatDateForGoogle(startDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(currentTask.notes || 'Added from LocalLife OS')}`;
        
        const appleCalendarUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:${encodeURIComponent(window.location.href)}%0ADTSTART:${formatDateForGoogle(startDate)}%0ADTEND:${formatDateForGoogle(endDate)}%0ASUMMARY:${encodeURIComponent(currentTask.title)}%0ADESCRIPTION:${encodeURIComponent(currentTask.notes || 'Added from LocalLife OS')}%0AEND:VEVENT%0AEND:VCALENDAR`;

        openConfirmationModal(
            "Add to Calendar",
            `<p>Choose your calendar provider to add the event: "<strong>${currentTask.title}</strong>".</p>
             <div style="display:flex; flex-direction:column; gap:var(--space-sm); margin-top:var(--space-md);">
                <a href="${googleCalendarUrl}" target="_blank" class="button" style="text-decoration:none;"><i class="fab fa-google" style="margin-right:var(--space-sm);"></i> Google Calendar</a>
                <a href="${appleCalendarUrl}" download="event.ics" class="button button-secondary" style="text-decoration:none;"><i class="fab fa-apple" style="margin-right:var(--space-sm);"></i> Apple Calendar (.ics)</a>
             </div>`,
            () => {  }
        );
        const confirmButton = document.getElementById('confirmActionButton');
        if (confirmButton) confirmButton.style.display = 'none'; 
    }
    
    document.addEventListener('visibilitychange', () => {
        const isAppLockEnabled = localStorage.getItem('appLockEnabled') === 'true';
        if (isAppLockEnabled && document.visibilityState === 'hidden') {
            isAppLocked = true;
        } else if (isAppLocked && document.visibilityState === 'visible') {
            lockScreen.classList.remove('hidden');
        }
    });

    document.getElementById('applet-siswatiTutor-modal').addEventListener('show', setupSiswatiTutor);
    document.getElementById('applet-groupExpenseSplitter-modal').addEventListener('show', () => {
        document.getElementById('split-result').innerHTML = '';
        document.getElementById('expense-participant-list').innerHTML = `<input type="text" class="input-field mb-1" placeholder="Participant 1">`;
        document.getElementById('expense-form').reset();
    });
    document.querySelectorAll('#applet-localRideshare-modal input').forEach(input => {
        input.addEventListener('input', checkRideInputs);
    });

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


