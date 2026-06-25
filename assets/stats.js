const MC_SERVER = 'stonelight.apexmc.co';
const MC_API = `https://api.mcsrvstat.us/3/${MC_SERVER}`;
const STATS_JSON = 'assets/server-stats.json';

let statsData = null;
let currentRange = 'day';
let topPage = 1;
const TOP_PER_PAGE = 10;

const $ = (id) => document.getElementById(id);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setStatus(state, title, text) {
  const dot = $('stats-status-dot');
  if (dot) dot.className = `status-dot ${state}`;
  setText('stats-status-title', title);
  setText('stats-status-text', text);
}

function headUrl(name) {
  return `https://crafthead.net/avatar/${encodeURIComponent(name)}/64`;
}

function pingClass(ms) {
  if (ms <= 120) return 'ping-good';
  if (ms <= 250) return 'ping-mid';
  return 'ping-bad';
}

function formatPing(ms) {
  return `${Math.round(ms)} ms`;
}

function formatSeconds(seconds) {
  seconds = Number(seconds || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes} хв`;
  return `${hours} год ${minutes} хв`;
}

function normalizePlayerName(item) {
  if (!item) return null;
  if (typeof item === 'string') return item;
  return item.name || item.username || item.player || null;
}

async function loadLiveStatus(force = false) {
  const refreshBtn = $('status-refresh');
  if (refreshBtn) refreshBtn.disabled = true;
  setStatus('checking', 'Перевірка статусу...', 'Оновлюємо live-дані сервера');

  const started = performance.now();
  try {
    const response = await fetch(`${MC_API}?t=${Date.now()}`, { cache: 'no-store' });
    const latency = performance.now() - started;
    const data = await response.json();

    const pingEl = $('metric-ping');
    if (pingEl) {
      pingEl.textContent = formatPing(latency);
      pingEl.className = `metric-ping ${pingClass(latency)}`;
    }

    if (data.online) {
      const online = data.players?.online ?? 0;
      const max = data.players?.max ?? '?';
      setStatus('online', 'Сервер онлайн', `Java: ${MC_SERVER}`);
      setText('metric-online', online);
      setText('metric-max', max);
      renderOnlinePlayers(data.players?.list || [], online);
    } else {
      setStatus('offline', 'Сервер офлайн', 'Спробуйте перевірити пізніше');
      setText('metric-online', '0');
      setText('metric-max', data.players?.max ?? '—');
      renderOnlinePlayers([], 0);
    }
  } catch (error) {
    setStatus('offline', 'Статус недоступний', 'mcsrvstat.us не відповідає');
    setText('metric-online', '—');
    setText('metric-max', '—');
    const pingEl = $('metric-ping');
    if (pingEl) {
      pingEl.textContent = '—';
      pingEl.className = 'metric-ping';
    }
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

function renderOnlinePlayers(list, onlineCount) {
  const box = $('online-players');
  if (!box) return;
  const names = (Array.isArray(list) ? list : [])
    .map(normalizePlayerName)
    .filter(Boolean);

  if (onlineCount > 0 && names.length === 0) {
    box.innerHTML = `<p class="muted">Зараз онлайн: ${onlineCount}. Список нікнеймів недоступний через query/API.</p>`;
    return;
  }

  if (names.length === 0) {
    box.innerHTML = '<p class="muted">Зараз на сервері нікого немає.</p>';
    return;
  }

  box.innerHTML = names.map(name => `
    <div class="player-chip">
      <img src="${headUrl(name)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.src='https://crafthead.net/avatar/Steve/64'">
      <span>${escapeHtml(name)}</span>
    </div>
  `).join('');
}

async function loadStatsJson() {
  try {
    const response = await fetch(`${STATS_JSON}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    statsData = await response.json();
    updateServerMetricsFromJson(statsData);
    renderChart(currentRange);
    renderTopPlayers();
  } catch (error) {
    statsData = null;
    renderChart(currentRange);
    const top = $('top-players');
    if (top) top.innerHTML = '<p class="muted">Не вдалося завантажити server-stats.json.</p>';
  }
}

function updateServerMetricsFromJson(data) {
  const server = data?.server || {};
  setText('metric-tps', formatMetric(server.tps ?? server.tps1m));
  setText('metric-mspt', formatMetric(server.mspt));
  setText('metric-core', server.coreVersion ? `${server.coreName || 'Paper'} ${server.coreVersion}` : '—');
}

function formatMetric(value) {
  if (value === undefined || value === null || Number(value) < 0) return '—';
  return Number(value).toFixed(2).replace(/\.00$/, '');
}

function getActivity(range) {
  const activity = statsData?.activity || {};
  return Array.isArray(activity[range]) ? activity[range] : [];
}

