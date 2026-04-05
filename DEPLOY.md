# Deploy contract

## Local

- `VITE_API_BASE_URL=/api`
- Frontend requests go to `/api`, and Vite proxies that path to a configured backend host.
- `npm run dev` starts only the frontend dev server. It does not build, start or probe the backend.
- `VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:10000` keeps the standard local backend target.

## Production

- `VITE_API_BASE_URL=https://solsignalmodel1d-backtest-backend.onrender.com/api`
- The frontend does not infer the backend host from the browser origin.
- The deployed site must receive a full absolute HTTPS API URL.
- Keep `.env.production` outside version control; the repository contains only `.env.production.example`.

## Invariants

- One API contract for all consumers in the frontend.
- No hostname guessing in runtime code.
- Local dev proxy uses an explicit backend target and never owns backend lifecycle.
- Production API URL is configured outside the transport layer.
