const fs = require("fs");
const path = require("path");

const statePath = path.join(__dirname, "..", "database", "maintenance_mode.json");
const message = "System modification in progress. Please try again later.";

function isEnabled() {
    try {
        return JSON.parse(fs.readFileSync(statePath, "utf8")).enabled === true;
    } catch {
        return false;
    }
}

function setEnabled(enabled) {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    const temporaryPath = `${statePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify({
        enabled: enabled === true,
        updatedAt: new Date().toISOString(),
    }, null, 2));
    fs.renameSync(temporaryPath, statePath);
    return getStatus();
}

function getStatus() {
    return { maintenance: isEnabled(), message };
}

module.exports = { getStatus, isEnabled, setEnabled, message };
