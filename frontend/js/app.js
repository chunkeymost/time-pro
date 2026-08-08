(function(){
  "use strict";

  /* ---------------- State ---------------- */
  const CATS = {
    desain:        { label:"Desain",        cls:"cat-desain" },
    pengembangan:  { label:"Pengembangan",  cls:"cat-pengembangan" },
    pengujian:     { label:"Pengujian",     cls:"cat-pengujian" },
    peluncuran:    { label:"Peluncuran",    cls:"cat-peluncuran" },
    lainnya:       { label:"Lainnya",       cls:"cat-lainnya" },
    research:      { label:"RnD (Research & Development)", cls:"cat-research" },
    operasional:   { label:"Operasional",                 cls:"cat-operasional" },
  };

  function today(){
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }
  function addDays(date, n){
    const d = new Date(date);
    d.setDate(d.getDate()+n);
    return d;
  }
  function fmt(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function parseDate(str){
    const parts = str.split('-').map(Number);
    if(parts.length!==3 || parts.some(isNaN)) return null;
    const d = new Date(parts[0], parts[1]-1, parts[2]);
    d.setHours(0,0,0,0);
    return d;
  }
  function dayDiff(a,b){ return Math.round((b-a)/86400000); }
  function countWeekdays(start,end){
    if(!start||!end) return 0;
    let c=0; const d=new Date(start);
    while(d<=end){ const w=d.getDay(); if(w!==0&&w!==6) c++; d.setDate(d.getDate()+1); }
    return c;
  }
  const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const DOW_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

  const T = today();

  let tasks = [];
  let nextId = 1;
  let nextTodoId = 1;
  let lastUpdated = null;
  let restoreLog = [];
  let taskLogs = [];
  let editingTodoId = null;
  let selectedId = null;
  let view = "week"; // "week" | "month"
  let dayWidth = 40;

  const els = {
    title: document.getElementById('project-title'),
    range: document.getElementById('project-range'),
    legend: document.getElementById('legend'),
    sidebarList: document.getElementById('sidebar-list'),
    ruler: document.getElementById('ruler'),
    rows: document.getElementById('rows'),
    timelineInner: document.getElementById('timeline-inner'),
    timelineWrap: document.getElementById('timeline-wrap'),
    overlay: document.getElementById('overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalSub: document.getElementById('modal-sub'),
    fName: document.getElementById('f-name'),
    fStart: document.getElementById('f-start'),
    fEnd: document.getElementById('f-end'),
    fCat: document.getElementById('f-cat'),
    fAssignee: document.getElementById('f-assignee'),
    fProgress: document.getElementById('f-progress'),
    fProgressVal: document.getElementById('f-progress-val'),
    todoInput: document.getElementById('todo-input'),
    todoDate: document.getElementById('todo-date'),
    todoAddBtn: document.getElementById('todo-add-btn'),
    todoCancelBtn: document.getElementById('todo-cancel-btn'),
    todoBody: document.getElementById('todo-body'),
    deleteBtn: document.getElementById('delete-btn'),
    confirmOverlay: document.getElementById('confirm-overlay'),
    confirmMsg: document.getElementById('confirm-msg'),
    confirmYes: document.getElementById('confirm-yes'),
    todoSection: document.getElementById('todo-section'),
    bellBtn: document.getElementById('bell-btn'),
    bellDot: document.getElementById('bell-dot'),
    notifOverlay: document.getElementById('notif-overlay'),
    notifBody: document.getElementById('notif-body'),
    notifSub: document.getElementById('notif-sub'),
    evidenceOverlay: document.getElementById('evidence-overlay'),
    evidenceBody: document.getElementById('evidence-body'),
    evidenceSub: document.getElementById('evidence-sub'),
    evidenceTypeRadios: document.querySelectorAll('input[name="evidence-type"]'),
    evidenceLinkMode: document.getElementById('evidence-link-mode'),
    evidenceTextMode: document.getElementById('evidence-text-mode'),
    evidenceLinkInput: document.getElementById('evidence-link-input'),
    evidenceDescInput: document.getElementById('evidence-desc-input'),
    evidenceTextInput: document.getElementById('evidence-text-input'),
    evidenceImageMode: document.getElementById('evidence-image-mode'),
    evidenceFileInput: document.getElementById('evidence-file-input'),
    evidenceImageKetInput: document.getElementById('evidence-image-ket-input'),
    evidenceAddBtn: document.getElementById('evidence-add-btn'),
    evidenceLogSection: document.getElementById('evidence-log-section'),
    evidenceLogBody: document.getElementById('evidence-log-body'),
    imgPreviewOverlay: document.getElementById('img-preview-overlay'),
    imgPreviewImg: document.getElementById('img-preview-img'),
    reportOverlay: document.getElementById('report-overlay'),
    reportContent: document.getElementById('report-content'),
    rStart: document.getElementById('r-start'),
    rEnd: document.getElementById('r-end'),
    taskLogSection: document.getElementById('task-log-section'),
    taskLogBody: document.getElementById('task-log-body'),
  };

  /* ---------------- API helper ---------------- */
  const api = {
    async get(path) {
      const r = await fetch(path);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async post(path, body) {
      const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async put(path, body) {
      const r = await fetch(path, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async del(path) {
      const r = await fetch(path, { method:'DELETE' });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  };

  async function loadTasks(){
    try {
      const data = await api.get('/api/tasks');
      tasks = data.tasks.map(t => ({
        ...t,
        start: parseDate(t.start),
        end: parseDate(t.end),
        todos: (t.todos||[]).map(td => ({ ...td, due: td.due ? parseDate(td.due) : null })),
        evidences: t.evidences || [],
      }));
      tasks.sort((a, b) => a.start - b.start);
      nextId = data.nextId;
      nextTodoId = data.nextTodoId;
      lastUpdated = data.metadata?.updatedAt || null;
      if (data.metadata?.title) els.title.textContent = data.metadata.title;
      try {
        const logRes = await fetch('/api/restore-log');
        const logData = await logRes.json();
        restoreLog = logData.restoreLog || [];
      } catch(_){ restoreLog = []; }
      renderRestoreLog();
    } catch(e){
      console.error('Gagal memuat data:', e);
      alert('Gagal memuat data. Pastikan server API berjalan (node server.js).');
    }
    renderLegend();
    renderAll(true);
    updateBellDot();
  }

  let _confirmResolve = null;

  function showConfirm(msg, confirmLabel = 'Ya, Hapus', cancelLabel = 'Batal', confirmClass = 'confirm-yes'){
    return new Promise(resolve => {
      els.confirmMsg.innerHTML = msg;
      document.getElementById('confirm-cancel').textContent = cancelLabel;
      const confirmBtn = document.getElementById('confirm-yes');
      confirmBtn.textContent = confirmLabel;
      confirmBtn.className = 'btn ' + confirmClass;
      _confirmResolve = resolve;
      els.confirmOverlay.classList.add('open');
    });
  }
  function closeConfirm(){
    els.confirmOverlay.classList.remove('open');
    _confirmResolve = null;
  }
  document.getElementById('confirm-cancel').addEventListener('click', ()=>{
    els.confirmOverlay.classList.remove('open');
    _confirmResolve = null;
  });
  els.confirmYes.addEventListener('click', ()=>{
    const resolve = _confirmResolve;
    els.confirmOverlay.classList.remove('open');
    _confirmResolve = null;
    if(resolve) resolve();
  });

  /* ---------------- Legend ---------------- */
  function renderLegend(){
    els.legend.innerHTML =
      `<span class="legend-label">Tags : </span>` +
      Object.values(CATS).map(c =>
        `<span class="legend-item"><span class="legend-dot ${c.cls}"></span>${c.label}</span>`
      ).join('') + `<span class="legend-item"><span class="legend-dot cat-today"></span>Hari ini</span>`;
  }

  /* ---------------- Range calc ---------------- */
  function computeRange(){
    if(tasks.length===0){
      return { start: addDays(T,-5), end: addDays(T,20) };
    }
    let min = tasks[0].start, max = tasks[0].end;
    tasks.forEach(t=>{
      if(t.start < min) min = t.start;
      if(t.end > max) max = t.end;
    });
    min = addDays(min, -4);
    max = addDays(max, 6);
    // ensure today is visible
    if(T < min) min = addDays(T,-3);
    if(T > max) max = addDays(T,3);
    return { start:min, end:max };
  }

  /* ---------------- Render ruler ---------------- */
  function renderRuler(range){
    const totalDays = dayDiff(range.start, range.end)+1;
    els.timelineInner.style.setProperty('--day-w', dayWidth+'px');
    els.timelineInner.style.width = (totalDays*dayWidth)+'px';
    els.ruler.style.setProperty('--day-w', dayWidth+'px');
    const rs = document.getElementById('ruler-scroll');
    rs.innerHTML = '';
    rs.style.width = (totalDays*dayWidth)+'px';

    let lastMonth = null;
    for(let i=0;i<totalDays;i++){
      const d = addDays(range.start, i);
      const x = i*dayWidth;

      if(d.getDate()===1 || i===0){
        const label = document.createElement('div');
        label.className='ruler-month';
        label.style.left = x+'px';
        label.textContent = `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
        rs.appendChild(label);
      }

      if(view==='week' && dayWidth>=28){
        const dayLbl = document.createElement('div');
        const isWeekend = d.getDay()===0 || d.getDay()===6;
        const isToday = d.toDateString() === T.toDateString();
        dayLbl.className = 'ruler-day' + (isWeekend?' weekend':'') + (isToday?' today':'');
        dayLbl.style.left = x+'px';
        dayLbl.textContent = d.getDate();
        rs.appendChild(dayLbl);
      } else if(d.getDay()===1) {
        const dayLbl = document.createElement('div');
        dayLbl.className = 'ruler-day';
        dayLbl.style.left = x+'px';
        dayLbl.textContent = d.getDate()+' '+MONTHS_ID[d.getMonth()];
        rs.appendChild(dayLbl);
      }

      const tick = document.createElement('div');
      tick.className='ruler-tick';
      tick.style.left = x+'px';
      rs.appendChild(tick);
    }
  }

  /* ---------------- Render rows / bars ---------------- */
  function renderRows(range){
    const totalDays = dayDiff(range.start, range.end)+1;
    els.rows.innerHTML = '';
    els.rows.style.width = (totalDays*dayWidth)+'px';

    // weekend shading
    for(let i=0;i<totalDays;i++){
      const d = addDays(range.start,i);
      if(d.getDay()===0 || d.getDay()===6){
        const col = document.createElement('div');
        col.className='weekend-col';
        col.style.left = (i*dayWidth)+'px';
        col.style.height = (tasks.length*52)+'px';
        els.rows.appendChild(col);
      }
    }

    tasks.forEach((t, idx) => {
      const rowBg = document.createElement('div');
      rowBg.className='row-bg';
      rowBg.style.width = (totalDays*dayWidth)+'px';
      els.rows.appendChild(rowBg);
    });

    // today line
    const todayOffset = dayDiff(range.start, T);
    if(todayOffset>=0 && todayOffset<=totalDays){
      const line = document.createElement('div');
      line.className='today-line';
      line.style.left = (todayOffset*dayWidth)+'px';
      document.querySelector('.timeline-group').appendChild(line);
    }

    tasks.forEach((t, idx) => {
      const bar = document.createElement('div');
      bar.className = 'bar ' + (CATS[t.cat] ?? CATS.lainnya).cls;
      bar.dataset.id = t.id;
      const left = dayDiff(range.start, t.start)*dayWidth;
      const width = (dayDiff(t.start,t.end)+1)*dayWidth - 4;
      bar.style.left = (left+2)+'px';
      bar.style.width = Math.max(width, 18)+'px';
      bar.style.top = (idx*52 + 10)+'px';

      const fill = document.createElement('div');
      fill.className='fill';
      fill.style.width = t.progress+'%';
      bar.appendChild(fill);

      const label = document.createElement('span');
      label.className='label';
      label.textContent = t.name;
      bar.appendChild(label);

      const pct = document.createElement('span');
      pct.className='pct';
      pct.textContent = t.progress+'%';
      bar.appendChild(pct);

      const hLeft = document.createElement('div');
      hLeft.className='handle left';
      const hRight = document.createElement('div');
      hRight.className='handle right';
      bar.appendChild(hLeft);
      bar.appendChild(hRight);

      attachBarDrag(bar, t, hLeft, hRight);
      bar.addEventListener('click', (e)=>{
        if(bar._dragged) { bar._dragged=false; return; }
        openModal(t);
      });

      els.rows.appendChild(bar);
    });

    els.rows.style.height = Math.max(tasks.length*52, 52)+'px';
  }

  /* ---------------- Drag & resize ---------------- */
  function attachBarDrag(bar, task, hLeft, hRight){
    let mode = null; // 'move' | 'left' | 'right'
    let startX = 0;
    let origStart = null, origEnd = null;

    function onDown(e, m){
      mode = m;
      startX = e.clientX;
      origStart = task.start;
      origEnd = task.end;
      bar._dragged = false;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.stopPropagation();
      e.preventDefault();
    }

    function onMove(e){
      const dx = e.clientX - startX;
      if(Math.abs(dx) > 3) bar._dragged = true;
      const deltaDays = Math.round(dx/dayWidth);
      if(mode==='move'){
        task.start = addDays(origStart, deltaDays);
        task.end = addDays(origEnd, deltaDays);
      } else if(mode==='left'){
        const newStart = addDays(origStart, deltaDays);
        if(newStart <= task.end) task.start = newStart;
      } else if(mode==='right'){
        const newEnd = addDays(origEnd, deltaDays);
        if(newEnd >= task.start) task.end = newEnd;
      }
      renderAll(false);
    }

    function onUp(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      mode = null;
      if(task && bar._dragged){
        api.put('/api/tasks/'+task.id, {
          name: task.name, start: fmt(task.start), end: fmt(task.end),
          cat: task.cat, assignee: task.assignee, progress: task.progress,
        }).catch(e => console.error('Save drag failed:', e));
      }
    }

    bar.addEventListener('mousedown', (e)=> onDown(e,'move'));
    hLeft.addEventListener('mousedown', (e)=> onDown(e,'left'));
    hRight.addEventListener('mousedown', (e)=> onDown(e,'right'));
  }

  /* ---------------- Sidebar ---------------- */
  function renderSidebar(){
    if(tasks.length===0){
      els.sidebarList.innerHTML = `<div class="sidebar-empty">Belum ada tugas. Tambahkan tugas pertama untuk mulai membangun lini waktu.</div>`;
      return;
    }
    els.sidebarList.innerHTML = '';
    tasks.forEach(t=>{
      const row = document.createElement('div');
      const isDone = t.progress === 100;
      const isOverdue = !isDone && t.end && t.end < today();
      row.className = 'sidebar-row' + (t.id===selectedId ? ' selected':'') + (isDone ? ' done':'') + (isOverdue ? ' overdue':'');
      row.innerHTML = `
        <div class="sidebar-row-top">
          <span class="name">${escapeHtml(t.name)}</span>
          ${isDone ? '<span class="done-flag">🏁</span>' : ''}
          ${isOverdue ? '<span class="overdue-flag"><i class="bi bi-bell-fill"></i></span>' : ''}
        </div>
        <span class="meta"><span class="tag-dot ${(CATS[t.cat] ?? CATS.lainnya).cls}"></span>${(CATS[t.cat] ?? CATS.lainnya).label} · ${t.progress}% · ${countWeekdays(t.start,t.end)} Hari Pengerjaan</span>
      `;
      row.addEventListener('click', ()=> openModal(t));
      els.sidebarList.appendChild(row);
    });
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function shortenUrl(url, maxLen){
    if(maxLen === undefined) maxLen = 45;
    return url.length > maxLen ? url.slice(0, maxLen) + '...' : url;
  }

  function fmtDateTime(isoStr){
    if(!isoStr) return '';
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2,'0')} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  /* ---------------- Project range label ---------------- */
  function renderProjectRange(){
    if(tasks.length===0){ els.range.textContent='Belum ada tugas'; return; }
    let min=tasks[0].start, max=tasks[0].end;
    tasks.forEach(t=>{ if(t.start<min) min=t.start; if(t.end>max) max=t.end; });
    const updated = lastUpdated ? ` · Last updated ${fmtDateTime(lastUpdated)}` : '';
    els.range.textContent = `${fmt(min)} — ${fmt(max)} · ${tasks.length} tugas${updated}`;
  }

  /* ---------------- Restore Log ---------------- */
  function renderRestoreLog(){
    const container = document.getElementById('restore-history-list');
    if(!container) return;
    if(!restoreLog || restoreLog.length === 0){
      container.innerHTML = '<div class="restore-history-empty">Belum ada aktivitas restore</div>';
      return;
    }
    const statusDisplay = { 'Restored':'Restored', 'Failed':'Failed', 'BackedUp':'Backed Up' };
    container.innerHTML = restoreLog.map(e => {
      const d = new Date(e.restoreAt);
      const dateStr = d.toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }) + ', ' + 
        String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      return '<div class="restore-history-item">' +
        '<div class="restore-history-status ' + e.status + '">' + (statusDisplay[e.status] || e.status) + '</div>' +
        '<div class="restore-history-file">' + e.filename + '</div>' +
        '<div class="restore-history-date">' + dateStr + '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------------- Task Log ---------------- */
  async function loadTaskLog(taskId){
    try {
      const res = await fetch('/api/tasks/' + taskId + '/changelog');
      const data = await res.json();
      taskLogs = data.logs || [];
    } catch(_){ taskLogs = []; }
    renderTaskLog();
  }

  function renderTaskLog(){
    els.taskLogBody.innerHTML = '';
    if(!taskLogs || taskLogs.length === 0){
      els.taskLogBody.innerHTML = '<tr><td colspan="3" class="task-log-empty">Belum ada riwayat perubahan.</td></tr>';
      return;
    }
    taskLogs.forEach((log, i) => {
      const d = new Date(log.actionAt);
      const datePart = d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
      const timePart = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="todo-num">' + (i + 1) + '</td>' +
        '<td class="log-action-text">' + escapeHtml(log.action) + '</td>' +
        '<td class="log-date-text"><span class="log-date-row">' + datePart + '</span><span class="log-time-row">' + timePart + '</span></td>';
      els.taskLogBody.appendChild(tr);
    });
  }

  /* ---------------- Master render ---------------- */
  function renderAll(scrollToToday){
    const range = computeRange();
    renderRuler(range);
    renderRows(range);
    renderSidebar();
    renderProjectRange();
    document.getElementById('backup-btn').disabled = tasks.length === 0;
    if(scrollToToday) scrollToTodayLine(range);
  }

  function scrollToTodayLine(range){
    const offset = dayDiff(range.start, T)*dayWidth;
    els.timelineWrap.scrollLeft = Math.max(offset - 200, 0);
    syncRulerScroll();
  }

  function syncRulerScroll(){
    const rs = document.getElementById('ruler-scroll');
    if(rs) rs.style.transform = `translateX(${-els.timelineWrap.scrollLeft}px)`;
  }

  /* ---------------- View toggle ---------------- */
  document.getElementById('view-toggle').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    document.querySelectorAll('#view-toggle button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    view = btn.dataset.view;
    dayWidth = view==='week' ? 40 : 14;
    renderAll(true);
  });

  document.getElementById('today-btn').addEventListener('click', ()=>{
    renderAll(true);
  });

  /* ---------------- Toast ---------------- */
  function showToast(msg, type='success'){
    const el = document.createElement('div');
    el.className = 'toast '+type;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(()=>{ el.remove(); }, 3000);
  }

  /* ---------------- Backup ---------------- */
  document.getElementById('backup-btn').addEventListener('click', async ()=>{
    await showConfirm('Yakin ingin melakukan backup data?', 'Ya, Backup', 'Batal', 'btn-primary');
    const btn = document.getElementById('backup-btn');
    btn.textContent = 'MENYIMPAN...';
    btn.disabled = true;
    try {
      const res = await fetch('/api/backup', { method:'POST' });
      const data = await res.json();
      if(data.success) {
        showToast('Backup berhasil: '+data.file);
        const logRes = await fetch('/api/restore-log');
        const logData = await logRes.json();
        restoreLog = logData.restoreLog || [];
        renderRestoreLog();
      } else showToast('Backup gagal', 'error');
    } catch(e){
      showToast('Backup gagal: '+e.message, 'error');
    } finally {
      btn.textContent = 'KEPT ON IT';
      btn.disabled = false;
    }
  });

  /* ---------------- Restore ---------------- */
  const restoreOverlay = document.getElementById('restore-overlay');
  const restoreList = document.getElementById('restore-list');

  document.getElementById('restore-btn').addEventListener('click', async ()=>{
    restoreOverlay.classList.add('open');
    restoreList.innerHTML = '<div class="restore-loading">Memuat daftar backup...</div>';
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (!data.backups || data.backups.length === 0) {
        restoreList.innerHTML = '<div class="restore-empty">Tidak ada file backup ditemukan.</div>';
        return;
      }
      restoreList.innerHTML = '';
      const typeLabels = {
        'task': 'Tasks',
        'task-changelog': 'Task Log',
        'evidence-changelog': 'Evidence Log',
        'restore-log': 'Restore Log'
      };
      const latestByType = {};
      data.backups.forEach((b) => {
        if (!latestByType[b.type]) latestByType[b.type] = b.filename;
      });
      data.backups.forEach((b) => {
        const isLatest = b.filename === latestByType[b.type];
        const isTask = b.type === 'task';
        const item = document.createElement('div');
        item.className = 'restore-item' + (isLatest && isTask ? ' latest' : '');
        item.innerHTML = `
          <div class="restore-info">
            <span class="restore-filename">${b.filename}</span>
            <span class="restore-type">${typeLabels[b.type] || b.type}</span>
            <span class="restore-date">${b.date || ''}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${isLatest ? '<span class="restore-latest-badge">Latest</span>' : ''}
            ${isTask ? '<button class="restore-btn" data-file="' + b.filename + '">Restore</button>' : ''}
          </div>
        `;
        restoreList.appendChild(item);
      });
      renderRestoreLog();
    } catch(e){
      restoreList.innerHTML = '<div class="restore-empty">Gagal memuat daftar backup: ' + e.message + '</div>';
    }
  });

  document.getElementById('restore-close-btn').addEventListener('click', ()=>{
    restoreOverlay.classList.remove('open');
  });

  restoreOverlay.addEventListener('click', (e)=>{
    if (e.target === restoreOverlay) restoreOverlay.classList.remove('open');
  });

  restoreList.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.restore-btn');
    if (!btn) return;
    const filename = btn.dataset.file;
    await showConfirm('Yakin ingin me-restore data dari file <strong>' + filename + '</strong>?<br><br>Data tugas yang ada saat ini akan digantikan seluruhnya.', 'Ya, Restore', 'Batal', 'btn-primary');
    btn.textContent = 'MERESTORE...';
    btn.disabled = true;
    try {
      const res = await fetch('/api/restore', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ filename }) });
      const data = await res.json();
      if(data.success) {
        showToast('Restore berhasil: ' + data.taskCount + ' tugas diimpor.');
        restoreOverlay.classList.remove('open');
        loadTasks();
      } else {
        showToast('Restore gagal: ' + (data.error || ''), 'error');
      }
    } catch(e){
      showToast('Restore gagal: ' + e.message, 'error');
    } finally {
      btn.textContent = 'Restore';
      btn.disabled = false;
    }
  });

  /* ---------------- Modal logic ---------------- */
  let editingId = null;

  function openModal(task){
    editingId = task ? task.id : null;
    els.modalTitle.textContent = task ? 'Ubah Tugas' : 'Tugas Baru';
    els.modalSub.textContent = task ? 'Perbarui detail atau geser jadwal tugas ini.' : 'Isi detail tugas di bawah ini.';
    els.fName.value = task ? task.name : '';
    els.fStart.value = task ? fmt(task.start) : fmt(T);
    els.fEnd.value = task ? fmt(task.end) : fmt(addDays(T,3));
    els.fCat.value = task ? task.cat : 'pengembangan';
    els.fAssignee.value = task ? task.assignee : '';
    els.fProgress.value = task ? task.progress : 0;
    els.fProgressVal.textContent = (task ? task.progress : 0)+'%';
    els.deleteBtn.style.visibility = task ? 'visible' : 'hidden';
    selectedId = task ? task.id : null;
    renderSidebar();
    els.todoSection.style.display = task ? '' : 'none';
    if(task){
      els.todoDate.min = fmt(task.start);
      els.todoDate.max = fmt(task.end);
    } else {
      els.todoDate.min = '';
      els.todoDate.max = '';
    }
    renderTodos(task);
    updateProgressSlider(task);
    updateProgressFromTodos(task);
    if(task){
      els.taskLogSection.style.display = '';
      loadTaskLog(task.id);
    } else {
      els.taskLogSection.style.display = 'none';
      taskLogs = [];
      renderTaskLog();
    }
    els.overlay.classList.add('open');
    els.fName.focus();
  }

  function closeModal(force){
    if(!force && els.confirmOverlay.classList.contains('open')) return;
    els.overlay.classList.remove('open');
    els.todoSection.style.display = '';
    cancelTodoEdit();
    editingId = null;
    selectedId = null;
    renderSidebar();
    closeEvidencePanel();
  }

  els.fProgress.addEventListener('input', ()=>{
    els.fProgressVal.textContent = els.fProgress.value+'%';
  });

  /* ---------------- To Do List ---------------- */
  function renderTodos(task){
    els.todoBody.innerHTML = '';
    if(!task || !task.todos || task.todos.length===0){
      els.todoBody.innerHTML = '<tr><td colspan="5" style="padding:16px 4px;color:var(--ink-faint);font-size:12px;">Belum ada aktivitas.</td></tr>';
      return;
    }
    task.todos.forEach((todo, i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="todo-num">${i+1}</td>
        <td><span class="todo-text${todo.done?' done':''}">${escapeHtml(todo.text)}</span></td>
        <td class="todo-due" style="font-size:11px;font-family:'IBM Plex Mono',monospace;">${todo.due ? fmt(todo.due) : '—'}</td>
        <td class="todo-status"><input type="checkbox" class="todo-cb" data-todo-id="${todo.id}"${todo.done?' checked':''}></td>
        <td class="todo-del"><button class="todo-del-btn" data-todo-id="${todo.id}">&times;</button></td>
      `;
      tr.querySelector('.todo-cb').addEventListener('change', function(){
        todo.done = this.checked;
        api.put('/api/tasks/'+task.id+'/todos/'+todo.id, { done: todo.done }).catch(e => console.error('Save todo cb failed:', e));
        updateProgressFromTodos(task);
        renderTodos(task);
        updateBellDot();
        if(editingId) loadTaskLog(editingId);
      });
      tr.querySelector('.todo-del-btn').addEventListener('click', function(){
        api.del('/api/tasks/'+task.id+'/todos/'+todo.id).catch(e => console.error('Delete todo failed:', e));
        task.todos = task.todos.filter(t=>t.id!==todo.id);
        updateProgressFromTodos(task);
        renderTodos(task);
        updateProgressSlider(task);
        updateBellDot();
        if(editingId) loadTaskLog(editingId);
      });
      tr.querySelector('.todo-text').addEventListener('click', function(){
        editingTodoId = todo.id;
        els.todoInput.value = todo.text;
        els.todoDate.value = todo.due ? fmt(todo.due) : '';
        els.todoAddBtn.textContent = 'Ubah';
        els.todoCancelBtn.style.display = '';
        els.todoInput.focus();
      });
      els.todoBody.appendChild(tr);
    });
  }

  function updateProgressFromTodos(task){
    if(!task || !task.todos || task.todos.length===0) return;
    const done = task.todos.filter(t=>t.done).length;
    task.progress = Math.round((done / task.todos.length) * 100);
    els.fProgress.value = task.progress;
    els.fProgressVal.textContent = task.progress+'%';
  }

  function updateProgressSlider(task){
    if(!task || !task.todos || task.todos.length===0){
      els.fProgress.disabled = false;
      els.fProgress.style.opacity = '';
      els.fProgress.style.cursor = '';
    } else {
      els.fProgress.disabled = true;
      els.fProgress.style.opacity = '0.5';
      els.fProgress.style.cursor = 'not-allowed';
    }
  }

  function cancelTodoEdit(){
    editingTodoId = null;
    els.todoInput.value = '';
    els.todoDate.value = '';
    els.todoAddBtn.textContent = 'Tambah';
    els.todoCancelBtn.style.display = 'none';
  }

  /* ---------------- Notification Panel ---------------- */
  function openNotifPanel(){
    const T = today();
    const allTodos = [];
    tasks.forEach(task => {
      (task.todos||[]).forEach(todo => {
        allTodos.push({ ...todo, taskId: task.id, taskName: task.name });
      });
    });

    const sorted = allTodos.sort((a, b) => {
      if(!a.due && !b.due) return 0;
      if(!a.due) return 1;
      if(!b.due) return -1;
      return a.due - b.due;
    });

    const ordered = sorted.filter(t => !t.done);

    if(ordered.length === 0){
      els.notifBody.innerHTML = '<tr><td colspan="6" class="notif-empty">Semua aktivitas telah selesai.</td></tr>';
      els.notifSub.textContent = 'Tidak ada aktivitas yang perlu diproses.';
      return;
    }

    els.notifSub.textContent = 'Daftar aktivitas yang perlu diproses.';
    els.notifBody.innerHTML = '';
    ordered.forEach((todo, i) => {
      let sisaHariText, sisaClass;
      if(!todo.due){
        sisaHariText = '—';
        sisaClass = '';
      } else {
        const diff = dayDiff(T, todo.due);
        if(diff < 0){
          sisaHariText = 'Overdue';
          sisaClass = 'overdue';
        } else if(diff === 0){
          sisaHariText = 'Hari ini';
          sisaClass = '';
        } else {
          sisaHariText = diff + ' hari';
          sisaClass = '';
        }
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="todo-num">${i+1}</td>
        <td><span class="todo-text${todo.done?' done':''}">${escapeHtml(todo.text)}</span></td>
        <td class="todo-due" style="font-size:11px;font-family:'IBM Plex Mono',monospace;">${todo.due ? fmt(todo.due) : '—'}</td>
        <td class="todo-due" style="font-size:11px;font-family:'IBM Plex Mono',monospace;${sisaClass ? 'color:var(--status-risk);font-weight:600;' : ''}">${sisaHariText}</td>
        <td class="todo-status"><input type="checkbox" class="todo-cb" data-task-id="${todo.taskId}" data-todo-id="${todo.id}"${todo.done?' checked':''}></td>
        <td class="todo-aksi"><button class="todo-copy-btn" title="Copy teks"><i class="bi bi-copy"></i></button></td>
      `;

      tr.querySelector('.todo-cb').addEventListener('change', async function(){
        todo.done = this.checked;
        const task = tasks.find(t => t.id === todo.taskId);
        if(task){
          const t = task.todos.find(td => td.id === todo.id);
          if(t) t.done = todo.done;
          updateProgressFromTodos(task);
          await api.put('/api/tasks/'+todo.taskId+'/todos/'+todo.id, { done: todo.done }).catch(e => console.error('Save notif todo failed:', e));
        }
        openNotifPanel();
        updateBellDot();
        renderAll(false);
      });

      tr.querySelector('.todo-text').addEventListener('click', function(){
        els.notifOverlay.classList.remove('open');
        const task = tasks.find(t => t.id === todo.taskId);
        if(task) openModal(task);
      });

      tr.querySelector('.todo-copy-btn').addEventListener('click', function(){
        navigator.clipboard.writeText(todo.text).then(() => showToast('Teks berhasil tercopy')).catch(() => showToast('Gagal copy teks', 'error'));
      });

      els.notifBody.appendChild(tr);
    });
  }

  function updateBellDot(){
    const pending = tasks.some(t => (t.todos||[]).some(td => !td.done));
    els.bellDot.classList.toggle('active', pending);
  }

  /* ---------------- Evidence Panel ---------------- */
  let evidenceTaskId = null;

  function truncateText(text, maxLen){
    if(!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  }

  function switchEvidenceMode(mode){
    els.evidenceLinkMode.style.display = 'none';
    els.evidenceTextMode.style.display = 'none';
    els.evidenceImageMode.style.display = 'none';
    if(mode === 'text'){
      els.evidenceTextMode.style.display = '';
    } else if(mode === 'image'){
      els.evidenceImageMode.style.display = '';
    } else {
      els.evidenceLinkMode.style.display = '';
    }
  }

  els.evidenceTypeRadios.forEach(radio => {
    radio.addEventListener('change', function(){
      if(this.checked) switchEvidenceMode(this.value);
    });
  });

  function openEvidencePanel(taskId){
    evidenceTaskId = taskId;
    document.querySelector('input[name="evidence-type"][value="link"]').checked = true;
    switchEvidenceMode('link');
    renderEvidences();
    loadEvidenceLog(taskId);
    els.evidenceOverlay.classList.add('open');
  }

  function closeEvidencePanel(){
    els.evidenceOverlay.classList.remove('open');
    evidenceTaskId = null;
    els.evidenceLinkInput.value = '';
    els.evidenceDescInput.value = '';
    els.evidenceTextInput.value = '';
    els.evidenceFileInput.value = '';
    els.evidenceImageKetInput.value = '';
  }

  function renderEvidences(){
    els.evidenceBody.innerHTML = '';
    const task = tasks.find(t => t.id === evidenceTaskId);
    if(!task || !task.evidences || task.evidences.length === 0){
      els.evidenceBody.innerHTML = '<tr><td colspan="6" class="evidence-empty">Belum ada evidence.</td></tr>';
      els.evidenceSub.textContent = 'Belum ada evidence.';
      return;
    }
    els.evidenceSub.textContent = 'Daftar evidence tugas.';
    task.evidences.forEach((ev, i) => {
      const tr = document.createElement('tr');
      const isText = (ev.type === 'text');
      const isImage = (ev.type === 'image');
      let evTextDisplay, evLinkDisplay, evKet;
      if(isImage){
        const imgSrc = '/' + ev.link;
        evTextDisplay = '<img src="'+escapeHtml(imgSrc)+'" class="evidence-img-thumb" data-preview="'+escapeHtml(imgSrc)+'" title="Klik untuk preview">';
        evLinkDisplay = '<span class="evidence-img-placeholder">Gambar</span>';
        evKet = escapeHtml(ev.keterangan || '');
      } else if(isText){
        evTextDisplay = '<span class="evidence-text-cell" title="'+escapeHtml(ev.keterangan || '')+'">'+escapeHtml(truncateText(ev.keterangan, 100))+'</span>';
        evLinkDisplay = '-';
        evKet = '-';
      } else {
        evTextDisplay = '-';
        evLinkDisplay = ev.link ? '<a href="'+escapeHtml(ev.link)+'" target="_blank" class="evidence-link-text" title="'+escapeHtml(ev.link)+'">'+escapeHtml(shortenUrl(ev.link))+'</a>' : '-';
        evKet = escapeHtml(ev.keterangan || '');
      }
      tr.innerHTML = `
        <td class="evidence-num">${i+1}</td>
        <td class="evidence-date">${ev.created_at ? new Date(ev.created_at).toLocaleDateString('id-ID') : '-'}</td>
        <td class="evidence-text">${evTextDisplay}</td>
        <td class="evidence-link">${evLinkDisplay}</td>
        <td>${evKet}</td>
        <td class="evidence-del"><button class="evidence-del-btn" data-ev-id="${ev.id}">&times;</button></td>
      `;
      tr.querySelector('.evidence-del-btn').addEventListener('click', async function(){
        const evId = parseInt(this.dataset.evId, 10);
        await api.del('/api/tasks/'+task.id+'/evidences/'+evId).catch(e => console.error('Delete evidence failed:', e));
        task.evidences = task.evidences.filter(e => e.id !== evId);
        renderEvidences();
        loadEvidenceLog(task.id);
      });
      if(isImage){
        tr.querySelector('.evidence-img-thumb').addEventListener('click', function(){
          openImagePreview(this.dataset.preview);
        });
      }
      els.evidenceBody.appendChild(tr);
    });
  }

  async function uploadImageEvidence(task){
    const file = els.evidenceFileInput.files[0];
    if(!file){ alert('File gambar harus dipilih.'); return; }
    const keterangan = els.evidenceImageKetInput.value.trim();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('keterangan', keterangan);
    try {
      const r = await fetch('/api/tasks/'+task.id+'/evidences/image', { method:'POST', body: formData });
      if(!r.ok){ const e = await r.json(); alert(e.error || 'Gagal upload gambar'); return; }
      const result = await r.json();
      if(!task.evidences) task.evidences = [];
      task.evidences.push(result.evidence);
      els.evidenceFileInput.value = '';
      els.evidenceImageKetInput.value = '';
      renderEvidences();
      loadEvidenceLog(task.id);
    } catch(e){ console.error('Failed to upload image evidence:', e); alert('Gagal upload gambar'); }
  }

  els.evidenceAddBtn.addEventListener('click', async ()=>{
    const task = tasks.find(t => t.id === evidenceTaskId);
    if(!task) return;
    const type = document.querySelector('input[name="evidence-type"]:checked').value;
    if(type === 'image'){ uploadImageEvidence(task); return; }
    let link = '', keterangan = '';
    if(type === 'link'){
      link = els.evidenceLinkInput.value.trim();
      if(!link){ alert('Link evidence harus diisi.'); return; }
      keterangan = els.evidenceDescInput.value.trim();
    } else {
      keterangan = els.evidenceTextInput.value.trim();
      if(!keterangan){ alert('Teks evidence harus diisi.'); return; }
    }
    try {
      const result = await api.post('/api/tasks/'+task.id+'/evidences', { type, link, keterangan });
      if(!task.evidences) task.evidences = [];
      task.evidences.push(result.evidence);
      els.evidenceLinkInput.value = '';
      els.evidenceDescInput.value = '';
      els.evidenceTextInput.value = '';
      renderEvidences();
      loadEvidenceLog(task.id);
      if(type === 'link') els.evidenceLinkInput.focus();
      else els.evidenceTextInput.focus();
    } catch(e){ console.error('Failed to add evidence:', e); }
  });

  els.evidenceLinkInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') els.evidenceAddBtn.click();
  });
  els.evidenceDescInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') els.evidenceAddBtn.click();
  });
  els.evidenceTextInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' && e.ctrlKey) els.evidenceAddBtn.click();
  });
  els.evidenceImageKetInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') els.evidenceAddBtn.click();
  });

  /* ---------------- Evidence Log ---------------- */
  let evidenceLogs = [];

  async function loadEvidenceLog(taskId){
    try {
      const res = await fetch('/api/tasks/' + taskId + '/evidence-changelog');
      const data = await res.json();
      evidenceLogs = data.logs || [];
    } catch(_){ evidenceLogs = []; }
    renderEvidenceLog();
  }

  function renderEvidenceLog(){
    els.evidenceLogBody.innerHTML = '';
    if(!evidenceLogs || evidenceLogs.length === 0){
      els.evidenceLogBody.innerHTML = '<tr><td colspan="3" class="evidence-log-empty">Belum ada riwayat perubahan.</td></tr>';
      return;
    }
    evidenceLogs.forEach((log, i) => {
      const d = new Date(log.actionAt);
      const datePart = d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
      const timePart = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="todo-num">' + (i + 1) + '</td>' +
        '<td class="log-action-text">' + escapeHtml(log.action) + '</td>' +
        '<td class="log-date-text"><span class="log-date-row">' + datePart + '</span><span class="log-time-row">' + timePart + '</span></td>';
      els.evidenceLogBody.appendChild(tr);
    });
  }

  /* ---------------- Image Preview Lightbox ---------------- */
  function openImagePreview(src){
    els.imgPreviewImg.src = src;
    els.imgPreviewOverlay.classList.add('open');
  }
  function closeImagePreview(){
    els.imgPreviewOverlay.classList.remove('open');
    els.imgPreviewImg.src = '';
  }
  els.imgPreviewOverlay.addEventListener('click', function(e){
    if(e.target === els.imgPreviewOverlay) closeImagePreview();
  });
  document.getElementById('img-preview-close').addEventListener('click', closeImagePreview);

  els.todoAddBtn.addEventListener('click', async ()=>{
    const t = tasks.find(x=>x.id===editingId);
    if(!t) return;
    const text = els.todoInput.value.trim();
    if(!text) return;
    const dueStr = els.todoDate.value || null;
    t.todos = t.todos || [];
    if(editingTodoId){
      const todo = t.todos.find(x=>x.id===editingTodoId);
      if(todo){ todo.text = text; todo.due = dueStr ? parseDate(dueStr) : null; }
      api.put('/api/tasks/'+t.id+'/todos/'+editingTodoId, { text, due: dueStr }).catch(e => console.error('Save todo failed:', e));
      cancelTodoEdit();
    } else {
      try {
        const result = await api.post('/api/tasks/'+t.id+'/todos', { text, due: dueStr });
        t.todos.push({ id: result.todo.id, text: result.todo.text, done: false, due: result.todo.due ? parseDate(result.todo.due) : null });
      } catch(e){ console.error('Failed to add todo:', e); return; }
      els.todoInput.value = '';
      els.todoDate.value = '';
    }
    els.todoInput.focus();
    renderTodos(t);
    updateProgressFromTodos(t);
    updateProgressSlider(t);
    updateBellDot();
    if(editingId) loadTaskLog(editingId);
  });
  els.todoInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') els.todoAddBtn.click();
  });
  els.todoDate.addEventListener('keydown', (e)=>{
    if(e.key==='Enter') els.todoAddBtn.click();
  });
  els.todoCancelBtn.addEventListener('click', cancelTodoEdit);

  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('close-btn').addEventListener('click', closeModal);
  els.overlay.addEventListener('click', (e)=>{ if(e.target===els.overlay) closeModal(); });
  els.confirmOverlay.addEventListener('click', (e)=>{ if(e.target===els.confirmOverlay) closeConfirm(); });

  document.getElementById('save-btn').addEventListener('click', async ()=>{
    const name = els.fName.value.trim();
    const start = parseDate(els.fStart.value);
    const end = parseDate(els.fEnd.value);
    if(!name){ alert('Nama tugas tidak boleh kosong.'); return; }
    if(!start || !end){ alert('Format tanggal harus YYYY-MM-DD.'); return; }
    if(end < start){ alert('Tanggal selesai harus setelah tanggal mulai.'); return; }

    const cat = els.fCat.value;
    const assignee = els.fAssignee.value.trim();
    const progress = Number(els.fProgress.value);

    if(editingId){
      const t = tasks.find(x=>x.id===editingId);
      if(!t) return;
      t.name = name; t.start = start; t.end = end;
      t.cat = cat; t.assignee = assignee; t.progress = progress;
      api.put('/api/tasks/'+editingId, { name, start:fmt(start), end:fmt(end), cat, assignee, progress }).catch(e => console.error('Save task failed:', e));
    } else {
      try {
        const result = await api.post('/api/tasks', { name, start:fmt(start), end:fmt(end), cat, assignee, progress });
        tasks.push({
          ...result.task,
          start: parseDate(result.task.start),
          end: parseDate(result.task.end),
          todos: (result.task.todos||[]).map(td => ({ ...td, due: td.due ? parseDate(td.due) : null })),
        });
      } catch(e){ console.error('Failed to create task:', e); return; }
    }
    tasks.sort((a, b) => a.start - b.start);
    closeModal();
    renderAll(false);
  });

  document.getElementById('delete-btn').addEventListener('click', async ()=>{
    if(!editingId) return;
    const name = tasks.find(t=>t.id===editingId)?.name||'';
    await showConfirm('Yakin ingin menghapus tugas <strong>'+escapeHtml(name)+'</strong>?', 'Ya, Hapus', 'Batal', 'confirm-yes');
    api.del('/api/tasks/'+editingId).catch(e => console.error('Delete task failed:', e));
    tasks = tasks.filter(t=>t.id!==editingId);
    closeModal(true);
    renderAll(false);
  });

  document.getElementById('add-task-btn').addEventListener('click', ()=> openModal(null));

  document.getElementById('evidence-btn').addEventListener('click', ()=>{
    if(editingId) openEvidencePanel(editingId);
  });

  /* ---------------- Notification Panel Events ---------------- */
  els.bellBtn.addEventListener('click', ()=>{
    openNotifPanel();
    els.notifOverlay.classList.add('open');
  });

  els.notifOverlay.addEventListener('click', (e)=>{
    if(e.target === els.notifOverlay) els.notifOverlay.classList.remove('open');
  });

  document.getElementById('notif-close-btn').addEventListener('click', ()=>{
    els.notifOverlay.classList.remove('open');
  });

  /* ---------------- Evidence Panel Events ---------------- */
  els.evidenceOverlay.addEventListener('click', (e)=>{
    if(e.target === els.evidenceOverlay) closeEvidencePanel();
  });

  document.getElementById('evidence-close-btn').addEventListener('click', closeEvidencePanel);

  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape' && els.confirmOverlay.classList.contains('open')){ closeConfirm(); return; }
    if(e.key==='Escape' && els.overlay.classList.contains('open')) closeModal();
    if(e.key==='Escape' && els.notifOverlay.classList.contains('open')) els.notifOverlay.classList.remove('open');
    if(e.key==='Escape' && els.evidenceOverlay.classList.contains('open')) closeEvidencePanel();
    if(e.key==='Escape' && els.imgPreviewOverlay.classList.contains('open')) closeImagePreview();
  });

  /* ---------------- Inline Title Edit ---------------- */
  let _savedTitle = '';

  function enableTitleEdit(){
    const current = els.title.textContent;
    _savedTitle = current;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'title-input';
    input.value = current;
    els.title.replaceWith(input);
    input.focus();
    input.select();

    function commit(){
      const val = input.value.trim();
      if(!val){
        input.focus();
        return;
      }
      const span = document.createElement('span');
      span.id = 'project-title';
      span.textContent = val;
      input.replaceWith(span);
      els.title = span;
      api.put('/api/metadata', { title: val }).catch(e => console.error('Save title failed:', e));
    }

    function cancel(){
      const span = document.createElement('span');
      span.id = 'project-title';
      span.textContent = _savedTitle;
      input.replaceWith(span);
      els.title = span;
    }

    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); commit(); }
      if(e.key === 'Escape'){ e.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', commit);
  }

  document.querySelector('.title-row').addEventListener('click', function(e){
    if(e.target.id === 'project-title' || e.target.id === 'title-edit-icon'){
      enableTitleEdit();
    }
  });

  /* ---------------- Theme ---------------- */
  function setFavicon(){
    const svg = `<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><path fill=%22%23FFFFFF%22 d=%22M2.5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm5 2h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1m-5 1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1zm9-1h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1%22/></svg>`;
    let link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if(!link){
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    link.href = 'data:image/svg+xml,' + svg;
  }

  function setTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const btn = document.getElementById('theme-toggle');
    if(btn) btn.innerHTML = theme === 'dark' ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-fill"></i>';
  }

  function initTheme(){
    const saved = localStorage.getItem('theme');
    if(saved){ setTheme(saved); return; }
    if(window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    else setTheme('light');
  }

  setFavicon();

  document.getElementById('theme-toggle').addEventListener('click', function(){
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e){
    if(!localStorage.getItem('theme')) setTheme(e.matches ? 'dark' : 'light');
  });

  initTheme();

  els.timelineWrap.addEventListener('scroll', syncRulerScroll);

  /* ---------- Scroll Area Shadow ---------- */
  const scrollArea = document.querySelector('.scroll-area');
  if(scrollArea){
    function updateScrollShadow(){
      const {scrollTop} = scrollArea;
      scrollArea.classList.toggle('scrolled-top', scrollTop > 4);
    }
    scrollArea.addEventListener('scroll', updateScrollShadow);
    updateScrollShadow();
  }

  /* ---------------- Report ---------------- */
  function openReportModal(){
    const todayDate = new Date();
    const weekAgo = new Date(todayDate);
    weekAgo.setDate(todayDate.getDate() - 7);
    els.rStart.value = fmt(weekAgo);
    els.rEnd.value = fmt(todayDate);
    els.reportContent.innerHTML = '';
    els.reportOverlay.classList.add('open');
  }

  function closeReportModal(){
    els.reportOverlay.classList.remove('open');
  }

  document.getElementById('report-btn').addEventListener('click', openReportModal);
  document.getElementById('report-close-btn').addEventListener('click', closeReportModal);
  els.reportOverlay.addEventListener('click', (e)=>{
    if(e.target === els.reportOverlay) closeReportModal();
  });

  function generateReport(){
    const startDate = parseDate(els.rStart.value);
    const endDate = parseDate(els.rEnd.value);
    if(!startDate || !endDate){
      alert('Mohon isi tanggal mulai dan selesai.');
      return;
    }
    if(startDate > endDate){
      alert('Tanggal mulai harus sebelum tanggal selesai.');
      return;
    }

    const filtered = tasks.filter(t => {
      if(!t.start) return false;
      return t.start >= startDate && t.start <= endDate;
    });

    if(filtered.length === 0){
      els.reportContent.innerHTML = '<div class="report-empty"><i class="bi bi-inbox" style="font-size:32px;display:block;margin-bottom:8px;color:#000;"></i>Tidak ada tugas dalam periode ini.</div>';
      return;
    }

    const rangeStr = els.rStart.value.split('-').reverse().join('/') + ' — ' + els.rEnd.value.split('-').reverse().join('/');

    let totalTodos = 0, doneTodos = 0, overdueTodos = 0, totalProgress = 0, doneTasks = 0;
    filtered.forEach(task => {
      let actualProgress;
      if(task.todos && task.todos.length > 0){
        const taskDone = task.todos.filter(t => t.done).length;
        actualProgress = Math.round((taskDone / task.todos.length) * 100);
        task.todos.forEach(todo => {
          totalTodos++;
          if(todo.done) doneTodos++;
          if(todo.due && !todo.done && todo.due < today()) overdueTodos++;
        });
      } else {
        actualProgress = 0;
      }
      totalProgress += actualProgress;
      if(actualProgress >= 100) doneTasks++;
    });
    const avgProgress = filtered.length > 0 ? Math.round(totalProgress / filtered.length) : 0;

    let html = '<div id="report-printable" style="font-family:Inter,sans-serif;color:#000;">';
    html += '<div style="text-align:center;margin-bottom:16px;"><div style="font-family:Space Grotesk,sans-serif;font-size:18px;font-weight:700;color:#000;">LAPORAN TUGAS</div><div style="font-size:12px;color:#000;font-family:IBM Plex Mono,monospace;">Periode: ' + rangeStr + '</div></div>';

    html += '<div class="report-summary">';
    html += '<div class="report-summary-card"><div class="report-summary-icon"><i class="bi bi-clipboard-check"></i></div><div class="report-summary-data"><span class="report-summary-num">' + filtered.length + '</span><span class="report-summary-label">Tugas Utama</span></div><div class="report-summary-stat">' + doneTasks + '/' + filtered.length + ' Selesai</div></div>';
    html += '<div class="report-summary-card"><div class="report-summary-icon"><i class="bi bi-list-check"></i></div><div class="report-summary-data"><span class="report-summary-num">' + totalTodos + '</span><span class="report-summary-label">Sub Tugas</span></div><div class="report-summary-stat">' + doneTodos + '/' + totalTodos + ' Selesai</div></div>';
    html += '<div class="report-summary-card"><div class="report-summary-icon" style="' + (overdueTodos > 0 ? 'color:#e53935;' : '') + '"><i class="bi bi-exclamation-triangle"></i></div><div class="report-summary-data"><span class="report-summary-num" style="' + (overdueTodos > 0 ? 'color:#e53935;' : '') + '">' + overdueTodos + '</span><span class="report-summary-label">Overdue</span></div><div class="report-summary-stat">' + (overdueTodos > 0 ? 'Ada keterlambatan' : 'No Overdue') + '</div></div>';
    html += '<div class="report-summary-card"><div class="report-summary-icon"><i class="bi bi-graph-up"></i></div><div class="report-summary-data"><span class="report-summary-num">' + avgProgress + '%</span><span class="report-summary-label">Progres Rata-rata</span></div><div class="report-summary-stat">Dari ' + filtered.length + ' tugas</div></div>';
    html += '</div>';

    filtered.forEach((task, idx) => {
      let actualProgress;
      if(task.todos && task.todos.length > 0){
        const taskDone = task.todos.filter(t => t.done).length;
        actualProgress = Math.round((taskDone / task.todos.length) * 100);
      } else {
        actualProgress = 0;
      }
      const progressBg = actualProgress >= 100 ? 'background:#2e7d32;color:#fff;' : 'background:#e53935;color:#fff;';
      html += '<div class="report-section">';
      html += '<div class="report-title-row"><div><div class="report-section-title"><i class="bi bi-folder"></i> ' + (idx+1) + '. ' + escapeHtml(task.name) + '</div><div class="report-task-meta">Kategori: ' + escapeHtml(task.cat || '-') + ' &bull; Assignee: ' + escapeHtml(task.assignee || '-') + ' &bull; Mulai: ' + fmt(task.start) + ' &bull; Selesai: ' + fmt(task.end) + '</div></div><span class="report-progress" style="' + progressBg + '">' + actualProgress + '%</span></div>';

      if(task.todos && task.todos.length > 0){
        html += '<div class="report-section-title" style="font-size:12px;color:#000;margin-bottom:10px;"><i class="bi bi-list-check"></i> Sub Tugas (' + task.todos.length + ')</div>';
        html += '<table class="report-table"><thead><tr><th style="width:30px;">No.</th><th>Tugas</th><th style="width:100px;">Due Date</th><th style="width:80px;">Status</th></tr></thead><tbody>';
        task.todos.forEach((todo, ti) => {
          const isOverdue = todo.due && !todo.done && todo.due < today();
          html += '<tr>';
          html += '<td>' + (ti+1) + '</td>';
          html += '<td><span class="report-todo-text' + (todo.done ? ' done' : '') + '">' + escapeHtml(todo.text) + '</span></td>';
          html += '<td class="report-todo-due' + (isOverdue ? ' report-overdue' : '') + '">' + (todo.due ? fmt(todo.due) : '—') + '</td>';
          html += '<td><span class="report-todo-check' + (todo.done ? ' checked' : '') + '">' + (todo.done ? '<i class="bi bi-check"></i>' : '') + '</span></td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
      } else {
        html += '<div style="font-size:12px;color:#000;padding:4px 0;">Tidak ada sub tugas.</div>';
      }

      if(task.evidences && task.evidences.length > 0){
        html += '<div class="report-section-title" style="font-size:12px;color:#000;margin-top:10px;margin-bottom:4px;"><i class="bi bi-paperclip"></i> Evidence (' + task.evidences.length + ')</div>';
        task.evidences.forEach(ev => {
          html += '<div class="report-evidence-item">';
          const isLink = ev.type === 'link' || (!ev.type && ev.link && ev.link !== 'None' && ev.link !== 'null');
          const isImage = ev.type === 'image';
          if(isImage){
            const imgSrc = '/' + ev.link;
            html += '<img src="' + escapeHtml(imgSrc) + '" data-preview="' + escapeHtml(imgSrc) + '" class="report-evidence-img" alt="Evidence">';
            html += '<span>' + escapeHtml(ev.keterangan || 'Gambar') + '</span>';
          } else if(isLink){
            html += '<i class="bi bi-link-45deg"></i>';
            html += '<span>' + escapeHtml(ev.keterangan || '') + '</span>';
            html += ' <a href="' + escapeHtml(ev.link) + '" target="_blank" title="' + escapeHtml(ev.link) + '">' + escapeHtml(ev.link) + '</a>';
          } else {
            html += '<i class="bi bi-fonts"></i>';
            html += '<span class="report-evidence-text">' + escapeHtml(ev.keterangan || '-') + '</span>';
          }
          html += '</div>';
        });
      }

      html += '</div>';
    });

    html += '</div>';
    els.reportContent.innerHTML = html;
  }

  document.getElementById('report-generate-btn').addEventListener('click', generateReport);

  els.reportContent.addEventListener('click', (e)=>{
    if(e.target.classList.contains('report-evidence-img')){
      openImagePreview(e.target.dataset.preview);
    }
  });

  document.getElementById('export-pdf-btn').addEventListener('click', ()=>{
    const el = document.getElementById('report-printable');
    if(!el){
      alert('Mohon generate report terlebih dahulu.');
      return;
    }
    if(typeof html2pdf === 'undefined'){
      alert('Library PDF belum dimuat. Silakan coba lagi.');
      return;
    }
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if(currentTheme === 'dark'){
      document.documentElement.setAttribute('data-theme', 'light');
    }
    el.classList.add('report-print-light');
    const fmtFile = (val) => val.split('-').reverse().join('');
    const fileName = 'report-' + fmtFile(els.rStart.value) + '-' + fmtFile(els.rEnd.value) + '.pdf';
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     fileName,
      image:        { type:'jpeg', quality:0.98 },
      html2canvas:  { scale:2, useCORS:true },
      jsPDF:        { unit:'mm', format:'a4', orientation:'portrait' }
    };
    html2pdf().set(opt).from(el).save().then(()=>{
      el.classList.remove('report-print-light');
      if(currentTheme === 'dark'){
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }).catch(()=>{
      el.classList.remove('report-print-light');
      if(currentTheme === 'dark'){
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    });
  });

  /* ---------------- Init ---------------- */
  loadTasks();

})();