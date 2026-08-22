/**
 * @module wellness
 * Wellness screen: meditations, mood check-ins, water intake.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: deleteHabit, incrementWater, logMood, openJournalModal, saveJournalEntry, selectMood, showAIWellnessSummaryModal, toggleHabitProgress.
 */
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
