// ===================================================================
// 👶 宝宝记录 — 完整应用
// ===================================================================

// ─── Data ──────────────────────────────────────────────────────────
const STORE = 'baby_tracker';

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORE)) || DEF; } catch { return { ...DEF }; }
}
function saveData(d) {
  try { localStorage.setItem(STORE, JSON.stringify(d)); } catch {}
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function today() { return new Date().toISOString().slice(0,10); }
function now() { return new Date().toISOString(); }
function timeStr(d) { return d.toTimeString().slice(0,5); }

const DEF = {
  baby: { name: '小糯米', birthday: '2025-01-15', gender: '女' },
  records: []
};

let D = loadData();

// ─── Helpers ────────────────────────────────────────────────────────
function ageStr(birth) {
  const b = new Date(birth), n = new Date();
  let m = (n.getFullYear()-b.getFullYear())*12 + n.getMonth()-b.getMonth();
  if (n.getDate() < b.getDate()) m--;
  if (m < 1) return `${Math.floor((n-b)/864e5)}天`;
  const y = Math.floor(m/12), mo = m%12;
  return y > 0 ? `${y}岁${mo}个月` : `${mo}个月`;
}

function todayRecords() {
  const t = today();
  return D.records.filter(r => r.date === t);
}

function statsToday() {
  const rs = todayRecords();
  const feed = rs.filter(r => r.type === 'feeding').length;
  const diaper = rs.filter(r => r.type === 'diaper').length;
  const sleep = rs.filter(r => r.type === 'sleep');
  const sleepMin = sleep.reduce((s, r) => s + (r.dur || 0), 0);
  const growth = rs.filter(r => r.type === 'growth');
  const growthLast = growth.length > 0 ? growth[growth.length-1] : null;
  return { feed, diaper, sleep: Math.round(sleepMin/6)/10, sleepMin, growthLast };
}

function dayRecords(date) {
  return D.records.filter(r => r.date === date).sort((a,b) => b.ts - a.ts);
}

function addRecord(rec) {
  rec.id = genId();
  rec.ts = Date.now();
  rec.date = today();
  D.records.unshift(rec);
  saveData(D);
  return rec;
}

function delRecord(id) {
  D.records = D.records.filter(r => r.id !== id);
  saveData(D);
}

function getBaby() { return D.baby; }
function updateBaby(b) { Object.assign(D.baby, b); saveData(D); }

// Week records for report
function weekRecords() {
  const end = new Date(); end.setHours(23,59,59,999);
  const start = new Date(); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
  return D.records.filter(r => {
    const d = new Date(r.date);
    return d >= start && d <= end;
  });
}

// Growth records
function growthRecords(type) {
  return D.records.filter(r => r.type === 'growth' && r.gtype === type).sort((a,b) => a.ts - b.ts);
}

// Milestones
function milestones() {
  return D.records.filter(r => r.type === 'milestone').sort((a,b) => b.ts - a.ts);
}

// ─── Sub Menus Definition ───────────────────────────────────────────
const SUB_MENUS = [
  {
    label: '🍼 喂养', items: [
      { icon: '🤱', label: '母乳', val: 'breast' },
      { icon: '🍶', label: '奶粉', val: 'bottle' },
      { icon: '🥣', label: '辅食', val: 'solid' },
      { icon: '⏱', label: '快速', val: 'quick' },
    ]
  },
  {
    label: '🧷 尿布', items: [
      { icon: '💛', label: '尿湿', val: 'wet' },
      { icon: '🤎', label: '便便', val: 'dirty' },
      { icon: '💚', label: '混合', val: 'both' },
      { icon: '✅', label: '正常', val: 'ok' },
    ]
  },
  {
    label: '😴 睡眠', items: [
      { icon: '⏱', label: '开始睡', val: 'start' },
      { icon: '⏹', label: '醒来', val: 'stop' },
      { icon: '🌙', label: '夜眠', val: 'night' },
      { icon: '✏️', label: '手动', val: 'manual' },
    ]
  },
  {
    label: '📏 生长', items: [
      { icon: '⚖️', label: '体重', val: 'weight' },
      { icon: '📐', label: '身高', val: 'height' },
      { icon: '🧠', label: '头围', val: 'head' },
      { icon: '📈', label: '曲线', val: 'chart' },
    ]
  },
  {
    label: '🩺 健康', items: [
      { icon: '🌡', label: '体温', val: 'temp' },
      { icon: '💊', label: '用药', val: 'medicine' },
      { icon: '🤒', label: '症状', val: 'symptom' },
      { icon: '🛁', label: '日常', val: 'daily' },
    ]
  },
  {
    label: '🎯 里程碑', items: [
      { icon: '🙂', label: '微笑', val: 'smile' },
      { icon: '🔄', label: '翻身', val: 'roll' },
      { icon: '🦷', label: '长牙', val: 'tooth' },
      { icon: '✏️', label: '自定义', val: 'custom' },
    ]
  }
];

// ─── State ──────────────────────────────────────────────────────────
let activePage = 'home';
let toastTimer = null;
let sleepTimer = null;
let sleepStart = null;
let sleepRunning = false; // for home page indicator

// ─── Routing ────────────────────────────────────────────────────────
function go(page, data) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  activePage = page;

  // Nav highlight
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navMap = { home:0, timeline:1, report:2, settings:3 };
  const idx = navMap[page];
  if (idx != null) document.querySelectorAll('.nav-item')[idx]?.classList.add('active');

  // Render on navigate
  if (page === 'home') renderHome();
  if (page === 'timeline') renderTimeline();
  if (page === 'report') renderReport();
  if (page === 'settings') renderSettings();

  // Special record pages
  if (page === 'feeding' || page === 'diaper' || page === 'sleep' ||
      page === 'growth' || page === 'health' || page === 'milestone') {
    renderRecordPage(page, data);
  }
  if (page === 'growth-chart') renderGrowthChart();
}

// ─── Toast & Button Feedback ──────────────────────────────────────
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// Enable iOS :active state
function enableTouchFeedback() {
  document.addEventListener('touchstart', function(){}, {passive: true});
}

// Add momentary button press feedback
function pressFeedback(el) {
  if (!el) return;
  el.style.transform = 'scale(0.94)';
  el.style.transition = 'transform 0.1s';
  setTimeout(() => {
    el.style.transform = 'scale(1)';
  }, 100);
}

