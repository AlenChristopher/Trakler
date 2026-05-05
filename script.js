/**
 * Trakler AI Planner - Production Logic
 * Handles State, Drag & Drop (Timeline + Bin), and Chat Interactions
 */
const App = (function() {
  
  // App State
  const state = {
    data: JSON.parse(localStorage.getItem("trakler_prod")) || { tasks: [], blocks: [] },
    currentFilter: 'all',
    draggedTaskId: null
  };

  // DOM Elements
  const DOM = {
    tasksContainer: document.getElementById('tasks'),
    timeline: document.getElementById('timeline'),
    focusArea: document.getElementById('focus-area'),
    statsArea: document.getElementById('stats-area'),
    inboxCount: document.getElementById('inbox-count'),
    chatInput: document.getElementById('chatInput'),
    chatMessages: document.getElementById('chatMessages'),
    systemToast: document.getElementById('systemToast'),
    recycleBin: document.getElementById('recycleBin')
  };

  let toastTimeout;

  // Utilities
  const saveState = () => localStorage.setItem("trakler_prod", JSON.stringify(state.data));
  const sanitize = (str) => { const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML; };

  const notify = (msg) => {
    DOM.systemToast.innerText = msg;
    DOM.systemToast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => DOM.systemToast.classList.remove('show'), 3000);
  };

  // Render Engine
  const renderDashboard = () => {
    const fragment = document.createDocumentFragment();
    let doneCount = 0;

    state.data.tasks.forEach(t => {
      if (t.done) doneCount++;
      if (state.currentFilter === 'focus' && (!t.focus || t.done)) return;
      if (state.currentFilter === 'completed' && !t.done) return;
      if (state.currentFilter === 'all' && t.done) return;

      const taskEl = document.createElement('div');
      taskEl.className = `task ${t.focus ? "focus-task" : ""} ${t.done ? "completed" : ""}`;
      taskEl.draggable = true;
      taskEl.dataset.id = t.id;

      taskEl.innerHTML = `
        <div class="task-content">
          <input type="checkbox" ${t.done ? "checked" : ""} aria-label="Mark task complete">
          <span class="task-text">${sanitize(t.text)}</span>
        </div>
        <button class="delete-btn icon-btn" aria-label="Delete task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;

      taskEl.addEventListener('dragstart', (e) => {
        state.draggedTaskId = t.id;
        e.dataTransfer.effectAllowed = 'move';
        document.body.classList.add('is-dragging'); 
        setTimeout(() => taskEl.classList.add('dragging'), 0);
      });
      
      taskEl.addEventListener('dragend', () => {
        taskEl.classList.remove('dragging');
        document.body.classList.remove('is-dragging'); 
        state.draggedTaskId = null;
      });

      fragment.appendChild(taskEl);
    });

    DOM.tasksContainer.innerHTML = '';
    if (fragment.children.length === 0) {
      DOM.tasksContainer.innerHTML = `<p class="text-muted" style="text-align: center; margin-top: 40px;">No tasks in this view.</p>`;
    } else {
      DOM.tasksContainer.appendChild(fragment);
    }

    const total = state.data.tasks.length;
    DOM.inboxCount.innerText = total - doneCount;

    const urgentTasks = state.data.tasks.filter(t => t.focus && !t.done);
    DOM.focusArea.innerHTML = urgentTasks.length 
      ? urgentTasks.slice(0, 2).map(t => `<div style="color: #fff; margin-bottom: 4px;">• ${sanitize(t.text)}</div>`).join('')
      : "No urgent tasks right now. Relax!";

    const percent = total ? Math.round((doneCount / total) * 100) : 0;
    DOM.statsArea.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Total: ${total}</span><span>Completed: ${doneCount}</span>
      </div>
      <div style="width: 100%; background: rgba(255,255,255,0.1); border-radius: 10px; height: 8px; overflow: hidden;">
        <div style="width: ${percent}%; background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple)); height: 100%; transition: width 0.5s ease;"></div>
      </div>
    `;
  };

  const renderTimeline = () => {
    const fragment = document.createDocumentFragment();
    
    for (let i = 6; i <= 23; i++) {
      const slot = document.createElement('div');
      slot.className = 'time-slot';
      slot.setAttribute('data-time', i > 12 ? `${i - 12} PM` : (i === 12 ? "12 PM" : `${i} AM`));
      
      slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        if (!state.draggedTaskId) return;

        state.data.blocks.push({ taskId: state.draggedTaskId, start: i, duration: 1 });
        notify(`Scheduled for ${slot.getAttribute('data-time')} ⏱`);
        saveState();
        renderTimeline();
      });

      fragment.appendChild(slot);
    }

    state.data.blocks.forEach((b, index) => {
      const t = state.data.tasks.find(x => x.id === b.taskId);
      if (!t) return;

      const block = document.createElement('div');
      block.className = `block ${t.focus ? "focus" : ""}`;
      block.style.top = `${(b.start - 6) * 60 + 5}px`;
      block.style.height = `${(b.duration * 60) - 10}px`;
      
      block.innerHTML = `
        <span>${sanitize(t.text)}</span>
        <button class="icon-btn remove-block" data-index="${index}" style="color: white; opacity: 0.8;" aria-label="Remove from schedule">&times;</button>
      `;
      fragment.appendChild(block);
    });

    DOM.timeline.innerHTML = '';
    DOM.timeline.appendChild(fragment);
  };

  // Controllers
  const initControllers = () => {
    // Nav
    document.querySelectorAll('.nav').forEach(nav => {
      nav.addEventListener('click', (e) => {
        document.querySelectorAll('.nav').forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });
        e.target.classList.add('active'); e.target.setAttribute('aria-current', 'page');

        document.querySelectorAll('.view-section').forEach(view => view.classList.add('hidden-view', 'active-view'));
        const targetView = document.getElementById(e.target.dataset.target);
        targetView.classList.remove('hidden-view');
        setTimeout(() => targetView.classList.add('active-view'), 10);
      });
    });

    // Filters
    document.querySelectorAll('.tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        document.querySelectorAll('.tag').forEach(t => t.classList.remove('active-tag'));
        e.currentTarget.classList.add('active-tag');
        state.currentFilter = e.currentTarget.dataset.filter;
        renderDashboard();
      });
    });

    // Task Interactions
    DOM.tasksContainer.addEventListener('click', (e) => {
      const taskEl = e.target.closest('.task');
      if (!taskEl) return;
      const taskId = parseInt(taskEl.dataset.id);

      if (e.target.type === 'checkbox') {
        const task = state.data.tasks.find(t => t.id === taskId);
        task.done = !task.done;
        if(task.done) notify("Task complete. Great focus! 🎉");
        saveState();
        renderDashboard();
      }

      if (e.target.closest('.delete-btn')) {
        state.data.tasks = state.data.tasks.filter(t => t.id !== taskId);
        state.data.blocks = state.data.blocks.filter(b => b.taskId !== taskId);
        saveState();
        renderDashboard();
        renderTimeline();
      }
    });

    // Timeline Block Removal
    DOM.timeline.addEventListener('click', (e) => {
      if(e.target.classList.contains('remove-block')) {
        state.data.blocks.splice(e.target.dataset.index, 1);
        saveState();
        renderTimeline();
      }
    });

    // Drag to Delete Bin
    DOM.recycleBin.addEventListener('dragover', (e) => { e.preventDefault(); DOM.recycleBin.classList.add('drag-over'); });
    DOM.recycleBin.addEventListener('dragleave', () => DOM.recycleBin.classList.remove('drag-over'));
    DOM.recycleBin.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.recycleBin.classList.remove('drag-over');
      if (!state.draggedTaskId) return;

      state.data.tasks = state.data.tasks.filter(t => t.id !== state.draggedTaskId);
      state.data.blocks = state.data.blocks.filter(b => b.taskId !== state.draggedTaskId);
      
      DOM.recycleBin.classList.add('deleted-action');
      setTimeout(() => DOM.recycleBin.classList.remove('deleted-action'), 400);

      notify("Task destroyed. 🗑️");
      saveState();
      renderDashboard();
      renderTimeline();
    });

    // Chatbot
    const chatWindow = document.getElementById('chatWindow');
    const chatFab = document.getElementById('chatFab');
    
    chatFab.addEventListener('click', () => {
      const isOpen = chatWindow.classList.toggle('open');
      chatFab.setAttribute('aria-expanded', isOpen);
      if(isOpen) DOM.chatInput.focus();
    });

    document.getElementById('closeChat').addEventListener('click', () => {
      chatWindow.classList.remove('open');
      chatFab.setAttribute('aria-expanded', 'false');
    });

    const processChatInput = () => {
      let text = DOM.chatInput.value.trim();
      if (!text) return;

      const msgEl = document.createElement('div');
      msgEl.className = 'msg user-msg';
      msgEl.innerText = text;
      DOM.chatMessages.appendChild(msgEl);
      DOM.chatInput.value = "";
      DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;

      const focus = text.startsWith("f:");
      if (focus) text = text.replace("f:", "").trim();

      state.data.tasks.push({ id: Date.now(), text, focus, done: false });
      saveState();
      
      document.querySelector('.tag[data-filter="all"]').click();

      setTimeout(() => {
        const replyEl = document.createElement('div');
        replyEl.className = 'msg ai-msg';
        replyEl.innerText = focus ? `Got it. I've highlighted "${text}" as top priority. ⚡` : `Added "${text}" to your inbox! ✔️`;
        DOM.chatMessages.appendChild(replyEl);
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
      }, 500);
    };

    document.getElementById('sendTaskBtn').addEventListener('click', processChatInput);
    DOM.chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') processChatInput(); });
  };

  // Init
  return {
    init: () => {
      initControllers();
      renderDashboard();
      renderTimeline();
      setTimeout(() => notify("System online. Welcome to Trakler. 👋"), 800);
    }
  };

})();

document.addEventListener('DOMContentLoaded', App.init);
