const App = (function() {
    const state = { data: JSON.parse(localStorage.getItem("trakler_v2")) || { tasks: [], blocks: [] } };
    const save = () => localStorage.setItem("trakler_v2", JSON.stringify(state.data));

    const renderTasks = () => {
        const container = document.getElementById('tasks'), stats = document.getElementById('stats-area');
        if(!container) return;
        container.innerHTML = ''; let done = 0;
        state.data.tasks.forEach(t => {
            if(t.done) done++;
            const el = document.createElement('div'); el.className = 'task';
            el.innerHTML = `<div><input type="checkbox" ${t.done?'checked':''} onchange="App.toggle(${t.id})"><span>${t.text}</span></div><button onclick="App.del(${t.id})" style="background:none;border:none;color:red;cursor:pointer;">&times;</button>`;
            container.appendChild(el);
        });
        const percent = state.data.tasks.length > 0 ? (done / state.data.tasks.length) * 100 : 0;
        stats.innerHTML = `<div class="progress-circle" style="--p:${Math.round(percent)}"><span>${Math.round(percent)}%</span></div>`;
    };

    window.App = {
        toggle: (id) => { const t = state.data.tasks.find(x=>x.id===id); if(t){t.done=!t.done; save(); renderTasks();} },
        del: (id) => { state.data.tasks = state.data.tasks.filter(x=>x.id!==id); save(); renderTasks(); }
    };

    const startClock = () => {
        setInterval(() => {
            const now = new Date(), s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
            const sH = document.getElementById('second-hand'), mH = document.getElementById('minute-hand'), hH = document.getElementById('hour-hand');
            if(sH) sH.style.transform = `translateX(-50%) rotate(${(s/60)*360}deg)`;
            if(mH) mH.style.transform = `translateX(-50%) rotate(${(m/60)*360}deg)`;
            if(hH) hH.style.transform = `translateX(-50%) rotate(${(h%12/12)*360 + (m/60)*30}deg)`;
            document.getElementById('digital-time').innerText = now.toLocaleTimeString();
        }, 1000);
    };

    return { init: () => { startClock(); renderTasks(); 
        document.getElementById('chatFab').onclick = () => document.getElementById('chatWindow').classList.toggle('open');
        document.getElementById('closeChat').onclick = () => document.getElementById('chatWindow').classList.remove('open');
    }};
})();
document.addEventListener('DOMContentLoaded', App.init);
