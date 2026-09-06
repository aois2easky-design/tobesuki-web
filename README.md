# tobesuki-web

TOBESUKI web app - QR-based quest demo with HMAC-signed sessions.

## Run locally

```sh
cp .env.example .env
HMAC_SECRET="$(openssl rand -hex 32)" WEB_USERS="player:change-me" npm start
```

Open `http://localhost:3000` and sign in with the user configured in `WEB_USERS`.

## Authentication

The server keeps the HMAC secret and signs a short-lived session cookie. The browser never receives the secret. Protected routes reject missing, expired, or modified cookies:

- `POST /api/login` - creates the signed session cookie
- `GET /api/me` - returns the current user
- `GET /api/quests` - example protected API
- `POST /api/logout` - clears the session cookie

Set `HMAC_SECRET` to a long random value in the hosting provider's secret settings. Set `WEB_USERS` as comma-separated `username:password` pairs. Do not commit `.env`; it is ignored by Git.

## Deploy to Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select this repository.
3. Render reads `render.yaml`, generates `HMAC_SECRET`, and asks you to set `WEB_USERS` (for example `player:your-password`).
4. Open the generated `https://tobesuki-web.onrender.com` URL.

The service listens on Render's `PORT`, exposes `/health` for deployment checks, and automatically uses a `Secure` session cookie in production.
