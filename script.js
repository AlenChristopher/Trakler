const App = (function() {
    const state = { 
        data: JSON.parse(localStorage.getItem("trackler_final_v1")) || { tasks: [], blocks: [] } 
    };

    const save = () => {
        localStorage.setItem("trackler_final_v1", JSON.stringify(state.data));
        render();
    };

    const render = () => {
        const tasks = document.getElementById('tasks');
        const stats = document.getElementById('stats-area');
        const bar = document.getElementById('progress-fill');
        const focus = document.getElementById('focus-area');
        const timeline = document.getElementById('timeline');

        if (!tasks) return;
        tasks.innerHTML = '';
        let done = 0;
        let topFocus = "No urgent tasks";

        state.data.tasks.forEach(t => {
            if (t.done) done++;
            if (t.urgent && !t.done) topFocus = t.text;

            const card = document.createElement('div');
            card.className = `task-card ${t.urgent ? 'urgent-mode' : ''}`;
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="App.toggleTask(${t.id})" style="transform:scale(1.4); accent-color:#9333ea;">
                    <span style="${t.done ? 'text-decoration:line-through; opacity:0.5' : ''}">${t.text}</span>
                </div>
                <button onclick="App.deleteTask(${t.id})" style="background:none; border:none; color:#ff4d4d; font-size:22px; cursor:pointer;">&times;</button>
            `;
            tasks.appendChild(card);
        });

        // Update Progress
        const pct = state.data.tasks.length > 0 ? Math.round((done / state.data.tasks.length) * 100) : 0;
        if (stats) stats.innerText = `${pct}%`;
        if (bar) bar.style.width = `${pct}%`;
        if (focus) focus.innerText = topFocus;

        // Render Timeline Grid
        if (timeline) {
            timeline.innerHTML = '';
            for(let i=6; i<=22; i++) {
                const slot = document.createElement('div');
                slot.style = "height:70px; border-bottom:1px solid rgba(255,255,255,0.02); position:relative;";
                slot.innerHTML = `<span style="position:absolute; left:-50px; top:-10px; font-size:11px; color:#555;">${i}:00</span>`;
                timeline.appendChild(slot);
            }
            state.data.blocks.forEach(b => {
                const task = state.data.tasks.find(x => x.id === b.taskId);
                if (task) {
                    const block = document.createElement('div');
                    block.style = `position:absolute; top:${(b.start-6)*70}px; left:0; right:0; background:linear-gradient(90deg, #6366f1, #9333ea); border-radius:12px; padding:15px; font-size:12px; font-weight:600; z-index:10;`;
                    block.innerText = task.text;
                    timeline.appendChild(block);
                }
            });
        }
    };

    const processMessage = (val) => {
        const str = val.toLowerCase();
        let urgent = /urgent|asap|priority/i.test(str);
        let time = null;
        
        const timeMatch = str.match(/at\s*(\d+)|@(\d+)|(\d+)\s*(pm|am)/);
        if (timeMatch) {
            let hr = parseInt(timeMatch[1] || timeMatch[2] || timeMatch[3]);
            if (str.includes('pm') && hr < 12) hr += 12;
            time = hr;
        }

        // Clean text: strip out the "urgent" and time keywords
        let cleanText = val.replace(/urgent|asap|priority|at\s*\d+|@\d+|\d+\s*(pm|am)/gi, '').trim();
        return { cleanText, time, urgent };
    };

    window.App = {
        toggleChat: () => document.getElementById('chatWindow').classList.toggle('open'),
        toggleTask: (id) => {
            const t = state.data.tasks.find(x => x.id === id);
            if (t) t.done = !t.done;
            save();
        },
        deleteTask: (id) => {
            state.data.tasks = state.data.tasks.filter(x => x.id !== id);
            state.data.blocks = state.data.blocks.filter(b => b.taskId !== id);
            save();
        },
        sendMessage: () => {
            const inp = document.getElementById('chatInput');
            if (!inp.value) return;

            const userMsg = document.createElement('div');
            userMsg.className = 'msg user';
            userMsg.innerText = inp.value;
            document.getElementById('chatMessages').appendChild(userMsg);

            const { cleanText, time, urgent } = processMessage(inp.value);
            const id = Date.now();
            state.data.tasks.push({ id, text: cleanText, done: false, urgent });
            if (time) state.data.blocks.push({ taskId: id, start: time });

            setTimeout(() => {
                const aiMsg = document.createElement('div');
                aiMsg.className = 'msg ai';
                aiMsg.innerText = `Added "${cleanText}" ${urgent ? '(Urgent)' : ''} ${time ? 'at ' + time + ':00' : ''}.`;
                document.getElementById('chatMessages').appendChild(aiMsg);
                document.getElementById('chatMessages').scrollTop = 9999;
            }, 600);

            save();
            inp.value = '';
        }
    };

    return {
        init: () => {
            render();
            setInterval(() => {
                const n = new Date();
                document.getElementById('second-hand').style.transform = `translateX(-50%) rotate(${n.getSeconds()*6}deg)`;
                document.getElementById('minute-hand').style.transform = `translateX(-50%) rotate(${n.getMinutes()*6}deg)`;
                document.getElementById('hour-hand').style.transform = `translateX(-50%) rotate(${n.getHours()*30 + n.getMinutes()*0.5}deg)`;
                document.getElementById('digital-time').innerText = n.toLocaleTimeString();
            }, 1000);
            document.getElementById('sendBtn').onclick = App.sendMessage;
        }
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
