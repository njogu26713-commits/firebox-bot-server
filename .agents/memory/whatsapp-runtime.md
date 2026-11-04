---
name: WhatsApp runtime
description: Deployment and session requirements for Firebox's persistent Baileys connection.
---

Firebox's WhatsApp/Baileys socket needs a continuously running VM deployment, not autoscale. An autoscale deployment reached zero active instances, and production logs showed repeated WhatsApp disconnects. A prior `401` also caused the app to clear saved auth and wait for a new pairing; changing deployment type alone cannot restore that session.

**Why:** This bot depends on a long-lived WhatsApp WebSocket rather than only serving stateless HTTP requests.

**How to apply:** Use a VM for production and verify a successful WhatsApp pairing/connection in logs after publishing. Treat `/health` as API availability only, not proof that WhatsApp is connected.
