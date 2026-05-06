const App = (function() {
    const state = {
        data: JSON.parse(localStorage.getItem("trakler_v2")) || { tasks: [], blocks: [] },
        currentFilter: 'all'
    };

    const save = () => localStorage.setItem("trakler_v2", JSON.stringify(state.data));

    // SUCCESS SOUND
    const playSuccessSound = () => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(523, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    };

    const renderTasks = () => {
        const container = document.getElementById('tasks');
        const stats = document.getElementById('stats-area');
        if(!container) return;
        
        container.innerHTML = '';
        let done = 0;

        state.data.tasks.forEach(t => {
            if(t.done) done++;
            const el = document.createElement('div');
            el.className = `task ${t.focus ? 'focus-task' : ''}`;
            el.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="App.toggle(${t.id})">
                    <span>${t.text}</span>
                </div>
                <button onclick="App.delete(${t.id})" style="background:none;border:none;color:#ff4d4d;font-size:20px;cursor:pointer;">&times;</button>
            `;
            container.appendChild(el);
        });

        // UPDATE PROGRESS RING
        const total = state.data.tasks.length;
        const percent = total > 0 ? (done / total) * 100 : 0;
        stats.innerHTML = `
            <div class="progress-circle" style="--p:${Math.round(percent)}">
                <span>${Math.round(percent)}%</span>
            </div>
        `;
    };

    window.App = {
        toggle: (id) => {
            const t = state.data.tasks.find(x => x.id === id);
            if(t) {
                t.done = !t.done;
                if(t.done) playSuccessSound(); // PLAY SOUND
                save(); renderTasks(); // UPDATE RING
            }
        },
        delete: (id) => {
            state.data.tasks = state.data.tasks.filter(x => x.id !== id);
            save(); renderTasks();
        }
    };

    const startClock = () => {
        const update = () => {
            const now = new Date(), s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
            const sH = document.getElementById('second-hand'), mH = document.getElementById('minute-hand'), hH = document.getElementById('hour-hand');
            if(sH) sH.style.transform = `translateX(-50%) rotate(${(s/60)*360}deg)`;
            if(mH) mH.style.transform = `translateX(-50%) rotate(${(m/60)*360}deg)`;
            if(hH) hH.style.transform = `translateX(-50%) rotate(${(h%12/12)*360 + (m/60)*30}deg)`;
            document.getElementById('digital-time').innerText = now.toLocaleTimeString();
        };
        setInterval(update, 1000); update();
    };

    const init = () => {
        startClock(); renderTasks();
        document.getElementById('chatFab').onclick = () => document.getElementById('chatWindow').classList.toggle('open');
        document.getElementById('closeChat').onclick = () => document.getElementById('chatWindow').classList.remove('open');
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
