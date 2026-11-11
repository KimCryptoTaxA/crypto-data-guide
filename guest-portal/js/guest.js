/* Guest-facing web app (phone-first). Hash routes: #/home, #/checkin, ... */
(function () {
  const app = document.getElementById('app');
  const CODE_KEY = 'guestportal_code';
  let lang = safeGet('guestportal_lang') || 'en';
  let code = safeGet(CODE_KEY) || '';
  let reqSnapshot = {};

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { } }

  const t = k => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  const tr = v => (v == null ? '' : typeof v === 'string' ? v : (v[lang] || v.en || ''));
  const S = () => Store.get().settings;
  const booking = () => (code ? Store.bookingByCode(code) : null);
  const property = () => { const b = booking(); return b && Store.property(b.propertyId); };
  const money = n => `${S().currency}${Number(n || 0).toLocaleString()}`;
  const route = () => (location.hash.replace(/^#\/?/, '') || 'home');
  const go = r => { location.hash = '#/' + r; };

  // ---------- auto-login from link (?code=XXXX) ----------
  const urlCode = new URLSearchParams(location.search).get('code');
  if (urlCode && Store.bookingByCode(urlCode)) { code = Store.bookingByCode(urlCode).code; safeSet(CODE_KEY, code); }

  // ---------- shell ----------
  function header() {
    const b = booking();
    return `<header class="g-head">
      <div class="g-brand"><span class="mark">${esc(S().brandName.slice(0, 1))}</span><span>${esc(S().brandName)}</span></div>
      <div class="g-actions">
        <button class="lang-toggle" id="langBtn" aria-label="Language">${icon('globe')}<b class="${lang === 'en' ? 'on' : ''}">EN</b><b class="${lang === 'fil' ? 'on' : ''}">FIL</b></button>
        ${b ? `<button class="icon-btn" id="logoutBtn" aria-label="${t('logout')}">${icon('logout')}</button>` : ''}
      </div>
    </header>`;
  }

  function bottomNav() {
    const r = route();
    const item = (to, ic, label, cls = '') => `<a href="#/${to}" class="${r === to ? 'on' : ''} ${cls}">${icon(ic)}<span>${label}</span></a>`;
    const open = Store.get().requests.filter(x => x.bookingId === booking().id && !['done', 'declined'].includes(x.status)).length;
    return `<nav class="g-nav">
      ${item('home', 'home', t('nav_home'))}
      ${item('services', 'coffee', t('nav_services'))}
      ${item('help', 'message', t('nav_request'))}
      <a href="#/myrequests" class="${r === 'myrequests' ? 'on' : ''}">${icon('list')}<span>${t('nav_my')}</span>${open ? `<i class="dot">${open}</i>` : ''}</a>
      ${item('sos', 'phone', 'SOS', 'sos')}
    </nav>`;
  }

  function page(title, body, opts = {}) {
    return `<section class="g-page">
      <div class="g-page-head">
        <a href="#/home" class="icon-btn back" aria-label="${t('back')}">${icon('back')}</a>
        <div><h1>${esc(title)}</h1>${opts.sub ? `<p class="muted">${esc(opts.sub)}</p>` : ''}</div>
      </div>
      ${body}
    </section>`;
  }

  function render() {
    applyTheme(S());
    document.documentElement.lang = lang === 'fil' ? 'fil' : 'en';
    const b = booking();
    if (!b) { app.innerHTML = header() + loginView(); bindShell(); bindLogin(); return; }
    const r = route();
    const views = { home, checkin, selfcheckin, wifi, rules, appliances, guide, services, stay, housekeeping, help, lostfound, luggage, trash, sos, guestbook, myrequests, checkout };
    const view = views[r] || home;
    app.innerHTML = header() + `<main class="g-main">${view()}</main>` + bottomNav();
    bindShell();
    (binders[r] || binders.home || (() => { }))();
    snapshotRequests();
  }

  function bindShell() {
    const lb = document.getElementById('langBtn');
    if (lb) lb.onclick = () => { lang = lang === 'en' ? 'fil' : 'en'; safeSet('guestportal_lang', lang); render(); };
    const lo = document.getElementById('logoutBtn');
    if (lo) lo.onclick = () => { if (confirm(t('logout_confirm'))) { code = ''; safeSet(CODE_KEY, null); history.replaceState(null, '', location.pathname); render(); } };
  }

  // ---------- login ----------
  function loginView() {
    return `<main class="g-login">
      <div class="login-card">
        <p class="eyebrow">${esc(tr(S().tagline))}</p>
        <h1>${t('login_title')}</h1>
        <p class="muted">${t('login_sub')}</p>
        <form id="loginForm" class="stack">
          <input id="codeInput" class="input code-input" placeholder="${t('code_placeholder')}" autocomplete="off" autocapitalize="characters" value="${esc(urlCode || '')}" required>
          <button class="btn primary block">${icon('login')} ${t('login_btn')}</button>
        </form>
        <p class="hint">${t('login_hint')}</p>
      </div>
    </main>`;
  }
  function bindLogin() {
    document.getElementById('loginForm').onsubmit = e => {
      e.preventDefault();
      const b = Store.bookingByCode(document.getElementById('codeInput').value);
      if (!b) return toast(t('code_invalid'), 'err');
      code = b.code; safeSet(CODE_KEY, code); go('home'); render();
    };
  }

  // ---------- home ----------
  function stayStatus(b) {
    const today = ymd();
    const nights = Math.max(1, daysBetween(b.checkIn, b.checkOut));
    if (b.status === 'checked_out') return { label: t('st_out'), sub: t('st_out_sub') };
    if (b.status === 'checked_in') {
      const n = Math.min(nights, Math.max(1, daysBetween(b.checkIn, today) + 1));
      const left = daysBetween(today, b.checkOut);
      return { label: t('st_night').replace('{n}', n).replace('{t}', nights), sub: left <= 0 ? t('st_checkout_today') : t('st_left').replace('{n}', left) };
    }
    const until = daysBetween(today, b.checkIn);
    if (until > 0) return { label: t('st_until').replace('{n}', until), sub: t('st_until_sub') };
    return { label: t('st_ready'), sub: t('st_ready_sub') };
  }

  function home() {
    const b = booking(), p = property(), st = stayStatus(b);
    const tile = (to, ic, key) => `<a class="tile" href="#/${to}">${icon(ic)}<span>${t(key)}</span></a>`;
    const cta = b.status === 'upcoming'
      ? `<a class="btn primary block" href="#/checkin">${icon('login')} ${t('cta_checkin')}</a>`
      : b.status === 'checked_in'
        ? `<a class="btn ghost block" href="#/checkout">${icon('logout')} ${t('cta_checkout')}</a>`
        : `<a class="btn ghost block" href="#/guestbook">${icon('pen')} ${t('cta_guestbook')}</a>`;
    return `
      <div class="hero" style="${p.heroImage ? `background-image:url('${esc(p.heroImage)}')` : ''}">
        <div class="hero-in">
          <p class="eyebrow light">${t('welcome')}, ${esc(b.guestName.split(' ')[0])}</p>
          <h1>${esc(tr(p.name))}</h1>
          <p class="hero-dates">${icon('calendar')} ${fmtDate(b.checkIn, lang)} — ${fmtDate(b.checkOut, lang)}</p>
        </div>
      </div>
      <div class="status-card">
        <div><p class="status-label">${esc(st.label)}</p><p class="muted small">${esc(st.sub)}</p></div>
        <div class="times"><span>${t('in')} <b>${fmtTime12(p.checkInTime)}</b></span><span>${t('out')} <b>${fmtTime12(p.checkOutTime)}</b></span></div>
        ${cta}
      </div>
      <div class="welcome-note">${paras(tr(p.welcome))}<p class="sign">— ${esc(S().hostName)}</p></div>

      <h2 class="section-title">${t('sec_stay')}</h2>
      <div class="tiles">
        ${tile('selfcheckin', 'key', 't_selfcheckin')}
        ${tile('wifi', 'wifi', 't_wifi')}
        ${tile('rules', 'book', 't_rules')}
        ${tile('appliances', 'tool', 't_appliances')}
        ${tile('trash', 'trash', 't_trash')}
        ${tile('guide', 'pin', 't_guide')}
      </div>
      <h2 class="section-title">${t('sec_service')}</h2>
      <div class="tiles">
        ${tile('help', 'message', 't_help')}
        ${tile('services', 'coffee', 't_services')}
        ${tile('housekeeping', 'droplet', 't_housekeeping')}
        ${tile('stay', 'clock', 't_stay')}
        ${tile('luggage', 'briefcase', 't_luggage')}
        ${tile('lostfound', 'search', 't_lostfound')}
      </div>
      <h2 class="section-title">${t('sec_more')}</h2>
      <div class="tiles">
        ${tile('myrequests', 'list', 't_myrequests')}
        ${tile('guestbook', 'pen', 't_guestbook')}
        ${tile('sos', 'alert', 't_sos')}
      </div>
      <a class="contact-strip" href="tel:${esc(S().hostPhone.replace(/\s/g, ''))}">${icon('phone')}<span>${t('call_host')} <b>${esc(S().hostName)}</b></span><span class="muted">${esc(S().hostPhone)}</span></a>`;
  }

  // ---------- check-in ----------
  function checkin() {
    const b = booking(), p = property();
    if (b.status !== 'upcoming') {
      return page(t('t_checkin'), `<div class="card center">${icon('check', 'big ok')}<h2>${t('ci_done')}</h2><p class="muted">${t('ci_done_sub')}</p><a class="btn primary" href="#/selfcheckin">${icon('key')} ${t('see_door')}</a></div>`);
    }
    return page(t('t_checkin'), `
      <form id="ciForm" class="card stack">
        <label>${t('f_fullname')}<input class="input" name="fullName" value="${esc(b.guestName)}" required></label>
        <div class="row2">
          <label>${t('f_phone')}<input class="input" name="phone" type="tel" required></label>
          <label>${t('f_guests')}<input class="input" name="guests" type="number" min="1" value="${b.guests}" required></label>
        </div>
        <label>${t('f_email')}<input class="input" name="email" type="email"></label>
        <label>${t('f_arrival')}<input class="input" name="arrival" type="time" value="${p.checkInTime}"></label>
        <label>${t('f_id')} ${p.requireId ? '' : `<span class="muted">(${t('optional')})</span>`}
          <div class="upload">${icon('camera')}<span id="idName">${t('f_id_hint')}</span><input type="file" name="idPhoto" accept="image/*" ${p.requireId ? 'required' : ''}></div>
        </label>
        <label>${t('f_notes')}<textarea class="input" name="notes" rows="2" placeholder="${t('f_notes_ph')}"></textarea></label>
        <label class="check"><input type="checkbox" name="agree" required> <span>${t('f_agree')} <a href="#/rules">${t('t_rules')}</a></span></label>
        <button class="btn primary block">${icon('check')} ${t('ci_submit')}</button>
      </form>`, { sub: t('ci_sub') });
  }

  // ---------- simple info pages ----------
  function selfcheckin() {
    const b = booking(), p = property();
    const unlocked = b.status === 'checked_in';
    const steps = (p.selfCheckIn || []).map((s, i) => `<li class="step"><span class="num">${i + 1}</span><div><h3>${esc(tr(s.title))}</h3>${paras(tr(s.text))}${s.image ? `<img src="${esc(s.image)}" alt="" class="step-img">` : ''}</div></li>`).join('');
    const doorHtml = unlocked
      ? `<div class="door-code"><p class="eyebrow">${t('door_code')}</p><p class="code">${esc(p.doorCode)}</p></div>`
      : `<div class="door-code locked">${icon('key')}<p>${t('door_locked')}</p>${b.status === 'upcoming' ? `<a class="btn primary" href="#/checkin">${t('cta_checkin')}</a>` : ''}</div>`;
    return page(t('t_selfcheckin'), `${doorHtml}<ol class="steps">${steps}</ol>
      ${p.mapUrl ? `<a class="btn ghost block" target="_blank" rel="noopener" href="${esc(p.mapUrl)}">${icon('pin')} ${t('open_map')}</a>` : ''}`, { sub: p.address });
  }

  function wifi() {
    const p = property();
    const row = (label, val) => `<div class="kv"><span class="muted">${label}</span><b>${esc(val)}</b><button class="icon-btn" data-copy="${esc(val)}" aria-label="Copy">${icon('copy')}</button></div>`;
    return page(t('t_wifi'), `<div class="card wifi-card">${icon('wifi', 'big')}${row(t('network'), p.wifi.ssid)}${row(t('password'), p.wifi.password)}</div>`);
  }

  function rules() {
    const p = property();
    return page(t('t_rules'), `<ul class="card rule-list">${(p.rules || []).map(r => `<li>${esc(tr(r))}</li>`).join('')}</ul>`);
  }

  function appliances() {
    const p = property();
    return page(t('t_appliances'), (p.appliances || []).map((a, i) => `
      <details class="card acc" ${i === 0 ? 'open' : ''}><summary>${icon('tool')}<span>${esc(tr(a.name))}</span>${icon('down', 'chev')}</summary>
        <div class="acc-body">${a.image ? `<img src="${esc(a.image)}" alt="" class="step-img">` : ''}<ol class="plain">${tr(a.steps).split('\n').filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
      </details>`).join(''));
  }

  function trash() {
    return page(t('t_trash'), `<div class="card prose">${paras(tr(property().trash))}</div>`);
  }

  function guide() {
    const p = property();
    const cats = [...new Set((p.localGuide || []).map(g => tr(g.category)))];
    return page(t('t_guide'), `
      <div class="chips" id="catChips"><button class="chip on" data-cat="">${t('all')}</button>${cats.map(c => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="cards" id="guideList">${(p.localGuide || []).map(g => `
        <article class="place" data-cat="${esc(tr(g.category))}">
          ${g.image ? `<img src="${esc(g.image)}" alt="">` : ''}
          <div><p class="eyebrow">${esc(tr(g.category))}</p><h3>${esc(g.name)}</h3><p class="muted">${esc(tr(g.desc))}</p>
          ${g.mapUrl ? `<a class="link" target="_blank" rel="noopener" href="${esc(g.mapUrl)}">${icon('pin')} ${t('open_map')}</a>` : ''}</div>
        </article>`).join('')}</div>`);
  }

  function sos() {
    const p = property();
    return page(t('t_sos'), `
      <a class="btn danger block big-call" href="tel:${esc(S().hostPhone.replace(/\s/g, ''))}">${icon('phone')} ${t('call_host')} · ${esc(S().hostName)}</a>
      <div class="card list">${(p.emergency || []).map(e => `
        <div class="li"><div><b>${esc(tr(e.label))}</b>${e.phone ? `<p class="muted small">${esc(e.phone)}</p>` : ''}</div>
          <div class="li-act">${e.phone ? `<a class="icon-btn" href="tel:${esc(e.phone.replace(/\s/g, ''))}" aria-label="Call">${icon('phone')}</a>` : ''}${e.mapUrl ? `<a class="icon-btn" target="_blank" rel="noopener" href="${esc(e.mapUrl)}" aria-label="Map">${icon('pin')}</a>` : ''}</div></div>`).join('')}</div>
      <p class="muted small center">${t('sos_note')}</p>`);
  }

  // ---------- services ----------
  function services() {
    const p = property();
    return page(t('t_services'), `<div class="cards">${(p.services || []).map((s, i) => `
      <article class="service">
        ${s.image ? `<img src="${esc(s.image)}" alt="">` : `<div class="service-ic">${icon('coffee')}</div>`}
        <div class="service-body"><h3>${esc(tr(s.name))}</h3><p class="muted">${esc(tr(s.desc))}</p>
          <div class="service-foot"><span class="price">${money(s.price)} <small>${esc(tr(s.unit))}</small></span><button class="btn primary sm" data-svc="${i}">${t('request')}</button></div></div>
      </article>`).join('')}</div>`, { sub: t('svc_sub') });
  }

  function serviceModal(i) {
    const s = property().services[i], b = booking();
    openModal(`<h2>${esc(tr(s.name))}</h2><p class="muted">${money(s.price)} ${esc(tr(s.unit))}</p>
      <form class="stack" id="svcForm">
        <div class="row2"><label>${t('f_date')}<input class="input" type="date" name="date" value="${ymd() < b.checkIn ? b.checkIn : ymd()}" required></label>
        <label>${t('f_time')}<input class="input" type="time" name="time" value="09:00"></label></div>
        <label>${t('f_qty')}<input class="input" type="number" name="qty" min="1" value="1" required></label>
        <label>${t('f_notes')}<textarea class="input" name="notes" rows="2"></textarea></label>
        <p class="total">${t('est_total')}: <b id="svcTotal">${money(s.price)}</b></p>
        <button class="btn primary block">${icon('send')} ${t('send_request')}</button>
      </form>`, (root, close) => {
      const f = root.querySelector('#svcForm');
      f.qty.oninput = () => { root.querySelector('#svcTotal').textContent = money(s.price * (+f.qty.value || 1)); };
      f.onsubmit = e => {
        e.preventDefault();
        Store.addRequest(b.id, {
          type: 'service', title: `${tr(s.name)} ×${f.qty.value}`,
          details: `${fmtDate(f.date.value, 'en')} ${fmtTime12(f.time.value)}${f.notes.value ? ' — ' + f.notes.value : ''}`,
          meta: { service: s.name.en, qty: +f.qty.value, total: s.price * (+f.qty.value || 1), date: f.date.value, time: f.time.value },
        });
        close(); toast(t('sent_ok'), 'ok'); go('myrequests');
      };
    });
  }

  // ---------- request / issue ----------
  let helpTab = 'request';
  function help() {
    const p = property();
    const chips = (helpTab === 'request' ? p.requestItems : p.issueTypes) || [];
    return page(t('t_help'), `
      <div class="seg"><button data-tab="request" class="${helpTab === 'request' ? 'on' : ''}">${t('tab_request')}</button><button data-tab="issue" class="${helpTab === 'issue' ? 'on' : ''}">${t('tab_issue')}</button></div>
      <form id="helpForm" class="card stack">
        <p class="label">${helpTab === 'request' ? t('what_need') : t('what_wrong')}</p>
        <div class="chips wrap">${chips.map(c => `<button type="button" class="chip" data-chip="${esc(tr(c))}" data-en="${esc(c.en)}">${esc(tr(c))}</button>`).join('')}</div>
        <label>${t('f_details')}<textarea class="input" name="details" rows="3" placeholder="${helpTab === 'request' ? t('details_req_ph') : t('details_issue_ph')}"></textarea></label>
        <label>${t('f_photo')} <span class="muted">(${t('optional')})</span><div class="upload">${icon('camera')}<span class="fname">${t('add_photo')}</span><input type="file" name="photo" accept="image/*"></div></label>
        ${helpTab === 'issue' ? `<label class="check"><input type="checkbox" name="urgent"> <span>${t('urgent')}</span></label>` : ''}
        <button class="btn primary block">${icon('send')} ${t('send_request')}</button>
      </form>`, { sub: t('help_sub') });
  }

  // ---------- stay changes ----------
  function stay() {
    const b = booking(), p = property();
    return page(t('t_stay'), `
      <p class="card note">${esc(tr(p.stayPolicy))}</p>
      <form class="card stack" data-stay="early_checkin"><h3>${icon('login')} ${t('early_ci')}</h3><p class="muted small">${t('standard')}: ${fmtTime12(p.checkInTime)}</p>
        <label>${t('desired_time')}<input class="input" type="time" name="time" value="11:00" required></label><button class="btn ghost block">${t('send_request')}</button></form>
      <form class="card stack" data-stay="late_checkout"><h3>${icon('logout')} ${t('late_co')}</h3><p class="muted small">${t('standard')}: ${fmtTime12(p.checkOutTime)}</p>
        <label>${t('desired_time')}<input class="input" type="time" name="time" value="14:00" required></label><button class="btn ghost block">${t('send_request')}</button></form>
      <form class="card stack" data-stay="extend_stay"><h3>${icon('calendar')} ${t('extend')}</h3><p class="muted small">${t('current_co')}: ${fmtDate(b.checkOut, lang)}</p>
        <label>${t('new_co')}<input class="input" type="date" name="date" min="${addDays(b.checkOut, 1)}" value="${addDays(b.checkOut, 1)}" required></label><button class="btn ghost block">${t('send_request')}</button></form>`);
  }

  function housekeeping() {
    const b = booking(), p = property();
    const start = ymd() > b.checkIn ? ymd() : b.checkIn;
    return page(t('t_housekeeping'), `
      <form id="hkForm" class="card stack">
        <label>${t('hk_type')}<select class="input" name="type">${(p.housekeepingOptions || []).map(o => `<option value="${esc(o.en)}">${esc(tr(o))}</option>`).join('')}</select></label>
        <label>${t('f_date')}<input class="input" type="date" name="date" min="${start}" max="${b.checkOut}" value="${start}" required></label>
        <p class="label">${t('hk_slot')}</p>
        <div class="chips wrap">${(p.housekeepingSlots || []).map((s, i) => `<label class="chip radio"><input type="radio" name="slot" value="${esc(s)}" ${i === 0 ? 'checked' : ''}>${esc(s)}</label>`).join('')}</div>
        <label>${t('f_notes')}<textarea class="input" name="notes" rows="2"></textarea></label>
        <button class="btn primary block">${icon('calendar')} ${t('hk_btn')}</button>
      </form>`, { sub: t('hk_sub') });
  }

  function luggage() {
    const b = booking();
    return page(t('t_luggage'), `
      <form id="lgForm" class="card stack">
        <div class="row2"><label>${t('dropoff')}<input class="input" type="date" name="d1" value="${b.checkOut}" required></label><label>${t('f_time')}<input class="input" type="time" name="t1" value="11:00" required></label></div>
        <div class="row2"><label>${t('pickup')}<input class="input" type="date" name="d2" value="${b.checkOut}" required></label><label>${t('f_time')}<input class="input" type="time" name="t2" value="16:00" required></label></div>
        <label>${t('bags')}<input class="input" type="number" name="bags" min="1" value="2" required></label>
        <label>${t('f_notes')}<textarea class="input" name="notes" rows="2"></textarea></label>
        <button class="btn primary block">${icon('briefcase')} ${t('send_request')}</button>
      </form>`, { sub: t('lg_sub') });
  }

  function lostfound() {
    return page(t('t_lostfound'), `
      <form id="lfForm" class="card stack">
        <label>${t('lf_item')}<input class="input" name="item" required placeholder="${t('lf_item_ph')}"></label>
        <label>${t('lf_where')}<textarea class="input" name="where" rows="2" placeholder="${t('lf_where_ph')}"></textarea></label>
        <label>${t('lf_return')}<select class="input" name="ret"><option>${t('lf_r1')}</option><option>${t('lf_r2')}</option><option>${t('lf_r3')}</option></select></label>
        <label>${t('f_photo')} <span class="muted">(${t('optional')})</span><div class="upload">${icon('camera')}<span class="fname">${t('add_photo')}</span><input type="file" name="photo" accept="image/*"></div></label>
        <button class="btn primary block">${icon('send')} ${t('send_request')}</button>
      </form>`, { sub: t('lf_sub') });
  }

  // ---------- my requests ----------
  function myrequests() {
    const b = booking();
    const list = Store.get().requests.filter(r => r.bookingId === b.id);
    if (!list.length) return page(t('t_myrequests'), `<div class="card center empty">${icon('inbox', 'big')}<p class="muted">${t('no_requests')}</p><a href="#/help" class="btn primary">${t('t_help')}</a></div>`);
    return page(t('t_myrequests'), list.map(r => `
      <article class="card req">
        <div class="req-head"><div><p class="eyebrow">${t('type_' + r.type)}</p><h3>${esc(r.title)}</h3></div><span class="status s-${r.status}">${t('s_' + r.status)}</span></div>
        ${r.details ? `<p class="muted">${esc(r.details)}</p>` : ''}
        ${r.photo ? `<img class="thumb" src="${r.photo}" alt="">` : ''}
        <p class="small muted">${timeAgo(r.createdAt, lang)}</p>
        ${r.replies.length ? `<div class="thread">${r.replies.map(m => `<div class="msg ${m.from === 'guest' ? 'me' : 'them'}"><span>${esc(m.text)}</span><small>${m.from === 'host' ? esc(S().hostName) : t('you')} · ${timeAgo(m.at, lang)}</small></div>`).join('')}</div>` : ''}
        <form class="reply" data-reply="${r.id}"><input class="input" name="msg" placeholder="${t('write_msg')}" required><button class="icon-btn solid" aria-label="Send">${icon('send')}</button></form>
      </article>`).join(''));
  }

  // ---------- guestbook ----------
  function guestbook() {
    const p = property(), b = booking();
    const entries = Store.get().guestbook.filter(g => g.propertyId === p.id && g.status === 'approved');
    return page(t('t_guestbook'), `
      <form id="gbForm" class="card stack"><label>${t('gb_name')}<input class="input" name="name" value="${esc(b.guestName.split(' ')[0])}" required></label>
        <label>${t('gb_msg')}<textarea class="input" name="text" rows="3" required placeholder="${t('gb_ph')}"></textarea></label>
        <button class="btn primary block">${icon('pen')} ${t('gb_btn')}</button></form>
      ${entries.map(g => `<blockquote class="card gb"><p>“${esc(g.text)}”</p><cite>— ${esc(g.name)} · ${new Date(g.createdAt).toLocaleDateString(lang === 'fil' ? 'fil-PH' : 'en-US', { month: 'short', year: 'numeric' })}</cite></blockquote>`).join('')}`, { sub: t('gb_sub') });
  }

  // ---------- checkout ----------
  function checkout() {
    const b = booking(), p = property();
    if (b.status === 'checked_out') {
      return page(t('t_checkout'), `<div class="card center">${icon('check', 'big ok')}<h2>${t('co_done')}</h2><p class="muted">${t('co_done_sub')}</p>
        ${p.reviewUrl ? `<a class="btn primary" target="_blank" rel="noopener" href="${esc(p.reviewUrl)}">${icon('star')} ${t('leave_review')}</a>` : ''}
        <a class="btn ghost" href="#/guestbook">${icon('pen')} ${t('t_guestbook')}</a></div>`);
    }
    if (b.status !== 'checked_in') return page(t('t_checkout'), `<div class="card center"><p class="muted">${t('co_not_yet')}</p><a class="btn primary" href="#/checkin">${t('cta_checkin')}</a></div>`);
    return page(t('t_checkout'), `
      <form id="coForm" class="stack">
        <div class="card stack"><h3>${t('co_list')}</h3>${(p.checkoutChecklist || []).map(c => `<label class="check"><input type="checkbox" class="co-item"> <span>${esc(tr(c))}</span></label>`).join('')}</div>
        <div class="card stack"><h3>${t('co_rate')}</h3><div class="stars" id="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" aria-label="${n}">${icon('star')}</button>`).join('')}</div>
          <label>${t('co_comment')}<textarea class="input" name="comment" rows="3" placeholder="${t('co_comment_ph')}"></textarea></label></div>
        <button class="btn primary block" id="coBtn">${icon('logout')} ${t('co_submit')}</button>
      </form>`, { sub: `${t('out')} ${fmtTime12(p.checkOutTime)} · ${fmtDate(b.checkOut, lang)}` });
  }

  // ---------- event binders per route ----------
  function bindUploads(root = document) {
    root.querySelectorAll('.upload input[type=file]').forEach(inp => {
      inp.onchange = () => { const s = inp.parentElement.querySelector('span'); if (inp.files[0]) s.textContent = inp.files[0].name; };
    });
  }
  function bindFormSubmit(id, handler) {
    const f = document.getElementById(id);
    if (f) f.onsubmit = async e => { e.preventDefault(); const btn = f.querySelector('button:not([type=button])'); btn && (btn.disabled = true); try { await handler(f); } finally { btn && (btn.disabled = false); } };
  }

  const binders = {
    home() { },
    checkin() {
      bindUploads();
      bindFormSubmit('ciForm', async f => {
        const id = await compressImage(f.idPhoto.files[0], 1000, 0.7);
        const b = booking();
        const ok = Store.update(d => {
          const bk = d.bookings.find(x => x.id === b.id);
          bk.status = 'checked_in';
          bk.checkInData = { fullName: f.fullName.value, phone: f.phone.value, email: f.email.value, guests: +f.guests.value, arrival: f.arrival.value, notes: f.notes.value, idPhoto: id, at: Date.now() };
          Store.notify(`✅ ${f.fullName.value} checked in · ${Store.property(bk.propertyId).name.en} (${f.guests.value} guests, arriving ${fmtTime12(f.arrival.value)})`, { bookingId: b.id, kind: 'checkin' });
        });
        if (ok) { toast(t('ci_ok'), 'ok'); go('selfcheckin'); }
      });
    },
    wifi() {
      document.querySelectorAll('[data-copy]').forEach(btn => btn.onclick = () => copyText(btn.dataset.copy).then(() => toast(t('copied'), 'ok')));
    },
    guide() {
      document.querySelectorAll('#catChips .chip').forEach(c => c.onclick = () => {
        document.querySelectorAll('#catChips .chip').forEach(x => x.classList.toggle('on', x === c));
        document.querySelectorAll('#guideList .place').forEach(pl => { pl.hidden = c.dataset.cat && pl.dataset.cat !== c.dataset.cat; });
      });
    },
    services() { document.querySelectorAll('[data-svc]').forEach(btn => btn.onclick = () => serviceModal(+btn.dataset.svc)); },
    help() {
      bindUploads();
      document.querySelectorAll('.seg [data-tab]').forEach(btn => btn.onclick = () => { helpTab = btn.dataset.tab; render(); });
      document.querySelectorAll('#helpForm [data-chip]').forEach(c => c.onclick = () => c.classList.toggle('on'));
      bindFormSubmit('helpForm', async f => {
        const picked = [...f.querySelectorAll('.chip.on')].map(c => c.dataset.en);
        if (!picked.length && !f.details.value.trim()) return toast(t('pick_one'), 'err');
        const photo = await compressImage(f.photo.files[0]);
        const urgent = f.urgent && f.urgent.checked;
        Store.addRequest(booking().id, { type: helpTab, title: (urgent ? '⚠️ URGENT · ' : '') + (picked.join(', ') || (helpTab === 'issue' ? 'Issue' : 'Request')), details: f.details.value, photo, meta: { urgent } });
        toast(t('sent_ok'), 'ok'); go('myrequests');
      });
    },
    stay() {
      document.querySelectorAll('form[data-stay]').forEach(f => f.onsubmit = e => {
        e.preventDefault();
        const type = f.dataset.stay;
        const title = type === 'extend_stay' ? `Extend until ${fmtDate(f.date.value, 'en')}` : `${REQUEST_TYPES[type]} at ${fmtTime12(f.time.value)}`;
        Store.addRequest(booking().id, { type, title, meta: { time: f.time && f.time.value, date: f.date && f.date.value } });
        toast(t('sent_ok'), 'ok'); go('myrequests');
      });
    },
    housekeeping() {
      bindFormSubmit('hkForm', f => {
        Store.addRequest(booking().id, { type: 'housekeeping', title: `${f.type.value} · ${fmtDate(f.date.value, 'en')}, ${f.slot.value}`, details: f.notes.value });
        toast(t('sent_ok'), 'ok'); go('myrequests');
      });
    },
    luggage() {
      bindFormSubmit('lgForm', f => {
        Store.addRequest(booking().id, { type: 'luggage', title: `${f.bags.value} bag(s)`, details: `Drop-off ${fmtDate(f.d1.value, 'en')} ${fmtTime12(f.t1.value)} → pick-up ${fmtDate(f.d2.value, 'en')} ${fmtTime12(f.t2.value)}${f.notes.value ? ' — ' + f.notes.value : ''}` });
        toast(t('sent_ok'), 'ok'); go('myrequests');
      });
    },
    lostfound() {
      bindUploads();
      bindFormSubmit('lfForm', async f => {
        const photo = await compressImage(f.photo.files[0]);
        Store.addRequest(booking().id, { type: 'lost_found', title: f.item.value, details: `${f.where.value}\nReturn: ${f.ret.value}`, photo });
        toast(t('sent_ok'), 'ok'); go('myrequests');
      });
    },
    myrequests() {
      document.querySelectorAll('form[data-reply]').forEach(f => f.onsubmit = e => {
        e.preventDefault(); Store.addReply(f.dataset.reply, 'guest', f.msg.value.trim()); render();
      });
    },
    guestbook() {
      bindFormSubmit('gbForm', f => {
        const p = property(), b = booking();
        Store.update(d => {
          d.guestbook.unshift({ id: uid('g'), propertyId: p.id, bookingId: b.id, name: f.name.value, text: f.text.value, status: 'pending', createdAt: Date.now() });
          Store.notify(`📝 New guestbook note from ${f.name.value} (awaiting approval)`, { bookingId: b.id, kind: 'guestbook' });
        });
        toast(t('gb_ok'), 'ok'); render();
      });
    },
    checkout() {
      let rating = 0;
      const stars = document.querySelectorAll('#stars [data-star]');
      stars.forEach(s => s.onclick = () => { rating = +s.dataset.star; stars.forEach(x => x.classList.toggle('on', +x.dataset.star <= rating)); });
      bindFormSubmit('coForm', f => {
        const done = [...f.querySelectorAll('.co-item')].every(c => c.checked);
        if (!done && !confirm(t('co_unchecked'))) return;
        const b = booking();
        Store.update(d => {
          const bk = d.bookings.find(x => x.id === b.id);
          bk.status = 'checked_out';
          bk.feedback = { rating, comment: f.comment.value, checklistDone: done, at: Date.now() };
          Store.notify(`👋 ${bk.guestName} checked out · ${Store.property(bk.propertyId).name.en}${rating ? ` · ${'★'.repeat(rating)}` : ''}`, { bookingId: b.id, kind: 'checkout' });
        });
        toast(t('co_ok'), 'ok'); render();
      });
    },
  };

  // ---------- live updates from admin ----------
  function snapshotRequests() {
    const b = booking(); if (!b) return;
    reqSnapshot = {};
    Store.get().requests.filter(r => r.bookingId === b.id).forEach(r => { reqSnapshot[r.id] = r.status + '|' + r.replies.length; });
  }
  function diffAndToast() {
    const b = booking(); if (!b) return;
    Store.get().requests.filter(r => r.bookingId === b.id).forEach(r => {
      const prev = reqSnapshot[r.id]; if (!prev) return;
      const [ps, pn] = prev.split('|');
      if (r.replies.length > +pn && r.replies[r.replies.length - 1].from === 'host') toast(`${S().hostName}: ${r.replies[r.replies.length - 1].text}`, 'info');
      else if (r.status !== ps) toast(`${r.title} — ${t('s_' + r.status)}`, 'info');
    });
  }
  Store.subscribe(source => {
    if (source !== 'remote') return;
    diffAndToast();
    const a = document.activeElement;
    const typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.value;
    if (!typing && !document.querySelector('.modal-back')) render(); else snapshotRequests();
  });

  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  render();
})();
