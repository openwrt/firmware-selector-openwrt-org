import "./setup.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  insertSnapshotVersions,
  normalizeOverviewProfiles,
} from "../../www/js/models.js";

describe("insertSnapshotVersions", () => {
  it("adds branch snapshots and SNAPSHOT", () => {
    const versions = ["23.05.4", "22.03.6"];
    insertSnapshotVersions(versions);
    assert.ok(versions.includes("23.05-SNAPSHOT"));
    assert.ok(versions.includes("22.03-SNAPSHOT"));
    assert.ok(versions.includes("SNAPSHOT"));
  });

  it("does not duplicate existing branch snapshots", () => {
    const versions = ["23.05.4", "23.05.3"];
    insertSnapshotVersions(versions);
    const count = versions.filter((v) => v === "23.05-SNAPSHOT").length;
    assert.equal(count, 1);
  });

  it("always appends SNAPSHOT at the end", () => {
    const versions = ["21.02.1"];
    insertSnapshotVersions(versions);
    assert.equal(versions[versions.length - 1], "SNAPSHOT");
  });

  it("handles empty versions list", () => {
    const versions = [];
    insertSnapshotVersions(versions);
    assert.deepEqual(versions, ["SNAPSHOT"]);
  });

  it("handles versions with different major branches", () => {
    const versions = ["23.05.4", "22.03.6", "21.02.7"];
    insertSnapshotVersions(versions);
    assert.ok(versions.includes("23.05-SNAPSHOT"));
    assert.ok(versions.includes("22.03-SNAPSHOT"));
    assert.ok(versions.includes("21.02-SNAPSHOT"));
    assert.ok(versions.includes("SNAPSHOT"));
  });

  it("does not add duplicate SNAPSHOT entry", () => {
    const versions = ["23.05.1"];
    insertSnapshotVersions(versions);
    const count = versions.filter((v) => v === "SNAPSHOT").length;
    assert.equal(count, 1);
  });

  it("preserves original version entries", () => {
    const versions = ["23.05.4", "22.03.6"];
    insertSnapshotVersions(versions);
    assert.ok(versions.includes("23.05.4"));
    assert.ok(versions.includes("22.03.6"));
  });
});

describe("normalizeOverviewProfiles", () => {
  it("transforms profile array to title-keyed object", () => {
    const input = {
      profiles: [
        {
          id: "device1",
          target: "ramips/mt7621",
          titles: [{ title: "Device One" }],
        },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    assert.ok("Device One" in result.profiles);
    assert.equal(result.profiles["Device One"].id, "device1");
    assert.equal(result.profiles["Device One"].target, "ramips/mt7621");
  });

  it("expands multiple titles into separate entries", () => {
    const input = {
      profiles: [
        {
          id: "device1",
          target: "ramips/mt7621",
          titles: [{ title: "Name A" }, { title: "Name B" }],
        },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    assert.ok("Name A" in result.profiles);
    assert.ok("Name B" in result.profiles);
  });

  it("builds title from vendor/model/variant", () => {
    const input = {
      profiles: [
        {
          id: "device1",
          target: "ath79/generic",
          titles: [{ vendor: "TP-Link", model: "Archer", variant: "v5" }],
        },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    assert.ok("TP-Link Archer v5" in result.profiles);
  });

  it("appends target to duplicate titles", () => {
    const input = {
      profiles: [
        {
          id: "dev1",
          target: "ramips/mt7621",
          titles: [{ title: "Same Name" }],
        },
        {
          id: "dev2",
          target: "ath79/generic",
          titles: [{ title: "Same Name" }],
        },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    const keys = Object.keys(result.profiles);
    assert.equal(keys.length, 2);
    assert.ok(keys.some((k) => k.includes("ramips/mt7621")));
    assert.ok(keys.some((k) => k.includes("ath79/generic")));
  });

  it("skips entries with empty title", () => {
    const input = {
      profiles: [
        {
          id: "device1",
          target: "ramips/mt7621",
          titles: [{ vendor: "", model: "", variant: "" }],
        },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    assert.equal(Object.keys(result.profiles).length, 0);
  });

  it("handles empty profiles array", () => {
    const input = { profiles: [] };
    const result = normalizeOverviewProfiles(input);
    assert.deepEqual(result.profiles, {});
  });

  it("preserves id and target on resulting entries", () => {
    const input = {
      profiles: [
        {
          id: "my-device",
          target: "ath79/generic",
          titles: [{ title: "My Device" }],
        },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    const entry = result.profiles["My Device"];
    assert.equal(entry.id, "my-device");
    assert.equal(entry.target, "ath79/generic");
  });

  it("handles case-insensitive duplicate detection", () => {
    const input = {
      profiles: [
        {
          id: "dev1",
          target: "ramips/mt7621",
          titles: [{ title: "My Device" }],
        },
        {
          id: "dev2",
          target: "ath79/generic",
          titles: [{ title: "my device" }],
        },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    const keys = Object.keys(result.profiles);
    assert.equal(keys.length, 2);
    assert.ok(keys.every((k) => k.includes("/")));
  });

  it("handles profile with vendor only", () => {
    const input = {
      profiles: [
        {
          id: "device1",
          target: "ramips/mt7621",
          titles: [{ vendor: "TP-Link" }],
        },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    assert.ok("TP-Link" in result.profiles);
  });

  it("handles many profiles without duplicates", () => {
    const input = {
      profiles: [
        { id: "d1", target: "t1", titles: [{ title: "Device A" }] },
        { id: "d2", target: "t2", titles: [{ title: "Device B" }] },
        { id: "d3", target: "t3", titles: [{ title: "Device C" }] },
      ],
    };
    const result = normalizeOverviewProfiles(input);
    assert.equal(Object.keys(result.profiles).length, 3);
  });
});
