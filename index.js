/**
 * Firebox Bot — SaaS Server
 *
 * The original Firebox Bot browser session remains available for bot setup.
 * The optional server registry uses a separate password-authenticated account
 * stored in the existing local application database directory.
 */

const fireboxWebhook = require("./saas/fireboxWebhook");
const botManager = require("./saas/botManager");

// ── Log noise filter ──────────────────────────────────────────────────────────
const _origError = console.error.bind(console);
const _origLog   = console.log.bind(console);

const CLEAN_SIGNAL_ERRORS = [
    { match: "Bad MAC",                                           msg: "⚠️  [Signal] Corrupt session key — will auto-refresh." },
    { match: "No matching sessions found",                        msg: "⚠️  [Signal] No session found — awaiting key exchange." },
    { match: "No session found to decrypt",                       msg: "⚠️  [Signal] Missing sender key — will resolve automatically." },
    { match: "Failed to decrypt message with any known session",  msg: "⚠️  [Signal] All session keys failed." },
    { match: "Closing open session in favor of incoming prekey",  msg: "ℹ️  [Signal] Re-keying session." },
    { match: "Closing session:",                                   msg: "ℹ️  [Signal] Closing stale session." },
    { match: "Decrypted message with closed session",             msg: "ℹ️  [Signal] Decrypted via closed session (harmless)." },
    { match: "transaction failed, rolling back",                  msg: "⚠️  [Signal] Transaction rollback (non-fatal)." },
    { match: "_chains",         msg: null },
    { match: "registrationId",  msg: null },
    { match: "currentRatchet",  msg: null },
    { match: "pendingPreKey",   msg: null },
    { match: "indexInfo",       msg: null },
    { match: "baseKeyType",     msg: null },
    { match: "ephemeralKeyPair",msg: null },
];

const _logCooldowns = new Map();
const COOLDOWN_MS = 30_000;

function interceptLog(originalFn, args) {
    const raw = String(args[0] ?? "");
    for (const { match, msg } of CLEAN_SIGNAL_ERRORS) {
        if (raw.includes(match)) {
            if (msg === null) return;
            const now = Date.now();
            if (now - (_logCooldowns.get(match) || 0) >= COOLDOWN_MS) {
                _logCooldowns.set(match, now);
                _origLog(msg);
            }
            return;
        }
    }
    originalFn(...args);
}

console.error = (...args) => interceptLog(_origError, args);
console.log   = (...args) => interceptLog(_origLog,   args);

process.on("unhandledRejection", (reason) => _origError("⚠️ Unhandled Rejection:", reason));
process.on("uncaughtException",  (error)  => _origError("⚠️ Uncaught Exception:", error));

// ── Express ───────────────────────────────────────────────────────────────────
const express = require("express");
const session = require("express-session");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = String(process.env.FRONTEND_URL || "")
    .split(",")
    .map(origin => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Permit health checks and server-to-server requests without an Origin header.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed by the API CORS policy."));
    },
    credentials: true,
}));

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(express.json({
    verify(req, _res, buffer) {
        if (req.originalUrl.split("?")[0] === "/api/paystack/webhook") req.rawBody = Buffer.from(buffer);
    },
}));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || require("crypto").randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" && allowedOrigins.length ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
    },
}));

// Paystack webhooks are authenticated against the exact raw request bytes.
const paystackWebhookService = require("./saas/paystackPayments").createPaystackService({
    tokenRegistry: require("./saas/tokenRegistry"),
});
app.post("/api/paystack/webhook", async (req, res) => {
    try {
        await paystackWebhookService.handleWebhook({
            rawBody: req.rawBody,
            signature: req.get("x-paystack-signature"),
        });
        return res.sendStatus(200);
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || "Paystack webhook processing failed." });
    }
});

// ── Bot API (/api/bot/*) ──────────────────────────────────────────────────────
app.use("/api/auth", require("./saas/authApiRoutes"));
app.use("/api/admin", require("./saas/adminApiRoutes"));
app.use("/api/bot", require("./saas/userApiRoutes"));
const { createDatabaseApiRouter } = require("./saas/fireboxDatabaseApi");
const { requireAdmin } = require("./saas/adminAuth");
app.use("/api/firebox-database/v1", createDatabaseApiRouter());
// Control Room's configured base URL points directly at the bot service and
// expects this stable, unversioned database API contract.
app.use("/api/firebox/database", createDatabaseApiRouter());
app.use("/api/admin/firebox-database", require("./saas/fireboxDatabaseApi").createAdminRouter(requireAdmin));

app.get("/", (_req, res) => res.status(200).json({
    service: "Firebox Bot SaaS",
    status: "online",
    health: "/health",
}));
app.get("/health", (_req, res) => res.send("🤖 Firebox Bot SaaS is Online!"));

// ── Listen ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🌍 Firebox Bot SaaS listening on port ${PORT}`);
    fireboxWebhook.start();
    botManager.restorePersisted().catch((error) => console.error("❌ Persistent bot restore failed:", error.message));
});
