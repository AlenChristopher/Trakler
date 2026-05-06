const App = (function() {
    const state = {
        data: JSON.parse(localStorage.getItem("trakler_v2")) || { tasks: [], blocks: [] },
        currentFilter: 'all',
        draggedTaskId: null,
        movingBlockIndex: null
    };

    const DOM = {
        tasks: document.getElementById('tasks'),
        timeline: document.getElementById('timeline'),
        inboxCount: document.getElementById('inbox-count'),
        chatInput: document.getElementById('chatInput'),
        chatMessages: document.getElementById('chatMessages'),
        chatWindow: document.getElementById('chatWindow'),
        fab: document.getElementById('chatFab'),
        statsArea: document.getElementById('stats-area'),
        focusArea: document.getElementById('focus-area')
    };

    const save = () => localStorage.setItem("trakler_v2", JSON.stringify(state.data));

    // --- PROACTIVE AUDIO ENGINE ---
    const playSound = (type) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            if (type === 'success') {
                // Rising "Achievement" tone
                osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
            } else {
                // Neutral notification blip
                osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            }
            
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch(e) { console.log("Audio blocked by browser"); }
    };

    // --- PROACTIVE NOTIFICATION ENGINE ---
    const sendNotification = (title, body) => {
        if (Notification.permission === "granted") {
            new Notification(title, { body });
            playSound('alert');
        }
    };

    // --- MODERN RENDER ENGINE ---
    const renderTasks = () => {
        if(!DOM.tasks) return;
        DOM.tasks.innerHTML = '';
        let count = 0, doneCount = 0, topPriority = "All clear!";

        state.data.tasks.forEach(t => {
            if (!t.done) {
                count++;
                // Proactive: Auto-grab first active priority task for the Focus Card
                if (t.focus && topPriority === "All clear!") topPriority = t.text;
            } else {
                doneCount++;
            }

            if (state.currentFilter === 'focus' && (!t.focus || t.done)) return;
            if (state.currentFilter === 'completed' && !t.done) return;
            if (state.currentFilter === 'all' && t.done) return;

            const el = document.createElement('div');
            // Modern card styling class
            el.className = `task ${t.focus ? 'focus-task' : ''} ${t.done ? 'completed' : ''}`;
            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="App.toggle(${t.id})">
                    <span class="task-text">${t.text}</span>
                </div>
                <button class="modern-close" onclick="App.delTask(${t.id})">&times;</button>
            `;
            DOM.tasks.appendChild(el);
        });

        // Update Proactive Focus Card
        DOM.focusArea.innerText = topPriority;

        // Update Modern Circular Progress Ring
        const total = state.data.tasks.length;
        const percent = total > 0 ? (doneCount / total) * 100 : 0;
        
        DOM.statsArea.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <div class="progress-circle" style="--p:${Math.round(percent)}">
                    <span>${Math.round(percent)}%</span>
                </div>
                <div>
                    <div style="font-weight:700; font-size:18px;">${doneCount}/${total}</div>
                    <div style="font-size:11px; color:var(--text-muted);">Goals Completed</div>
                </div>
            </div>
        `;
        if(DOM.inboxCount) DOM.inboxCount.innerText = count;
    };

    const renderTimeline = () => {
        if(!DOM.timeline) return;
        DOM.timeline.innerHTML = '';
        for (let i = 6; i <= 23; i++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.setAttribute('data-time', i > 12 ? `${i-12} PM` : (i === 12 ? "12 PM" : `${i} AM`));
            slot.ondragover = (e) => e.preventDefault();
            slot.ondrop = (e) => {
                e.preventDefault();
                if (state.movingBlockIndex !== null) state.data.blocks[state.movingBlockIndex].start = i;
                else if (state.draggedTaskId) state.data.blocks.push({ taskId: state.draggedTaskId, start: i, duration: 1 });
                save(); renderTimeline();
            };
            DOM.timeline.appendChild(slot);
        }

        state.data.blocks.forEach((b, idx) => {
            const task = state.data.tasks.find(t => t.id === b.taskId);
            if (!task) return;
            const others = state.data.blocks.filter(other => other.start === b.start);
            const block = document.createElement('div');
            
            // SIDE-BY-SIDE LOGIC
            const overlapIndex = others.indexOf(b);
            block.className = `block ${others.length > 1 ? 'overlap-' + (overlapIndex + 1) : ''}`;
            
            block.style.top = `${(b.start - 6) * 70 + 5}px`;
            block.style.height = `${(b.duration * 70) - 10}px`;
            block.draggable = true;
            
            block.innerHTML = `
                <span style="font-weight:600;">${task.text}</span>
                <div class="duration-controls" style="pointer-events: auto;">
                    <span onclick="event.stopPropagation(); App.adj(${idx}, -1)" class="duration-btn">−</span>
                    <span onclick="event.stopPropagation(); App.adj(${idx}, 1)" class="duration-btn">+</span>
                    <span onclick="event.stopPropagation(); App.rem(${idx})" class="duration-btn">×</span>
                </div>`;
                
            block.ondragstart = () => { state.movingBlockIndex = idx; state.draggedTaskId = null; };
            DOM.timeline.appendChild(block);
        });
    };

    // --- PROACTIVE HEARTBEAT: Checks for upcoming tasks ---
    const startHeartbeat = () => {
        setInterval(() => {
            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();
            if (m === 0) { // On the hour
                const currentBlock = state.data.blocks.find(b => b.start === h);
                if (currentBlock) {
                    const task = state.data.tasks.find(t => t.id === currentBlock.taskId);
                    if (task && !task.done) sendNotification("Trackler AI Alert", `Time to start: ${task.text}`);
                }
            }
        }, 60000);
    };

    window.App = {
        toggle: (id) => {
            const t = state.data.tasks.find(x => x.id === id);
            if(t) {
                t.done = !t.done;
                if(t.done) playSound('success');
                save(); renderTasks(); renderTimeline();
            }
        },
        delTask: (id) => {
            state.data.tasks = state.data.tasks.filter(x => x.id !== id);
            state.data.blocks = state.data.blocks.filter(b => b.taskId !== id);
            save(); renderTasks(); renderTimeline();
        },
        adj: (idx, amt) => { 
            if(state.data.blocks[idx]) {
                state.data.blocks[idx].duration = Math.max(1, state.data.blocks[idx].duration + amt); 
                save(); renderTimeline(); 
            }
        },
        rem: (idx) => { state.data.blocks.splice(idx, 1); save(); renderTimeline(); }
    };

    const handleChat = () => {
        const val = DOM.chatInput.value.trim();
        if (!val) return;
        
        // Display user message
        const userMsg = document.createElement('div');
        userMsg.className = 'msg user-msg';
        userMsg.innerText = val;
        DOM.chatMessages.appendChild(userMsg);

        // --- PROACTIVE NLP PARSING ---
        const lower = val.toLowerCase();
        // Priority Detection (Case Insensitive)
        const priorityKeywords = ['urgent', 'important', 'asap', 'focus', 'deadline', 'must'];
        const isFocus = lower.startsWith('f:') || priorityKeywords.some(kw => lower.includes(kw));

        // Time Detection (@14 or at 2)
        const timeMatch = val.match(/@(\d{1,2})/) || val.match(/at\s(\d{1,2})/);
        let hour = timeMatch ? parseInt(timeMatch[1]) : null;
        if (hour !== null && hour < 7) hour += 12; // Smart PM correction

        // Clean text for the task card
        const cleanText = val.replace(/@\d+/, '').replace(/at\s\d+/, '').replace('f:', '').trim();

        const taskId = Date.now();
        state.data.tasks.push({ id: taskId, text: cleanText, focus: isFocus, done: false });

        // PROACTIVE CONFLICT CHECK
        let response = `Added "${cleanText}" to your inbox.`;
        if(hour && hour >= 6 && hour <= 23) {
            const conflict = state.data.blocks.find(b => b.start === hour);
            state.data.blocks.push({ taskId, start: hour, duration: 1 });
            response = conflict ? 
                `Scheduled "${cleanText}" at ${hour}:00. Warning: This overlaps with an existing task!` : 
                `Scheduled "${cleanText}" for ${hour}:00.`;
        } else if (isFocus) {
            response = `Added "${cleanText}" as a High Priority task.`;
        }

        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'msg ai-msg';
            aiMsg.innerText = response;
            DOM.chatMessages.appendChild(aiMsg);
            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        }, 600);

        save(); renderTasks(); renderTimeline();
        DOM.chatInput.value = '';
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    };

    const init = () => {
        if ("Notification" in window) Notification.requestPermission();
        renderTasks(); renderTimeline(); startHeartbeat();
        
        DOM.fab.onclick = (e) => { e.stopPropagation(); DOM.chatWindow.classList.toggle('open'); };
        document.getElementById('closeChat').onclick = () => DOM.chatWindow.classList.remove('open');
        
        document.getElementById('sendTaskBtn').onclick = handleChat;
        DOM.chatInput.onkeydown = (e) => { if(e.key === 'Enter') handleChat(); };

        // Sidebar Navigation
        document.querySelectorAll('.nav').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.nav').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden-view'));
                document.getElementById(btn.dataset.target).classList.remove('hidden-view');
            };
        });

        // Category Filters
        document.querySelectorAll('.tag').forEach(tag => {
            tag.onclick = () => {
                document.querySelectorAll('.tag').forEach(t => t.classList.remove('active-tag'));
                tag.classList.add('active-tag');
                state.currentFilter = tag.dataset.filter;
                renderTasks();
            };
        });
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
