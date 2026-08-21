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

