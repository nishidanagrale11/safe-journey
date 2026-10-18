# Safe Journey — Final College Project

A responsive Node.js/Express safety journey tracker with a dark glassmorphism UI, persistent JSON storage, live GPS updates while the browser page is active, trusted contacts, private share links that can be copied manually, journey reminders, safety confirmation, and SOS logging/alert attempts.

## Requirements
- Node.js 20+
- An SMTP email account/provider for sending real email
- HTTPS when testing from another phone/device (browser geolocation generally requires a secure context; `localhost` is allowed for local testing)

## Run locally
1. Extract this folder.
2. Open a terminal in the folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and edit the settings.
5. Run `npm start`.
6. Open `http://localhost:4000`.

Windows PowerShell: `Copy-Item .env.example .env`

## Configure optional SOS/reminder email alerts
SMTP is only for configured safety alerts; this build does not email live-location links. Fill in `.env` with SMTP details supplied by your email provider:

```env
BASE_URL=https://your-public-https-domain.example
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password-or-app-password
ALERT_FROM="Safe Journey <verified-sender@your-domain.example>"
ENABLE_REAL_ALERTS=true
```

Use the real public HTTPS URL in `BASE_URL`; do not leave it as localhost when the recipient is on another device. Deploy behind HTTPS or use a secure tunnel for testing. Keep `.env` private and never commit it. Gmail usually requires an App Password when 2-step verification is enabled; follow your provider's current SMTP instructions.

On an active journey, tap **Copy private location link** and send it manually to a trusted person. Opening it shows a map refreshed every five seconds from the latest GPS coordinates received from the sender's device. Turning sharing off or ending the journey revokes the link.

## Important limitations (read before presenting)
- This is a web app/PWA project with a Node.js backend, not a compiled Android APK. It can be installed from a compatible browser, but installation does not grant native background-location capability.
- For privacy and platform reasons, live coordinates update only while the sender's page is active and has location permission. Browser/OS suspension, screen-off power management, denied permission, or poor GPS/network may stop updates. Reliable background tracking requires a native Android app with foreground-service/background-location permissions and platform review.
- The email recipient gets a private Safe Journey map URL, not an automated Google Maps native Live Location session. This build does not email live-location links. The app's own map updates as new GPS readings arrive.
- The project currently has no user login or ownership/authentication system. Do not expose it publicly with real personal data without adding authentication, authorization, HTTPS, retention controls, and security review. Anyone with the private link can view the shared location while it remains active.
- SMTP delivery must be configured and tested before email can be sent. SOS is not a replacement for emergency services and should not be represented as guaranteed emergency dispatch.
- JSON file persistence is suitable for a small college demo, not concurrent multi-user production deployment.

## Main features
- Add/delete trusted contacts (name, phone, email, relationship)
- Start a journey with destination and expected arrival
- Live GPS collection and private read-only shared map
- One-tap current-location refresh with visible GPS permission/error status
- Email a private live-location link to a specified recipient
- Disable sharing/revoke previous link
- ETA + 10-minute safety check and configurable subsequent reminder interval
- Safety confirmation cancels remaining journey reminders
- Separate SOS action, alert history, journey history
- Responsive glassmorphism UI and basic PWA files

## Data
Persistent records are stored in `data/store.json`, created automatically. Back up the file before clearing project data. Do not put real people's location data in a public/demo deployment.
