# Guest Portal (demo)

A web app for short-term rental guests, with a host dashboard. Guests check in, see everything about the stay, and send requests. The host gets notified instantly and replies from the dashboard.

## Try it

Open `index.html` through a local web server (for example `python3 -m http.server` inside this folder, then go to http://localhost:8000).

| Page | Access |
| --- | --- |
| `guest.html?code=HARBOR1` | Demo guest (Maria Santos) |
| `admin.html` | Host dashboard, PIN `1234` |

Open both in the **same browser**, in two tabs. Actions in one tab show up in the other right away.

## Guest features (English / Filipino)

- Booking-code login; links and QR codes log the guest in directly
- Stay status: countdown, night X of Y, check-out day
- Online check-in: details, arrival time, ID photo, agreement to house rules
- Self check-in guide; the door code is revealed only after check-in
- Wi-Fi with copy buttons, house rules, appliance how-to guides, trash & recycling
- Local guide with categories and Google Maps links
- Add-on services with prices (airport transfer, breakfast, laundry, tours, rentals)
- Requests and issue reports with quick picks, a photo and an "urgent" flag
- Early check-in, late checkout and extend-stay requests
- Housekeeping scheduling, luggage storage, lost & found
- "My requests" with live status and a chat thread with the host
- Emergency / SOS: one-tap calls and map links
- Check-out checklist, star rating, comments and a review link
- Guestbook, moderated by the host

## Host dashboard

- Notification bell at the top with an unread count, a chime, popup messages and optional desktop alerts
- Dashboard: guests in-house, arrivals, open requests, average rating, activity feed
- Requests inbox: filters, statuses (New / In progress / Approved / Declined / Done), replies, editable quick replies
- Bookings: create or edit, auto-generated code, guest link, QR code (copy, download), ready-to-send message, check-in details and ID photo, feedback
- Properties: edit every text (EN + FIL), photo, rule, guide, service and price. Add, duplicate or delete properties. Changes save automatically.
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
