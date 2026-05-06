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
        chatInput: document.getElementById('chatInput'),
        toast: document.getElementById('systemToast')
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

            el.ondragstart = () => { state.draggedTaskId = t.id; };
            DOM.tasks.appendChild(el);
        });
        if(DOM.inboxCount) DOM.inboxCount.innerText = count;
    };

    const renderTimeline = () => {
        if(!DOM.timeline) return;
        DOM.timeline.innerHTML = '';
        
        for (let i = 6; i <= 23; i++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            const label = i > 12 ? `${i-12} PM` : (i === 12 ? "12 PM" : `${i} AM`);
            slot.setAttribute('data-time', label);
            
            // Logic to keep blocks INSIDE the slot (Fixes the "Bottom" issue)
            const hourBlocks = state.data.blocks.filter(b => b.start === i);
            hourBlocks.forEach((b) => {
                const task = state.data.tasks.find(t => t.id === b.taskId);
                if (!task) return;

                const block = document.createElement('div');
                // FIXED: Removed the 'Short' variable that was crashing the script
                block.className = `block ${task.focus ? 'focus' : ''} ${task.done ? 'completed-block' : ''}`;
                block.style.height = `${(b.duration * 60) - 10}px`;
                
                block.innerHTML = `
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${task.text}</span>
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
                notify(`Scheduled for ${label}`);
            };
            DOM.timeline.appendChild(slot);
        }
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
        renderTasks();
        renderTimeline();
        
        // Chat Logic
        const sendBtn = document.getElementById('sendTaskBtn');
        if(sendBtn) {
            sendBtn.onclick = () => {
                let val = document.getElementById('chatInput').value.trim();
                if(!val) return;
                state.data.tasks.push({ id: Date.now(), text: val, focus: val.startsWith('f:'), done: false });
                save(); renderTasks();
                document.getElementById('chatInput').value = '';
            };
        }

        // Filter Logic
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
