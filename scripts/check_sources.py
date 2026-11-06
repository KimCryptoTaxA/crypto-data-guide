#!/usr/bin/env python3
"""Daily source check for the Crypto Data Pulling Guide.

Runs once a day (GitHub Actions). For every CoinTracking import page the
guide links to, it:
  1. reads the whitelist IP the page tells people to enter, and updates the
     IPS table in index.html if it changed;
  2. takes a fingerprint of the page's instruction text, so you are told when
     CoinTracking rewrites its steps (you then decide what to change).

Nothing goes live by itself: the workflow turns any change into a pull
request that you approve (merge) or close.

Standard library only. Usage:  python scripts/check_sources.py [--offline DIR]
  --offline DIR  read pages from DIR/<slug>.html instead of the web (testing)
"""
import datetime as dt
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "index.html"
FINGERPRINTS = ROOT / "checker" / "fingerprints.json"
REPORT = Path(os.environ.get("RUNNER_TEMP", ROOT / "checker")) / "report.md"
BASE_URL = "https://cointracking.info/import/{slug}/"
UA = "Mozilla/5.0 (compatible; crypto-guide-daily-check/1.0)"

IPV4 = r"(?<![\d.])((?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3})(?![\d.])"
# An IP only counts if the word "IP" (or whitelist/trusted) appears shortly before it.
IP_IN_CONTEXT = re.compile(r"(?:\bIPs?\b|whitelist|trusted|restrict)[^\n]{0,120}?" + IPV4, re.I)
VARIANTS = ["", "?theme=dark", "index.php"]  # CoinTracking serves slightly different pages per variant
STEP_WORDS = re.compile(
    r"\b(click|select|choose|copy|paste|enter|enable|disable|create|generate|navigate|"
    r"go to|open|log ?in|hover|export|download|permission|read[- ]only|whitelist|api key|secret|passphrase)\b",
    re.I,
)


def read_ip_table(src):
    m = re.search(r"const IPS = (\{.*?\});", src, re.S)
    if not m:
        sys.exit("Could not find the IPS table in index.html")
    return json.loads(m.group(1))


def write_ip_table(src, ips, today):
    src = re.sub(r"const IPS = \{.*?\};", "const IPS = " + json.dumps(ips, indent=1) + ";", src, count=1, flags=re.S)
    return re.sub(r'const LAST_UPDATED = "[^"]*";', f'const LAST_UPDATED = "{today}";', src, count=1)


def page_text(raw):
    raw = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", raw)
    raw = re.sub(r"(?i)<br\s*/?>|</(p|li|div|h\d|tr|td)>", "\n", raw)
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    return "\n".join(" ".join(line.split()) for line in text.splitlines() if line.strip())


def instruction_fingerprint(text):
    # Keep only lines that read like instructions; drop counters, dates and other noise.
    lines = [line for line in text.splitlines() if STEP_WORDS.search(line) and len(line) < 400]
    lines = [re.sub(IPV4, "<ip>", l) for l in lines]  # IPs are tracked separately
    lines = [re.sub(r"\b(19|20)\d\d\b|\b\d{1,2}[:/.-]\d{1,2}([:/.-]\d{2,4})?\b", "#", l) for l in lines]
    return hashlib.sha256("\n".join(sorted(set(lines))).encode()).hexdigest()[:16], len(lines)


def fetch(slug, offline_dir=None, variant=""):
    if offline_dir:
        f = Path(offline_dir) / f"{slug}{variant.replace('?', '_').replace('.', '_')}.html"
        if variant and not f.exists():
            raise FileNotFoundError(f)
        return (f if variant else Path(offline_dir) / f"{slug}.html").read_text(encoding="utf8")
    url = BASE_URL.format(slug=slug) + variant
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf8", "replace")
        except Exception as e:  # network hiccup, rate limit, etc.
            last = e
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"{url}: {last}")


def find_ips(raw):
    """IPs that follow an IP/whitelist cue - first in visible text, then anywhere in the page source."""
    found = set(IP_IN_CONTEXT.findall(page_text(raw)))
    if not found:
        loose = html.unescape(re.sub(r"<[^>]+>", " ", raw.replace("\\/", "/")))
        loose = re.sub(r"\\u002[eE]", ".", loose)
        found = set(IP_IN_CONTEXT.findall(loose))
    return found


