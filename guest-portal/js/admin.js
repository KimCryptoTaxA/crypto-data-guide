/* Admin dashboard: notifications, requests inbox, bookings + QR, content editor, settings. */
(function () {
  const root = document.getElementById('admin');
  const AUTH = 'guestportal_admin_auth';
  const D = () => Store.get();
  const S = () => D().settings;
  const money = n => `${S().currency}${Number(n || 0).toLocaleString()}`;
  const propName = id => { const p = Store.property(id); return p ? p.name.en : '(deleted property)'; };
  const authed = () => { try { return sessionStorage.getItem(AUTH) === '1'; } catch (e) { return false; } };

  let tab = 'dashboard';
  const sel = { requestId: null, propertyIdx: 0, inboxStatus: 'open', inboxProp: '', bookingFilter: 'active' };
  let known = new Set(D().notifications.map(n => n.id));
  let bellOpen = false;

  const TABS = [
    ['dashboard', 'grid', 'Dashboard'],
    ['inbox', 'inbox', 'Requests'],
    ['bookings', 'calendar', 'Bookings'],
    ['properties', 'building', 'Properties'],
    ['guestbook', 'pen', 'Guestbook'],
    ['settings', 'sliders', 'Settings'],
  ];

  // ================= shell =================
  function render() {
    applyTheme(S());
    if (!authed()) return renderLogin();
    root.innerHTML = `
      <header class="a-top">
        <div class="a-brand"><span class="mark">${esc(S().brandName.slice(0, 1))}</span><div><b>${esc(S().brandName)}</b><small>Host dashboard</small></div></div>
        <div class="a-top-actions">
          <button class="btn ghost sm" id="pushBtn"></button>
          <div class="bell-wrap">
            <button class="icon-btn bell" id="bellBtn" aria-label="Notifications">${icon('bell')}<i class="badge" id="bellBadge" hidden></i></button>
            <div class="bell-panel" id="bellPanel" hidden></div>
          </div>
          <button class="icon-btn" id="logoutBtn" aria-label="Sign out">${icon('logout')}</button>
        </div>
      </header>
      <div class="a-body">
        <nav class="a-side">${TABS.map(([k, ic, label]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${icon(ic)}<span>${label}</span><i class="count" data-count="${k}" hidden></i></button>`).join('')}
          <a class="side-link" href="guest.html" target="_blank" data-guest="">${icon('external')}<span>Open guest portal</span></a>
        </nav>
        <main class="a-main" id="main"></main>
      </div>`;
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    bindGuestLinks(root);
    document.getElementById('logoutBtn').onclick = () => { try { sessionStorage.removeItem(AUTH); } catch (e) { } render(); };
    document.getElementById('bellBtn').onclick = e => { e.stopPropagation(); bellOpen = !bellOpen; renderBell(); };
    setupPushBtn();
    renderMain();
    updateBadges();
  }

  function switchTab(k) {
    tab = k;
    root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
    renderMain();
    window.scrollTo(0, 0);
  }

  function renderMain() {
    const main = document.getElementById('main');
    if (!main) return;
    BLANKS = [];
    main.innerHTML = VIEWS[tab]();
    (BINDERS[tab] || (() => { }))(main);
  }

  function renderLogin() {
    root.innerHTML = `<div class="a-login"><form class="login-card stack" id="pinForm">
      <span class="mark lg">${esc(S().brandName.slice(0, 1))}</span>
      <h1>Host dashboard</h1><p class="muted">${esc(S().brandName)}</p>
      <input class="input code-input" type="password" inputmode="numeric" name="pin" placeholder="PIN" autofocus required>
      <button class="btn primary block">${icon('login')} Sign in</button>
      <p class="hint">Demo PIN: <b>1234</b> — change it in Settings.</p></form></div>`;
    document.getElementById('pinForm').onsubmit = e => {
      e.preventDefault();
      if (e.target.pin.value === String(S().adminPin)) { try { sessionStorage.setItem(AUTH, '1'); } catch (er) { } render(); }
      else toast('Incorrect PIN', 'err');
    };
  }

  // ================= notifications =================
  function unread() { return D().notifications.filter(n => !n.read); }

  function updateBadges() {
    const b = document.getElementById('bellBadge');
    if (!b) return;
    const n = unread().length;
    b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
    const openReq = D().requests.filter(r => r.status === 'new').length;
    const pendingGb = D().guestbook.filter(g => g.status === 'pending').length;
    setCount('inbox', openReq); setCount('guestbook', pendingGb);
    document.title = (n ? `(${n}) ` : '') + 'Host dashboard';
    if (bellOpen) renderBell();
  }
  function setCount(k, n) { const el = root.querySelector(`[data-count="${k}"]`); if (el) { el.hidden = !n; el.textContent = n; } }

  function renderBell() {
    const panel = document.getElementById('bellPanel');
    if (!panel) return;
    panel.hidden = !bellOpen;
    if (!bellOpen) return;
    const list = D().notifications.slice(0, 25);
    panel.innerHTML = `<div class="bell-head"><b>Notifications</b><button class="link" id="markAll">Mark all read</button></div>
      ${list.length ? list.map(n => `<button class="notif ${n.read ? '' : 'unread'}" data-n="${n.id}"><span class="nk">${kindIcon(n.kind)}</span><span><span class="nt">${esc(n.text)}</span><small>${timeAgo(n.at)}</small></span></button>`).join('') : '<p class="muted pad">No notifications yet.</p>'}`;
    panel.querySelector('#markAll').onclick = e => { e.stopPropagation(); Store.update(d => d.notifications.forEach(n => { n.read = true; })); };
    panel.querySelectorAll('[data-n]').forEach(btn => btn.onclick = e => {
      e.stopPropagation();
      const n = D().notifications.find(x => x.id === btn.dataset.n);
      Store.update(d => { d.notifications.find(x => x.id === n.id).read = true; });
      bellOpen = false; renderBell();
      openNotification(n);
    });
  }

  function kindIcon(k) {
    const m = { checkin: 'login', checkout: 'logout', message: 'message', guestbook: 'pen', issue: 'alert', service: 'coffee', housekeeping: 'droplet', luggage: 'briefcase', lost_found: 'search' };
    return icon(m[k] || 'bell');
  }

  function openNotification(n) {
    if (n.requestId && Store.request(n.requestId)) { sel.requestId = n.requestId; sel.inboxStatus = 'all'; switchTab('inbox'); }
    else if (n.kind === 'guestbook') switchTab('guestbook');
    else if (n.bookingId && Store.booking(n.bookingId)) { switchTab('bookings'); bookingDetail(Store.booking(n.bookingId)); }
  }

  function handleNew(source) {
    const fresh = D().notifications.filter(n => !known.has(n.id));
    fresh.forEach(n => known.add(n.id));
    if (source !== 'remote' || !fresh.length) return;
    chime();
    fresh.slice(0, 3).forEach(n => {
      toast(n.text, 'info');
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const bn = new Notification(S().brandName, { body: n.text, tag: n.id });
          bn.onclick = () => { window.focus(); openNotification(n); bn.close(); };
        } catch (e) { /* some browsers only allow notifications from a service worker */ }
      }
    });
  }

  function setupPushBtn() {
    const b = document.getElementById('pushBtn');
    if (!('Notification' in window)) { b.hidden = true; return; }
    const st = Notification.permission;
    b.innerHTML = st === 'granted' ? `${icon('bell')} Alerts on` : st === 'denied' ? `${icon('bell')} Alerts blocked` : `${icon('bell')} Enable alerts`;
    b.disabled = st !== 'default';
    b.onclick = () => Notification.requestPermission().then(() => { setupPushBtn(); if (Notification.permission === 'granted') new Notification(S().brandName, { body: 'Desktop alerts are on. You will be notified of guest activity.' }); });
  }

  Store.subscribe(source => {
    handleNew(source);
    updateBadges();
    if (source === 'remote' && !['properties', 'settings'].includes(tab)) {
      const a = document.activeElement;
      if (!(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.value) && !document.querySelector('.modal-back')) renderMain();
    }
  });

  // ================= shared bits =================
  const statusChip = s => `<span class="status s-${s}">${STATUS_LABEL[s] || s}</span>`;
  const bookingChip = s => `<span class="status b-${s}">${{ upcoming: 'Upcoming', checked_in: 'In-house', checked_out: 'Checked out' }[s]}</span>`;
  const propOptions = (selected, withAll) => (withAll ? `<option value="">All properties</option>` : '') + D().properties.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.name.en)}</option>`).join('');

  // ================= views =================
  const VIEWS = {
    dashboard() {
      const d = D(), today = ymd();
      const inHouse = d.bookings.filter(b => b.status === 'checked_in');
      const arriving = d.bookings.filter(b => b.status === 'upcoming' && b.checkIn >= today && b.checkIn <= addDays(today, 7)).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      const departing = inHouse.filter(b => b.checkOut <= today);
      const open = d.requests.filter(r => ['new', 'in_progress'].includes(r.status));
      const rated = d.bookings.filter(b => b.feedback && b.feedback.rating);
      const avg = rated.length ? (rated.reduce((s, b) => s + b.feedback.rating, 0) / rated.length).toFixed(1) : '—';
      const stat = (n, l, ic) => `<div class="stat">${icon(ic)}<div><b>${n}</b><span>${l}</span></div></div>`;
      const bRow = (b, when) => `<button class="row-btn" data-booking="${b.id}"><span><b>${esc(b.guestName)}</b><small>${esc(propName(b.propertyId))}</small></span><span class="muted small">${when}</span></button>`;
      return `<div class="a-head"><h1>Good ${greeting()}, ${esc(S().hostName.split(' ')[0])}</h1><p class="muted">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>
        <div class="stats">${stat(inHouse.length, 'Guests in-house', 'users')}${stat(arriving.length, 'Arriving (7 days)', 'calendar')}${stat(open.length, 'Open requests', 'inbox')}${stat(avg, 'Average rating', 'star')}</div>
        <div class="grid2">
          <section class="panel"><h2>Needs attention</h2>${open.length ? open.slice(0, 8).map(r => `<button class="row-btn" data-req="${r.id}"><span><b>${esc(r.title)}</b><small>${REQUEST_TYPES[r.type]} · ${esc(r.guestName)} · ${esc(propName(r.propertyId))}</small></span>${statusChip(r.status)}</button>`).join('') : '<p class="muted">All caught up.</p>'}</section>
          <section class="panel"><h2>Arrivals & departures</h2>
            ${arriving.map(b => bRow(b, b.checkIn === today ? 'Arriving today' : 'Arrives ' + fmtDate(b.checkIn))).join('')}
            ${departing.map(b => bRow(b, 'Departing today')).join('')}
            ${!arriving.length && !departing.length ? '<p class="muted">Nothing scheduled this week.</p>' : ''}</section>
        </div>
        <section class="panel"><h2>Recent activity</h2>${d.notifications.slice(0, 10).map(n => `<div class="activity">${kindIcon(n.kind)}<span>${esc(n.text)}</span><small>${timeAgo(n.at)}</small></div>`).join('') || '<p class="muted">Guest activity will appear here. Try it: open the guest portal in another tab with code <b>HARBOR1</b>.</p>'}</section>`;
    },

    inbox() {
      const d = D();
      let list = d.requests;
      if (sel.inboxStatus === 'open') list = list.filter(r => ['new', 'in_progress'].includes(r.status));
      else if (sel.inboxStatus !== 'all') list = list.filter(r => r.status === sel.inboxStatus);
      if (sel.inboxProp) list = list.filter(r => r.propertyId === sel.inboxProp);
      const r = sel.requestId && Store.request(sel.requestId);
      return `<div class="a-head"><h1>Requests</h1><p class="muted">Everything guests send from the portal.</p></div>
        <div class="filters">
          <select class="input" id="fStatus">${[['open', 'Open'], ['all', 'All'], ...STATUSES.map(s => [s, STATUS_LABEL[s]])].map(([v, l]) => `<option value="${v}" ${sel.inboxStatus === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="input" id="fProp">${propOptions(sel.inboxProp, true)}</select>
        </div>
        <div class="inbox ${r ? 'has-detail' : ''}">
          <div class="inbox-list">${list.length ? list.map(x => `
            <button class="inbox-item ${x.id === sel.requestId ? 'on' : ''} ${x.status === 'new' ? 'unread' : ''}" data-req="${x.id}">
              <span class="ii-top"><span class="eyebrow">${REQUEST_TYPES[x.type]}</span><small>${timeAgo(x.createdAt)}</small></span>
              <b>${esc(x.title)}</b><small class="muted">${esc(x.guestName)} · ${esc(propName(x.propertyId))}</small>
              <span class="ii-foot">${statusChip(x.status)}${x.replies.length ? `<small>${icon('message')} ${x.replies.length}</small>` : ''}${x.photo ? `<small>${icon('camera')}</small>` : ''}</span>
            </button>`).join('') : '<p class="muted pad">No requests here.</p>'}</div>
          <div class="inbox-detail">${r ? requestDetail(r) : '<p class="muted pad">Select a request to view details.</p>'}</div>
        </div>`;
    },

    bookings() {
      const d = D();
      const f = sel.bookingFilter;
      const list = d.bookings.filter(b => f === 'all' || (f === 'active' ? b.status !== 'checked_out' : b.status === 'checked_out')).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      return `<div class="a-head row"><div><h1>Bookings</h1><p class="muted">Create a booking to give a guest their personal link, code and QR.</p></div><button class="btn primary" id="newBooking">${icon('plus')} New booking</button></div>
        <div class="seg small">${[['active', 'Upcoming & in-house'], ['past', 'Checked out'], ['all', 'All']].map(([v, l]) => `<button data-bf="${v}" class="${f === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="table">${list.length ? `<div class="tr th"><span>Guest</span><span>Property</span><span>Dates</span><span>Code</span><span>Status</span><span></span></div>` + list.map(b => `
          <div class="tr">
            <span><button class="link strong" data-booking="${b.id}">${esc(b.guestName)}</button><small class="muted">${b.guests} guest(s)</small></span>
            <span>${esc(propName(b.propertyId))}</span>
            <span>${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)}</span>
            <span><code>${esc(b.code)}</code></span>
            <span>${bookingChip(b.status)}</span>
            <span class="actions"><button class="icon-btn" data-qr="${b.id}" title="Guest link & QR">${icon('qr')}</button><button class="icon-btn" data-edit="${b.id}" title="Edit">${icon('pen')}</button><button class="icon-btn" data-delb="${b.id}" title="Delete">${icon('trash')}</button></span>
          </div>`).join('') : '<p class="muted pad">No bookings yet.</p>'}</div>`;
    },

    properties() {
      const d = D();
      if (sel.propertyIdx >= d.properties.length) sel.propertyIdx = 0;
      const p = d.properties[sel.propertyIdx];
      return `<div class="a-head row"><div><h1>Properties</h1><p class="muted">Edit everything guests see. Changes save automatically.</p></div>
          <div class="btn-row"><button class="btn ghost" id="propQr">${icon('qr')} Guest guide link</button><button class="btn ghost" id="dupProp">${icon('copy')} Duplicate</button><button class="btn primary" id="addProp">${icon('plus')} Add property</button></div></div>
        <div class="chips">${d.properties.map((x, i) => `<button class="chip ${i === sel.propertyIdx ? 'on' : ''}" data-pidx="${i}">${esc(x.name.en || 'Untitled')}</button>`).join('')}</div>
        ${p ? `<div class="editor">${PROP_SECTIONS.map(sec => sectionHTML(sec, `properties.${sel.propertyIdx}`)).join('')}</div>
        <button class="btn danger-ghost" id="delProp">${icon('trash')} Delete this property</button>` : ''}`;
    },

    guestbook() {
      const list = D().guestbook;
      return `<div class="a-head"><h1>Guestbook</h1><p class="muted">Approve notes before they appear to future guests.</p></div>
        ${list.length ? list.map(g => `<div class="panel gb-row"><div><p>“${esc(g.text)}”</p><small class="muted">— ${esc(g.name)} · ${esc(propName(g.propertyId))} · ${timeAgo(g.createdAt)}</small></div>
          <div class="btn-row">${g.status === 'approved' ? `<span class="status s-approved">Visible</span><button class="btn ghost sm" data-gb="hide|${g.id}">Hide</button>` : `<span class="status s-new">${g.status === 'pending' ? 'Pending' : 'Hidden'}</span><button class="btn primary sm" data-gb="approve|${g.id}">Approve</button>`}
          <button class="icon-btn" data-gb="delete|${g.id}" title="Delete">${icon('trash')}</button></div></div>`).join('') : '<p class="muted">No guestbook entries yet.</p>'}`;
    },

    settings() {
      return `<div class="a-head"><h1>Settings</h1><p class="muted">Brand, contact details and security. Changes save automatically.</p></div>
        <div class="editor">${SETTINGS_SECTIONS.map(sec => sectionHTML(sec, 'settings')).join('')}</div>
        <section class="panel"><h2>Backup & demo data</h2>
          <p class="muted">Download all your content as a file, or restore it. Useful before moving to a live server.</p>
          <div class="btn-row"><button class="btn ghost" id="exportBtn">${icon('down')} Export backup</button>
          <label class="btn ghost">${icon('up')} Import backup<input type="file" id="importInp" accept="application/json" hidden></label>
          <button class="btn danger-ghost" id="resetBtn">${icon('trash')} Reset demo data</button></div></section>`;
    },
  };

  function greeting() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }

  function requestDetail(r) {
    const b = Store.booking(r.bookingId);
    const qr = S().quickReplies || [];
    return `<div class="detail">
      <button class="link back-link" id="closeDetail">${icon('back')} Back to list</button>
      <p class="eyebrow">${REQUEST_TYPES[r.type]} · ${new Date(r.createdAt).toLocaleString()}</p>
      <h2>${esc(r.title)}</h2>
      <p class="muted">${esc(r.guestName)} · ${esc(propName(r.propertyId))}${b ? ` · ${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)}` : ''}</p>
      ${r.details ? `<div class="prose">${paras(r.details)}</div>` : ''}
      ${r.meta && r.meta.total ? `<p>Estimated total: <b>${money(r.meta.total)}</b></p>` : ''}
      ${r.photo ? `<img class="detail-photo" src="${r.photo}" alt="Guest photo" data-zoom>` : ''}
      <div class="status-row">${STATUSES.map(s => `<button class="chip ${r.status === s ? 'on' : ''}" data-status="${s}">${STATUS_LABEL[s]}</button>`).join('')}</div>
      <div class="thread">${r.replies.map(m => `<div class="msg ${m.from === 'host' ? 'me' : 'them'}"><span>${esc(m.text)}</span><small>${m.from === 'host' ? 'You' : esc(r.guestName)} · ${timeAgo(m.at)}</small></div>`).join('')}</div>
      ${qr.length ? `<div class="chips wrap">${qr.map((q, i) => `<button class="chip sm" data-qreply="${i}">${esc(q.length > 38 ? q.slice(0, 36) + '…' : q)}</button>`).join('')}</div>` : ''}
      <form class="reply" id="replyForm"><input class="input" name="msg" placeholder="Reply to ${esc(r.guestName.split(' ')[0])}…" required><button class="icon-btn solid" aria-label="Send">${icon('send')}</button></form>
    </div>`;
  }

  // ================= binders =================
  const BINDERS = {
    dashboard(main) {
      main.querySelectorAll('[data-req]').forEach(b => b.onclick = () => { sel.requestId = b.dataset.req; switchTab('inbox'); });
      main.querySelectorAll('[data-booking]').forEach(b => b.onclick = () => bookingDetail(Store.booking(b.dataset.booking)));
    },
    inbox(main) {
      main.querySelector('#fStatus').onchange = e => { sel.inboxStatus = e.target.value; renderMain(); };
      main.querySelector('#fProp').onchange = e => { sel.inboxProp = e.target.value; renderMain(); };
      main.querySelectorAll('[data-req]').forEach(b => b.onclick = () => {
        sel.requestId = b.dataset.req;
        Store.update(d => d.notifications.forEach(n => { if (n.requestId === sel.requestId) n.read = true; }));
        if (Store.request(sel.requestId).status === 'new') Store.setStatus(sel.requestId, 'in_progress');
        renderMain();
      });
      const r = sel.requestId && Store.request(sel.requestId);
      if (!r) return;
      main.querySelector('#closeDetail').onclick = () => { sel.requestId = null; renderMain(); };
      main.querySelectorAll('[data-status]').forEach(b => b.onclick = () => { Store.setStatus(r.id, b.dataset.status); renderMain(); toast(`Marked as ${STATUS_LABEL[b.dataset.status]} — guest can see it`, 'ok'); });
      const f = main.querySelector('#replyForm');
      main.querySelectorAll('[data-qreply]').forEach(b => b.onclick = () => { f.msg.value = S().quickReplies[+b.dataset.qreply]; f.msg.focus(); });
      f.onsubmit = e => { e.preventDefault(); Store.addReply(r.id, 'host', f.msg.value.trim()); renderMain(); toast('Reply sent', 'ok'); };
      const img = main.querySelector('[data-zoom]');
      if (img) img.onclick = () => openModal(`<img src="${img.src}" class="zoomed" alt="">`, null, 'wide');
    },
    bookings(main) {
      main.querySelector('#newBooking').onclick = () => bookingForm();
      main.querySelectorAll('[data-bf]').forEach(b => b.onclick = () => { sel.bookingFilter = b.dataset.bf; renderMain(); });
      main.querySelectorAll('[data-booking]').forEach(b => b.onclick = () => bookingDetail(Store.booking(b.dataset.booking)));
      main.querySelectorAll('[data-qr]').forEach(b => b.onclick = () => qrModal(Store.booking(b.dataset.qr)));
      main.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => bookingForm(Store.booking(b.dataset.edit)));
      main.querySelectorAll('[data-delb]').forEach(b => b.onclick = async () => {
        const bk = Store.booking(b.dataset.delb);
        if (!(await askConfirm(`Delete the booking for ${bk.guestName}? Their requests will also be removed.`, { danger: true, ok: 'Delete' }))) return;
        Store.update(d => { d.bookings = d.bookings.filter(x => x.id !== bk.id); d.requests = d.requests.filter(x => x.bookingId !== bk.id); });
        renderMain();
      });
    },
    properties(main) {
      main.querySelectorAll('[data-pidx]').forEach(b => b.onclick = () => { sel.propertyIdx = +b.dataset.pidx; renderMain(); });
      main.querySelector('#addProp').onclick = () => {
        const tpl = JSON.parse(JSON.stringify(seedData().properties[0]));
        Object.assign(tpl, { id: uid('p'), name: bi('New property', 'Bagong property'), address: '', heroImage: '', doorCode: '', wifi: { ssid: '', password: '' } });
        Store.update(d => d.properties.push(tpl)); sel.propertyIdx = D().properties.length - 1; renderMain();
        toast('Property added from the template — edit the details below.', 'ok');
      };
      main.querySelector('#dupProp').onclick = () => {
        const cp = JSON.parse(JSON.stringify(D().properties[sel.propertyIdx]));
        cp.id = uid('p'); cp.name.en += ' (copy)'; cp.name.fil += ' (kopya)';
        Store.update(d => d.properties.push(cp)); sel.propertyIdx = D().properties.length - 1; renderMain();
      };
      const del = main.querySelector('#delProp');
      if (del) del.onclick = async () => {
        const p = D().properties[sel.propertyIdx];
        if (D().properties.length === 1) return toast('You need at least one property.', 'err');
        if (D().bookings.some(b => b.propertyId === p.id)) return toast('Delete or move its bookings first.', 'err');
        if (!(await askConfirm(`Delete "${p.name.en}"? This cannot be undone.`, { danger: true, ok: 'Delete' }))) return;
        Store.update(d => d.properties.splice(sel.propertyIdx, 1)); sel.propertyIdx = 0; renderMain();
      };
      bindEditor(main);
      main.querySelector('#propQr').onclick = () => propertyQr(D().properties[sel.propertyIdx]);
    },
    guestbook(main) {
      main.querySelectorAll('[data-gb]').forEach(b => b.onclick = async () => {
        const [act, id] = b.dataset.gb.split('|');
        if (act === 'delete' && !(await askConfirm('Delete this guestbook note?', { danger: true, ok: 'Delete' }))) return;
        Store.update(d => {
          if (act === 'delete') d.guestbook = d.guestbook.filter(g => g.id !== id);
          else d.guestbook.find(g => g.id === id).status = act === 'approve' ? 'approved' : 'hidden';
        });
        renderMain();
      });
    },
    settings(main) {
      bindEditor(main);
      main.querySelector('#exportBtn').onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' }));
        a.download = `guest-portal-backup-${ymd()}.json`; a.click();
      };
      main.querySelector('#importInp').onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        file.text().then(async txt => {
          try {
            const data = JSON.parse(txt);
            if (!data.settings || !Array.isArray(data.properties)) throw new Error('bad');
            if (!(await askConfirm('Replace all current data with this backup?', { ok: 'Replace' }))) return;
            Store.replaceAll(data); render(); toast('Backup restored', 'ok');
          } catch (er) { toast('That file is not a valid backup.', 'err'); }
        });
      };
      main.querySelector('#resetBtn').onclick = async () => {
        if (!(await askConfirm('Reset everything to the demo data? All your changes, bookings and requests will be erased.', { danger: true, ok: 'Reset' }))) return;
        Store.reset(); known = new Set(D().notifications.map(n => n.id)); render(); toast('Demo data restored', 'ok');
      };
    },
  };

  // ================= bookings: form, QR, detail =================
  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c; do { c = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); } while (Store.bookingByCode(c));
    return c;
  }

  function bookingForm(b) {
    const isNew = !b;
    const today = ymd();
    b = b || { guestName: '', propertyId: D().properties[0].id, checkIn: today, checkOut: addDays(today, 2), guests: 2, code: genCode(), notes: '' };
    openModal(`<h2>${isNew ? 'New booking' : 'Edit booking'}</h2>
      <form class="stack" id="bkForm">
        <label>Guest name<input class="input" name="guestName" value="${esc(b.guestName)}" required></label>
        <label>Property<select class="input" name="propertyId">${propOptions(b.propertyId)}</select></label>
        <div class="row2"><label>Check-in<input class="input" type="date" name="checkIn" value="${b.checkIn}" required></label><label>Check-out<input class="input" type="date" name="checkOut" value="${b.checkOut}" required></label></div>
        <div class="row2"><label>Guests<input class="input" type="number" min="1" name="guests" value="${b.guests}" required></label><label>Booking code<input class="input" name="code" value="${esc(b.code)}" required pattern="[A-Za-z0-9\\-]{4,20}" title="4–20 letters or numbers"></label></div>
        <label>Private notes (not shown to guest)<textarea class="input" name="notes" rows="2">${esc(b.notes || '')}</textarea></label>
        <button class="btn primary block">${isNew ? 'Create booking' : 'Save changes'}</button>
      </form>`, (rootEl, close) => {
      const f = rootEl.querySelector('#bkForm');
      f.onsubmit = e => {
        e.preventDefault();
        const code = f.code.value.trim().toUpperCase();
        const clash = Store.bookingByCode(code);
        if (clash && clash.id !== b.id) return toast('That code is already used by another booking.', 'err');
        if (f.checkOut.value <= f.checkIn.value) return toast('Check-out must be after check-in.', 'err');
        const vals = { guestName: f.guestName.value.trim(), propertyId: f.propertyId.value, checkIn: f.checkIn.value, checkOut: f.checkOut.value, guests: +f.guests.value, code, notes: f.notes.value };
        let created;
        Store.update(d => {
          if (isNew) { created = { id: uid('b'), status: 'upcoming', checkInData: null, feedback: null, createdAt: Date.now(), ...vals }; d.bookings.push(created); }
          else Object.assign(d.bookings.find(x => x.id === b.id), vals);
        });
        close(); renderMain();
        if (created) qrModal(created);
      };
    });
  }

  // In the single-page preview, guest links switch views instead of opening a new page.
  function bindGuestLinks(scope) {
    scope.querySelectorAll('[data-guest]').forEach(a => a.addEventListener('click', e => {
      if (!window.PREVIEW) return;
      e.preventDefault();
      document.querySelectorAll('.modal-back').forEach(m => m.remove());
      document.body.classList.remove('no-scroll');
      window.PREVIEW.show('guest', a.dataset.guest);
    }));
  }

  function guestLink(b) { return new URL('guest.html?code=' + encodeURIComponent(b.code), location.href).href; }

  function qrModal(b) {
    const link = guestLink(b), p = Store.property(b.propertyId);
    const msg = `Hi ${b.guestName.split(' ')[0]}! Welcome to ${p.name.en}. Here is your guest portal for check-in, Wi-Fi, house guide and requests:\n${link}\nBooking code: ${b.code}`;
    openModal(`<h2>Guest link for ${esc(b.guestName)}</h2><p class="muted">Send this link, or print the QR for the unit. It logs the guest straight into their stay.</p>
      <div class="qr-box"><div id="qr"></div><code class="code-lg">${esc(b.code)}</code></div>
      <div class="copy-field"><input class="input" readonly value="${esc(link)}"><button class="btn ghost sm" id="cpLink">${icon('copy')} Copy</button></div>
      <label>Message to send<textarea class="input" rows="4" readonly id="msgTxt">${esc(msg)}</textarea></label>
      <div class="btn-row"><button class="btn primary" id="cpMsg">${icon('copy')} Copy message</button><button class="btn ghost" id="dlQr">${icon('down')} Download QR</button><a class="btn ghost" href="${esc(link)}" target="_blank" data-guest="${esc(b.code)}">${icon('external')} Open as guest</a></div>`, rootEl => {
      const box = rootEl.querySelector('#qr');
      if (window.QRCode) new QRCode(box, { text: link, width: 200, height: 200, colorDark: '#2a2420', colorLight: '#ffffff' });
      else box.innerHTML = '<p class="muted small">QR library could not load (offline?). The link still works.</p>';
      bindGuestLinks(rootEl);
      rootEl.querySelector('#cpLink').onclick = () => copyText(link).then(() => toast('Link copied', 'ok'));
      rootEl.querySelector('#cpMsg').onclick = () => copyText(msg).then(() => toast('Message copied', 'ok'));
      rootEl.querySelector('#dlQr').onclick = () => {
        const c = box.querySelector('canvas'), img = box.querySelector('img');
        const src = c ? c.toDataURL('image/png') : img && img.src;
        if (!src) return;
        const a = document.createElement('a'); a.href = src; a.download = `qr-${b.code}.png`; a.click();
      };
    });
  }

  function bookingDetail(b) {
    if (!b) return;
    const ci = b.checkInData, fb = b.feedback;
    const reqs = D().requests.filter(r => r.bookingId === b.id);
    openModal(`<p class="eyebrow">${esc(propName(b.propertyId))}</p><h2>${esc(b.guestName)}</h2>
      <p>${bookingChip(b.status)} <span class="muted">${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)} · ${b.guests} guest(s) · code <code>${esc(b.code)}</code></span></p>
      ${b.notes ? `<p class="note">${esc(b.notes)}</p>` : ''}
      <h3>Check-in details</h3>
      ${ci ? `<dl class="dl"><dt>Name</dt><dd>${esc(ci.fullName)}</dd><dt>Phone</dt><dd><a href="tel:${esc(ci.phone)}">${esc(ci.phone)}</a></dd><dt>Email</dt><dd>${esc(ci.email || '—')}</dd><dt>Guests</dt><dd>${ci.guests}</dd><dt>Arrival</dt><dd>${fmtTime12(ci.arrival)}</dd><dt>Notes</dt><dd>${esc(ci.notes || '—')}</dd><dt>Checked in</dt><dd>${new Date(ci.at).toLocaleString()}</dd></dl>
        ${ci.idPhoto ? `<p class="label">ID photo</p><img class="detail-photo" src="${ci.idPhoto}" alt="Guest ID">` : ''}` : '<p class="muted">Not checked in yet.</p>'}
      ${fb ? `<h3>Feedback</h3><p class="stars-static">${'★'.repeat(fb.rating || 0)}${'☆'.repeat(5 - (fb.rating || 0))}</p><p>${esc(fb.comment || '')}</p><p class="muted small">Checklist ${fb.checklistDone ? 'completed' : 'not fully completed'}</p>` : ''}
      <h3>Requests (${reqs.length})</h3>${reqs.map(r => `<button class="row-btn" data-req="${r.id}"><span><b>${esc(r.title)}</b><small>${REQUEST_TYPES[r.type]}</small></span>${statusChip(r.status)}</button>`).join('') || '<p class="muted">None.</p>'}
      <h3>Manual status</h3><div class="btn-row">${['upcoming', 'checked_in', 'checked_out'].map(s => `<button class="chip ${b.status === s ? 'on' : ''}" data-bs="${s}">${{ upcoming: 'Upcoming', checked_in: 'In-house', checked_out: 'Checked out' }[s]}</button>`).join('')}</div>
      <div class="btn-row"><button class="btn ghost" id="bdQr">${icon('qr')} Link & QR</button><button class="btn ghost" id="bdEdit">${icon('pen')} Edit</button></div>`, (rootEl, close) => {
      rootEl.querySelectorAll('[data-req]').forEach(x => x.onclick = () => { close(); sel.requestId = x.dataset.req; sel.inboxStatus = 'all'; switchTab('inbox'); });
      rootEl.querySelectorAll('[data-bs]').forEach(x => x.onclick = () => { Store.update(d => { d.bookings.find(y => y.id === b.id).status = x.dataset.bs; }); close(); renderMain(); bookingDetail(Store.booking(b.id)); });
      rootEl.querySelector('#bdQr').onclick = () => { close(); qrModal(b); };
      rootEl.querySelector('#bdEdit').onclick = () => { close(); bookingForm(b); };
    }, 'wide');
  }

  // ================= generic content editor =================
  const BI = (k, label, area) => ({ k, label, t: area ? 'bi-area' : 'bi' });
  const IMG = (k = 'image', label = 'Photo') => ({ k, label, t: 'image' });
  const ICON = { k: 'icon', label: 'Icon', t: 'icon' };
  const safeSum = fn => x => { try { return fn(x); } catch (e) { return ''; } };
  const BUILTIN_TARGETS = [
    ['wifi', 'Wi-Fi (private)'], ['host', 'Host contact (private)'], ['checkin', 'Check in'], ['checkout', 'Checkout'],
    ['extras', 'Extras & experiences'], ['rules', 'House rules'], ['guide', 'Local guide'], ['emergency', 'Safety & emergency'],
    ['problems', 'Common problems'], ['tutorials', 'Tutorials list'], ['requests', 'Requests'], ['help', 'Request or report'],
    ['housekeeping', 'Housekeeping'], ['stay', 'Early in / late out'], ['luggage', 'Luggage storage'], ['lostfound', 'Lost & found'], ['guestbook', 'Guestbook'],
  ];
  const TILE_ITEM = [{ k: 'target', label: 'Opens', t: 'target' }, ICON, { k: 'color', label: 'Icon color', t: 'select', options: TILE_COLORS }, BI('title', 'Title'), BI('sub', 'Short description')];
  const tileList = (k, label) => ({ k, label, t: 'list', item: TILE_ITEM, blank: () => ({ target: 'rules', icon: 'star', color: 'beige', title: bi(''), sub: bi('') }), sum: safeSum(x => x.title.en) });
  const newPageId = () => 'pg' + Math.random().toString(36).slice(2, 7);
  const PAGE_ITEM = [
    { t: 'note', text: x => `Guests open this page at #p-${x.id}. Point a home tile or photo card to "Page: ${x.title.en}".` },
    BI('title', 'Page title'), BI('category', 'Category label (e.g. Kitchen, Arrival)'), BI('summary', 'Short summary', 1), ICON, IMG('cover', 'Cover photo'),
    { k: 'inTutorials', label: 'Show in the Tutorials list', t: 'bool' },
    { k: 'private', label: 'Private: hide until the guest is confirmed and inside the unlock window', t: 'bool' },
    { k: 'showDoorCode', label: 'Show the door code on this page (after online check-in)', t: 'bool' },
    { k: 'infoCards', label: 'Info cards (hours, closed days, access…)', t: 'list', item: [BI('label', 'Label'), BI('text', 'Text')], blank: () => ({ label: bi(''), text: bi('') }), sum: safeSum(x => x.label.en) },
    { k: 'gallery', label: 'Photo walk-through (guests swipe)', t: 'list', item: [IMG(), BI('caption', 'Caption')], blank: () => ({ image: '', caption: bi('') }), sum: safeSum(x => x.caption.en) },
    { k: 'steps', label: 'Numbered steps', t: 'list', item: [BI('title', 'Step title'), BI('text', 'Instructions', 1), IMG()], blank: () => ({ title: bi(''), text: bi(''), image: '' }), sum: safeSum(x => x.title.en) },
    { k: 'video', label: 'Video link (YouTube, Google Drive, or a direct .mp4 link)', t: 'text' },
    { k: 'lists', label: 'Lists (e.g. Before swimming, Extra guests)', t: 'list', item: [BI('title', 'List title'), { k: 'tone', label: 'Style', t: 'select', options: [['plain', 'Plain'], ['sage', 'Green highlight']] }, BI('items', 'Items, one per line', 1)], blank: () => ({ title: bi(''), tone: 'plain', items: bi('') }), sum: safeSum(x => x.title.en) },
  ];
  const simpleBi = (label) => ({ item: [BI('', label)], blank: () => bi(''), sum: safeSum(x => x.en) });

  const PROP_SECTIONS = [
    { title: 'Basics', ic: 'building', fields: [BI('name', 'Property name'), BI('welcomeLine', 'Welcome line (script text on the cover)'), BI('tagline', 'Tagline'), { k: 'location', label: 'Location shown on the cover', t: 'text' }, { k: 'address', label: 'Full address', t: 'text' }, IMG('heroImage', 'Home cover photo'), { k: 'checkInTime', label: 'Check-in time', t: 'time' }, { k: 'checkOutTime', label: 'Check-out time', t: 'time' }, { k: 'unlockHours', label: 'Unlock private details this many hours before check-in', t: 'number' }, { k: 'mapUrl', label: 'Google Maps link (directions)', t: 'text' }, { k: 'reviewUrl', label: 'Review link (e.g. your Airbnb listing)', t: 'text' }, { k: 'requireId', label: 'Require an ID photo at online check-in', t: 'bool' }] },
    { title: 'Private details (door code, Wi-Fi, host)', ic: 'lock', hint: 'Guests see these only after confirming their reservation, inside the unlock window. The door code also needs online check-in.', fields: [{ k: 'doorCode', label: 'Door / lockbox code', t: 'text' }, { k: 'wifi.ssid', label: 'Wi-Fi network name', t: 'text' }, { k: 'wifi.password', label: 'Wi-Fi password', t: 'text' }, BI('wifiNote', 'Wi-Fi note', 1), BI('hostNote', 'Host contact note', 1)] },
    { title: 'Home · tile sections', ic: 'grid', hint: 'The "Start here" card. Each section has a label and a grid of icon tiles.', list: 'homeSections', item: [BI('title', 'Section label'), tileList('tiles', 'Tiles')], blank: () => ({ title: bi(''), tiles: [] }), sum: safeSum(x => x.title.en) },
    { title: 'Home · photo cards', ic: 'image', list: 'features', item: [{ k: 'target', label: 'Opens', t: 'target' }, IMG('image', 'Photo (empty = use the page cover)'), BI('eyebrow', 'Small line on top'), BI('title', 'Title'), BI('text', 'Text', 1), BI('button', 'Button label')], blank: () => ({ target: 'extras', image: '', eyebrow: bi(''), title: bi(''), text: bi(''), button: bi('View details', 'Tingnan') }), sum: safeSum(x => x.title.en) },
    { title: 'Home · swipe panels', ic: 'list', list: 'panels', item: [BI('eyebrow', 'Small label'), BI('title', 'Title'), BI('text', 'Text', 1), tileList('tiles', 'Rows (the first one is dark)')], blank: () => ({ eyebrow: bi(''), title: bi(''), text: bi(''), tiles: [] }), sum: safeSum(x => x.title.en) },
    { title: 'Guide pages & tutorials', ic: 'book', hint: 'Pool, trash, sofa bed, kitchen… Each page can have a cover photo, info cards, a photo walk-through, numbered steps, a video and lists.', list: 'pages', item: PAGE_ITEM, blank: () => ({ id: newPageId(), icon: 'book', category: bi(''), title: bi('New page', 'Bagong page'), summary: bi(''), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '', infoCards: [], gallery: [], steps: [], lists: [] }), sum: safeSum(x => `${x.title.en}${x.inTutorials ? ' · Tutorial' : ''}${x.private ? ' · Private' : ''}`) },
    { title: 'Extras & experiences', ic: 'sparkle', fields: [IMG('extrasCover', 'Extras page cover photo')], list: 'services', item: [ICON, BI('name', 'Name'), BI('category', 'Category (used for filters)'), BI('tag', 'Tag (e.g. Host-arranged, Partner service)'), BI('desc', 'Description', 1), BI('priceText', 'Price text (e.g. Ask for rate, ₱600 per trip)'), { k: 'price', label: 'Price for estimates (0 = no estimate)', t: 'number' }, BI('note', 'Note (e.g. Request 1 day ahead)'), IMG()], blank: () => ({ icon: 'sparkle', name: bi(''), category: bi(''), tag: bi(''), desc: bi(''), priceText: bi(''), price: 0, note: bi(''), image: '' }), sum: safeSum(x => `${x.name.en} · ${x.priceText.en || money(x.price)}`) },
    { title: 'Safety & emergency contacts', ic: 'siren', fields: [BI('notice.title', 'Notice title (e.g. Generator information)'), BI('notice.text', 'Notice text', 1)], list: 'emergency', item: [ICON, BI('label', 'Name'), BI('desc', 'Description'), { k: 'phones', label: 'Phone numbers, separated by commas', t: 'text' }, { k: 'mapUrl', label: 'Map link (optional)', t: 'text' }], blank: () => ({ icon: 'siren', label: bi(''), desc: bi(''), phones: '', mapUrl: '' }), sum: safeSum(x => x.label.en) },
    { title: 'Emergency procedures', ic: 'flame', list: 'procedures', item: [BI('title', 'Title'), BI('text', 'What to do', 1)], blank: () => ({ title: bi(''), text: bi('') }), sum: safeSum(x => x.title.en) },
    { title: 'Common problems', ic: 'help', list: 'problems', item: [BI('q', 'Problem'), BI('a', 'Quick fix', 1)], blank: () => ({ q: bi(''), a: bi('') }), sum: safeSum(x => x.q.en) },
    { title: 'House rules', ic: 'lock', list: 'rules', ...simpleBi('Rule') },
    { title: 'Local guide', ic: 'pin', list: 'localGuide', item: [BI('category', 'Category (e.g. Food)'), { k: 'name', label: 'Place name', t: 'text' }, BI('desc', 'Description', 1), { k: 'mapUrl', label: 'Google Maps link', t: 'text', mapFrom: 'name' }, IMG()], blank: () => ({ category: bi(''), name: '', desc: bi(''), mapUrl: '', image: '' }), sum: safeSum(x => x.name) },
    { title: 'Request items (quick picks)', ic: 'message', list: 'requestItems', ...simpleBi('Item') },
    { title: 'Issue types', ic: 'alert', list: 'issueTypes', ...simpleBi('Issue type') },
    { title: 'Housekeeping options', ic: 'concierge', list: 'housekeepingOptions', ...simpleBi('Option') },
    { title: 'Housekeeping time slots', ic: 'clock', list: 'housekeepingSlots', item: [{ k: '', label: 'Time slot', t: 'text' }], blank: () => '', sum: x => x },
    { title: 'Early check-in / late checkout policy', ic: 'clock', fields: [BI('stayPolicy', 'Policy shown to guests', 1)] },
    { title: 'Checkout checklist', ic: 'check', list: 'checkoutChecklist', ...simpleBi('Checklist item') },
  ];
  const SETTINGS_SECTIONS = [
    { title: 'Brand', ic: 'building', fields: [{ k: 'brandName', label: 'Brand name', t: 'text' }, BI('tagline', 'Tagline'), { k: 'accent', label: 'Button color', t: 'color' }] },
    { title: 'Host contact', ic: 'phone', fields: [{ k: 'hostName', label: 'Host name (shown to guests)', t: 'text' }, { k: 'hostPhone', label: 'Phone', t: 'text' }, { k: 'hostEmail', label: 'Email', t: 'text' }] },
    { title: 'Currency & admin PIN', ic: 'key', fields: [{ k: 'currency', label: 'Currency symbol', t: 'text' }, { k: 'adminPin', label: 'Admin PIN', t: 'text' }] },
    { title: 'Quick replies', ic: 'message', list: 'quickReplies', item: [{ k: '', label: 'Reply text', t: 'text' }], blank: () => '', sum: x => x },
  ];

  const openKeys = new Set(['sec:Basics', 'sec:Brand']);
  let BLANKS = [];
  const join = (a, b) => (b === '' ? a : `${a}.${b}`);
  function getPath(o, path) { return path.split('.').reduce((x, k) => (x == null ? x : x[k]), o); }
  function setPath(o, path, val) {
    const ks = path.split('.');
    let x = o;
    for (let i = 0; i < ks.length - 1; i++) { if (x[ks[i]] == null) x[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; x = x[ks[i]]; }
    x[ks[ks.length - 1]] = val;
  }
  function targetOptions(selected) {
    const p = D().properties[sel.propertyIdx] || { pages: [] };
    const opts = [...BUILTIN_TARGETS, ...(p.pages || []).map(pg => ['p-' + pg.id, 'Page: ' + (pg.title.en || pg.id)])];
    if (selected && !opts.some(o => o[0] === selected)) opts.push([selected, selected + ' (missing)']);
    return opts.map(([v, l]) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(l)}</option>`).join('');
  }

  function fieldHTML(f, base) {
    const path = join(base, f.k || ''), v = f.k == null ? undefined : getPath(D(), path);
    const lab = `<span class="f-label">${esc(f.label || '')}</span>`;
    switch (f.t) {
      case 'note': return `<p class="muted small">${esc(f.text(getPath(D(), base)))}</p>`;
      case 'list': return `<div class="field">${lab}${listHTML(path, f)}</div>`;
      case 'bi': case 'bi-area': {
        const ctl = sub => f.t === 'bi' ? `<input class="input" data-path="${path}.${sub}" value="${esc(v && v[sub])}">` : `<textarea class="input" rows="3" data-path="${path}.${sub}">${esc(v && v[sub])}</textarea>`;
        return `<div class="field">${lab}<div class="bi"><label><small>EN</small>${ctl('en')}</label><label><small>FIL</small>${ctl('fil')}</label></div></div>`;
      }
      case 'bool': return `<label class="check field"><input type="checkbox" data-path="${path}" data-kind="bool" ${v ? 'checked' : ''}> <span>${esc(f.label)}</span></label>`;
      case 'number': return `<label class="field">${lab}<input class="input" type="number" min="0" data-path="${path}" data-kind="number" value="${esc(v)}"></label>`;
      case 'time': return `<label class="field">${lab}<input class="input" type="time" data-path="${path}" value="${esc(v)}"></label>`;
      case 'color': return `<label class="field">${lab}<input class="input color" type="color" data-path="${path}" value="${esc(v || '#1f2a44')}"></label>`;
      case 'select': return `<label class="field">${lab}<select class="input" data-path="${path}" data-rerender="1">${f.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o[0].toUpperCase() + o.slice(1)]; return `<option value="${esc(ov)}" ${ov === v ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></label>`;
      case 'target': return `<label class="field">${lab}<select class="input" data-path="${path}" data-rerender="1">${targetOptions(v)}</select></label>`;
      case 'icon': return `<div class="field">${lab}<div class="icon-pick"><span class="sq-ic beige">${icon(v || 'grid')}</span><select class="input" data-path="${path}" data-rerender="1">${Object.keys(ICONS).map(n => `<option ${n === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>`;
      case 'image': return `<div class="field">${lab}<div class="img-ed">
          ${v ? `<img src="${esc(v)}" alt="">` : `<div class="img-ph">${icon('camera')}</div>`}
          <div class="stack sm"><label class="btn ghost sm">${icon('up')} Upload<input type="file" accept="image/*" data-img="${path}" hidden></label>
          <input class="input" placeholder="…or paste an image link" data-path="${path}" value="${v && !String(v).startsWith('data:') ? esc(v) : ''}">
          ${v ? `<button class="link danger" data-clear="${path}">Remove photo</button>` : ''}</div></div></div>`;
      default: return `<label class="field">${lab}<div class="inline"><input class="input" data-path="${path}" value="${esc(v)}">${f.mapFrom ? `<button class="btn ghost sm" data-mapfrom="${join(base, f.mapFrom)}|${path}" title="Create a Google Maps search link from the place name">${icon('pin')} Auto</button>` : ''}</div></label>`;
    }
  }

  function listHTML(lp, f) {
    const items = getPath(D(), lp) || [];
    const bk = BLANKS.push(f.blank) - 1;
    const collapsible = f.item.length > 2;
    const rows = items.map((it, i) => {
      const key = `${lp}.${i}`;
      const btns = `<span><button class="icon-btn sm" data-move="${lp}|${i}|-1" ${i === 0 ? 'disabled' : ''} title="Move up">${icon('up')}</button><button class="icon-btn sm" data-move="${lp}|${i}|1" ${i === items.length - 1 ? 'disabled' : ''} title="Move down">${icon('down')}</button><button class="icon-btn sm" data-del="${lp}|${i}" title="Remove">${icon('trash')}</button></span>`;
      const head = `<b>${i + 1}. ${esc((f.sum && f.sum(it)) || 'Untitled')}</b>${btns}`;
      const fields = f.item.map(x => fieldHTML(x, key)).join('');
      return collapsible
        ? `<details class="li-ed" data-key="${key}" ${openKeys.has(key) ? 'open' : ''}><summary class="li-ed-head">${head}</summary><div class="li-body">${fields}</div></details>`
        : `<div class="li-ed"><div class="li-ed-head">${head}</div>${fields}</div>`;
    }).join('');
    return `<div class="sub-list">${rows}<button class="btn ghost sm" data-add="${lp}" data-blank="${bk}">${icon('plus')} Add</button></div>`;
  }

  function sectionHTML(sec, base) {
    const key = 'sec:' + sec.title;
    let body = sec.hint ? `<p class="muted small">${esc(sec.hint)}</p>` : '';
    if (sec.fields) body += sec.fields.map(f => fieldHTML(f, base)).join('');
    if (sec.list) body += listHTML(join(base, sec.list), sec);
    const count = sec.list ? (getPath(D(), join(base, sec.list)) || []).length : '';
    return `<details class="panel ed-sec" data-key="${esc(key)}" ${openKeys.has(key) ? 'open' : ''}><summary>${icon(sec.ic || 'pen')}<span>${esc(sec.title)}</span>${sec.list ? `<small class="muted">${count}</small>` : ''}${icon('down', 'chev')}</summary><div class="ed-body">${body}</div></details>`;
  }

  function bindEditor(main) {
    const rerender = () => { const y = window.scrollY; BLANKS = []; renderMain(); window.scrollTo(0, y); };
    const saved = () => { const el = document.getElementById('savedFlag') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'savedFlag', className: 'saved-flag' }); el.textContent = '✓ Saved'; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 1200); };
    const ed = main.querySelector('.editor');
    ed.addEventListener('toggle', e => { const k = e.target.dataset && e.target.dataset.key; if (k) e.target.open ? openKeys.add(k) : openKeys.delete(k); }, true);
    ed.addEventListener('change', async e => {
      const el = e.target;
      if (el.dataset.img) {
        const url = await compressImage(el.files[0]);
        if (Store.update(d => setPath(d, el.dataset.img, url))) { saved(); rerender(); }
        return;
      }
      if (!el.dataset.path) return;
      let val = el.value;
      if (el.dataset.kind === 'bool') val = el.checked;
      if (el.dataset.kind === 'number') val = +el.value || 0;
      if (Store.update(d => setPath(d, el.dataset.path, val))) {
        saved();
        if (el.dataset.path.startsWith('settings.')) applyTheme(S());
        if (el.dataset.rerender) rerender();
      }
    });
    ed.addEventListener('click', async e => {
      const b = e.target.closest('[data-add],[data-del],[data-move],[data-clear],[data-mapfrom]');
      if (!b) return;
      e.preventDefault();
      if (b.dataset.add) {
        let idx = 0;
        Store.update(d => { const arr = getPath(d, b.dataset.add) || []; arr.push(BLANKS[+b.dataset.blank]()); idx = arr.length - 1; setPath(d, b.dataset.add, arr); });
        openKeys.add(`${b.dataset.add}.${idx}`);
      } else if (b.dataset.del) {
        const [p, i] = b.dataset.del.split('|');
        if (!(await askConfirm('Remove this item?', { danger: true, ok: 'Remove' }))) return;
        Store.update(d => getPath(d, p).splice(+i, 1));
      } else if (b.dataset.move) {
        const [p, i, dir] = b.dataset.move.split('|'); const a = +i, z = a + +dir;
        Store.update(d => { const arr = getPath(d, p); [arr[a], arr[z]] = [arr[z], arr[a]]; });
      } else if (b.dataset.clear) {
        Store.update(d => setPath(d, b.dataset.clear, ''));
      } else if (b.dataset.mapfrom) {
        const [from, to] = b.dataset.mapfrom.split('|');
        const p = D().properties[sel.propertyIdx];
        const q = [getPath(D(), from), p && p.address].filter(Boolean).join(', ');
        if (!q) return toast('Enter the place name first.', 'err');
        Store.update(d => setPath(d, to, mapsSearch(q)));
      }
      saved(); rerender();
    });
  }

  function propertyQr(p) {
    const link = new URL('guest.html?p=' + encodeURIComponent(p.id), location.href).href;
    openModal(`<h2>Guest guide link · ${esc(p.name.en)}</h2><p class="muted">Print this QR for the unit or share it in your listing. Anyone can browse the guides. Private details unlock after the guest checks in with their last name.</p>
      <div class="qr-box"><div id="qr"></div></div>
      <div class="copy-field"><input class="input" readonly value="${esc(link)}"><button class="btn ghost sm" id="cpLink">${icon('copy')} Copy</button></div>`, rootEl => {
      const box = rootEl.querySelector('#qr');
      if (window.QRCode) new QRCode(box, { text: link, width: 200, height: 200, colorDark: '#1f2a44', colorLight: '#ffffff' });
      rootEl.querySelector('#cpLink').onclick = () => copyText(link).then(() => toast('Link copied', 'ok'));
    });
  }

  document.addEventListener('click', e => { if (bellOpen && !e.target.closest('.bell-wrap')) { bellOpen = false; renderBell(); } });
  window.AdminApp = { render };
  render();
})();
