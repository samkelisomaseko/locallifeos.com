/**
 * @module data
 * Seed/demo datasets for app content (places, deals, meditations).
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: none assigned explicitly; top-level function/var declarations become
 * browser globals consumed by inline handler attributes.
 */
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
