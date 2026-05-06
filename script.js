const App = (function() {
    const state = {
        data: JSON.parse(localStorage.getItem("trakler_v2")) || { tasks: [], blocks: [] },
        currentFilter: 'all',
        draggedTaskId: null,
        movingBlockIndex: null // Tracks if we are moving an existing block
    };

    const DOM = {
        tasks: document.getElementById('tasks'),
        timeline: document.getElementById('timeline'),
        inboxCount: document.getElementById('inbox-count'),
        chatInput: document.getElementById('chatInput'),
        toast: document.getElementById('systemToast'),
        chatWindow: document.getElementById('chatWindow'),
        fab: document.getElementById('chatFab')
    };

    const save = () => localStorage.setItem("trakler_v2", JSON.stringify(state.data));

    const notify = (msg) => {
        if(!DOM.toast) return;
        DOM.toast.innerText = msg;
        DOM.toast.classList.add('show');
        setTimeout(() => DOM.toast.classList.remove('show'), 3000);
    };

    const renderTasks = () => {
        if(!DOM.tasks) return;
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
            };

            el.querySelector('.del-btn').onclick = () => {
                state.data.tasks = state.data.tasks.filter(x => x.id !== t.id);
                state.data.blocks = state.data.blocks.filter(b => b.taskId !== t.id);
                save(); renderTasks(); renderTimeline();
            };

            el.ondragstart = () => { 
                state.draggedTaskId = t.id; 
                state.movingBlockIndex = null; // We are dragging a NEW task
            };
            DOM.tasks.appendChild(el);
        });
        if(DOM.inboxCount) DOM.inboxCount.innerText = count;
    };

    const renderTimeline = () => {
        if(!DOM.timeline) return;
        DOM.timeline.innerHTML = '';
        
        // 1. Render Hour Slots
        for (let i = 6; i <= 23; i++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            const label = i > 12 ? `${i-12} PM` : (i === 12 ? "12 PM" : `${i} AM`);
            slot.setAttribute('data-time', label);
            
            slot.ondragover = (e) => e.preventDefault();
            slot.ondrop = (e) => {
                e.preventDefault();
                if (state.movingBlockIndex !== null) {
                    state.data.blocks[state.movingBlockIndex].start = i;
                } else if (state.draggedTaskId) {
                    state.data.blocks.push({ taskId: state.draggedTaskId, start: i, duration: 1 });
                }
                save(); renderTimeline();
            };
            DOM.timeline.appendChild(slot);
        }

        // 2. Render Floating Blocks
        state.data.blocks.forEach((b, idx) => {
            const task = state.data.tasks.find(t => t.id === b.taskId);
            if (!task) return;

            const othersInSameHour = state.data.blocks.filter(other => other.start === b.start);
            const overlapIndex = othersInSameHour.indexOf(b);
            const overlapClass = othersInSameHour.length > 1 ? `overlap-${overlapIndex + 1}` : '';

            const block = document.createElement('div');
            block.className = `block ${overlapClass} ${task.focus ? 'focus' : ''} ${task.done ? 'completed-block' : ''}`;
            
            const topPos = (b.start - 6) * 70;
            block.style.top = `${topPos + 5}px`;
            block.style.height = `${(b.duration * 70) - 10}px`;
            block.draggable = true;

            block.innerHTML = `
                <span style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${task.text}</span>
                <div class="duration-controls">
                    <span onclick="event.stopPropagation(); App.adj(${idx}, -1)" class="duration-btn">-</span>
                    <span onclick="event.stopPropagation(); App.adj(${idx}, 1)" class="duration-btn">+</span>
                    <span onclick="event.stopPropagation(); App.rem(${idx})" style="margin-left:5px; cursor:pointer;">&times;</span>
                </div>
            `;

            block.ondragstart = (e) => {
                state.movingBlockIndex = idx;
                state.draggedTaskId = null;
            };

            DOM.timeline.appendChild(block);
        });
    };

    const startClock = () => {
        const hHand = document.getElementById('hour-hand');
        const mHand = document.getElementById('minute-hand');
        const sHand = document.getElementById('second-hand');
        const dTime = document.getElementById('digital-time');

        const update = () => {
            const now = new Date();
            const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
            // Added check to ensure clock elements exist before trying to style them
            if(sHand) sHand.style.transform = `translateX(-50%) rotate(${(s/60)*360}deg)`;
            if(mHand) mHand.style.transform = `translateX(-50%) rotate(${(m/60)*360 + (s/60)*6}deg)`;
            if(hHand) hHand.style.transform = `translateX(-50%) rotate(${(h % 12 / 12) * 360 + (m / 60) * 30}deg)`;
            if(dTime) dTime.innerText = now.toLocaleTimeString([], {hour12: false});
        };
        setInterval(update, 1000); update();
    };

    window.App = {
        adj: (idx, amt) => {
            if (state.data.blocks[idx]) {
                state.data.blocks[idx].duration = Math.max(1, state.data.blocks[idx].duration + amt);
                save(); renderTimeline();
            }
        },
        rem: (idx) => {
            state.data.blocks.splice(idx, 1);
            save(); renderTimeline();
        }
    };

    const init = () => {
        renderTasks(); renderTimeline(); startClock();
        
        if(DOM.fab && DOM.chatWindow) {
            DOM.fab.onclick = (e) => {
                e.stopPropagation();
                DOM.chatWindow.classList.toggle('open');
            };
            const closeBtn = document.getElementById('closeChat');
            if(closeBtn) closeBtn.onclick = () => DOM.chatWindow.classList.remove('open');
        }

        const sendBtn = document.getElementById('sendTaskBtn');
        if(sendBtn) {
            sendBtn.onclick = () => {
                let val = DOM.chatInput.value.trim();
                if(!val) return;
                state.data.tasks.push({ id: Date.now(), text: val, focus: val.startsWith('f:'), done: false });
                save(); renderTasks();
                DOM.chatInput.value = '';
                notify("Task added!");
            };
        }

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
