# Guest Portal (demo)

A web app for short-term rental guests, with a host dashboard. Guests check in, see everything about the stay, and send requests. The host gets notified instantly and replies from the dashboard.

## Try it

Open `index.html` through a local web server (for example `python3 -m http.server` inside this folder, then go to http://localhost:8000).

| Page | Access |
| --- | --- |
| `guest.html` | Guest guide. Check in with booking code `PINES1` |
| `admin.html` | Host dashboard, PIN `1234` |

Open both in the **same browser**, in two tabs. Actions in one tab show up in the other right away.

## Guest features (English / Filipino)

- **Open guest guide:** anyone with the property link (`guest.html?p=<property id>`) or its QR code can browse the guides.
- **Check in with last name (or booking code):** private details unlock a set number of hours before arrival (48 by default). These are Wi-Fi with a QR code, parking, host contact, and the door code (the door code also needs online check-in).
- **Home:** photo cover, check-in / check-out time cards, "Start here" icon tiles with lock badges, photo feature cards, host card, safety card, and swipeable "During your stay" / "Need help?" panels.
- **Bottom menu:** Home · Tutorials · Requests · Emergency · Checkout.
- **Guide pages and tutorials:** cover photo, info cards, a swipeable photo walk-through, numbered steps, a video, and lists (examples: pool, trash, sofa bed, kitchen, shower, aircon, parking, door access).
- **Extras & experiences:** category filters, Host-arranged / Partner tags, flexible price text, notes, and request forms.
- **Requests:** item or issue (with a photo and urgent flag), housekeeping, early check-in / late checkout / extend stay, luggage, lost & found. Each request has a live status and a chat with the host.
- **Safety & emergency:** contacts with several numbers each, a notice (such as generator information) and procedures. Also a Common problems quick-fix list.
- **Online check-in** with an ID photo, a checkout checklist with a rating, a review link, and a guestbook.

## Host dashboard

- Notification bell at the top with an unread count, a chime, popup messages and optional desktop alerts
- Dashboard: guests in-house, arrivals, open requests, average rating, activity feed
- Requests inbox: filters, statuses (New / In progress / Approved / Declined / Done), replies, editable quick replies
- Bookings: create or edit, auto-generated code, guest link, QR code (copy, download), ready-to-send message, check-in details and ID photo, feedback
- Properties: edit every text (EN + FIL), home tiles, photo cards, swipe panels, guide pages (cover, steps, photo walk-through, video, lists), extras, emergency info, rules and more. Add, duplicate or delete properties, and get a printable guest-guide QR for each one. Changes save automatically.
- Guestbook moderation, brand / colors / contact / PIN settings, backup export and import, demo reset

## Demo limitations

Data is stored in the browser (`localStorage`). That means:
- A guest on **their own phone** cannot reach the host's dashboard. Both must be in the same browser for now.
- Phone push notifications and email alerts need a server.
- The PIN is a demo lock, not real security.

## Next step: going live

`js/store.js` is the only data layer. Replacing it with a hosted backend (for example Supabase: database, login, file storage, realtime) keeps the rest of the app unchanged and adds:
- real guest-to-host sync across devices
- phone push notifications (installable app) and email or Telegram alerts
- secure admin login and private ID-photo storage

## Preview build

`python3 tools/build-preview.py OUT.html` bundles the guest and host views into one page with a Guest / Host switch, for sharing a review link.