function sampleTime(sample) {
  const value = sample.timestamp ?? sample.time ?? sample.date;
  if (typeof value === 'number') return value > 100000000000 ? value : value * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function sampleOnline(sample) {
  return Number(sample.online ?? sample.players ?? sample.count ?? 0);
}

function renderChart(range) {
  currentRange = range;
  document.querySelectorAll('.range-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.range === range));

  const canvas = $('activity-chart');
  const note = $('chart-note');
  if (!canvas) return;

  const data = getActivity(range);
  if (!data.length) {
    clearChart(canvas, 'Немає даних для цього періоду');
    if (note) note.textContent = 'Очікуємо нові точки від StoneLightStats.';
    return;
  }

  drawLineChart(canvas, data);
  if (note) {
    const labels = { day: '24 години', week: '7 днів', month: '30 днів' };
    note.textContent = `Період: ${labels[range] || range}. Точок: ${data.length}.`;
  }
}

function clearChart(canvas, message) {
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, rect.width * ratio);
  canvas.height = Math.max(1, rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#777';
  ctx.font = '600 16px Inter, system-ui, sans-serif';
  ctx.fillText(message, 24, 48);
}

function drawLineChart(canvas, samples) {
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const styles = getComputedStyle(document.documentElement);
  const text = styles.getPropertyValue('--muted').trim() || '#7f6b57';
  const accent = styles.getPropertyValue('--accent2').trim() || '#f47c38';
  const line = styles.getPropertyValue('--line').trim() || 'rgba(0,0,0,.14)';

  const values = samples.map(sampleOnline);
  const max = Math.max(1, ...values);
  const minTime = Math.min(...samples.map(sampleTime));
  const maxTime = Math.max(...samples.map(sampleTime));
  const pad = { left: 42, right: 16, top: 22, bottom: 34 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillStyle = text;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH * (i / 4);
    const value = Math.round(max - max * (i / 4));
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(String(value), 10, y + 4);
  }

  const points = samples.map(s => {
    const t = sampleTime(s);
    const x = maxTime === minTime ? pad.left : pad.left + ((t - minTime) / (maxTime - minTime)) * chartW;
    const y = pad.top + chartH - (sampleOnline(s) / max) * chartH;
    return { x, y };
  });

  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.fillStyle = accent;
  points.forEach((p, i) => {
    if (i % Math.ceil(points.length / 24) === 0 || i === points.length - 1) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function renderTopPlayers() {
  const box = $('top-players');
  const pager = $('top-pagination');
  if (!box) return;
  const players = Array.isArray(statsData?.topPlayers) ? statsData.topPlayers : [];
  if (!players.length) {
    box.innerHTML = '<p class="muted">Топ гравців поки порожній.</p>';
    if (pager) pager.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(players.length / TOP_PER_PAGE));
  topPage = Math.min(Math.max(1, topPage), totalPages);
  const start = (topPage - 1) * TOP_PER_PAGE;
  const pagePlayers = players.slice(start, start + TOP_PER_PAGE);

  box.innerHTML = pagePlayers.map((player, index) => {
    const rank = start + index + 1;
    const name = player.name || player.lastName || 'Unknown';
    const seconds = player.playtimeSeconds ?? player.playtime ?? player.time ?? 0;
    const joins = player.joins ?? 0;
    return `
      <div class="top-player">
        <span class="rank">${rank}</span>
        <img src="${headUrl(name)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.src='https://crafthead.net/avatar/Steve/64'">
        <div>
          <strong>${escapeHtml(name)}</strong>
          <span>${formatSeconds(seconds)} • входів: ${joins}</span>
        </div>
      </div>
    `;
  }).join('');

  if (pager) {
    pager.innerHTML = `
      <button class="range-tab" ${topPage <= 1 ? 'disabled' : ''} id="top-prev">Назад</button>
      <span class="top-page-info">${topPage} / ${totalPages}</span>
      <button class="range-tab" ${topPage >= totalPages ? 'disabled' : ''} id="top-next">Далі</button>
    `;
    $('top-prev')?.addEventListener('click', () => { topPage--; renderTopPlayers(); });
    $('top-next')?.addEventListener('click', () => { topPage++; renderTopPlayers(); });
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
  $('status-refresh')?.addEventListener('click', () => loadLiveStatus(true));
  document.querySelectorAll('.range-tab[data-range]').forEach(btn => btn.addEventListener('click', () => renderChart(btn.dataset.range)));
  loadLiveStatus(true);
  loadStatsJson();
  setInterval(loadLiveStatus, 30000);
  setInterval(loadStatsJson, 300000);
  window.addEventListener('resize', () => renderChart(currentRange));
});
