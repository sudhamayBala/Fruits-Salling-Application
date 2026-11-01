# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Run the Fruit House frontend

The development server listens on port `2000`:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:2000`. API URLs are configured centrally in
`src/connection/config.ts`. Set `VITE_API_BASE_URL` to use one backend origin,
or override it with `VITE_AUTH_API_URL` and `VITE_FRUIT_API_URL` in `.env.local`.
Frontend pages should import API clients
from `src/connection` rather than defining their own backend URLs.

The frontend defaults to the deployed combined backend at
`https://fruits-salling-application.onrender.com`. Set
`VITE_API_BASE_URL=http://127.0.0.1:8000` in `.env.local` when using a local
combined backend. The backend must allow the frontend origin in its
`CORS_ORIGINS` setting. Cart, order-history, dealer, export, packaging, and
coming-soon utilities still store state in browser `localStorage`; that data is
not synchronized to the backend.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
