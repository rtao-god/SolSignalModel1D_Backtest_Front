# React + TypeScript + Vite

## API contract

- Detailed deploy notes are in [DEPLOY.md](DEPLOY.md).

- Development uses same-origin `/api` and a Vite proxy to the local backend.
- The local backend origin is discovered from `backend/SolSignalModel1D_Backtest/SolSignalModel1D_Backtest.Api/Properties/launchSettings.json`.
- `npm run dev` builds the backend into an isolated runtime under `d:/crypto/tmp/frontend-local-api-runtime` and auto-starts it if the canonical local host is still down.
- Production uses an explicit absolute `VITE_API_BASE_URL`, for example `https://.../api`.
- The frontend does not infer backend hostnames from the current browser origin.

## Local env

- Copy `.env.example` to `.env.local` for local development.
- `VITE_API_BASE_URL=/api` keeps the frontend on the proxy path.
- `VITE_DEV_API_PROXY_TARGET` is optional and only overrides the backend owner contract for a non-standard target.
- Copy `.env.production.example` to `.env.production` for the deployed frontend.
- `VITE_API_BASE_URL` in production must be an absolute HTTPS URL.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json', './tsconfig.app.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