def main():
    offline = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "--offline" else None
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date().isoformat()
    src = PAGE.read_text(encoding="utf8")
    ips = read_ip_table(src)
    slugs = sorted(set(re.findall(r'CT\("([a-z0-9_]+)"\)', src)) | set(ips))
    prints = json.loads(FINGERPRINTS.read_text()) if FINGERPRINTS.exists() else {}
    first_run = not prints

    ip_changes, ip_review, text_changes, failed, new_prints = [], [], [], [], dict(prints)
    for slug in slugs:
        url = BASE_URL.format(slug=slug)
        try:
            raw = fetch(slug, offline)
            text = page_text(raw)
        except Exception as e:
            failed.append((slug, str(e)))
            continue

        if slug in ips:
            found = find_ips(raw)
            for variant in VARIANTS[1:]:
                if found:
                    break
                try:
                    found = find_ips(fetch(slug, offline, variant))
                except Exception:
                    pass
            found = sorted(found)
            if not found and os.environ.get("DEBUG_IPS"):
                for variant in VARIANTS:
                    try:
                        r = fetch(slug, offline, variant)
                    except Exception as e:
                        print(f"[debug] {slug}{variant}: fetch error {e}")
                        continue
                    hits = [m.start() for m in re.finditer(r"\bIPs?\b", r)][:6]
                    any_ip = sorted(set(re.findall(IPV4, r)))[:8]
                    print(f"[debug] {slug}{variant}: {len(r)} bytes; IPv4s anywhere: {any_ip}; site IP present: {ips[slug] in r}")
                    for h in hits[:4]:
                        print("   ...", re.sub(r"\s+", " ", r[max(0, h - 60):h + 100]))
            if len(found) == 1 and found[0] != ips[slug]:
                ip_changes.append((slug, ips[slug], found[0], url))
                ips[slug] = found[0]
            elif len(found) != 1:
                ip_review.append((slug, ips[slug], found, url))

        fp, n = instruction_fingerprint(text)
        if n == 0:
            failed.append((slug, "page loaded but no instruction text found (layout change or blocked)"))
            continue
        if not first_run and prints.get(slug) and prints[slug] != fp:
            text_changes.append((slug, url))
        new_prints[slug] = fp

    print(f"Checked {len(slugs)} pages: {len(ip_changes)} IP change(s), {len(ip_review)} IP(s) to review, "
          f"{len(text_changes)} instruction change(s), {len(failed)} failed.")

    if len(failed) == len(slugs):
        sys.exit("Every page failed to load - CoinTracking may be blocking the checker. Nothing was changed.")

    # Write report (used as the pull-request description)
    out = [f"## Daily source check - {today}", ""]
    if first_run:
        out += ["**First run:** this records today's CoinTracking pages as the baseline. Merge it to start daily tracking.", ""]
    if ip_changes:
        out += ["### Whitelist IPs changed (already updated on the site in this request)", "",
                "| Source | Old IP | New IP | Check it |", "|---|---|---|---|"]
        out += [f"| {s} | `{o}` | `{n}` | [CoinTracking page]({u}) |" for s, o, n, u in ip_changes]
        out += ["", "Open each link and confirm the new IP before merging.", ""]
    if ip_review:
        out += ["### IPs that need a manual look (not changed)", ""]
        out += [f"- **{s}**: site shows `{o}`; page shows {', '.join(f'`{x}`' for x in f) or 'no IP'} - [open]({u})"
                for s, o, f, u in ip_review]
        out.append("")
    if text_changes:
        out += ["### CoinTracking changed its instructions on these pages", "",
                "The site text was **not** changed. Read the page, then ask for the matching steps on the site to be updated.", ""]
        out += [f"- [{s}]({u})" for s, u in text_changes]
        out.append("")
    if failed:
        out += ["### Pages that could not be checked today", ""]
        out += [f"- {s}: {e}" for s, e in failed]
        out.append("")
    out += ["---", "**Merge** to publish/acknowledge these changes. **Close** to ignore them."]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(out), encoding="utf8")

    changed = bool(ip_changes or text_changes or first_run or new_prints != prints)
    if ip_changes:
        PAGE.write_text(write_ip_table(src, ips, today), encoding="utf8")
    if new_prints != prints:
        FINGERPRINTS.parent.mkdir(parents=True, exist_ok=True)
        FINGERPRINTS.write_text(json.dumps(new_prints, indent=1, sort_keys=True) + "\n")

    names = [s for s, *_ in ip_changes]
    title = ("IP whitelist changed: " + ", ".join(names)) if names else \
            ("CoinTracking instructions changed: " + ", ".join(s for s, _ in text_changes)) if text_changes else \
            "Daily check: baseline / housekeeping"
    if "GITHUB_OUTPUT" in os.environ:
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"changed={'true' if changed else 'false'}\n")
            f.write(f"title={title}\n")
            f.write(f"report={REPORT}\n")
            f.write(f"needs_attention={'true' if (ip_review or failed) else 'false'}\n")
    if "GITHUB_STEP_SUMMARY" in os.environ:
        Path(os.environ["GITHUB_STEP_SUMMARY"]).write_text(REPORT.read_text())


if __name__ == "__main__":
    main()
