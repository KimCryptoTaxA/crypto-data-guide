"""Bundle the guest portal into one self-contained HTML page with a Guest / Host switch.

Usage: python3 tools/build-preview.py OUTPUT.html
Used for the private review link; the normal app is still index.html / guest.html / admin.html.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
read = lambda p: (ROOT / p).read_text(encoding='utf-8')

PREVIEW_CSS = """
/* Preview switch bar */
.pv-bar { background: var(--accent); color: #fff; padding-block: 10px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.pv-bar .pv-title { font: 800 1rem var(--display); }
.pv-bar .pv-hint { font-size: .78rem; color: #e9dcc4; }
.pv-switch { display: inline-flex; background: rgba(255,255,255,.12); border-radius: 999px; padding: 3px; gap: 3px; }
.pv-switch button { position: relative; border: 0; background: transparent; color: #fff; font: 600 .82rem var(--sans);
  padding: 8px 16px; border-radius: 999px; cursor: pointer; }
.pv-switch button.on { background: #fff; color: var(--accent); }
.pv-switch button:focus-visible { outline: 2px solid #f3e3c3; outline-offset: 2px; }
.pv-badge { position: absolute; top: -4px; right: -4px; background: var(--danger); color: #fff; font: 600 .62rem var(--sans);
  min-width: 18px; height: 18px; border-radius: 99px; display: grid; place-items: center; padding: 0 4px; }
"""

PREVIEW_SETUP = """
window.PREVIEW = (function () {
  let view = 'guest';
  let seen = Store.get().notifications.length;
  const $ = id => document.getElementById(id);
  function badge() {
    const n = Store.get().notifications.filter(x => !x.read).length;
    const b = $('pvBadge'); b.hidden = !n || view === 'host'; b.textContent = n;
  }
  function show(v, code) {
    view = v;
    $('app').hidden = v !== 'guest';
    $('admin').hidden = v !== 'host';
    document.querySelectorAll('.pv-switch button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    if (v === 'guest' && window.GuestApp) GuestApp.setCode(code || null);
    if (v === 'host' && window.AdminApp) AdminApp.render();
    badge();
    window.scrollTo(0, 0);
  }
  Store.subscribe(() => {
    const n = Store.get().notifications.length;
    if (n > seen && view === 'guest') { chime(); toast('Host notified. Switch to Host view to see it.', 'info'); }
    seen = n; badge();
  });
  return { show, badge };
})();
"""

PREVIEW_INIT = """
document.querySelectorAll('.pv-switch button').forEach(b => b.onclick = () => PREVIEW.show(b.dataset.v));
PREVIEW.badge();
"""

html = f"""<title>Guest Portal Demo</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap">
<style>
{read('css/style.css')}
{PREVIEW_CSS}
</style>
<div class="pv-bar">
  <div><div class="pv-title">Guest Portal · demo preview</div><div class="pv-hint">Guest check-in last name: Santos · Host PIN 1234</div></div>
  <div class="pv-switch" role="tablist" aria-label="Choose view">
    <button type="button" data-v="guest" class="on">Guest view</button>
    <button type="button" data-v="host">Host view<span class="pv-badge" id="pvBadge" hidden></span></button>
  </div>
</div>
<div id="app"></div>
<div id="admin" hidden></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
{read('js/common.js')}
{read('js/store.js')}
{read('js/i18n.js')}
{PREVIEW_SETUP}
</script>
<script>
{read('js/guest.js')}
</script>
<script>
{read('js/admin.js')}
</script>
<script>
{PREVIEW_INIT}
</script>
"""

out = pathlib.Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'wrote {out} ({len(html) // 1024} KB)')
