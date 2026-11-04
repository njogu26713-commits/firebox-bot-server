const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const maintenanceMode = require("../saas/maintenanceMode");

const statePath = path.join(__dirname, "../database/maintenance_mode.json");

function removeState() {
    try { fs.unlinkSync(statePath); } catch {}
}

test("maintenance mode is off by default and can be enabled", () => {
    removeState();
    assert.equal(maintenanceMode.getStatus().maintenance, false);
    assert.equal(maintenanceMode.setEnabled(true).maintenance, true);
    assert.equal(maintenanceMode.isEnabled(), true);
    assert.equal(maintenanceMode.getStatus().message, "System modification in progress. Please try again later.");
    assert.equal(maintenanceMode.setEnabled(false).maintenance, false);
    removeState();
});

test.after(removeState);
