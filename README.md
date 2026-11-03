# Firebox Bot Server

Backend-only deployment for Firebox Bot. This repository runs the Express API and WhatsApp/Baileys bot server on Railway while the frontend is hosted separately, for example on Azure Static Web Apps or Azure App Service.

## Deployment

Deploy this repository as a Docker deployment on Railway. Railway will use the included `Dockerfile` and `railway.toml`.

Required Railway variables:

```env
NODE_ENV=production
SESSION_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=https://your-azure-frontend.example.com
MONGO_URL=${{Mongo.MONGO_URL}}
MONGODB_DATABASE=firebox
MONGODB_SERVERS_COLLECTION=servers
FIREBOX_ADMIN_PASSCODE=replace-with-a-long-random-passcode
```

`FRONTEND_URL` may contain a comma-separated list of allowed browser origins, for example:

```env
FRONTEND_URL=https://your-site.azurestaticapps.net,https://app.example.com
```

The server allows credentialed requests only from these origins. Frontend requests must include cookies with `credentials: "include"`.

Optional variables are documented in `.env.example` and `RAILWAY.md`. Keep `SESSION_SECRET`, database settings, and token secrets stable across redeployments. MongoDB is required for durable token and Baileys authentication persistence.

## Health check

After deployment, open:

```text
https://your-railway-domain.up.railway.app/health
```

## Frontend configuration

Set the frontend API base URL to the Railway public URL, for example:

```env
VITE_API_URL=https://your-railway-domain.up.railway.app
```

Use that value for all `/api/...` requests and include credentials:

```js
fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
```

Do not put MongoDB URLs, Paystack secret keys, admin passcodes, or other server secrets in the Azure frontend.

## Important

This repository intentionally does not include the old `public/` frontend directory. The frontend should be deployed from its separate Azure repository.
