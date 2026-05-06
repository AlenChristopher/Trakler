const App = (function() {
    // 1. Storage & State
    const state = { 
        data: JSON.parse(localStorage.getItem("trakler_v2")) || { tasks: [], blocks: [] } 
    };
    const save = () => localStorage.setItem("trakler_v2", JSON.stringify(state.data));

    // 2. Success Sound (Proactive Feedback)
    const playSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(523, ctx.currentTime); // C5 note
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        } catch(e) { console.log("Sound interaction needed"); }
    };

    // 3. The Main Renderer
    const render = () => {
        const tasks = document.getElementById('tasks');
        const stats = document.getElementById('stats-area');
        const timeline = document.getElementById('timeline');
        
        if (!tasks) return;

        // Render Tasks
        tasks.innerHTML = '';
        let done = 0;
        state.data.tasks.forEach(t => {
            if (t.done) done++;
            const el = document.createElement('div');
            el.className = `task ${t.done ? 'completed' : ''}`;
            el.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="App.toggle(${t.id})">
                    <span>${t.text}</span>
                </div>
                <button onclick="App.del(${t.id})" style="background:none;border:none;color:red;cursor:pointer;">&times;</button>
            `;
            tasks.appendChild(el);
        });

        // Update Progress Ring
        const total = state.data.tasks.length;
        const percent = total > 0 ? (done / total) * 100 : 0;
        if (stats) {
            stats.innerHTML = `
                <div class="progress-circle" style="--p:${Math.round(percent)}">
                    <span>${Math.round(percent)}%</span>
                </div>
            `;
        }

        // Render Timeline Grid (6 AM to 11 PM)
        if (timeline) {
            timeline.innerHTML = '';
            for (let i = 6; i <= 23; i++) {
                const slot = document.createElement('div');
                slot.className = 'time-slot';
                slot.style.height = '70px';
                slot.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                slot.style.position = 'relative';
                slot.setAttribute('data-time', i > 12 ? `${i-12} PM` : (i === 12 ? "12 PM" : `${i} AM`));
                timeline.appendChild(slot);
            }

            // Draw scheduled blocks on top of grid
            state.data.blocks.forEach((b, idx) => {
                const task = state.data.tasks.find(t => t.id === b.taskId);
                if (!task) return;
                const block = document.createElement('div');
                block.className = 'block';
                block.style.top = `${(b.start - 6) * 70 + 5}px`;
                block.style.height = `${(b.duration * 70) - 10}px`;
                block.innerHTML = `<span>${task.text}</span> <button onclick="App.remBlock(${idx})">&times;</button>`;
                timeline.appendChild(block);
            });
        }
    };

    // 4. Clock Logic
    const startClock = () => {
        const update = () => {
            const now = new Date(), s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
            const sH = document.getElementById('second-hand'), 
                  mH = document.getElementById('minute-hand'), 
                  hH = document.getElementById('hour-hand');
            if (sH) sH.style.transform = `translateX(-50%) rotate(${(s/60)*360}deg)`;
            if (mH) mH.style.transform = `translateX(-50%) rotate(${(m/60)*360}deg)`;
            if (hH) hH.style.transform = `translateX(-50%) rotate(${(h%12/12)*360 + (m/60)*30}deg)`;
            const dt = document.getElementById('digital-time');
            if (dt) dt.innerText = now.toLocaleTimeString();
        };
        setInterval(update, 1000); update();
    };

    // Global Functions
    window.App = {
        toggle: (id) => {
            const t = state.data.tasks.find(x => x.id === id);
            if (t) {
                t.done = !t.done;
                if (t.done) playSound();
                save(); render();
            }
        },
        del: (id) => {
            state.data.tasks = state.data.tasks.filter(x => x.id !== id);
            state.data.blocks = state.data.blocks.filter(b => b.taskId !== id);
            save(); render();
        },
        remBlock: (idx) => {
            state.data.blocks.splice(idx, 1);
            save(); render();
        }
    };

    return { init: () => { startClock(); render(); } };
})();

document.addEventListener('DOMContentLoaded', App.init);