// ─── Render: Home (Dial) ────────────────────────────────────────────
function renderHome() {
  const st = statsToday();
  const baby = getBaby();
  document.getElementById('h-name').textContent = baby.name;
  document.getElementById('h-age').textContent = `${ageStr(baby.birthday)} · ${baby.gender}宝`;

  document.querySelector('#s-feed .sc-count').textContent = st.feed.toString();
  document.querySelector('#s-diaper .sc-count').textContent = st.diaper.toString();
  if (sleepRunning) {
    document.querySelector('#s-sleep .sc-count').innerHTML = `⏱ <span style="animation:pi 1s infinite;color:var(--green);">●</span>`;
  } else {
    document.querySelector('#s-sleep .sc-count').textContent = `${st.sleep}h`;
  }
  if (st.growthLast) {
    const g = st.growthLast;
    const units = { weight:'kg', height:'cm', head:'cm' };
    document.querySelector('#s-growth .sc-count').innerHTML = `+${g.val}${units[g.gtype]||''}`;
  } else {
    document.querySelector('#s-growth .sc-count').textContent = '—';
  }
}

function openSubMenu(idx) {
  const menu = SUB_MENUS[idx];
  const wrap = document.getElementById('sub-menu');
  const items = document.getElementById('sub-items');
  items.innerHTML = '';
  menu.items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = `sub-item si${i}`;
    el.style.animationDelay = (i*0.05)+'s';
    el.innerHTML = `<div class="si-icon">${item.icon}</div><div class="si-label">${item.label}</div>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSubMenu();
      handleQuickAction(idx, item.val);
    });
    items.appendChild(el);
  });
  wrap.classList.add('active');
  document.getElementById('dial').style.transform = 'scale(0.92)';
}

function closeSubMenu() {
  document.getElementById('sub-menu').classList.remove('active');
  document.getElementById('dial').style.transform = 'scale(1)';
}

function handleQuickAction(catIdx, val) {
  const CAT_PAGES = ['feeding','diaper','sleep','growth','health','milestone'];
  const page = CAT_PAGES[catIdx];

  // Quick one-tap records (skip detail page)
  if (page === 'feeding' && val === 'quick') {
    addRecord({ type:'feeding', subtype:'quick', d: {} });
    showToast('🍼 快速喂养 · 已记录');
    renderHome();
    return;
  }
  if (page === 'diaper' && val === 'ok') {
    addRecord({ type:'diaper', subtype:'ok', d: {} });
    showToast('🧷 尿布正常 · 已记录');
    renderHome();
    return;
  }

  // Special fast actions
  if (page === 'sleep' && val === 'start') { startSleepTimer(); return; }
  if (page === 'sleep' && val === 'stop') { stopSleepTimer(); return; }
  if (page === 'growth' && val === 'chart') { go('growth-chart'); return; }

  // Go to detail page
  go(page, { prefill: val });
}

// ─── Sleep Timer ─────────────────────────────────────────────────────
function startSleepTimer() {
  sleepStart = Date.now();
  sleepRunning = true;
  // Update sleep stat indicator on home page
  const sEl = document.getElementById('s-sleep');
  if (sEl) sEl.querySelector('.sc-count').innerHTML = `⏱ <span style="animation:pi 1s infinite;color:var(--green);">●</span>`;
  
  // Also update timer-display on sleep page if visible
  const td = document.getElementById('timer-display');
  if (td) td.classList.add('running');
  
  showToast('😴 睡眠计时开始 💤 点圆盘「醒来」停止');
  
  sleepTimer = setInterval(() => {
    const ms = Date.now() - sleepStart;
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const display = `${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}m${String(s).padStart(2,'0')}s`;
    // Update display wherever it exists
    const td2 = document.getElementById('timer-display');
    if (td2) { td2.textContent = display; }
    // Update home page sleep indicator with elapsed time
    const homeSleep = document.getElementById('s-sleep');
    if (homeSleep) {
      const h = Math.floor(m/60);
      const min = m % 60;
      homeSleep.querySelector('.sc-count').innerHTML = `⏱ ${h}h${String(min).padStart(2,'0')}m <span style="animation:pi 1s infinite;color:var(--green);">●</span>`;
    }
  }, 1000);
}

function stopSleepTimer() {
  if (!sleepStart) {
    showToast('⚠️ 没有正在进行的睡眠计时');
    return;
  }
  const ms = Date.now() - sleepStart;
  const durMin = Math.round(ms / 60000);
  clearInterval(sleepTimer);
  sleepTimer = null;
  sleepRunning = false;
  
  // Reset display wherever it exists
  const td = document.getElementById('timer-display');
  if (td) {
    td.textContent = '00h00m00s';
    td.classList.remove('running');
  }
  
  if (durMin >= 1) {
    addRecord({ type:'sleep', dur: durMin, note: '计时睡眠', from: (new Date(Date.now()-ms)).toISOString(), to: now() });
    showToast(`😴 已记录睡眠 ${Math.floor(durMin/60)}h${durMin%60}min`);
  } else {
    showToast('⏱ 计时太短（<1分钟），已忽略');
  }
  sleepStart = null;
  renderHome();
}

// ─── Render: Record Page ─────────────────────────────────────────────
function renderRecordPage(type, data) {
  const pfx = type;
  const page = document.getElementById('page-' + type);
  if (!page) return;
  const title = page.querySelector('.page-title');
  const body = page.querySelector('.rec-body');
  const defs = { feeding:'🍼 喂养', diaper:'🧷 尿布', sleep:'😴 睡眠', growth:'📏 生长', health:'🩺 健康', milestone:'🎯 里程碑' };
  title.textContent = defs[type] || type;

  switch(type) {
    case 'feeding': renderFeeding(body, data); break;
    case 'diaper': renderDiaper(body, data); break;
    case 'sleep': renderSleep(body, data); break;
    case 'growth': renderGrowth(body, data); break;
    case 'health': renderHealth(body, data); break;
    case 'milestone': renderMilestone(body, data); break;
  }
}

// ── Feeding ──
function renderFeeding(body, data) {
  let sel = data?.prefill || 'breast';
  let amount = 120, brand = '', food = '', note = '';
  body.innerHTML = `
    <div class="rec-card">
      <h3>🍼 类型</h3>
      <div class="rec-row" id="feed-type">
        <button class="rec-btn" data-v="breast">🤱 母乳</button>
        <button class="rec-btn" data-v="bottle">🍶 奶粉</button>
        <button class="rec-btn" data-v="solid">🥣 辅食</button>
      </div>
    </div>
    <div class="rec-card" id="feed-detail">
      <h3>📋 详情</h3>
      <div id="feed-detail-content"></div>
    </div>
    <div class="rec-card">
      <h3>📝 备注</h3>
      <div class="rec-num"><input id="feed-note" placeholder="可选备注" style="text-align:left;font-weight:400;"></div>
    </div>
    <div class="submit-row"><button class="submit-btn" id="feed-submit">✅ 记录喂养</button></div>
  `;

  function renderDetail(type) {
    const el = document.getElementById('feed-detail-content');
    if (type === 'breast') {
      el.innerHTML = `
        <div class="rec-row">
          <button class="rec-btn" data-v="left">⬅️ 左胸</button>
          <button class="rec-btn" data-v="right">➡️ 右胸</button>
          <button class="rec-btn" data-v="both">🔄 双侧</button>
        </div>
        <div class="rec-num"><label>⏱ 时长</label>
          <div style="display:flex;gap:4px;flex:1;">
            <input id="feed-min" value="15" style="flex:1;"> <span class="unit">分钟</span>
            <button class="rec-btn small" id="feed-timer">⏱ 计时</button>
          </div>
        </div>
      `;
      document.getElementById('feed-timer')?.addEventListener('click', () => {
        showToast('⏱ 开始计时... 在睡眠模块有完整计时器');
      });
    } else if (type === 'bottle') {
      el.innerHTML = `
        <div class="rec-num"><label>🥛 奶量</label><input id="feed-amt" value="120" style="flex:1;"><span class="unit">ml</span></div>
        <div class="rec-num"><label>🏷 品牌</label><input id="feed-brand" placeholder="如：爱他美" style="text-align:left;font-weight:400;flex:1;"></div>
        <div class="rec-row">
          <button class="rec-btn small" data-v="hot">🔥 热</button>
          <button class="rec-btn small" data-v="warm">💧 温</button>
          <button class="rec-btn small" data-v="cold">🧊 凉</button>
        </div>
      `;
    } else if (type === 'solid') {
      el.innerHTML = `
        <div class="rec-row">
          <button class="rec-btn" data-v="rice">🍚 米糊</button>
          <button class="rec-btn" data-v="pumpkin">🎃 南瓜</button>
          <button class="rec-btn" data-v="carrot">🥕 胡萝卜</button>
          <button class="rec-btn" data-v="egg">🥚 蛋黄</button>
        </div>
        <div class="rec-row" style="margin-top:4px;">
          <button class="rec-btn" data-v="apple">🍎 苹果</button>
          <button class="rec-btn" data-v="banana">🍌 香蕉</button>
          <button class="rec-btn" data-v="other">✏️ 其他</button>
        </div>
        <div class="rec-num" style="margin-top:6px;"><label>🥄 分量</label>
          <div style="display:flex;gap:4px;flex:1;">
            <button class="rec-btn small" data-v="little">少</button>
            <button class="rec-btn small" data-v="half">半碗</button>
            <button class="rec-btn small" data-v="full">一碗</button>
          </div>
        </div>
        <div class="rec-num" style="margin-top:4px;">
          <label>😋 接受度</label>
          <div style="display:flex;gap:4px;flex:1;">
            <button class="rec-btn small" data-v="good">👍 好</button>
            <button class="rec-btn small" data-v="ok">👌 一般</button>
            <button class="rec-btn small" data-v="bad">👎 不好</button>
          </div>
        </div>
      `;
    }
    // Bind selection
    el.querySelectorAll('.rec-btn[data-v]').forEach(b => {
      b.addEventListener('click', () => {
        el.querySelectorAll(`.rec-btn[data-v]`).forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
      });
    });
  }
  renderDetail(sel);

  // Type selection
  body.querySelectorAll('#feed-type .rec-btn').forEach(b => {
    b.addEventListener('click', () => {
      body.querySelectorAll('#feed-type .rec-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      sel = b.dataset.v;
      renderDetail(sel);
    });
  });

  document.getElementById('feed-submit')?.addEventListener('click', () => {
    const detail = {};
    let label = '';
    if (sel === 'breast') {
      const side = document.querySelector('#feed-detail-content .rec-btn.selected')?.dataset.v || 'left';
      const min = parseInt(document.getElementById('feed-min')?.value) || 15;
      detail.side = side; detail.min = min;
      const sides = { left:'⬅️左', right:'➡️右', both:'🔄双侧' };
      label = `🍼 母乳 · ${sides[side]} ${min}分钟`;
    } else if (sel === 'bottle') {
      const amt = parseInt(document.getElementById('feed-amt')?.value) || 120;
      const brand = document.getElementById('feed-brand')?.value || '';
      const temp = document.querySelector('#feed-detail-content .rec-btn.selected[data-v]')?.dataset.v || 'warm';
      detail.amt = amt; detail.brand = brand; detail.temp = temp;
      label = `🍶 奶粉 · ${amt}ml${brand ? ' '+brand : ''}`;
    } else {
      const food = document.querySelector('#feed-detail-content .rec-btn.selected[data-v]:not([data-v^="little"]):not([data-v^="half"]):not([data-v^="full"]):not([data-v^="good"]):not([data-v^="ok"]):not([data-v^="bad"])')?.dataset.v || 'rice';
      const amt = document.querySelector('#feed-detail-content .rec-btn.selected[data-v="little"],#feed-detail-content .rec-btn.selected[data-v="half"],#feed-detail-content .rec-btn.selected[data-v="full"]')?.dataset.v || 'half';
      const reaction = document.querySelector('#feed-detail-content .rec-btn.selected[data-v="good"],#feed-detail-content .rec-btn.selected[data-v="ok"],#feed-detail-content .rec-btn.selected[data-v="bad"]')?.dataset.v || 'ok';
      detail.food = food; detail.amt = amt; detail.reaction = reaction;
      const foods = { rice:'米糊', pumpkin:'南瓜', carrot:'胡萝卜', egg:'蛋黄', apple:'苹果', banana:'香蕉', other:'其他' };
      const amts = { little:'少', half:'半碗', full:'一碗' };
      label = `🥣 辅食 · ${foods[food]||food} ${amts[amt]||amt}`;
    }
    const note = document.getElementById('feed-note')?.value || '';
    if (note) detail.note = note;
    addRecord({ type:'feeding', subtype: sel, d: detail });
    showToast(`✅ ${label}`);
    go('home');
  });
}

// ── Diaper ──
function renderDiaper(body, data) {
  let sel = data?.prefill || 'wet';
  body.innerHTML = `
    <div class="rec-card">
      <h3>🧷 类型</h3>
      <div class="rec-row" id="diaper-type">
        <button class="rec-btn" data-v="wet">💛 尿湿</button>
        <button class="rec-btn" data-v="dirty">🤎 便便</button>
        <button class="rec-btn" data-v="both">💚 混合</button>
      </div>
    </div>
    <div class="rec-card" id="diaper-color" style="display:none;">
      <h3>🎨 便便颜色</h3>
      <div class="rec-row">
        <button class="rec-btn small" data-v="yellow">💛 黄</button>
        <button class="rec-btn small" data-v="green">💚 绿</button>
        <button class="rec-btn small" data-v="brown">🤎 褐</button>
        <button class="rec-btn small" data-v="red">❤️ 红</button>
      </div>
    </div>
    <div class="rec-card">
      <h3>📝 备注</h3>
      <div class="rec-num"><input id="diaper-note" placeholder="可选备注" style="text-align:left;font-weight:400;"></div>
    </div>
    <div class="submit-row"><button class="submit-btn green" id="diaper-submit">✅ 记录尿布</button></div>
  `;

  body.querySelectorAll('#diaper-type .rec-btn').forEach(b => {
    b.addEventListener('click', () => {
      body.querySelectorAll('#diaper-type .rec-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      sel = b.dataset.v;
      document.getElementById('diaper-color').style.display = (sel==='dirty'||sel==='both') ? 'block' : 'none';
    });
  });

  document.getElementById('diaper-submit')?.addEventListener('click', () => {
    const color = document.querySelector('#diaper-color .rec-btn.selected')?.dataset.v || '';
    const note = document.getElementById('diaper-note')?.value || '';
    const labels = { wet:'尿湿', dirty:'便便', both:'混合' };
    addRecord({ type:'diaper', subtype: sel, d: { color, note } });
    showToast(`🧷 ${labels[sel]} · 已记录`);
    go('home');
  });
}

// ── Sleep (manual) ──
function renderSleep(body, data) {
  const prefill = data?.prefill;
  if (prefill === 'start') { startSleepTimer(); go('home'); return; }
  if (prefill === 'stop') { stopSleepTimer(); go('home'); return; }

  body.innerHTML = `
    <div class="rec-card" style="text-align:center;">
      <div class="timer-display" id="timer-display">00h00m00s</div>
      <div class="timer-btn-wrap">
        <button class="rec-btn green" id="sleep-start-btn">⏱ 开始睡</button>
        <button class="rec-btn" id="sleep-stop-btn" style="border-color:var(--red);color:var(--red);">⏹ 醒来</button>
      </div>
    </div>
    <div class="rec-card">
      <h3>✏️ 手动记录</h3>
      <div class="sleep-time-row">
        <label>😴 开始</label>
        <input type="time" id="sleep-start" value="13:00">
        <label>⏹ 结束</label>
        <input type="time" id="sleep-end" value="14:30">
      </div>
      <div class="rec-row">
        <button class="rec-btn small" data-v="nap">😴 小睡</button>
        <button class="rec-btn small" data-v="night">🌙 夜眠</button>
      </div>
    </div>
    <div class="submit-row"><button class="submit-btn" id="sleep-submit" style="background:var(--blue);">✅ 记录睡眠</button></div>
  `;

  document.getElementById('sleep-start-btn')?.addEventListener('click', () => { startSleepTimer(); go('home'); });
  document.getElementById('sleep-stop-btn')?.addEventListener('click', () => { stopSleepTimer(); go('home'); });

  document.getElementById('sleep-submit')?.addEventListener('click', () => {
    const s = document.getElementById('sleep-start').value;
    const e = document.getElementById('sleep-end').value;
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const dur = (eh*60+em) - (sh*60+sm);
    if (dur <= 0) { showToast('⚠️ 结束时间需晚于开始时间'); return; }
    const type = document.querySelector('#page-sleep .rec-btn.selected')?.dataset.v || 'nap';
    addRecord({ type:'sleep', dur, note: type==='night'?'夜眠':'小睡', from: s, to: e, stype:type });
    showToast(`😴 ${dur}分钟 · 已记录`);
    go('home');
  });
}

// ── Growth ──
function renderGrowth(body, data) {
  let sel = data?.prefill || 'weight';
  const units = { weight:'kg', height:'cm', head:'cm' };
  const labels = { weight:'体重', height:'身高', head:'头围' };

  body.innerHTML = `
    <div class="rec-card">
      <h3>📏 类型</h3>
      <div class="rec-row" id="growth-type">
        <button class="rec-btn" data-v="weight">⚖️ 体重</button>
        <button class="rec-btn" data-v="height">📐 身高</button>
        <button class="rec-btn" data-v="head">🧠 头围</button>
      </div>
    </div>
    <div class="rec-card">
      <h3>✏️ 数值</h3>
      <div class="rec-num"><label>${labels[sel]}</label>
        <input id="growth-val" type="number" step="0.1" value="${sel==='weight'?'6.5':'62'}" style="flex:1;">
        <span class="unit">${units[sel]}</span>
      </div>
    </div>
    <div class="rec-card">
      <h3>📝 备注</h3>
      <div class="rec-num"><input id="growth-note" placeholder="可选" style="text-align:left;font-weight:400;"></div>
    </div>
    <div class="submit-row"><button class="submit-btn green" id="growth-submit">✅ 记录${labels[sel]}</button></div>
    <div style="text-align:center;padding:4px;"><button class="rec-btn" id="growth-chart-btn" style="display:inline-flex;">📈 查看生长曲线</button></div>
  `;

  body.querySelectorAll('#growth-type .rec-btn').forEach(b => {
    b.addEventListener('click', () => {
      body.querySelectorAll('#growth-type .rec-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      sel = b.dataset.v;
      document.querySelector('#growth-val').placeholder = `例如 ${sel==='weight'?'6.5':'62'}`;
    });
  });

  document.getElementById('growth-submit')?.addEventListener('click', () => {
    const val = parseFloat(document.getElementById('growth-val')?.value);
    if (!val || val <= 0) { showToast('⚠️ 请输入有效数值'); return; }
    const note = document.getElementById('growth-note')?.value || '';
    addRecord({ type:'growth', gtype: sel, val, unit: units[sel], note });
    showToast(`📏 ${labels[sel]}: ${val}${units[sel]} ✅`);
    go('home');
  });

  document.getElementById('growth-chart-btn')?.addEventListener('click', () => go('growth-chart'));
}

// ── Health ──
function renderHealth(body, data) {
  let sel = data?.prefill || 'temp';
  body.innerHTML = `
    <div class="rec-card">
      <h3>🩺 类型</h3>
      <div class="rec-row" id="health-type">
        <button class="rec-btn" data-v="temp">🌡 体温</button>
        <button class="rec-btn" data-v="medicine">💊 用药</button>
        <button class="rec-btn" data-v="symptom">🤒 症状</button>
        <button class="rec-btn" data-v="daily">🛁 日常</button>
      </div>
    </div>
    <div class="rec-card" id="health-detail">
      <div id="health-detail-content"></div>
    </div>
    <div class="submit-row"><button class="submit-btn" id="health-submit" style="background:var(--purple);">✅ 记录健康</button></div>
  `;

  function renderHealthDetail(type) {
    const el = document.getElementById('health-detail-content');
    if (type === 'temp') {
      el.innerHTML = `<div class="rec-num"><label>🌡 体温</label><input id="h-temp" type="number" step="0.1" value="36.8" style="flex:1;"><span class="unit">℃</span></div>`;
    } else if (type === 'medicine') {
      el.innerHTML = `
        <div class="rec-num"><label>💊 药品</label><input id="h-med" placeholder="如：维生素D" style="text-align:left;font-weight:400;flex:1;"></div>
        <div class="rec-num"><label>剂量</label><input id="h-dose" value="1" style="flex:1;"><span class="unit">滴/粒</span></div>
      `;
    } else if (type === 'symptom') {
      el.innerHTML = `
        <div class="rec-row">
          <button class="rec-btn small" data-v="diarrhea">💩 腹泻</button>
          <button class="rec-btn small" data-v="rash">🔴 湿疹</button>
          <button class="rec-btn small" data-v="cough">🤧 咳嗽</button>
          <button class="rec-btn small" data-v="fever">🤒 发烧</button>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="rec-row">
          <button class="rec-btn small" data-v="bath">🛁 洗澡</button>
          <button class="rec-btn small" data-v="walk">🌳 出门</button>
          <button class="rec-btn small" data-v="tummy">🤸 趴卧</button>
        </div>
      `;
    }
    el.querySelectorAll('.rec-btn[data-v]').forEach(b => {
      b.addEventListener('click', () => {
        el.querySelectorAll('.rec-btn[data-v]').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
      });
    });
  }
  renderHealthDetail(sel);

  body.querySelectorAll('#health-type .rec-btn').forEach(b => {
    b.addEventListener('click', () => {
      body.querySelectorAll('#health-type .rec-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      sel = b.dataset.v;
      renderHealthDetail(sel);
    });
  });

  document.getElementById('health-submit')?.addEventListener('click', () => {
    const note = '';
    let label = '';
    if (sel === 'temp') {
      const v = document.getElementById('h-temp')?.value || '36.8';
      addRecord({ type:'health', subtype:'temp', d: { temp: v } });
      label = `🌡 体温 ${v}℃`;
    } else if (sel === 'medicine') {
      const med = document.getElementById('h-med')?.value || '';
      const dose = document.getElementById('h-dose')?.value || '1';
      addRecord({ type:'health', subtype:'medicine', d: { med, dose } });
      label = `💊 ${med || '用药'} ${dose}`;
    } else if (sel === 'symptom') {
      const v = document.querySelector('#health-detail-content .rec-btn.selected')?.dataset.v || '';
      const labels = { diarrhea:'腹泻', rash:'湿疹', cough:'咳嗽', fever:'发烧' };
      addRecord({ type:'health', subtype:'symptom', d: { symptom: v } });
      label = `🤒 ${labels[v]||v}`;
    } else {
      const v = document.querySelector('#health-detail-content .rec-btn.selected')?.dataset.v || '';
      const labels = { bath:'洗澡', walk:'出门', tummy:'趴卧' };
      addRecord({ type:'health', subtype:'daily', d: { activity: v } });
      label = `🛁 ${labels[v]||v}`;
    }
    showToast(`✅ ${label}`);
    go('home');
  });
}

// ── Milestone ──
function renderMilestone(body, data) {
  let sel = data?.prefill || 'smile';
  body.innerHTML = `
    <div class="rec-card">
      <h3>🎯 里程碑</h3>
      <div class="rec-row" id="ms-type">
        <button class="rec-btn" data-v="smile">🙂 微笑</button>
        <button class="rec-btn" data-v="roll">🔄 翻身</button>
        <button class="rec-btn" data-v="crawl">🐛 爬行</button>
        <button class="rec-btn" data-v="tooth">🦷 长牙</button>
      </div>
      <div class="rec-row" style="margin-top:4px;">
        <button class="rec-btn" data-v="sit">🧘 坐</button>
        <button class="rec-btn" data-v="stand">🧍 站</button>
        <button class="rec-btn" data-v="walk">🚶 走</button>
        <button class="rec-btn" data-v="talk">🗣 说话</button>
      </div>
      <div class="rec-row" style="margin-top:4px;">
        <button class="rec-btn" data-v="custom">✏️ 自定义</button>
      </div>
    </div>
    <div class="rec-card">
      <h3>📝 备注</h3>
      <div class="rec-num"><input id="ms-note" placeholder="记录这一刻..." style="text-align:left;font-weight:400;"></div>
    </div>
    <div class="submit-row"><button class="submit-btn" style="background:var(--teal);">✅ 记录里程碑</button></div>
  `;

  body.querySelectorAll('#ms-type .rec-btn').forEach(b => {
    b.addEventListener('click', () => {
      body.querySelectorAll('#ms-type .rec-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
    });
  });

  body.querySelector('.submit-btn')?.addEventListener('click', () => {
    const v = document.querySelector('#ms-type .rec-btn.selected')?.dataset.v || 'smile';
    const note = document.getElementById('ms-note')?.value || '';
    const labels = {
      smile:'🙂 第一次微笑', roll:'🔄 会翻身了', crawl:'🐛 开始爬行',
      tooth:'🦷 长牙了', sit:'🧘 会坐了', stand:'🧍 会站了',
      walk:'🚶 会走了', talk:'🗣 会说话了', custom:'✏️ '
    };
    addRecord({ type:'milestone', ms: v, note: note || labels[v] || '里程碑' });
    showToast(`🎉 ${labels[v] || '里程碑'} ✅`);
    go('home');
  });
}

// ─── Timeline ────────────────────────────────────────────────────────
function renderTimeline() {
  const wrap = document.getElementById('tl-content');
  const todayStr = today();
  const dates = [...new Set(D.records.map(r => r.date))].sort().reverse().slice(0, 14);

  if (dates.length === 0) {
    wrap.innerHTML = '<div class="empty">📝 还没有记录，回到首页开始吧</div>';
    return;
  }

  wrap.innerHTML = dates.map(date => {
    const items = dayRecords(date);
    const dow = ['日','一','二','三','四','五','六'][new Date(date).getDay()];
    const label = date === todayStr ? '今天' : date;
    return `<div class="tl-day">
      <div class="tl-date">${label} <span class="tl-dow">周${dow} · ${items.length}条</span></div>
      ${items.map(r => renderTLItem(r)).join('')}
    </div>`;
  }).join('');
}

function renderTLItem(r) {
  try {
    const t = new Date(r.ts);
    const time = isNaN(t.getTime()) ? '' : timeStr(t);
    let icon = '📝', title = '记录', detail = '';

    const L = {
      feeding: { icon: '🍼', sub: { breast:'母乳', bottle:'奶粉', solid:'辅食', quick:'快速' } },
      diaper:  { icon: '🧷', sub: { wet:'尿湿', dirty:'便便', both:'混合', ok:'正常' } },
      sleep:   { icon: '😴' },
      growth:  { icon: '📏', sub: { weight:'体重', height:'身高', head:'头围' } },
      health:  { icon: '🩺', sub: { temp:'体温', medicine:'用药', symptom:'症状', daily:'日常' } },
      milestone:{icon: '🎯' }
    }[r.type];

    if (L) {
      icon = L.icon;
      if (r.type === 'feeding') {
        title = (L.sub[r.subtype] || '喂养');
        if (r.subtype === 'breast') detail = `${r.d?.side==='left'?'⬅️左':r.d?.side==='right'?'➡️右':'🔄双侧'} ${r.d?.min||''}分钟`;
        else if (r.subtype === 'bottle') detail = `${r.d?.amt||''}ml${r.d?.brand?' '+r.d.brand:''}`;
        else if (r.subtype === 'solid') detail = `${r.d?.food||''} ${r.d?.amt||''}`;
        else detail = '已记录';
      } else if (r.type === 'diaper') {
        title = (L.sub[r.subtype] || '尿布');
        detail = r.d?.color ? `颜色:${r.d.color}` : '';
      } else if (r.type === 'sleep') {
        title = r.dur ? `${Math.floor(r.dur/60)}h${r.dur%60}min` : '睡眠';
        detail = r.stype === 'night' ? '🌙 夜眠' : (r.note||'😴 小睡');
      } else if (r.type === 'growth') {
        title = (L.sub[r.gtype] || '生长');
        detail = `${r.val}${r.unit||''}`;
      } else if (r.type === 'health') {
        title = (L.sub[r.subtype] || '健康');
        if (r.subtype === 'temp') detail = `${r.d?.temp}℃`;
        else if (r.subtype === 'medicine') detail = `${r.d?.med||''} ${r.d?.dose||''}`;
        else if (r.subtype === 'daily') detail = r.d?.activity||'';
        else detail = r.d?.symptom||'';
      } else if (r.type === 'milestone') {
        title = r.note || '里程碑';
      }
    }

    return `<div class="tl-item" data-id="${r.id||''}">
      <div class="tl-icon">${icon}</div>
      <div class="tl-info"><div class="tl-title">${title}</div><div class="tl-detail">${detail}</div></div>
      <div class="tl-time">${time}</div>
    </div>`;
  } catch(e) {
    return `<div class="tl-item"><div class="tl-icon">📝</div><div class="tl-info"><div class="tl-title">记录</div></div></div>`;
  }
}

// Timeline delete (long press simulation via double tap)
document.addEventListener('click', (e) => {
  const item = e.target.closest('.tl-item');
  if (!item || activePage !== 'timeline') return;
  const id = item.dataset.id;
  if (confirm('删除这条记录？')) {
    delRecord(id);
    renderTimeline();
    showToast('🗑 已删除');
  }
});

// ─── Report ──────────────────────────────────────────────────────────
function renderReport() {
  const wrap = document.getElementById('rpt-content');
  const wr = weekRecords();

  if (wr.length === 0) {
    wrap.innerHTML = '<div class="empty">📊 本周暂无记录</div>';
    return;
  }

  const feedCount = wr.filter(r => r.type==='feeding').length;
  const diaperCount = wr.filter(r => r.type==='diaper').length;
  const sleepTotal = wr.filter(r => r.type==='sleep').reduce((s,r) => s+(r.dur||0), 0);
  const growthW = wr.filter(r => r.type==='growth'&&r.gtype==='weight');
  const growthH = wr.filter(r => r.type==='growth'&&r.gtype==='height');

  // Daily distribution (bar chart)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const dayRecs = D.records.filter(r => r.date === ds);
    days.push({ date: ds, count: dayRecs.length, feed: dayRecs.filter(r=>r.type==='feeding').length, diaper: dayRecs.filter(r=>r.type==='diaper').length });
  }
  const maxCount = Math.max(...days.map(d=>d.count), 1);

  wrap.innerHTML = `
    <div class="rpt-card">
      <h3>📊 本周概览 (7天)</h3>
      <div class="rpt-grid">
        <div class="rpt-item"><div class="riv">${feedCount}</div><div class="ril">🍼 喂养</div></div>
        <div class="rpt-item"><div class="riv">${diaperCount}</div><div class="ril">🧷 尿布</div></div>
        <div class="rpt-item"><div class="riv">${Math.round(sleepTotal/6)/10}h</div><div class="ril">😴 睡眠</div></div>
      </div>
    </div>
    <div class="rpt-card">
      <h3>📈 每日记录趋势</h3>
      <div class="rpt-chart" id="daily-chart">
        ${days.map((d, i) => {
          const pct = (d.count / maxCount) * 100;
          return `<div class="rpt-bar" style="left:${i*14+2}%;width:12%;height:${Math.max(pct,2)}%;background:linear-gradient(to top,var(--accent3),var(--accent));" title="${d.date}: ${d.count}条"></div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:4px;padding:0 4px;">
        ${days.map(d => `<span>${d.date.slice(5)}</span>`).join('')}
      </div>
    </div>
    ${growthW.length > 0 ? `
    <div class="rpt-card">
      <h3>⚖️ 体重变化</h3>
      <div style="font-size:13px;color:var(--text);">
        ${growthW.map(g => `${g.date.slice(5)}: ${g.val}kg`).join(' → ')}
      </div>
    </div>` : ''}
    <div class="rpt-card">
      <h3>🎯 里程碑</h3>
      ${milestones().length > 0
        ? milestones().slice(0,5).map(m => `<div style="padding:4px 0;font-size:13px;">${m.date} ${m.note||'里程碑'}</div>`).join('')
        : '<div style="color:var(--text3);font-size:13px;">暂无里程碑记录</div>'}
    </div>
  `;
}

// ─── Growth Chart ────────────────────────────────────────────────────
function renderGrowthChart() {
  const wrap = document.getElementById('growth-chart-content');
  const type = document.getElementById('gc-type')?.value || 'weight';
  const data = growthRecords(type);
  const units = { weight:'kg', height:'cm', head:'cm' };
  const labels = { weight:'⚖️ 体重', height:'📐 身高', head:'🧠 头围' };

  let html = `
    <div style="display:flex;gap:6px;padding:12px 16px 4px;">
      <button class="rec-btn small selected" data-gt="weight">⚖️ 体重</button>
      <button class="rec-btn small" data-gt="height">📐 身高</button>
      <button class="rec-btn small" data-gt="head">🧠 头围</button>
    </div>
    <div class="rpt-card">
      <h3>${labels[type]}曲线</h3>
      <canvas id="growthChart" width="360" height="200"></canvas>
    </div>
  `;

  if (data.length === 0) {
    html += '<div class="empty">暂无生长数据，记录一些后会自动生成曲线</div>';
  }

  wrap.innerHTML = html;

  // Type switcher
  wrap.querySelectorAll('[data-gt]').forEach(b => {
    b.addEventListener('click', () => {
      wrap.querySelectorAll('[data-gt]').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      document.getElementById('gc-type').value = b.dataset.gt;
      renderGrowthChart();
    });
  });

  // Draw chart
  if (data.length > 1) {
    drawGrowthChart('growthChart', data, units[type]);
  } else if (data.length === 1) {
    const ctx = document.getElementById('growthChart')?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#4a3f38';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`📏 ${data[0].val}${units[type]} (${data[0].date})`, 180, 100);
    }
  }
}

function drawGrowthChart(canvasId, data, unit) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { t:20, r:20, b:30, l:40 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  ctx.clearRect(0,0,W,H);

  const vals = data.map(d => d.val);
  const min = Math.floor(Math.min(...vals) * 0.98 * 10) / 10;
  const max = Math.ceil(Math.max(...vals) * 1.02 * 10) / 10;
  const range = max - min || 1;

  // Grid
  ctx.strokeStyle = '#f0e8e0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ch - (ch * i / 4);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W-pad.r, y); ctx.stroke();
    ctx.fillStyle = '#b0a094';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText((min + range * i / 4).toFixed(1), pad.l-4, y+3);
  }

  // Line
  ctx.strokeStyle = '#f59e54';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = pad.l + (cw * i / (data.length-1 || 1));
    const y = pad.t + ch - ((d.val - min) / range * ch);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  data.forEach((d, i) => {
    const x = pad.l + (cw * i / (data.length-1 || 1));
    const y = pad.t + ch - ((d.val - min) / range * ch);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2);
    ctx.fillStyle = '#f59e54';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value labels
    ctx.fillStyle = '#4a3f38';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.val.toFixed(1), x, y-10);
  });

  // X labels (dates)
  ctx.fillStyle = '#b0a094';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  data.forEach((d, i) => {
    if (data.length > 6 && i % Math.ceil(data.length/6) !== 0 && i !== data.length-1) return;
    const x = pad.l + (cw * i / (data.length-1 || 1));
    ctx.fillText(d.date.slice(5), x, H-6);
  });
}

