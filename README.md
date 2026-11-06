# Crypto Data Pulling Guide

Client-facing instructions for pulling exchange and wallet transaction history (API keys, CSV exports, wallet addresses) for crypto tax preparation.

- **Website:** `index.html` (single page, no build step) published with GitHub Pages.
- **Daily check:** `.github/workflows/daily-check.yml` runs `scripts/check_sources.py` every 24 hours (08:17 Philippine time).
  - Reads the whitelist IP on each CoinTracking import page and updates the `IPS` table in `index.html` if it changed.
  - Fingerprints each page's instruction text and flags pages CoinTracking has rewritten.
  - Any change arrives as a **pull request**. Nothing goes live until you merge it.

---

## One-time setup (about 15 minutes)

1. **Create a free GitHub account** at github.com. Your username appears in the site address (`https://USERNAME.github.io/REPO/`), so choose a professional one.
2. **Create a repository:** top-right **+ → New repository**. Name it, e.g. `crypto-data-guide`. Set it to **Public** (free GitHub Pages needs a public repo; the site holds no client data). Tick **Add a README file**. Click **Create repository**.
3. **Allow the daily check to open change requests:** repo **Settings → Actions → General → Workflow permissions** → choose **Read and write permissions** and tick **Allow GitHub Actions to create and approve pull requests** → **Save**.
4. **Add the files** (pick one):
   - **Easiest:** give your AI assistant access to this repo and have it push the files.
   - **By hand:** **Add file → Upload files**, drag in `index.html`, `.nojekyll`, `README.md` and the `scripts` and `checker` folders, then **Commit**. The `.github` folder is hidden on Mac/Windows, so create it in the browser instead: **Add file → Create new file**, type the name `.github/workflows/daily-check.yml`, paste the contents of that file, **Commit**.
5. **Turn on the website:** **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main, / (root) → Save**. After 1–2 minutes the address appears at the top of that page.
6. **Run the first check:** **Actions** tab → **Daily source check** → **Run workflow**. It opens a pull request titled *Daily check: baseline*. Open it and click **Merge pull request**. From now on it runs on its own every 24 hours.
7. **Get notified:** click **Watch → All Activity** at the top of the repo so GitHub emails you whenever a change request opens.

Optional: point your own domain (e.g. `guide.yourfirm.com`) at it under **Settings → Pages → Custom domain**.

---

## Your daily routine

- **No email = nothing changed.**
- **Email "IP whitelist changed: …"** → open the pull request, click each *CoinTracking page* link to confirm the new IP, then **Merge**. The site updates within ~2 minutes.
- **Email "CoinTracking instructions changed: …"** → the site text was not touched. Read the linked page and update those steps (or edit `index.html` yourself), then **Merge** the request to acknowledge.
- **Want a check right now?** Actions → Daily source check → **Run workflow**.

### Good to know
- GitHub pauses scheduled jobs in repos with no activity for 60 days. Merging a change request counts as activity; if it does get paused, GitHub emails you and one click on **Enable workflow** restarts it.
- IPs live in one place: the `IPS` table near the top of the `<script>` in `index.html`. To change one by hand, edit that value and `LAST_UPDATED`.
- Instruction text for each exchange is in the `SOURCES` list in the same file.
