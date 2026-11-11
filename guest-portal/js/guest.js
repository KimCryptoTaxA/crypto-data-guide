/* Guest-facing web app (phone-first). Hash routes: #home, #tutorials, #p-pool, ...
 * Guides are public. Private details (Wi-Fi, door code, parking, host contact)
 * unlock after the guest confirms their reservation, starting N hours before check-in.
 */
(function () {
  const app = document.getElementById('app');
  const CODE_KEY = 'guestportal_code';
  const PROP_KEY = 'guestportal_prop';
  const LANGS = [['en', '🇺🇸', 'English'], ['fil', '🇵🇭', 'Filipino']];
  let lang = safeGet('guestportal_lang') || 'en';
  let code = safeGet(CODE_KEY) || '';
  let propId = '';
  let reqSnapshot = {};
  let helpTab = 'request';
  let extrasCat = '';

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { } }

  const t = k => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  const tf = (k, vars) => Object.entries(vars).reduce((s, [a, b]) => s.split('{' + a + '}').join(b), t(k));
  const tr = v => (v == null ? '' : typeof v === 'string' ? v : (v[lang] || v.en || ''));
  const S = () => Store.get().settings;
  const money = n => `${S().currency}${Number(n || 0).toLocaleString()}`;
  const route = () => (location.hash.replace(/^#\/?/, '') || 'home');
  const go = r => { location.hash = '#' + r; };
  const time12 = v => (v === '12:00' ? t('noon') : fmtTime12(v));
  const whenText = d => d.toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  // ---------- who / where ----------
  const params = new URLSearchParams(location.search);
  const urlCode = params.get('code');
  if (urlCode && Store.bookingByCode(urlCode)) { code = Store.bookingByCode(urlCode).code; safeSet(CODE_KEY, code); }

  function booking() { return code ? Store.bookingByCode(code) : null; }
  function property() {
    const d = Store.get();
    const b = booking();
    const want = (b && b.propertyId) || propId || params.get('p') || safeGet(PROP_KEY);
    return d.properties.find(p => p.id === want) || d.properties[0];
  }
  function unlockAt(b, p) {
    const [h, m] = (p.checkInTime || '14:00').split(':').map(Number);
    const d = parseYmd(b.checkIn); d.setHours(h, m || 0, 0, 0);
    return new Date(d.getTime() - (Number(p.unlockHours) || 0) * 3600e3);
  }
  function access() {
    const b = booking(), p = property();
    if (!b || b.propertyId !== p.id) return { verified: false, unlocked: false, checkedIn: false, b: null, p };
    const inWindow = Date.now() >= unlockAt(b, p).getTime() && ymd() <= b.checkOut && b.status !== 'checked_out';
    return { verified: true, unlocked: inWindow, checkedIn: b.status === 'checked_in', b, p };
  }
  const page = id => (property().pages || []).find(x => x.id === id);

  function isLocked(target) {
    const a = access();
    if (['wifi', 'host'].includes(target)) return !a.unlocked;
    if (target === 'checkout') return !a.checkedIn;
    if (target.startsWith('p-')) {
      const pg = page(target.slice(2));
      if (!pg) return false;
      if (pg.private) return !a.unlocked;
      if (pg.showDoorCode) return !(a.unlocked && a.checkedIn);
    }
    return false;
  }

  // ---------- building blocks ----------
  function langSelect(cls = '') {
    return `<label class="lang-sel ${cls}"><span class="sr">Language</span><select id="langSel">${LANGS.map(([k, f, n]) => `<option value="${k}" ${k === lang ? 'selected' : ''}>${f} ${n}</option>`).join('')}</select>${icon('down', 'sel-chev')}</label>`;
  }

  function topBar() {
    return `<div class="g-topbar"><button class="pill-btn" id="backBtn">${icon('back')} ${t('back')}</button>${langSelect()}<a class="pill-btn soft" href="#home">${icon('home')} ${t('nav_home')}</a></div>`;
  }

  function pageHead(ic, eyebrow, title, sub) {
    return `<header class="p-head"><div class="p-eyebrow"><span class="sq-ic beige">${icon(ic)}</span><span class="eyebrow">${esc(eyebrow)}</span></div><h1>${esc(title)}</h1>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}</header>`;
  }

  function coverHTML(img, ic, eyebrow, title, sub) {
    return `<section class="cover ${img ? '' : 'no-img'}" ${img ? `style="background-image:url('${esc(img)}')"` : ''}>
      ${img ? '' : `<span class="cover-art">${icon(ic)}</span>`}
      <div class="cover-in"><div class="p-eyebrow"><span class="sq-ic glass">${icon(ic)}</span><span class="eyebrow light">${esc(eyebrow)}</span></div>
      <h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></section>`;
  }

  function tileHTML(tl) {
    const locked = isLocked(tl.target);
    return `<a class="tile" href="#${esc(tl.target)}"><span class="sq-ic ${esc(tl.color || 'beige')}">${icon(tl.icon || 'grid')}${locked ? `<i class="lock-badge">${icon('lock')}</i>` : ''}</span>
      <span class="tile-txt"><b>${esc(tr(tl.title))}</b><small>${esc(tr(tl.sub))}</small></span>${icon('chevron', 'chev-r')}</a>`;
  }

  function rowTile(tl, i) {
    return `<a class="row-tile ${i === 0 ? 'dark' : ''}" href="#${esc(tl.target)}"><span class="row-ic">${icon(tl.icon || 'grid')}</span><span class="tile-txt"><b>${esc(tr(tl.title))}</b><small>${esc(tr(tl.sub))}</small></span>${icon('chevron', 'chev-r')}</a>`;
  }

  /* Explains why something is hidden and what unlocks it. */
  function lockCard(need = 'window') {
    const a = access(), p = property();
    let title = t('lock_title'), text, cta = `<a class="btn primary block" href="#checkin">${t('cta_checkin')}</a>`;
    if (!a.verified) text = tf('lock_text', { h: p.unlockHours });
    else if (!a.unlocked && a.b.status !== 'checked_out') text = tf('lock_wait', { when: whenText(unlockAt(a.b, p)) });
    else if (need === 'checkin' && !a.checkedIn) { title = t('lock_ci_title'); text = t('lock_ci_text'); cta = `<a class="btn primary block" href="#checkin">${t('cta_online_ci')}</a>`; }
    else { title = t('lock_ended_title'); text = t('lock_ended_text'); cta = ''; }
    return `<div class="lock-card"><div class="lock-top"><span class="lock-ic">${icon('lock')}</span><div><h2>${esc(title)}</h2><p>${esc(text)}</p></div></div>
      <div class="lock-actions stack">${cta}<a class="btn beige block" href="#extras">${icon('sparkle')} ${t('t_extras')}</a><a class="btn outline block" href="#home">${t('browse_guide')}</a></div></div>`;
  }

  function stayLine(b) {
    const today = ymd(), nights = Math.max(1, daysBetween(b.checkIn, b.checkOut));
    if (b.status === 'checked_in') return tf('st_night', { n: Math.min(nights, Math.max(1, daysBetween(b.checkIn, today) + 1)), t: nights });
    if (b.status === 'checked_out') return t('st_out');
    const until = daysBetween(today, b.checkIn);
    return until > 0 ? tf('st_until', { n: until }) : t('st_today');
  }

  function bottomNav() {
    const r = route();
    const a = access();
    const open = a.b ? Store.get().requests.filter(x => x.bookingId === a.b.id && !['done', 'declined'].includes(x.status)).length : 0;
    const on = keys => (keys.includes(r) ? 'on' : '');
    const tutorialRoutes = ['tutorials', ...(property().pages || []).filter(x => x.inTutorials).map(x => 'p-' + x.id)];
    const item = (to, ic, label, keys, extra = '') => `<a href="#${to}" class="${on(keys)}">${icon(ic)}<span>${label}</span>${extra}</a>`;
    return `<nav class="g-nav">
      ${item('home', 'home', t('nav_home'), ['home'])}
      ${item('tutorials', 'tv', t('nav_tutorials'), tutorialRoutes)}
      ${item('requests', 'message', t('nav_requests'), ['requests', 'help', 'housekeeping', 'stay', 'luggage', 'lostfound', 'myrequests'], open ? `<i class="dot">${open}</i>` : '')}
      ${item('emergency', 'siren', t('nav_emergency'), ['emergency'])}
      ${item('checkout', 'check', t('nav_checkout'), ['checkout'])}
    </nav>`;
  }

  // ---------- views ----------
  const V = {};

  V.home = () => {
    const p = property(), a = access(), b = a.b;
    let cta;
    if (!a.verified) cta = `<a class="btn primary block lg" href="#checkin">${t('cta_checkin')}</a>`;
    else if (b.status === 'upcoming' && !a.unlocked) cta = `<a class="btn primary block lg muted-btn" href="#checkin">${tf('cta_opens', { when: fmtDate(ymd(unlockAt(b, p)), lang) })}</a>`;
    else if (b.status === 'upcoming') cta = `<a class="btn primary block lg" href="#checkin">${t('cta_online_ci')}</a>`;
    else if (b.status === 'checked_in') cta = `<a class="btn outline block lg" href="#checkout">${t('cta_checkout')}</a>`;
    else cta = `<a class="btn outline block lg" href="#checkout">${t('leave_review')}</a>`;
    const hostOpen = a.unlocked;
    return `
      <section class="g-hero ${p.heroImage ? '' : 'no-img'}" ${p.heroImage ? `style="background-image:url('${esc(p.heroImage)}')"` : ''}>
        <div class="hero-top">${b ? `<button class="hello" id="switchStay" title="${t('switch_stay')}">${icon('users')} ${esc(b.guestName.split(' ')[0])}</button>` : '<span></span>'}${langSelect('on-dark')}</div>
        <div class="hero-in">
          <p class="script">${esc(tr(p.welcomeLine))}</p>
          <h1>${esc(tr(p.name))}</h1>
          <p class="tagline">${esc(tr(p.tagline))}</p>
          <p class="loc">${esc(p.location || '')}</p>
        </div>
      </section>
      <div class="times-card">
        <div class="time-row">
          <div class="time-box"><div><small>${t('in')}</small><b>${time12(p.checkInTime)}</b></div><span class="sq-ic green">${icon('check')}</span></div>
          <div class="time-box"><div><small>${t('out')}</small><b>${time12(p.checkOutTime)}</b></div><span class="sq-ic orange">${icon('plane')}</span></div>
        </div>
        ${b ? `<p class="stay-line">${icon('calendar')} ${fmtDate(b.checkIn, lang)} — ${fmtDate(b.checkOut, lang)} · <b>${esc(stayLine(b))}</b></p>` : ''}
        ${cta}
      </div>

      <section class="start-card">
        <p class="script">${t('start_here')}</p>
        <h2>${t('everything')}</h2>
        <p class="muted">${t('msg_anytime')}</p>
        ${(p.homeSections || []).map(sec => `<p class="sec-label">${esc(tr(sec.title))}</p><div class="tile-grid">${(sec.tiles || []).map(tileHTML).join('')}</div>`).join('')}
      </section>

      ${(p.features || []).map(f => {
        const pg = f.target.startsWith('p-') ? page(f.target.slice(2)) : null;
        const img = f.image || (pg && pg.cover) || (f.target === 'extras' ? p.extrasCover : '');
        const ic = pg ? pg.icon : f.target === 'extras' ? 'sparkle' : 'image';
        return `<a class="feature" href="#${esc(f.target)}"><div class="feature-img ${img ? '' : 'no-img'}" ${img ? `style="background-image:url('${esc(img)}')"` : ''}>${img ? '' : icon(ic)}</div>
          <div class="feature-body"><span class="eyebrow">${esc(tr(f.eyebrow))}</span><h3>${esc(tr(f.title))}</h3><p class="muted clamp2">${esc(tr(f.text))}</p><span class="btn primary sm">${esc(tr(f.button))} ${icon('chevron')}</span></div></a>`;
      }).join('')}

      <div class="need-card"><div><b>${t('need_anything')}</b><p>${hostOpen ? esc(tr(p.hostNote)) : tf('host_unlocks', { h: p.unlockHours })}</p></div>
        ${hostOpen ? `<a class="btn white" href="#host">${t('contact')}</a>` : `<a class="btn white" href="#checkin">${t('cta_checkin')}</a>`}</div>

      <a class="safety-card" href="#emergency"><span class="sq-ic red">${icon('siren')}</span><div><h3>${t('safety_title')}</h3><p>${t('safety_text')}</p></div>${icon('chevron', 'chev-r')}</a>

      <p class="script pad-x">${t('settle_in')}</p>
      <h2 class="pad-x big-h">${t('everything')}</h2>
      <div class="panels">${(p.panels || []).map(pn => `<section class="panel-card"><span class="eyebrow">${esc(tr(pn.eyebrow))}</span><h3>${esc(tr(pn.title))}</h3><p class="muted">${esc(tr(pn.text))}</p><div class="stack sm">${(pn.tiles || []).map(rowTile).join('')}</div></section>`).join('')}</div>
      <p class="foot">${esc(S().brandName)}</p>`;
  };

  V.tutorials = () => {
    const list = (property().pages || []).filter(x => x.inTutorials);
    return topBar() + pageHead('tv', t('how_things_work'), t('nav_tutorials'), t('tut_sub')) + `<div class="stack">${list.map(pg => `
      <a class="tut-card" href="#p-${esc(pg.id)}"><div class="tut-img ${pg.cover ? '' : 'no-img'}" ${pg.cover ? `style="background-image:url('${esc(pg.cover)}')"` : ''}>${pg.cover ? '' : icon(pg.icon || 'tool')}</div>
        <div class="tut-body"><span class="eyebrow">${esc(tr(pg.category))}</span><h3>${esc(tr(pg.title))}</h3><p class="muted">${esc(tr(pg.summary))}</p></div>${icon('chevron', 'chev-r')}</a>`).join('')}</div>`;
  };

  function guidePage(pg) {
    const a = access(), p = property();
    let body = '';
    if (pg.private && !a.unlocked) body = lockCard();
    else {
      if (pg.showDoorCode) {
        body += a.unlocked && a.checkedIn
          ? `<div class="door-code"><span class="eyebrow light">${t('door_code')}</span><p class="code">${esc(p.doorCode)}</p><small>${t('door_backup')}</small></div>`
          : lockCard('checkin');
      }
      if ((pg.infoCards || []).length) body += `<div class="card stack sm">${pg.infoCards.map(c => `<div class="info-card"><span class="eyebrow">${esc(tr(c.label))}</span><p>${esc(tr(c.text))}</p></div>`).join('')}</div>`;
      if ((pg.gallery || []).length) body += `<div class="gallery">${pg.gallery.map(g => `<figure><div class="g-img ${g.image ? '' : 'no-img'}" ${g.image ? `style="background-image:url('${esc(g.image)}')"` : ''}>${g.image ? '' : icon('image')}</div><figcaption>${esc(tr(g.caption))}</figcaption></figure>`).join('')}</div>`;
      if ((pg.steps || []).length) body += `<div class="card"><h2>${t('steps')}</h2><ol class="num-steps">${pg.steps.map((s, i) => `<li><span class="n">${i + 1}</span><div><h3>${esc(tr(s.title))}</h3>${paras(tr(s.text))}${s.image ? `<img src="${esc(s.image)}" alt="" class="step-img">` : ''}</div></li>`).join('')}</ol></div>`;
      if (pg.video) body += `<div class="video-wrap">${videoHTML(pg.video, t('watch_video'))}</div>`;
      (pg.lists || []).forEach(l => {
        const items = tr(l.items).split('\n').map(x => x.trim()).filter(Boolean);
        if (items.length) body += `<div class="card list-card ${l.tone === 'sage' ? 'tone-sage' : ''}"><h2>${esc(tr(l.title))}</h2><div class="stack sm">${items.map(x => `<div class="li-pill">${esc(x)}</div>`).join('')}</div></div>`;
      });
    }
    return topBar() + coverHTML(pg.cover, pg.icon || 'image', tr(pg.category), tr(pg.title), tr(pg.summary)) + body;
  }

  V.wifi = () => {
    const p = property(), a = access();
    if (!a.unlocked) return topBar() + pageHead('wifi', t('quick_access'), t('t_wifi'), '') + lockCard();
    const row = (label, val) => `<div class="kv"><span class="muted">${label}</span><b>${esc(val)}</b><button class="icon-btn" data-copy="${esc(val)}" aria-label="${t('copy')}">${icon('copy')}</button></div>`;
    return topBar() + pageHead('wifi', t('quick_access'), t('t_wifi'), tr(p.wifiNote)) + `<div class="card wifi-card">${row(t('network'), p.wifi.ssid)}${row(t('password'), p.wifi.password)}<div id="wifiQr" class="wifi-qr"></div><p class="muted small center">${t('wifi_qr')}</p></div>`;
  };

  V.host = () => {
    const p = property(), a = access();
    if (!a.unlocked) return topBar() + pageHead('phone', t('concierge'), t('host_contact'), '') + lockCard();
    const phone = S().hostPhone;
    return topBar() + pageHead('phone', t('concierge'), t('host_contact'), tr(p.hostNote)) + `
      <div class="card host-card"><span class="avatar">${esc(S().hostName.slice(0, 1))}</span><h2>${esc(S().hostName)}</h2>
        <div class="kv"><span class="muted">${t('phone')}</span><b>${esc(phone)}</b><button class="icon-btn" data-copy="${esc(phone)}" aria-label="${t('copy')}">${icon('copy')}</button></div>
        ${S().hostEmail ? `<div class="kv"><span class="muted">Email</span><b>${esc(S().hostEmail)}</b><button class="icon-btn" data-copy="${esc(S().hostEmail)}" aria-label="${t('copy')}">${icon('copy')}</button></div>` : ''}
        <div class="stack sm"><a class="btn primary block" href="tel:${esc(phone.replace(/\s/g, ''))}">${icon('phone')} ${t('call')}</a><a class="btn outline block" href="#help">${icon('message')} ${t('send_message')}</a></div></div>`;
  };

  const phoneChip = n => `<a class="chip mono" href="tel:${esc(n.replace(/[^\d+]/g, ''))}">${esc(n)}</a>`;
  V.emergency = () => {
    const p = property(), a = access();
    const hostCard = a.unlocked
      ? `<div class="em-card"><span class="sq-ic navy">${icon('phone')}</span><div><h3>${esc(S().hostName)}</h3><p class="muted">${t('host_contact')}</p><div class="chips wrap">${phoneChip(S().hostPhone)}</div></div></div>`
      : `<div class="em-card"><span class="sq-ic beige">${icon('lock')}</span><div><h3>${tf('host_unlocks', { h: p.unlockHours })}</h3></div><a class="btn soft sm" href="#checkin">${t('cta_checkin')}</a></div>`;
    return topBar() + pageHead('siren', t('priority_help'), t('safety_title'), t('safety_text')) + `<div class="stack">${hostCard}
      ${(p.emergency || []).map(e => `<div class="em-card"><span class="sq-ic red">${icon(e.icon || 'siren')}</span><div><h3>${esc(tr(e.label))}</h3><p class="muted">${esc(tr(e.desc))}</p>
        <div class="chips wrap">${String(e.phones || '').split(',').map(x => x.trim()).filter(Boolean).map(phoneChip).join('')}${e.mapUrl ? `<a class="chip" target="_blank" rel="noopener" href="${esc(e.mapUrl)}">${icon('pin')} ${t('open_map')}</a>` : ''}</div></div></div>`).join('')}
      ${p.notice && tr(p.notice.text) ? `<div class="card tone-sage"><h2>${esc(tr(p.notice.title))}</h2><p class="muted">${esc(tr(p.notice.text))}</p></div>` : ''}
      ${(p.procedures || []).length ? `<h2 class="sub-h">${t('procedures')}</h2>${p.procedures.map(x => `<details class="acc"><summary><span>${esc(tr(x.title))}</span>${icon('chevron', 'chev')}</summary><div class="acc-body">${paras(tr(x.text))}</div></details>`).join('')}` : ''}
      <p class="muted small center">${t('sos_note')}</p></div>`;
  };

  V.problems = () => {
    const p = property();
    return topBar() + pageHead('help', t('troubleshooting'), t('t_problems'), t('problems_sub')) + `<div class="stack">
      ${(p.problems || []).map(x => `<details class="acc"><summary><span>${esc(tr(x.q))}</span>${icon('chevron', 'chev')}</summary><div class="acc-body">${paras(tr(x.a))}</div></details>`).join('')}
      <a class="btn primary block" href="#help">${icon('alert')} ${t('still_stuck')}</a></div>`;
  };

  V.extras = () => {
    const p = property();
    const svcs = p.services || [];
    const cats = [...new Set(svcs.map(s => tr(s.category)).filter(Boolean))];
    return topBar() + coverHTML(p.extrasCover, 'sparkle', t('stay_extras'), t('t_extras'), t('extras_sub')) + `
      <div class="card soft-card"><h2>${t('few_taps')}</h2><p class="muted">${t('few_taps_text')}</p></div>
      <div class="chips" id="catChips"><button class="chip ${extrasCat ? '' : 'on'}" data-cat="">${t('all')}</button>${cats.map(c => `<button class="chip ${extrasCat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="stack">${svcs.map((s, i) => `
        <article class="svc" ${extrasCat && tr(s.category) !== extrasCat ? 'hidden' : ''}>
          ${s.image ? `<img class="svc-img" src="${esc(s.image)}" alt="">` : ''}
          <div class="svc-row"><span class="sq-ic beige">${icon(s.icon || 'sparkle')}</span>
          <div class="svc-body"><div class="tags">${tr(s.category) ? `<span class="tag sage">${esc(tr(s.category))}</span>` : ''}${tr(s.tag) ? `<span class="tag">${esc(tr(s.tag))}</span>` : ''}</div>
            <h3>${esc(tr(s.name))}</h3><p class="muted">${esc(tr(s.desc))}</p>
            <div class="svc-foot"><div><b class="price-txt">${esc(tr(s.priceText) || (s.price ? money(s.price) : ''))}</b><small>${esc(tr(s.note))}</small></div><button class="btn primary" data-svc="${i}">${t('request')}</button></div></div></div>
        </article>`).join('')}</div>`;
  };

  V.rules = () => topBar() + pageHead('lock', t('good_to_know'), t('t_rules'), '') + `<div class="card stack sm">${(property().rules || []).map(r => `<div class="li-pill">${esc(tr(r))}</div>`).join('')}</div>`;

  V.guide = () => {
    const p = property();
    const cats = [...new Set((p.localGuide || []).map(g => tr(g.category)))];
    return topBar() + pageHead('pin', t('around_you'), t('t_guide'), '') + `
      <div class="chips" id="guideChips"><button class="chip on" data-cat="">${t('all')}</button>${cats.map(c => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="stack" id="guideList">${(p.localGuide || []).map(g => `
        <article class="place" data-cat="${esc(tr(g.category))}">${g.image ? `<img src="${esc(g.image)}" alt="">` : ''}
          <div><span class="eyebrow">${esc(tr(g.category))}</span><h3>${esc(g.name)}</h3><p class="muted">${esc(tr(g.desc))}</p>
          ${g.mapUrl ? `<a class="link" target="_blank" rel="noopener" href="${esc(g.mapUrl)}">${icon('pin')} ${t('open_map')}</a>` : ''}</div></article>`).join('')}</div>`;
  };

  // ---------- check-in / out ----------
  V.checkin = () => {
    const p = property(), a = access();
    let head = topBar() + pageHead('login', t('arrival'), t('t_checkin'), '');
    if (!a.verified) {
      return head + `<form id="verifyForm" class="card stack"><p class="muted">${tf('verify_sub', { h: p.unlockHours })}</p>
        <label>${t('f_lastname')}<input class="input" id="verifyInput" name="who" autocomplete="family-name" placeholder="${t('f_lastname_ph')}" required></label>
        <button class="btn primary block lg">${t('confirm_stay')}</button><p class="hint">${t('verify_hint')}</p></form>`;
    }
    const b = a.b;
    head += `<button class="link switch-link" id="switchStay">${t('switch_stay')}</button>`;
    if (b.status === 'checked_in') return head + `<div class="card center">${icon('check', 'big ok')}<h2>${t('ci_done')}</h2><p class="muted">${t('ci_done_sub')}</p><a class="btn primary" href="#p-door">${icon('key')} ${t('see_door')}</a></div>`;
    if (b.status === 'checked_out') return head + `<div class="card center"><h2>${t('st_out')}</h2><a class="btn primary" href="#checkout">${t('leave_review')}</a></div>`;
    if (!a.unlocked) return head + `<div class="card center">${icon('calendar', 'big')}<h2>${tf('confirmed_hi', { name: b.guestName.split(' ')[0] })}</h2><p class="muted">${tf('lock_wait', { when: whenText(unlockAt(b, p)) })}</p><a class="btn outline" href="#home">${t('browse_guide')}</a></div>`;
    return head + `
      <form id="ciForm" class="card stack"><p class="muted">${t('ci_sub')}</p>
        <label>${t('f_fullname')}<input class="input" name="fullName" value="${esc(b.guestName)}" required></label>
        <div class="row2"><label>${t('f_phone')}<input class="input" name="phone" type="tel" required></label><label>${t('f_guests')}<input class="input" name="guests" type="number" min="1" value="${b.guests}" required></label></div>
        <label>${t('f_email')}<input class="input" name="email" type="email"></label>
        <label>${t('f_arrival')}<input class="input" name="arrival" type="time" value="${p.checkInTime}"></label>
        <label>${t('f_id')} ${p.requireId ? '' : `<span class="muted">(${t('optional')})</span>`}<div class="upload">${icon('camera')}<span>${t('f_id_hint')}</span><input type="file" name="idPhoto" accept="image/*" ${p.requireId ? 'required' : ''}></div></label>
        <label>${t('f_notes')}<textarea class="input" name="notes" rows="2" placeholder="${t('f_notes_ph')}"></textarea></label>
        <label class="check"><input type="checkbox" name="agree" required> <span>${t('f_agree')} <a href="#rules">${t('t_rules')}</a></span></label>
        <button class="btn primary block lg">${t('ci_submit')}</button>
      </form>`;
  };

  V.checkout = () => {
    const p = property(), a = access(), b = a.b;
    const head = topBar() + pageHead('check', t('before_leaving'), t('nav_checkout'), t('co_sub'));
    if (!a.verified || b.status === 'upcoming') return head + lockCard('checkin');
    if (b.status === 'checked_out') return head + `<div class="card center">${icon('check', 'big ok')}<h2>${t('co_done')}</h2><p class="muted">${t('co_done_sub')}</p>
      <div class="stack sm">${p.reviewUrl ? `<a class="btn primary block" target="_blank" rel="noopener" href="${esc(p.reviewUrl)}">${icon('star')} ${t('leave_review')}</a>` : ''}<a class="btn outline block" href="#guestbook">${icon('pen')} ${t('t_guestbook')}</a><a class="btn outline block" href="#lostfound">${icon('search')} ${t('t_lostfound')}</a></div></div>`;
    return head + `<form id="coForm" class="stack">
      <div class="card stack"><h2>${t('co_list')}</h2>${(p.checkoutChecklist || []).map(c => `<label class="check"><input type="checkbox" class="co-item"> <span>${esc(tr(c))}</span></label>`).join('')}</div>
      <div class="card stack"><h2>${t('co_rate')}</h2><div class="stars" id="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" aria-label="${n}">${icon('star')}</button>`).join('')}</div>
        <label>${t('co_comment')}<textarea class="input" name="comment" rows="3" placeholder="${t('co_comment_ph')}"></textarea></label></div>
      <button class="btn primary block lg" id="coBtn">${t('co_submit')}</button></form>`;
  };

  // ---------- requests ----------
  function needBooking(ic, eyebrow, title) {
    if (access().verified) return null;
    return topBar() + pageHead(ic, eyebrow, title, '') + lockCard();
  }

  V.requests = () => {
    const blocked = needBooking('message', t('concierge'), t('nav_requests')); if (blocked) return blocked;
    const b = access().b;
    const list = Store.get().requests.filter(r => r.bookingId === b.id);
    const act = (to, ic, color, title, sub) => tileHTML({ target: to, icon: ic, color, title, sub });
    return topBar() + pageHead('message', t('concierge'), t('nav_requests'), t('req_sub')) + `
      <div class="tile-grid">${act('help', 'message', 'sage', t('t_help'), t('t_help_sub'))}${act('extras', 'sparkle', 'beige', t('t_extras'), t('t_extras_sub'))}
        ${act('housekeeping', 'concierge', 'mint', t('t_housekeeping'), t('t_housekeeping_sub'))}${act('stay', 'clock', 'yellow', t('t_stay'), t('t_stay_sub'))}
        ${act('luggage', 'briefcase', 'lavender', t('t_luggage'), t('t_luggage_sub'))}${act('lostfound', 'search', 'beige', t('t_lostfound'), t('t_lostfound_sub'))}</div>
      <h2 class="sub-h">${t('t_myrequests')}</h2>
      ${list.length ? list.map(r => `
        <article class="card req">
          <div class="req-head"><div><span class="eyebrow">${t('type_' + r.type)}</span><h3>${esc(r.title)}</h3></div><span class="status s-${r.status}">${t('s_' + r.status)}</span></div>
          ${r.details ? `<p class="muted">${esc(r.details)}</p>` : ''}${r.photo ? `<img class="thumb" src="${r.photo}" alt="">` : ''}
          <p class="small muted">${timeAgo(r.createdAt, lang)}</p>
          ${r.replies.length ? `<div class="thread">${r.replies.map(m => `<div class="msg ${m.from === 'guest' ? 'me' : 'them'}"><span>${esc(m.text)}</span><small>${m.from === 'host' ? esc(S().hostName) : t('you')} · ${timeAgo(m.at, lang)}</small></div>`).join('')}</div>` : ''}
          <form class="reply" data-reply="${r.id}"><input class="input" name="msg" placeholder="${t('write_msg')}" required><button class="icon-btn solid" aria-label="${t('send')}">${icon('send')}</button></form>
        </article>`).join('') : `<div class="card center muted">${t('no_requests')}</div>`}`;
  };
  V.myrequests = V.requests;

  V.help = () => {
    const blocked = needBooking('message', t('concierge'), t('t_help')); if (blocked) return blocked;
    const p = property();
    const chips = (helpTab === 'request' ? p.requestItems : p.issueTypes) || [];
    return topBar() + pageHead('message', t('concierge'), t('t_help'), t('help_sub')) + `
      <div class="seg"><button data-tab="request" class="${helpTab === 'request' ? 'on' : ''}">${t('tab_request')}</button><button data-tab="issue" class="${helpTab === 'issue' ? 'on' : ''}">${t('tab_issue')}</button></div>
      <form id="helpForm" class="card stack">
        <p class="label">${helpTab === 'request' ? t('what_need') : t('what_wrong')}</p>
        <div class="chips wrap">${chips.map(c => `<button type="button" class="chip" data-chip data-en="${esc(c.en)}">${esc(tr(c))}</button>`).join('')}</div>
        <label>${t('f_details')}<textarea class="input" name="details" rows="3" placeholder="${helpTab === 'request' ? t('details_req_ph') : t('details_issue_ph')}"></textarea></label>
        <label>${t('f_photo')} <span class="muted">(${t('optional')})</span><div class="upload">${icon('camera')}<span>${t('add_photo')}</span><input type="file" name="photo" accept="image/*"></div></label>
        ${helpTab === 'issue' ? `<label class="check"><input type="checkbox" name="urgent"> <span>${t('urgent')}</span></label>` : ''}
        <button class="btn primary block lg">${icon('send')} ${t('send_request')}</button>
      </form>`;
  };

  V.stay = () => {
    const blocked = needBooking('clock', t('concierge'), t('t_stay')); if (blocked) return blocked;
    const p = property(), b = access().b;
    return topBar() + pageHead('clock', t('concierge'), t('t_stay'), '') + `
      <div class="card soft-card"><p class="muted">${esc(tr(p.stayPolicy))}</p></div>
      <form class="card stack" data-stay="early_checkin"><h3>${t('early_ci')}</h3><p class="muted small">${t('standard')}: ${time12(p.checkInTime)}</p>
        <label>${t('desired_time')}<input class="input" type="time" name="time" value="11:00" required></label><button class="btn outline block">${t('send_request')}</button></form>
      <form class="card stack" data-stay="late_checkout"><h3>${t('late_co')}</h3><p class="muted small">${t('standard')}: ${time12(p.checkOutTime)}</p>
        <label>${t('desired_time')}<input class="input" type="time" name="time" value="14:00" required></label><button class="btn outline block">${t('send_request')}</button></form>
      <form class="card stack" data-stay="extend_stay"><h3>${t('extend')}</h3><p class="muted small">${t('current_co')}: ${fmtDate(b.checkOut, lang)}</p>
        <label>${t('new_co')}<input class="input" type="date" name="date" min="${addDays(b.checkOut, 1)}" value="${addDays(b.checkOut, 1)}" required></label><button class="btn outline block">${t('send_request')}</button></form>`;
  };

  V.housekeeping = () => {
    const blocked = needBooking('concierge', t('concierge'), t('t_housekeeping')); if (blocked) return blocked;
    const p = property(), b = access().b;
    const start = ymd() > b.checkIn ? ymd() : b.checkIn;
    return topBar() + pageHead('concierge', t('concierge'), t('t_housekeeping'), t('hk_sub')) + `
      <form id="hkForm" class="card stack">
        <label>${t('hk_type')}<select class="input" name="kind">${(p.housekeepingOptions || []).map(o => `<option value="${esc(o.en)}">${esc(tr(o))}</option>`).join('')}</select></label>
        <label>${t('f_date')}<input class="input" type="date" name="date" min="${start}" max="${b.checkOut}" value="${start}" required></label>
        <p class="label">${t('hk_slot')}</p>
        <div class="chips wrap">${(p.housekeepingSlots || []).map((s, i) => `<label class="chip radio"><input type="radio" name="slot" value="${esc(s)}" ${i === 0 ? 'checked' : ''}>${esc(s)}</label>`).join('')}</div>
        <label>${t('f_notes')}<textarea class="input" name="notes" rows="2"></textarea></label>
        <button class="btn primary block lg">${t('hk_btn')}</button></form>`;
  };

  V.luggage = () => {
    const blocked = needBooking('briefcase', t('concierge'), t('t_luggage')); if (blocked) return blocked;
    const b = access().b;
    return topBar() + pageHead('briefcase', t('concierge'), t('t_luggage'), t('lg_sub')) + `
      <form id="lgForm" class="card stack">
        <div class="row2"><label>${t('dropoff')}<input class="input" type="date" name="d1" value="${b.checkOut}" required></label><label>${t('f_time')}<input class="input" type="time" name="t1" value="12:00" required></label></div>
        <div class="row2"><label>${t('pickup')}<input class="input" type="date" name="d2" value="${b.checkOut}" required></label><label>${t('f_time')}<input class="input" type="time" name="t2" value="16:00" required></label></div>
        <label>${t('bags')}<input class="input" type="number" name="bags" min="1" value="2" required></label>
        <label>${t('f_notes')}<textarea class="input" name="notes" rows="2"></textarea></label>
        <button class="btn primary block lg">${t('send_request')}</button></form>`;
  };

  V.lostfound = () => {
    const blocked = needBooking('search', t('concierge'), t('t_lostfound')); if (blocked) return blocked;
    return topBar() + pageHead('search', t('concierge'), t('t_lostfound'), t('lf_sub')) + `
      <form id="lfForm" class="card stack">
        <label>${t('lf_item')}<input class="input" name="item" required placeholder="${t('lf_item_ph')}"></label>
        <label>${t('lf_where')}<textarea class="input" name="where" rows="2" placeholder="${t('lf_where_ph')}"></textarea></label>
        <label>${t('lf_return')}<select class="input" name="ret"><option>${t('lf_r1')}</option><option>${t('lf_r2')}</option><option>${t('lf_r3')}</option></select></label>
        <label>${t('f_photo')} <span class="muted">(${t('optional')})</span><div class="upload">${icon('camera')}<span>${t('add_photo')}</span><input type="file" name="photo" accept="image/*"></div></label>
        <button class="btn primary block lg">${t('send_request')}</button></form>`;
  };

  V.guestbook = () => {
    const p = property(), a = access();
    const entries = Store.get().guestbook.filter(g => g.propertyId === p.id && g.status === 'approved');
    return topBar() + pageHead('pen', t('good_to_know'), t('t_guestbook'), t('gb_sub')) + `
      ${a.verified ? `<form id="gbForm" class="card stack"><label>${t('gb_name')}<input class="input" name="name" value="${esc(a.b.guestName.split(' ')[0])}" required></label>
        <label>${t('gb_msg')}<textarea class="input" name="text" rows="3" required placeholder="${t('gb_ph')}"></textarea></label>
        <button class="btn primary block">${t('gb_btn')}</button></form>` : ''}
      ${entries.map(g => `<blockquote class="card gb"><p>“${esc(g.text)}”</p><cite>— ${esc(g.name)}</cite></blockquote>`).join('')}`;
  };

  // ---------- render ----------
  function render() {
    applyTheme(S());
    document.documentElement.lang = lang === 'fil' ? 'fil' : 'en';
    const r = route();
    let html;
    if (r.startsWith('p-')) { const pg = page(r.slice(2)); html = pg ? guidePage(pg) : V.home(); }
    else html = (V[r] || V.home)();
    app.innerHTML = `<main class="g-main ${r === 'home' ? 'is-home' : ''}">${html}</main>` + bottomNav();
    bindCommon();
    (B[r] || (() => { }))();
    snapshotRequests();
  }

  function bindCommon() {
    const ls = document.getElementById('langSel');
    if (ls) ls.onchange = () => { lang = ls.value; safeSet('guestportal_lang', lang); render(); };
    const bb = document.getElementById('backBtn');
    if (bb) bb.onclick = () => { if (history.length > 1) history.back(); else go('home'); };
    document.querySelectorAll('[data-copy]').forEach(btn => btn.onclick = () => copyText(btn.dataset.copy).then(() => toast(t('copied'), 'ok'), () => toast(btn.dataset.copy)));
    document.querySelectorAll('.upload input[type=file]').forEach(inp => {
      inp.onchange = () => { const s = inp.parentElement.querySelector('span'); if (inp.files[0]) s.textContent = inp.files[0].name; };
    });
    const sw = document.getElementById('switchStay');
    if (sw) sw.onclick = async () => { if (await askConfirm(t('switch_confirm'), { ok: t('sign_out'), cancel: t('cancel') })) { code = ''; safeSet(CODE_KEY, null); go('checkin'); render(); } };
    document.querySelectorAll('form[data-reply]').forEach(f => f.onsubmit = e => { e.preventDefault(); Store.addReply(f.dataset.reply, 'guest', f.msg.value.trim()); render(); });
  }

  function bindForm(id, handler) {
    const f = document.getElementById(id);
    if (f) f.onsubmit = async e => { e.preventDefault(); const btn = f.querySelector('button:not([type=button])'); if (btn) btn.disabled = true; try { await handler(f); } finally { if (btn) btn.disabled = false; } };
  }
  const sent = () => { toast(t('sent_ok'), 'ok'); go('requests'); };

  function serviceModal(i) {
    const p = property(), s = p.services[i], a = access();
    if (!a.verified) {
      openModal(`<h2>${esc(tr(s.name))}</h2><p class="muted">${t('svc_need_ci')}</p><a class="btn primary block" href="#checkin" data-close>${t('cta_checkin')}</a>`, (root, close) => { root.querySelector('[data-close]').onclick = close; }, 'small');
      return;
    }
    const b = a.b;
    openModal(`<span class="eyebrow">${esc(tr(s.category))}</span><h2>${esc(tr(s.name))}</h2><p class="muted">${esc(tr(s.priceText) || (s.price ? money(s.price) : ''))}${tr(s.note) ? ' · ' + esc(tr(s.note)) : ''}</p>
      <form class="stack" id="svcForm">
        <div class="row2"><label>${t('f_date')}<input class="input" type="date" name="date" value="${ymd() < b.checkIn ? b.checkIn : ymd()}" required></label>
        <label>${t('f_time')}<input class="input" type="time" name="time" value="09:00"></label></div>
        <label>${t('f_qty')}<input class="input" type="number" name="qty" min="1" value="1" required></label>
        <label>${t('f_notes')}<textarea class="input" name="notes" rows="2" placeholder="${t('svc_notes_ph')}"></textarea></label>
        ${s.price ? `<p class="total">${t('est_total')}: <b id="svcTotal">${money(s.price)}</b></p>` : `<p class="muted small">${t('svc_confirm')}</p>`}
        <button class="btn primary block lg">${t('send_request')}</button>
      </form>`, (root, close) => {
      const f = root.querySelector('#svcForm');
      f.qty.oninput = () => { const el = root.querySelector('#svcTotal'); if (el) el.textContent = money(s.price * (+f.qty.value || 1)); };
      f.onsubmit = e => {
        e.preventDefault();
        Store.addRequest(b.id, {
          type: 'service', title: `${s.name.en} ×${f.qty.value}`,
          details: `${fmtDate(f.date.value, 'en')} ${fmtTime12(f.time.value)}${f.notes.value ? ' — ' + f.notes.value : ''}`,
          meta: { service: s.name.en, qty: +f.qty.value, total: s.price ? s.price * (+f.qty.value || 1) : 0, priceText: s.priceText && s.priceText.en },
        });
        close(); sent();
      };
    });
  }

  const B = {
    wifi() {
      const box = document.getElementById('wifiQr'); const p = property();
      if (box && window.QRCode) new QRCode(box, { text: `WIFI:T:WPA;S:${p.wifi.ssid};P:${p.wifi.password};;`, width: 160, height: 160, colorDark: '#1f2a44', colorLight: '#ffffff' });
      else if (box) box.nextElementSibling.remove(), box.remove();
    },
    extras() {
      document.querySelectorAll('#catChips .chip').forEach(c => c.onclick = () => { extrasCat = c.dataset.cat; render(); });
      document.querySelectorAll('[data-svc]').forEach(btn => btn.onclick = () => serviceModal(+btn.dataset.svc));
    },
    guide() {
      document.querySelectorAll('#guideChips .chip').forEach(c => c.onclick = () => {
        document.querySelectorAll('#guideChips .chip').forEach(x => x.classList.toggle('on', x === c));
        document.querySelectorAll('#guideList .place').forEach(pl => { pl.hidden = !!c.dataset.cat && pl.dataset.cat !== c.dataset.cat; });
      });
    },
    checkin() {
      bindForm('verifyForm', f => {
        const v = f.who.value.trim();
        const p = property();
        const b = Store.bookingByCode(v) || Store.bookingByLastName(p.id, v);
        if (!b) return toast(t('verify_fail'), 'err');
        code = b.code; safeSet(CODE_KEY, code); propId = b.propertyId; safeSet(PROP_KEY, propId);
        toast(tf('confirmed_hi', { name: b.guestName.split(' ')[0] }), 'ok'); render();
      });
      bindForm('ciForm', async f => {
        const id = await compressImage(f.idPhoto.files[0], 1000, 0.7);
        const b = access().b;
        const ok = Store.update(d => {
          const bk = d.bookings.find(x => x.id === b.id);
          bk.status = 'checked_in';
          bk.checkInData = { fullName: f.fullName.value, phone: f.phone.value, email: f.email.value, guests: +f.guests.value, arrival: f.arrival.value, notes: f.notes.value, idPhoto: id, at: Date.now() };
          Store.notify(`✅ ${f.fullName.value} checked in · ${Store.property(bk.propertyId).name.en} (${f.guests.value} guests, arriving ${fmtTime12(f.arrival.value)})`, { bookingId: b.id, kind: 'checkin' });
        });
        if (ok) { toast(t('ci_ok'), 'ok'); go('p-door'); }
      });
    },
    help() {
      document.querySelectorAll('.seg [data-tab]').forEach(btn => btn.onclick = () => { helpTab = btn.dataset.tab; render(); });
      document.querySelectorAll('#helpForm [data-chip]').forEach(c => c.onclick = () => c.classList.toggle('on'));
      bindForm('helpForm', async f => {
        const picked = [...f.querySelectorAll('.chip.on')].map(c => c.dataset.en);
        if (!picked.length && !f.details.value.trim()) return toast(t('pick_one'), 'err');
        const photo = await compressImage(f.photo.files[0]);
        const urgent = f.urgent && f.urgent.checked;
        Store.addRequest(access().b.id, { type: helpTab, title: (urgent ? '⚠️ URGENT · ' : '') + (picked.join(', ') || (helpTab === 'issue' ? 'Issue' : 'Request')), details: f.details.value, photo, meta: { urgent } });
        sent();
      });
    },
    stay() {
      document.querySelectorAll('form[data-stay]').forEach(f => f.onsubmit = e => {
        e.preventDefault();
        const type = f.dataset.stay;
        const title = type === 'extend_stay' ? `Extend until ${fmtDate(f.date.value, 'en')}` : `${REQUEST_TYPES[type]} at ${fmtTime12(f.time.value)}`;
        Store.addRequest(access().b.id, { type, title, meta: { time: f.time && f.time.value, date: f.date && f.date.value } });
        sent();
      });
    },
    housekeeping() {
      bindForm('hkForm', f => { Store.addRequest(access().b.id, { type: 'housekeeping', title: `${f.kind.value} · ${fmtDate(f.date.value, 'en')}, ${f.slot.value}`, details: f.notes.value }); sent(); });
    },
    luggage() {
      bindForm('lgForm', f => { Store.addRequest(access().b.id, { type: 'luggage', title: `${f.bags.value} bag(s)`, details: `Drop-off ${fmtDate(f.d1.value, 'en')} ${fmtTime12(f.t1.value)} → pick-up ${fmtDate(f.d2.value, 'en')} ${fmtTime12(f.t2.value)}${f.notes.value ? ' — ' + f.notes.value : ''}` }); sent(); });
    },
    lostfound() {
      bindForm('lfForm', async f => {
        const photo = await compressImage(f.photo.files[0]);
        Store.addRequest(access().b.id, { type: 'lost_found', title: f.item.value, details: `${f.where.value}\nReturn: ${f.ret.value}`, photo });
        sent();
      });
    },
    guestbook() {
      bindForm('gbForm', f => {
        const p = property(), b = access().b;
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
      bindForm('coForm', async f => {
        const done = [...f.querySelectorAll('.co-item')].every(c => c.checked);
        if (!done && !(await askConfirm(t('co_unchecked'), { ok: t('co_anyway'), cancel: t('cancel') }))) return;
        const b = access().b;
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
    const b = access().b; if (!b) return;
    reqSnapshot = {};
    Store.get().requests.filter(r => r.bookingId === b.id).forEach(r => { reqSnapshot[r.id] = r.status + '|' + r.replies.length; });
  }
  function diffAndToast() {
    const b = access().b; if (!b) return;
    Store.get().requests.filter(r => r.bookingId === b.id).forEach(r => {
      const prev = reqSnapshot[r.id]; if (!prev) return;
      const [ps, pn] = prev.split('|');
      const last = r.replies[r.replies.length - 1];
      if (r.replies.length > +pn && last.from === 'host') toast(`${S().hostName}: ${last.text}`, 'info');
      else if (r.status !== ps) toast(`${r.title} — ${t('s_' + r.status)}`, 'info');
    });
  }
  Store.subscribe(source => {
    if (source !== 'remote') return;
    diffAndToast();
    const a = document.activeElement;
    const typing = a && /INPUT|TEXTAREA/.test(a.tagName) && a.value;
    if (!typing && !document.querySelector('.modal-back')) render(); else snapshotRequests();
  });

  window.addEventListener('hashchange', () => { if (route() !== 'extras') extrasCat = ''; render(); window.scrollTo(0, 0); });
  // Hook used by the single-page preview build.
  window.GuestApp = {
    render,
    setCode(c) { if (c) { code = c; safeSet(CODE_KEY, c); } if (location.hash !== '#home') location.hash = '#home'; render(); },
    signOut() { code = ''; safeSet(CODE_KEY, null); render(); },
  };
  render();
})();
