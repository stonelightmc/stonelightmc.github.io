const STATS_API='https://api.mcsrvstat.us/3/stonelight.apexmc.co';
const STATS_DATA_URL='assets/server-stats.json';

function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function playerHead(nameOrUuid,size=48){return `https://crafthead.net/helm/${encodeURIComponent(nameOrUuid)}/${size}`}

async function loadStatsStatus(){
  const started=performance.now();
  const dot=document.getElementById('stats-status-dot');
  const list=document.getElementById('online-list');
  if(dot)dot.className='status-dot checking';
  setText('stats-status-title','Перевірка статусу...');
  setText('stats-status-text','Java: stonelight.apexmc.co');

  try{
    const response=await fetch(STATS_API,{cache:'no-store'});
    const data=await response.json();
    const latency=Math.round(performance.now()-started);

    if(data.online){
      if(dot)dot.className='status-dot online';
      setText('stats-status-title','Сервер онлайн');
      const online=data.players?.online??0;
      const max=data.players?.max??'?';
      setText('stats-status-text',`Гравців: ${online}/${max}`);
      setText('stats-online-count',`${online}/${max}`);
      setText('stats-version',data.version || '—');
      setText('stats-latency',`${latency} мс`);

      const players=data.players?.list || [];
      if(list){
        if(players.length){
          list.innerHTML=players.map((player)=>`<div class="online-player"><img src="${playerHead(player.name || player,32)}" alt=""><span>${player.name || player}</span></div>`).join('');
        }else{
          list.innerHTML='<p class="muted">API бачить онлайн, але не повертає список нікнеймів. Це залежить від налаштувань сервера/API.</p>';
        }
      }
    }else{
      if(dot)dot.className='status-dot offline';
      setText('stats-status-title','Сервер офлайн');
      setText('stats-status-text','Спробуйте перевірити пізніше');
      setText('stats-online-count','0');
      setText('stats-version','—');
      setText('stats-latency',`${latency} мс`);
      if(list)list.innerHTML='<p class="muted">Зараз нікого немає онлайн.</p>';
    }
  }catch(error){
    if(dot)dot.className='status-dot offline';
    setText('stats-status-title','Статус недоступний');
    setText('stats-status-text','API статусу не відповідає');
    setText('stats-online-count','—');
    setText('stats-version','—');
    setText('stats-latency','—');
    if(list)list.innerHTML='<p class="muted">Не вдалося отримати список гравців.</p>';
  }
}

async function loadStatsData(){
  try{
    const response=await fetch(STATS_DATA_URL,{cache:'no-store'});
    if(!response.ok)throw new Error('stats data not found');
    return await response.json();
  }catch(error){
    return {onlineHistory:{day:[],week:[],month:[]},topPlayers:[]};
  }
}

