# tobesuki-web

TOBESUKI web app - publicly accessible QR-based quest demo.

## Run locally

```sh
PORT=3000 npm start
```

Open `http://localhost:3000`. No login is required.

## Public API

- `GET /api/quests` - returns the public quest list
- `GET /health` - deployment health check

## Deploy to Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select this repository.
3. Render reads `render.yaml` and deploys the public web app.
4. Open the generated `https://tobesuki-web.onrender.com` URL.

The service listens on Render's `PORT`, exposes `/health` for deployment checks, and automatically uses a `Secure` session cookie in production.
