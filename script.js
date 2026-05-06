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
        fab: document.getElementById('chatFab')
    };

    const save = () => localStorage.setItem("trakler_v2", JSON.stringify(state.data));

    const renderTasks = () => {
        if(!DOM.tasks) return;
        DOM.tasks.innerHTML = '';
        let count = 0, doneCount = 0, priorityText = "None";

        state.data.tasks.forEach(t => {
            if (!t.done) count++;
            if (t.done) doneCount++;
            if (t.focus && !t.done && priorityText === "None") priorityText = t.text;

            if (state.currentFilter === 'focus' && (!t.focus || t.done)) return;
            if (state.currentFilter === 'completed' && !t.done) return;
            if (state.currentFilter === 'all' && t.done) return;

            const el = document.createElement('div');
            el.className = `task ${t.focus ? 'focus-task' : ''} ${t.done ? 'completed' : ''}`;
            el.draggable = true;
            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="checkbox" ${t.done ? 'checked' : ''}>
                    <span class="task-text">${t.text}</span>
                </div>
                <button class="del-btn" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button>
            `;

            el.querySelector('input').onchange = () => { t.done = !t.done; save(); renderTasks(); renderTimeline(); };
            el.querySelector('.del-btn').onclick = () => {
                state.data.tasks = state.data.tasks.filter(x => x.id !== t.id);
                state.data.blocks = state.data.blocks.filter(b => b.taskId !== t.id);
                save(); renderTasks(); renderTimeline();
            };
            el.ondragstart = () => { state.draggedTaskId = t.id; state.movingBlockIndex = null; };
            DOM.tasks.appendChild(el);
        });

        document.getElementById('focus-area').innerText = priorityText;
        const percent = state.data.tasks.length > 0 ? (doneCount / state.data.tasks.length) * 100 : 0;
        document.getElementById('stats-area').innerHTML = `
            <div style="font-size:12px; margin-bottom:5px;">${doneCount}/${state.data.tasks.length} Done</div>
            <div class="progress-container"><div class="progress-bar" style="width: ${percent}%"></div></div>
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
            
            // Fixed side-by-side logic
            const overlapIndex = others.indexOf(b);
            block.className = `block ${others.length > 1 ? 'overlap-' + (overlapIndex + 1) : ''}`;
            
            block.style.top = `${(b.start - 6) * 70 + 5}px`;
            block.style.height = `${(b.duration * 70) - 10}px`;
            block.draggable = true;
            
            // pointer-events: auto on buttons ensures +/- works while block is draggable
            block.innerHTML = `
                <span style="font-weight:600;">${task.text}</span>
                <div class="duration-controls" style="pointer-events: auto;">
                    <span onclick="event.stopPropagation(); App.adj(${idx}, -1)" class="duration-btn">−</span>
                    <span onclick="event.stopPropagation(); App.adj(${idx}, 1)" class="duration-btn">+</span>
                    <span onclick="event.stopPropagation(); App.rem(${idx})" class="duration-btn" style="color:#ff4d4d;">×</span>
                </div>`;
                
            block.ondragstart = () => { state.movingBlockIndex = idx; state.draggedTaskId = null; };
            DOM.timeline.appendChild(block);
        });
    };

    const addChatMessage = (text, type) => {
        const msg = document.createElement('div');
        msg.className = `msg ${type}-msg`;
        msg.innerText = text;
        DOM.chatMessages.appendChild(msg);
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    };

    const startClock = () => {
        const hHand = document.getElementById('hour-hand');
        const mHand = document.getElementById('minute-hand');
        const sHand = document.getElementById('second-hand');
        const dTime = document.getElementById('digital-time');

        const update = () => {
            const now = new Date(), s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
            if(sHand) sHand.style.transform = `translateX(-50%) rotate(${(s/60)*360}deg)`;
            if(mHand) mHand.style.transform = `translateX(-50%) rotate(${(m/60)*360 + (s/60)*6}deg)`;
            if(hHand) hHand.style.transform = `translateX(-50%) rotate(${(h % 12 / 12) * 360 + (m / 60) * 30}deg)`;
            if(dTime) dTime.innerText = now.toLocaleTimeString();
        };
        setInterval(update, 1000); update();
    };

    window.App = {
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
        addChatMessage(val, "user");

        // 1. SMART PRIORITY DETECTION
        const priorityKeywords = ['urgent', 'important', 'deadline', 'must', 'focus', 'asap'];
        let isFocus = val.toLowerCase().startsWith('f:') || 
                      priorityKeywords.some(word => val.toLowerCase().includes(word));

        // 2. SMART TIME DETECTION (Looks for @12, @12:00, or "at 12")
        const timeMatch = val.match(/@(\d{1,2})(?::(\d{2}))?/) || val.match(/at\s(\d{1,2})(?::(\d{2}))?/);
        let scheduledHour = null;
        if (timeMatch) {
            scheduledHour = parseInt(timeMatch[1]);
            if (scheduledHour < 7) scheduledHour += 12; // Auto-PM adjustment
        }

        // 3. CLEAN TEXT
        const cleanText = val.replace(/@\d{1,2}(:\d{2})?/, '')
                            .replace(/at\s\d{1,2}(:\d{2})?/, '')
                            .replace('f:', '')
                            .trim();

        const taskId = Date.now();
        state.data.tasks.push({ id: taskId, text: cleanText, focus: isFocus, done: false });

        // 4. AUTO-SCHEDULE LOGIC
        if (scheduledHour >= 6 && scheduledHour <= 23) {
            state.data.blocks.push({ taskId: taskId, start: scheduledHour, duration: 1 });
            setTimeout(() => addChatMessage(`Scheduled "${cleanText}" for ${scheduledHour}:00.`, "ai"), 600);
        } else {
            setTimeout(() => addChatMessage(`Got it! Added "${cleanText}" to your inbox.`, "ai"), 600);
        }

        save(); renderTasks(); renderTimeline();
        DOM.chatInput.value = '';
    };

    const init = () => {
        renderTasks(); renderTimeline(); startClock();
        
        DOM.fab.onclick = (e) => { e.stopPropagation(); DOM.chatWindow.classList.toggle('open'); };
        document.getElementById('closeChat').onclick = () => DOM.chatWindow.classList.remove('open');
        
        if (DOM.chatMessages.children.length === 0) {
            setTimeout(() => addChatMessage("Hi! I'm Trackler AI. Try typing 'Meeting @14:00 urgent' or just a task name.", "ai"), 500);
        }

        document.getElementById('sendTaskBtn').onclick = handleChat;
        DOM.chatInput.onkeydown = (e) => { if(e.key === 'Enter') handleChat(); };

        // View Toggles
        document.querySelectorAll('.nav').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.nav').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden-view'));
                document.getElementById(btn.dataset.target).classList.remove('hidden-view');
            };
        });

        // Filters
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