function drawChart(points){
  const canvas=document.getElementById('online-chart');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const width=canvas.width;
  const height=canvas.height;
  const pad={left:54,right:26,top:26,bottom:46};
  const dpr=window.devicePixelRatio || 1;

  if(canvas.dataset.ready!=='true'){
    canvas.style.width='100%';
    canvas.style.height='auto';
    canvas.dataset.ready='true';
  }

  ctx.clearRect(0,0,width,height);
  const styles=getComputedStyle(document.documentElement);
  const isDark=document.documentElement.classList.contains('dark');
  const text=isDark?'#edf3ff':'#3a2818';
  const muted=isDark?'#9fb0c8':'#7d6a58';
  const line=isDark?'rgba(255,255,255,.12)':'rgba(116,79,46,.18)';
  const accent=styles.getPropertyValue('--accent').trim() || '#ffb347';
  const accent2=styles.getPropertyValue('--accent2').trim() || '#f47c38';

  ctx.font='14px Inter, system-ui, sans-serif';
  ctx.lineWidth=1;
  ctx.strokeStyle=line;
  ctx.fillStyle=muted;

  const values=points.map(p=>Number(p.online)||0);
  const max=Math.max(5,...values);
  const chartW=width-pad.left-pad.right;
  const chartH=height-pad.top-pad.bottom;

  for(let i=0;i<=4;i++){
    const y=pad.top+chartH*(i/4);
    ctx.beginPath();
    ctx.moveTo(pad.left,y);
    ctx.lineTo(width-pad.right,y);
    ctx.stroke();
    const value=Math.round(max-(max*i/4));
    ctx.fillText(String(value),16,y+5);
  }

  if(!points.length){
    ctx.fillStyle=muted;
    ctx.fillText('Немає даних для графіка',pad.left,pad.top+32);
    return;
  }

  const xStep=points.length>1 ? chartW/(points.length-1) : chartW;
  const coords=points.map((p,i)=>{
    const x=pad.left+i*xStep;
    const y=pad.top+chartH-(Number(p.online)||0)/max*chartH;
    return {x,y,p};
  });

  const grad=ctx.createLinearGradient(0,pad.top,0,height-pad.bottom);
  grad.addColorStop(0,'rgba(255,179,71,.32)');
  grad.addColorStop(1,'rgba(255,179,71,0)');

  ctx.beginPath();
  coords.forEach((c,i)=>i?ctx.lineTo(c.x,c.y):ctx.moveTo(c.x,c.y));
  ctx.lineTo(coords[coords.length-1].x,height-pad.bottom);
  ctx.lineTo(coords[0].x,height-pad.bottom);
  ctx.closePath();
  ctx.fillStyle=grad;
  ctx.fill();

  ctx.beginPath();
  coords.forEach((c,i)=>i?ctx.lineTo(c.x,c.y):ctx.moveTo(c.x,c.y));
  ctx.lineWidth=4;
  ctx.lineJoin='round';
  ctx.lineCap='round';
  ctx.strokeStyle=accent2;
  ctx.shadowBlur=18;
  ctx.shadowColor=accent;
  ctx.stroke();
  ctx.shadowBlur=0;

  coords.forEach((c)=>{
    ctx.beginPath();
    ctx.arc(c.x,c.y,5,0,Math.PI*2);
    ctx.fillStyle=accent;
    ctx.fill();
  });

  ctx.fillStyle=text;
  ctx.font='13px Inter, system-ui, sans-serif';
  const labelEvery=Math.max(1,Math.ceil(points.length/8));
  points.forEach((p,i)=>{
    if(i%labelEvery===0 || i===points.length-1){
      const x=pad.left+i*xStep;
      ctx.fillStyle=muted;
      ctx.fillText(String(p.label),x-10,height-16);
    }
  });
}

function renderPlayers(players){
  const root=document.getElementById('top-players');
  if(!root)return;
  if(!players.length){
    root.innerHTML='<p class="muted">Поки немає даних топу. Заповни <code>assets/server-stats.json</code>.</p>';
    return;
  }
  root.innerHTML=players.map((player,index)=>`
    <article class="player-card">
      <div class="player-rank">#${index+1}</div>
      <img class="player-head" src="${playerHead(player.uuid || player.name,64)}" alt="${player.name}">
      <div class="player-info">
        <strong>${player.name}</strong>
        <span>${player.time}</span>
      </div>
    </article>
  `).join('');
}

async function initStatsPage(){
  const data=await loadStatsData();
  let currentRange='day';

  const renderRange=(range)=>{
    currentRange=range;
    document.querySelectorAll('.range-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.range===range));
    drawChart(data.onlineHistory?.[range] || []);
  };

  document.querySelectorAll('.range-btn').forEach(btn=>btn.addEventListener('click',()=>renderRange(btn.dataset.range)));
  window.addEventListener('resize',()=>renderRange(currentRange));
  new MutationObserver(()=>renderRange(currentRange)).observe(document.documentElement,{attributes:true,attributeFilter:['class']});

  renderRange(currentRange);
  renderPlayers(data.topPlayers || []);
  loadStatsStatus();
  document.getElementById('refresh-status')?.addEventListener('click',loadStatsStatus);
}

if(document.getElementById('online-chart'))initStatsPage();
