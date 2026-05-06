const App = (function() {
    const state = { data: JSON.parse(localStorage.getItem("trackler_master_v1")) || { tasks: [], blocks: [] } };
    const save = () => { localStorage.setItem("trackler_master_v1", JSON.stringify(state.data)); render(); };

    const playSuccessTone = () => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    };

    // Advanced NLP Engine (Handles time, priority, and "remind me" intents)
    const processIntent = (input) => {
        const prompt = input.toLowerCase();
        let time = null;
        const timeRegex = /@(\d{1,2})|(\d{1,2})\s*(pm|am)|at\s*(\d{1,2})/;
        const match = prompt.match(timeRegex);

        if (match) {
            let hr = parseInt(match[1] || match[2] || match[4]);
            if (prompt.includes('pm') && hr < 12) hr += 12;
            if (prompt.includes('am') && hr === 12) hr = 0;
            time = hr;
        }

        return {
            cleanText: input.replace(timeRegex, '').replace(/urgent|asap|priority|remind me to/gi, '').trim(),
            time: time,
            isUrgent: /urgent|asap|priority/i.test(prompt)
        };
    };

    const render = () => {
        const taskArea = document.getElementById('tasks');
        const timeline = document.getElementById('timeline');
        if (!taskArea) return;

        taskArea.innerHTML = '';
        let doneCount = 0;

        state.data.tasks.forEach(t => {
            if (t.done) doneCount++;
            const el = document.createElement('div');
            el.className = `task-item ${t.urgent ? 'urgent-glow' : ''}`;
            el.style = "background:rgba(255,255,255,0.03); padding:18px; border-radius:16px; margin-bottom:12px; display:flex; justify-content:space-between; border: 1px solid var(--border)";
            el.innerHTML = `
                <div style="display:flex; gap:12px; align-items:center;">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="App.toggleTask(${t.id})" style="accent-color:var(--accent)">
                    <span style="${t.done ? 'text-decoration:line-through; opacity:0.5' : ''}">${t.text}</span>
                </div>
                <button onclick="App.deleteTask(${t.id})" style="background:none; border:none; color:#ef4444; font-size:18px; cursor:pointer;">&times;</button>
            `;
            taskArea.appendChild(el);
        });

        // Timeline Logic
        if (timeline) {
            timeline.innerHTML = '';
            for(let i=0; i<24; i++) {
                const slot = document.createElement('div');
                slot.className = 'time-slot';
                slot.setAttribute('data-time', i % 12 === 0 ? '12 ' + (i < 12 ? 'AM' : 'PM') : (i % 12) + (i < 12 ? ' AM' : ' PM'));
                timeline.appendChild(slot);
            }
            state.data.blocks.forEach((b, idx) => {
                const t = state.data.tasks.find(x => x.id === b.taskId);
                if (!t) return;
                const block = document.createElement('div');
                block.className = 'block';
                block.style.top = `${b.start * 70 + 5}px`;
                block.style.height = `60px`;
                block.innerHTML = `<span>${t.text}</span> <span onclick="App.remBlock(${idx})">&times;</span>`;
                timeline.appendChild(block);
            });
        }

        const pct = state.data.tasks.length > 0 ? (doneCount / state.data.tasks.length) * 100 : 0;
        document.getElementById('stats-area').innerHTML = `<h2 style="color:var(--accent)">${Math.round(pct)}%</h2>`;
    };

    window.App = {
        toggleChat: () => document.getElementById('chatWindow').classList.toggle('open'),
        toggleTask: (id) => { 
            const t = state.data.tasks.find(x => x.id === id); 
            if (t) { t.done = !t.done; if(t.done) playSuccessTone(); save(); }
        },
        deleteTask: (id) => { 
            state.data.tasks = state.data.tasks.filter(x => x.id !== id); 
            state.data.blocks = state.data.blocks.filter(b => b.taskId !== id); 
            save(); 
        },
        openSummary: () => {
            const done = state.data.tasks.filter(t => t.done).length;
            const total = state.data.tasks.length;
            document.getElementById('count-done').innerText = done;
            document.getElementById('count-pending').innerText = total - done;
            document.getElementById('bar-fill').style.width = total > 0 ? `${(done/total)*100}%` : '0%';
            document.getElementById('summaryModal').classList.add('open');
        },
        closeSummary: () => document.getElementById('summaryModal').classList.remove('open'),
        remBlock: (idx) => { state.data.blocks.splice(idx, 1); save(); }
    };

    return { init: () => {
        render();
        setInterval(() => {
            const n = new Date();
            document.getElementById('hour-hand').style.transform = `translateX(-50%) rotate(${(n.getHours() % 12 / 12) * 360 + (n.getMinutes() / 60) * 30}deg)`;
            document.getElementById('minute-hand').style.transform = `translateX(-50%) rotate(${(n.getMinutes() / 60) * 360}deg)`;
            document.getElementById('second-hand').style.transform = `translateX(-50%) rotate(${(n.getSeconds() / 60) * 360}deg)`;
            document.getElementById('digital-time').innerText = n.toLocaleTimeString();
        }, 1000);

        document.getElementById('summaryBtn').onclick = App.openSummary;
        document.getElementById('sendBtn').onclick = () => {
            const input = document.getElementById('chatInput');
            const res = processIntent(input.value);
            if (!res.cleanText) return;
            const id = Date.now();
            state.data.tasks.push({ id, text: res.cleanText, done: false, urgent: res.isUrgent });
            if (res.time !== null) state.data.blocks.push({ taskId: id, start: res.time });
            save(); input.value = '';
        };
    }};
})();
document.addEventListener('DOMContentLoaded', App.init);
