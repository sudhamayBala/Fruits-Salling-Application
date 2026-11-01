# INDKAN backend

The backend contains separate Auth User Content and Fruit Content API modules
that can run together through `Backend/main.py` as one FastAPI service, backed
by the same PostgreSQL database. Product-content tables are declared as Python
classes in `Fruit Content/Api/models`; auth and product tables are initialized
at backend startup.

- `Auth User Content/Api`: registration, login, logout, profiles, passwords,
  user listing, and role management.
- `Fruit Content/Api`: products, categories, customer orders, and bulk orders.
- `Fruit Content/Api/models`: table declarations for catalog, gallery, orders,
  packaging, dealers, exports, contact inquiries, and distributors.
- `Fruit Content/Api/Services`: catalog and order logic.
- `shared`: PostgreSQL pool and auth/authorization helpers.

## Setup

### Run with Docker

This setup connects the containers to PostgreSQL already running on your
computer; it does not create a second database. From the project root, copy
`.env.example` to `.env`, set `DB_PASSWORD` to the PostgreSQL password (not
URL-encoded), and set `JWT_SECRET` to a new random value of at least 32 bytes,
then start the app:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The frontend is available at `http://localhost:2000`, the Fruit API at
`http://127.0.0.1:4000/docs`, the Auth API at
`http://127.0.0.1:3000/docs`, and PostgreSQL
at `localhost:5432`. pgAdmin is available at `http://localhost:5050`; sign in
with `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD` from the root `.env`
file. The `Fruit House PostgreSQL` server is registered automatically. Connect
to it with the `DB_USER` and `DB_PASSWORD` values from `.env`, then open
`Databases > FRUITS > Schemas > public > Tables` to view and query the live
application tables. If you customize `DB`, open that database instead of
`FRUITS`. If you customize `DB_USER`, update the server's `Username` in
`pgadmin/servers.json`. The APIs and pgAdmin both connect to the host database
through `host.docker.internal`, so they use the same live tables.

The host PostgreSQL server must accept connections from Docker Desktop. If
connections fail, configure PostgreSQL to listen on an interface reachable
from Docker and allow only the Docker Desktop gateway/subnet in `pg_hba.conf`
and the Windows Firewall. Do not expose PostgreSQL to public networks.
pgAdmin settings persist in the `pgadmin_data` Docker volume.

Stop the services with `docker compose down`. This does not delete data from
your host PostgreSQL database.

The example passwords are intended only for local development. Set private
`DB_PASSWORD` and `PGADMIN_DEFAULT_PASSWORD` values in the root `.env` file
before using this setup outside your local machine.

### Deploy a single backend URL to Render

The root `render.yaml` defines one Render web service for the combined backend
and one static frontend. The backend Dockerfile starts both existing API
surfaces in one FastAPI application: authentication remains under `/api/auth`,
and products, orders, and other Fruit Content routes remain under `/api`.
Connect the repository to Render and create a Blueprint.

Set `DATABASE_URL` to the hosted PostgreSQL connection string on the backend
service. Render generates a secure `JWT_SECRET`; the Blueprint supplies the
default frontend origin and backend URL based on their service names. The
frontend derives both API base paths from this one URL. If you change either
service name or use a custom frontend domain, update `CORS_ORIGINS` and
`VITE_API_BASE_URL` accordingly. Frontend variables are baked in at build time,
so redeploy the frontend after changing them. The combined backend serves
`/health` for Render health checks.

Keep the database URL, JWT secret, and other credentials in Render's
environment settings; do not commit them to the repository. The backend binds
to Render's runtime `PORT`.

Product image uploads are written beneath
`/app/Fruit Content/Api/uploads`. Render's container filesystem is ephemeral
by default, so the Blueprint attaches a 1 GB persistent disk at that exact path
and uses the Starter web-service plan. Review Render's current pricing before
deploying. The disk preserves uploaded files across deploys and restarts.

Both APIs use the same `JWT_SECRET` to sign and verify seven-day access tokens.
Generate a secret with
`python -c "import secrets; print(secrets.token_urlsafe(48))"` and keep it
private. For Docker, put the same value in the project-root `.env` file. For
local API processes, put it in `Backend/.env`, which both APIs load. Do not
commit either `.env` file. After deploying JWT authentication, users with old
opaque session tokens must sign in again.

Account type is determined by the registration email: an unused, admin-issued
owner employee email creates an owner account, while a personal email creates
a client account. Personal-email registrations are never promoted to
administrator by first-account bootstrap. An initial administrator must be
provisioned separately before owner employee IDs can be issued.

The browser-to-API URLs are centralized in
`Frontend/View/src/connection/config.ts`. Set `VITE_API_BASE_URL` to the single
backend origin, or optionally override the Auth and Fruit API paths separately
with `VITE_AUTH_API_URL` and `VITE_FRUIT_API_URL`. Add the frontend origin to
`CORS_ORIGINS` if it differs from the local defaults.

