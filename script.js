const App = (function() {
    const state = {
        data: JSON.parse(localStorage.getItem("trakler_v2")) || { tasks: [], blocks: [] },
        currentFilter: 'all'
    };

    const DOM = {
        tasks: document.getElementById('tasks'),
        timeline: document.getElementById('timeline'),
        chatInput: document.getElementById('chatInput'),
        chatMessages: document.getElementById('chatMessages'),
        chatWindow: document.getElementById('chatWindow'),
        fab: document.getElementById('chatFab')
    };

    const save = () => localStorage.setItem("trakler_v2", JSON.stringify(state.data));

    // AUDIO ENGINE
    const playSound = (type) => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(type === 'success' ? 523 : 440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    };

    // CLOCK ENGINE
    const startClock = () => {
        const update = () => {
            const now = new Date(), s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
            const sHand = document.getElementById('second-hand');
            const mHand = document.getElementById('minute-hand');
            const hHand = document.getElementById('hour-hand');
            const dTime = document.getElementById('digital-time');

            if(sHand) sHand.style.transform = `translateX(-50%) rotate(${(s/60)*360}deg)`;
            if(mHand) mHand.style.transform = `translateX(-50%) rotate(${(m/60)*360}deg)`;
            if(hHand) hHand.style.transform = `translateX(-50%) rotate(${(h%12/12)*360 + (m/60)*30}deg)`;
            if(dTime) dTime.innerText = now.toLocaleTimeString();
        };
        setInterval(update, 1000); update();
    };

    const renderTasks = () => {
        if(!DOM.tasks) return;
        DOM.tasks.innerHTML = '';
        let doneCount = 0;

        state.data.tasks.forEach(t => {
            if(t.done) doneCount++;
            const el = document.createElement('div');
            el.className = `task ${t.focus ? 'focus-task' : ''}`;
            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="App.toggle(${t.id})">
                    <span>${t.text}</span>
                </div>
                <button onclick="App.delete(${t.id})" style="background:none; border:none; color:#ef4444; font-size:18px;">&times;</button>
            `;
            DOM.tasks.appendChild(el);
        });

        // UPDATE PROGRESS RING
        const percent = state.data.tasks.length > 0 ? (doneCount / state.data.tasks.length) * 100 : 0;
        document.getElementById('stats-area').innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="font-weight:700; font-size:18px;">${Math.round(percent)}%</div>
                <div style="font-size:11px;">Completed</div>
            </div>
        `;
    };

    window.App = {
        toggle: (id) => {
            const t = state.data.tasks.find(x => x.id === id);
            if(t) { t.done = !t.done; if(t.done) playSound('success'); save(); renderTasks(); }
        },
        delete: (id) => {
            state.data.tasks = state.data.tasks.filter(x => x.id !== id);
            save(); renderTasks();
        }
    };

    const handleChat = () => {
        const val = DOM.chatInput.value.trim();
        if(!val) return;

        // SMART NLP
        const isFocus = ['urgent', 'important', 'asap'].some(kw => val.toLowerCase().includes(kw));
        const timeMatch = val.match(/@(\d{1,2})/);
        const hour = timeMatch ? parseInt(timeMatch[1]) : null;

        const taskId = Date.now();
        state.data.tasks.push({ id: taskId, text: val.replace(/@\d+/, '').trim(), focus: isFocus, done: false });
        
        save(); renderTasks();
        DOM.chatInput.value = '';
    };

    const init = () => {
        startClock(); renderTasks();
        DOM.fab.onclick = () => DOM.chatWindow.classList.toggle('open');
        document.getElementById('closeChat').onclick = () => DOM.chatWindow.classList.remove('open');
        document.getElementById('sendTaskBtn').onclick = handleChat;
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
