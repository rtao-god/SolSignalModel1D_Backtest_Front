# Deploy contract

## Local

- `VITE_API_BASE_URL=/api`
- Frontend requests go to `/api`, and Vite reads the local backend origin from `backend/SolSignalModel1D_Backtest/SolSignalModel1D_Backtest.Api/Properties/launchSettings.json`.
- `npm run dev` builds the backend into `d:/crypto/tmp/frontend-local-api-runtime` and starts the fresh isolated DLL on the canonical local host when the API is still down.
- `VITE_DEV_API_PROXY_TARGET` is optional and should be used only for an explicit non-standard backend target.

## Production

- `VITE_API_BASE_URL=https://solsignalmodel1d-backtest-backend.onrender.com/api`
- The frontend does not infer the backend host from the browser origin.
- The deployed site must receive a full absolute HTTPS API URL.
- Keep `.env.production` outside version control; the repository contains only `.env.production.example`.

## Invariants

- One API contract for all consumers in the frontend.
- No hostname guessing in runtime code.
- Local dev proxy reuses the backend launch profile as the single source of truth.
- Production API URL is configured outside the transport layer.
