# Browser tests (real Chrome, real API)

Drives the actual store and admin UIs against a running API: register, verify, session restore on reload, silent token
refresh after a 401, sign out, forgot/reset password, session revocation, admin sign-in, route protection, staff invites,
permissions, last-Super-Admin rule, deactivation, audit-log filters. 23 checks.

Not part of the web workspaces and not run in CI (it needs the whole stack). It uses your installed Chrome or Edge, so there is no browser download.

```bash
# 1. stack (from the repo root)
cd api && npm run infra:up && npm run build
export MONGODB_URI='mongodb://localhost:27017/tonyson_e2e?replicaSet=rs0&directConnection=true' \
       JWT_ACCESS_SECRET='e2e-jwt-secret-0123456789-abcdefghijklmnopqr' TOKEN_HMAC_SECRET='e2e-hmac-secret-9876543210-rqponmlkjihgfedcba' NODE_ENV=development
SEED_ADMIN_EMAIL=admin-e2e@example.com SEED_ADMIN_PASSWORD='E2e-admin-password-1' npm run seed:super-admin
node dist/main.js > /tmp/api.log 2>&1 &          # NODE_ENV=development logs the emails the tests read
cd ../web && npm run dev:store &  npm run dev:admin &

# 2. run
cd e2e && npm install
API_LOG=/tmp/api.log SEED_ADMIN_EMAIL=admin-e2e@example.com SEED_ADMIN_PASSWORD='E2e-admin-password-1' npm test
```

Optional: `SHOTS=./shots` saves screenshots (and a screenshot of every failure), `CHROME_PATH`, `STORE_URL`, `ADMIN_URL`, `API_URL`.
The first run is slow because the Next dev servers compile each route on first request; the test warms them up first.
