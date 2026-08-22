/**
 * @module voice-share
 * Voice notes capture and share-sheet integration.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: none assigned explicitly; top-level function/var declarations become
 * browser globals consumed by inline handler attributes.
 */
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
