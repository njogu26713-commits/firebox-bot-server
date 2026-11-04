# Firebox Bot on Replit

## Run

Use the Run button to start the `Firebox Backend` workflow (`PORT=5000 npm start`).
The existing Node.js 20 / Express backend is unchanged in structure. Dependencies
are managed with npm and the existing lockfile. Replit also supplies ffmpeg,
ImageMagick, WebP tools, and yt-dlp for media commands.

Open `/` or `/health` to check that the server is listening. The root returns a
small status response for Replit's deployment health check; this repository
intentionally contains no frontend. Use the separately hosted frontend to
access the dashboard and pair WhatsApp.

## Configuration

Set sensitive values in Replit Secrets, never in source control:

- `SESSION_SECRET`: already supplied; keep stable across restarts.
- `MONGODB_URI` (or `MONGO_URL`): a reachable MongoDB connection string.
  MongoDB is required for user accounts and durable bot authentication/storage.
  Without it, the server can answer health checks, but account operations fail;
  some other stores use the project's existing JSON fallback.
- `FIREBOX_ADMIN_PASSCODE`: required for administrator login.

Set `FRONTEND_URL` to the real frontend origin (comma-separated if multiple) to
allow credentialed browser requests. The frontend must use this backend's URL
and send requests with `credentials: "include"`. No frontend URL is assumed.

Optional AI, Paystack, and central hub credentials are described in `.env.example`;
do not enable those services until their credentials are configured. WhatsApp
pairing requires the separate frontend and a real WhatsApp account.

## Checks

- Run the existing suite with `npm test`.
- `GET /health` checks HTTP availability only, not database readiness.
- `GET /api/auth/me` returns the current account, or `{"user":null}`.

The deployment target is configured as an always-running VM so the WhatsApp
connection is not hosted on a scale-to-zero service. The setting applies on the
next publish. After publishing, check the deployment logs for a WhatsApp
connection; if the saved session was rejected or cleared, pair WhatsApp again
from the separate frontend.

The existing Express session store is in memory and should be replaced with a
persistent store before relying on logins across server restarts or replicas.
