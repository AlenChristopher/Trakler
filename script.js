const App = (function() {
    const state = {
        data: JSON.parse(localStorage.getItem("trakler_v2")) || { tasks: [], blocks: [] },
        currentFilter: 'all',
        draggedTaskId: null
    };

    const DOM = {
        tasks: document.getElementById('tasks'),
        timeline: document.getElementById('timeline'),
        inboxCount: document.getElementById('inbox-count'),
        focusArea: document.getElementById('focus-area'),
        statsArea: document.getElementById('stats-area'),
        chatInput: document.getElementById('chatInput'),
        chatMessages: document.getElementById('chatMessages'),
        toast: document.getElementById('systemToast')
    };

    const save = () => localStorage.setItem("trakler_v2", JSON.stringify(state.data));

    const notify = (msg) => {
        DOM.toast.innerText = msg;
        DOM.toast.classList.add('show');
        setTimeout(() => DOM.toast.classList.remove('show'), 3000);
    };

    const renderTasks = () => {
        DOM.tasks.innerHTML = '';
        let count = 0;
        
        state.data.tasks.forEach(t => {
            if (!t.done) count++;
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

            el.querySelector('input').onchange = () => {
                t.done = !t.done;
                save(); renderTasks(); renderTimeline();
                if(t.done) notify("Task Finished! ✨");
            };

            el.querySelector('.del-btn').onclick = () => {
                state.data.tasks = state.data.tasks.filter(x => x.id !== t.id);
                state.data.blocks = state.data.blocks.filter(b => b.taskId !== t.id);
                save(); renderTasks(); renderTimeline();
            };

            el.ondragstart = (e) => {
                state.draggedTaskId = t.id;
                document.body.classList.add('is-dragging');
            };
            el.ondragend = () => document.body.classList.remove('is-dragging');

            DOM.tasks.appendChild(el);
        });

        DOM.inboxCount.innerText = count;
        const done = state.data.tasks.filter(t => t.done).length;
        const total = state.data.tasks.length;
        DOM.statsArea.innerHTML = `<p style="font-size:12px; margin-bottom:5px;">${done}/${total} Completed</p>
            <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
                <div style="width:${(done/total)*100 || 0}%; background:var(--accent-purple); height:100%; transition:0.5s;"></div>
            </div>`;
    };

    const renderTimeline = () => {
        DOM.timeline.innerHTML = '';
        for (let i = 6; i <= 23; i++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.dataset.time = i > 12 ? `${i-12}PM` : `${i}AM`;
            
            const hourBlocks = state.data.blocks.filter(b => b.start === i);
            hourBlocks.forEach((b, idx) => {
                const task = state.data.tasks.find(t => t.id === b.taskId);
                if (!task) return;

                const block = document.createElement('div');
                block.className = `block ${task.focus ? 'focus' : ''} ${task.done ? 'completed-block' : ''}`;
                block.style.height = `${(b.duration * 60) - 10}px`;
                block.innerHTML = `
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${task.text}</span>
                    <div class="duration-controls">
                        <span onclick="event.stopPropagation(); App.adj(${state.data.blocks.indexOf(b)}, -1)" class="duration-btn">-</span>
                        <span onclick="event.stopPropagation(); App.adj(${state.data.blocks.indexOf(b)}, 1)" class="duration-btn">+</span>
                        <span onclick="event.stopPropagation(); App.rem(${state.data.blocks.indexOf(b)})" style="margin-left:5px; cursor:pointer;">&times;</span>
                    </div>
                `;
                slot.appendChild(block);
            });

            slot.ondragover = (e) => e.preventDefault();
            slot.ondrop = (e) => {
                e.preventDefault();
                if (!state.draggedTaskId) return;
                state.data.blocks.push({ taskId: state.draggedTaskId, start: i, duration: 1 });
                save(); renderTimeline();
            };
            DOM.timeline.appendChild(slot);
        }
    };

    // Global App object for HTML onclicks
    window.App = {
        adj: (idx, amt) => {
            state.data.blocks[idx].duration = Math.max(1, state.data.blocks[idx].duration + amt);
            save(); renderTimeline();
        },
        rem: (idx) => {
            state.data.blocks.splice(idx, 1);
            save(); renderTimeline();
        }
    };

    // Initialize UI
    const init = () => {
        renderTasks(); renderTimeline();
        
        // Chat Logic
        const fab = document.getElementById('chatFab');
        const win = document.getElementById('chatWindow');
        fab.onclick = () => win.classList.toggle('open');
        document.getElementById('closeChat').onclick = () => win.classList.remove('open');

        const sendTask = () => {
            let val = DOM.chatInput.value.trim();
            if(!val) return;
            const focus = val.startsWith('f:');
            if(focus) val = val.replace('f:', '').trim();
            
            state.data.tasks.push({ id: Date.now(), text: val, focus, done: false });
            save(); renderTasks();
            DOM.chatInput.value = '';
            notify("Added to Inbox");
        };

        document.getElementById('sendTaskBtn').onclick = sendTask;
        DOM.chatInput.onkeydown = (e) => { if(e.key === 'Enter') sendTask(); };

        // Filter Logic
        document.querySelectorAll('.tag').forEach(tag => {
            tag.onclick = () => {
                document.querySelectorAll('.tag').forEach(t => t.classList.remove('active-tag'));
                tag.classList.add('active-tag');
                state.currentFilter = tag.dataset.filter;
                renderTasks();
            };
        });

        // Sidebar Navigation
        document.querySelectorAll('.nav').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.nav').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden-view'));
                document.getElementById(btn.dataset.target).classList.remove('hidden-view');
            };
        });
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