// ─── Settings ────────────────────────────────────────────────────────
function renderSettings() {
  const b = getBaby();
  document.getElementById('set-name').value = b.name;
  document.getElementById('set-birthday').value = b.birthday;
  document.querySelectorAll('.set-gender').forEach(el => {
    el.classList.toggle('selected', el.dataset.v === b.gender);
  });
}

// ─── Init ────────────────────────────────────────────────────────────
function init() {
  const app = document.getElementById('app');

  // Build pages
  app.innerHTML = `
    ${homeHTML()}${timelineHTML()}${reportHTML()}${settingsHTML()}
    ${recordPages()}
    <div class="toast" id="toast"></div>
    ${bottomNavHTML()}
  `;

  // Bind nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => go(el.dataset.page));
  });

  // Bind dial
  document.querySelectorAll('.sector').forEach(el => {
    el.addEventListener('click', () => openSubMenu(parseInt(el.dataset.idx)));
  });
  document.getElementById('sub-bg')?.addEventListener('click', closeSubMenu);
  document.getElementById('dial-center')?.addEventListener('click', () => showToast('🐣 今天也要加油哦 ❤️'));

  // Bind settings
  document.getElementById('set-name')?.addEventListener('change', (e) => updateBaby({ name: e.target.value }));
  document.getElementById('set-birthday')?.addEventListener('change', (e) => updateBaby({ birthday: e.target.value }));
  document.querySelectorAll('.set-gender')?.forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.set-gender').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      updateBaby({ gender: el.dataset.v });
    });
  });
  document.getElementById('set-export')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(D, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `宝宝记录_${today()}.json`;
    a.click();
    showToast('📤 数据已导出');
  });
  document.getElementById('set-clear')?.addEventListener('click', () => {
    if (confirm('确定清空所有数据？此操作不可恢复！')) {
      if (confirm('再次确认：删除所有记录？')) {
        D.records = []; saveData(D);
        renderHome(); showToast('🗑 已清空');
      }
    }
  });

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(el => {
    el.addEventListener('click', () => go('home'));
  });

  // Growth chart back
  document.getElementById('gc-back')?.addEventListener('click', () => go('home'));
  document.getElementById('gc-type')?.addEventListener('change', renderGrowthChart);

  // Init growth chart type
  const gcType = document.getElementById('gc-type');
  if (gcType) gcType.value = 'weight';

  // Enable iOS touch feedback
  enableTouchFeedback();

  // Bind press feedback to buttons (NOT sectors/sub-items — they have CSS transforms)
  document.querySelectorAll('button:not(.sector):not(.sub-item), .stat-card').forEach(el => {
    el.addEventListener('click', function() { pressFeedback(this); });
  });

  // Stats cards click
  document.querySelectorAll('.stat-card').forEach(el => {
    el.addEventListener('click', () => {
      const label = el.querySelector('.sc-label')?.textContent || '';
      const count = el.querySelector('.sc-count')?.textContent || '';
      showToast(`📊 ${label}: ${count}`);
    });
  });

  // Render
  renderHome();
  go('home');
}

