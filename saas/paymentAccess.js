const fs = require("fs");
const path = require("path");

const statePath = path.join(__dirname, "..", "database", "payment_access.json");
const timezone = String(process.env.FIREBOX_FREE_WEEKEND_TIMEZONE || "Africa/Nairobi");

function readState() {
    try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
        if (state.manualMode === "free" || state.manualMode === "paid") return { manualMode: state.manualMode };
        return { manualMode: state.manualFreeMode === true ? "free" : null };
    } catch {
        return { manualFreeMode: false };
    }
}

function writeState(state) {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    const temporaryPath = `${statePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify({
        manualMode: state.manualMode,
        updatedAt: new Date().toISOString(),
    }, null, 2));
    fs.renameSync(temporaryPath, statePath);
}

function isWeekend(now = new Date()) {
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(now);
    return weekday === "Sat" || weekday === "Sun";
}

function getStatus(now = new Date()) {
    const state = readState();
    const weekendFree = isWeekend(now);
    const manualFreeMode = state.manualMode === "free";
    const manualPaidMode = state.manualMode === "paid";
    return {
        manualFreeMode,
        manualPaidMode,
        weekendFree,
        freePairing: manualFreeMode || (!manualPaidMode && weekendFree),
        timezone,
    };
}

module.exports = {
    getStatus,
    isFreePairing: () => getStatus().freePairing,
    setManualFreeMode(enabled) {
        writeState({ manualMode: enabled === true ? "free" : "paid" });
        return getStatus();
    },
};
