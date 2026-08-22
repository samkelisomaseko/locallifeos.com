/**
 * @module explore
 * Explore screen: search, category filters and discovery cards.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: filterPlaces, ratePlace, submitPlaceReview, toggleSavePlace.
 */
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