// ─── HTML Templates ──────────────────────────────────────────────────
function homeHTML() {
  const baby = getBaby();
  return `
  <div class="page active" id="page-home">
    <div class="status-bar"><span>9:41</span><span>📶 🔋</span></div>
    <div class="header">
      <div class="h-left">
        <div class="h-avatar">👶</div>
        <div class="h-info">
          <div class="name" id="h-name">${baby.name}</div>
          <div class="age" id="h-age">${ageStr(baby.birthday)} · ${baby.gender}宝</div>
        </div>
      </div>
      <div class="h-right syncing"><span class="dot"></span>本地存储</div>
    </div>
    <div class="stats-row">
      <div class="stat-card" id="s-feed"><div class="sc-icon">🍼</div><div class="sc-count">0</div><div class="sc-label">喂养</div></div>
      <div class="stat-card" id="s-diaper"><div class="sc-icon">🧷</div><div class="sc-count">0</div><div class="sc-label">尿布</div></div>
      <div class="stat-card" id="s-sleep"><div class="sc-icon">😴</div><div class="sc-count">0h</div><div class="sc-label">睡眠</div></div>
      <div class="stat-card" id="s-growth"><div class="sc-icon">📏</div><div class="sc-count">—</div><div class="sc-label">生长</div></div>
    </div>
    <div class="dial-wrap">
      <div class="dial" id="dial">
        <div class="dial-bg"></div>
        <div class="dial-center" id="dial-center"><div class="dc-emoji">🐣</div><div class="dc-label">记录</div></div>
        ${[0,1,2,3,4,5].map(i => `<div class="sector s${i}" data-idx="${i}"><div class="s-inner"><div class="s-icon">${['🍼','🧷','😴','📏','🩺','🎯'][i]}</div><div class="s-label">${['喂养','尿布','睡眠','生长','健康','里程碑'][i]}</div></div></div>`).join('')}
      </div>
      <div class="sub-menu" id="sub-menu"><div class="sub-bg" id="sub-bg"></div><div class="sub-items" id="sub-items"></div></div>
    </div>
  </div>`;
}

