const navToggle=document.querySelector('.nav-toggle');const nav=document.querySelector('.nav');navToggle?.addEventListener('click',()=>{const isOpen=nav.classList.toggle('open');navToggle.setAttribute('aria-expanded',String(isOpen));});
document.querySelectorAll('[data-copy]').forEach((button)=>{button.addEventListener('click',async()=>{const value=button.dataset.copy;const label=button.querySelector('span');const old=label?.textContent||'';try{await navigator.clipboard.writeText(value);if(label)label.textContent='Скопійовано';setTimeout(()=>{if(label)label.textContent=old},1400)}catch{alert(value)}})});
async function loadServerStatus(){const dot=document.getElementById('status-dot');const title=document.getElementById('status-title');const text=document.getElementById('status-text');if(!dot||!title||!text)return;dot.className='status-dot checking';title.textContent='Перевірка статусу...';try{const response=await fetch('https://api.mcsrvstat.us/3/stonelight.apexmc.co');const data=await response.json();if(data.online){dot.className='status-dot online';title.textContent='Сервер онлайн';const online=data.players?.online??0;const max=data.players?.max??'?';text.textContent=`Гравців: ${online}/${max}`}else{dot.className='status-dot offline';title.textContent='Сервер офлайн';text.textContent='Спробуйте перевірити пізніше'}}catch{dot.className='status-dot offline';title.textContent='Статус недоступний';text.textContent='API статусу не відповідає'}}loadServerStatus();
const btn=document.getElementById('theme-toggle');if(localStorage.theme==='dark'){document.documentElement.classList.add('dark');if(btn)btn.textContent='☀️'}btn?.addEventListener('click',()=>{document.documentElement.classList.toggle('dark');const dark=document.documentElement.classList.contains('dark');localStorage.theme=dark?'dark':'light';btn.textContent=dark?'☀️':'🌙';});
async function loadStats() {
    const response = await fetch("assets/server-stats.json");
    const data = await response.json();

    updateStatus(data.server);
    updatePlayers(data.onlinePlayers);
    updateTop(data.topPlayers);
    updateChart(data.activity.day);
}

loadStats();
setInterval(loadStats, 60000);