Frontend API clients are exported through
`Frontend/View/src/connection/index.ts`; import API functions from
`../../connection` (adjusting the relative path for the file location).
Features backed only by browser `localStorage` remain local to the browser and
are not synchronized with PostgreSQL.

### Run without Docker

Install dependencies into the Python environment used to run the combined
backend:

```powershell
& ".\Auth User Content\env\Scripts\python.exe" -m pip install -r requirements.txt
```

Set `DATABASE_URL` and `JWT_SECRET` in `Backend/.env` or the shell. Existing
shell variables take precedence over `.env` values.
`DATABASE_URL` is preferred whenever it is set. Otherwise, provide all five
`DB`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` settings. Individual
password settings support reserved URL characters without URL encoding.
`Fruit Content/.env` is loaded automatically. Example URL format:

```text
DATABASE_URL=postgresql://username:password@localhost:5432/FRUITS
```

For passwords containing reserved URL characters, percent-encode them in the
URL. Set `CORS_ORIGINS` to a comma-separated origin list if the frontend is not
running at `http://localhost:2000` or `http://127.0.0.1:2000`.

Run the combined backend from the `Backend` directory:

```powershell
& ".\Auth User Content\env\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Set `VITE_API_BASE_URL=http://127.0.0.1:8000` in
`Frontend/View/.env.local`. The combined backend serves both APIs and their
documentation at `http://127.0.0.1:8000/docs`.

Both APIs return structured request-validation errors and preserve explicit
HTTP error details. Unexpected server errors are logged with a request ID and
return a generic message; use the `X-Request-ID` response header when
investigating server logs. Error responses include `request_id` where
applicable. Sensitive request values are not included in validation details.
The frontend uses a shared JSON request helper that distinguishes network,
HTTP, and invalid-response errors, plus a React error boundary for unexpected
render failures.

## API routes

Authentication:

- `POST /api/auth/register`, `POST /api/auth/login`
- Personal-email registration creates a client credential and generates its
  unique client contract number; issued
  `first-name.joining-year.employee-type.ID@indkan.com` registration creates
  an owner credential and does not require a client contract number. Login
  checks the matching account credentials and returns the account role so the
  frontend opens the owner dashboard or client message center. Client IDs are
  generated UUID primary keys and the owner client directory supports searching
  by client name or ID.
- `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me`
- `POST /api/auth/password`
- Authenticated: `GET /api/auth/messages/contacts`,
  `GET /api/auth/messages/{contact_id}`, `POST /api/auth/messages`,
  `POST /api/auth/messages/voice`, and
  `GET /api/auth/messages/{contact_id}/{message_id}/audio` provide persistent
  client-to-owner text and voice messaging with unread tracking. Messages and
  voice recordings are automatically deleted after three months.
- Admin-only: `POST /api/auth/employee-ids` accepts an employee name, date of
  birth, joining date, employee type, phone, and address; it stores the profile
  and creates a unique six-digit ID and email in the
  `first-name.joining-year.employee-type.ID@indkan.com` format.
- Admin-only: `GET /api/auth/users`,
  `PATCH /api/auth/users/{customer_id}/role`

Products and orders:

- Public: `GET /api/products`, `GET /api/categories`,
  `POST /api/bulk-orders`
- Admin-only: `GET /api/products/manage`, `POST /api/products`,
  `PUT /api/products/{product_id}`, `DELETE /api/products/{product_id}`
- Product management requires a cost price for estimated profit analytics;
  cost price is only returned by the admin management endpoint.
- Admins upload JPEG, PNG, or WebP product images (up to 5 MB) from their
  device through `POST /api/product-images`; uploaded files are served under
  `/uploads/`.
- Admin-only: `GET /api/orders/manage` supplies order data for the owner
  dashboard. Delivery areas are derived in the frontend without displaying
  full addresses; returns are not currently tracked.
- Authenticated: `POST /api/orders`

The Fruit Content service initializes these PostgreSQL tables if they do not
exist: `categories`, `products`, `gallery_images`, `coming_soon_products`,
`orders`, `order_items`, `bulk_orders`, `packaging_records`, `dealers`,
`export_shipments`, `contact_inquiries`, and `distributors`. Request validation
schemas for those content workflows live in `Fruit Content/Api/Schema/schemas.py`.
At startup it also adds missing order timestamps, item fulfillment status, and
feedback columns to legacy `orders` and `order_items` tables.
The Authentication service creates the `auth_messages` table and indexes at
startup; messages are stored in PostgreSQL and conversations refresh
automatically while the inbox is open.

New users have the `customer` role. To grant administrator access, register the
account, then use a trusted PostgreSQL connection to run:

```sql
UPDATE customers SET role = 'admin' WHERE email = lower('admin@example.com');
```

Passwords use salted PBKDF2 hashes. Access tokens are signed JWTs with a
seven-day expiry. The database stores only each token's SHA-256 hash and
continues to enforce revocation, logout, and password-change invalidation.
Do not commit credentials or `.env` files.