function timelineHTML() {
  return `<div class="page" id="page-timeline">
    <div class="page-header"><button class="back-btn">‹</button><div class="page-title">📋 时间线</div></div>
    <div class="tl-wrap" id="tl-content"></div>
  </div>`;
}

function reportHTML() {
  return `<div class="page" id="page-report">
    <div class="page-header"><button class="back-btn">‹</button><div class="page-title">📊 报告</div></div>
    <div id="rpt-content"></div>
  </div>`;
}

function settingsHTML() {
  const b = getBaby();
  return `<div class="page" id="page-settings">
    <div class="page-header"><button class="back-btn">‹</button><div class="page-title">⚙️ 设置</div></div>
    <div style="margin-top:6px;">
      <div class="set-item"><div class="set-label">👶 宝宝名字</div><div class="set-value"><input class="set-input" id="set-name" value="${b.name}" style="text-align:right;"></div></div>
      <div class="set-item"><div class="set-label">🎂 生日</div><div class="set-value"><input type="date" id="set-birthday" value="${b.birthday}"></div></div>
      <div class="set-item"><div class="set-label">👤 性别</div><div class="set-value" style="gap:4px;">
        <button class="rec-btn small set-gender ${b.gender==='男'?'selected':''}" data-v="男">👦 男</button>
        <button class="rec-btn small set-gender ${b.gender==='女'?'selected':''}" data-v="女">👧 女</button>
      </div></div>
      <div class="set-item" style="border:none;"><div class="set-label">📤 数据</div></div>
      <div style="padding:0 20px;">
        <button class="rec-btn" id="set-export" style="width:100%;margin-bottom:6px;">📤 导出数据 (JSON)</button>
        <button class="rec-btn" id="set-clear" style="width:100%;border-color:var(--red);color:var(--red);">🗑 清空所有数据</button>
      </div>
      <div style="text-align:center;padding:20px;font-size:11px;color:var(--text3);">
        宝宝记录 v1.0 · 数据存储在本地
      </div>
    </div>
  </div>`;
}

