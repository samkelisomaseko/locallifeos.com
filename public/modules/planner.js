/**
 * @module planner
 * Planner screen: tasks, habits, focus sessions and their persistence.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: applyAISchedule, deleteTask, toggleTaskStatus.
 */
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
