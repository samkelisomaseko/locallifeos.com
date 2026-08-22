/**
 * @module native-bridge
 * Bridge to native/mobile capabilities (geolocation, vibration, haptics).
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: none assigned explicitly; top-level function/var declarations become
 * browser globals consumed by inline handler attributes.
 */
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