function recordPages() {
  const pages = [
    { id:'feeding', title:'🍼 喂养' },
    { id:'diaper', title:'🧷 尿布' },
    { id:'sleep', title:'😴 睡眠' },
    { id:'growth', title:'📏 生长' },
    { id:'health', title:'🩺 健康' },
    { id:'milestone', title:'🎯 里程碑' }
  ];

  let html = '';
  pages.forEach(p => {
    html += `<div class="page" id="page-${p.id}">
      <div class="page-header"><button class="back-btn">‹</button><div class="page-title">${p.title}</div></div>
      <div class="rec-body"></div>
    </div>`;
  });

  // Growth chart page
  html += `<div class="page" id="page-growth-chart">
    <div class="page-header"><button class="back-btn" id="gc-back">‹</button><div class="page-title">📈 生长曲线</div></div>
    <input type="hidden" id="gc-type" value="weight">
    <div id="growth-chart-content"></div>
  </div>`;

  return html;
}

function bottomNavHTML() {
  return `<div class="bottom-nav">
    <div class="nav-item active" data-page="home"><div class="ni-icon">🏠</div>首页</div>
    <div class="nav-item" data-page="timeline"><div class="ni-icon">📋</div>时间线</div>
    <div class="nav-item" data-page="report"><div class="ni-icon">📊</div>报告</div>
    <div class="nav-item" data-page="settings"><div class="ni-icon">⚙️</div>设置</div>
  </div>`;
}

// ─── Boot ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
