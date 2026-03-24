import "./setup.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { match } from "../../www/js/autocomplete.js";

describe("match", () => {
  it("finds a single pattern and returns its position", () => {
    const result = match("TP-Link Archer A7 v5", ["ARCHER"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 8);
    assert.equal(result[0].length, 6);
  });

  it("is case-insensitive (patterns are expected uppercase)", () => {
    const result = match("tp-link archer", ["TP"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 0);
  });

  it("returns empty array when pattern is not found", () => {
    const result = match("TP-Link Archer A7 v5", ["NETGEAR"]);
    assert.deepEqual(result, []);
  });

  it("returns empty array when any of multiple patterns is missing", () => {
    const result = match("TP-Link Archer A7 v5", ["ARCHER", "NETGEAR"]);
    assert.deepEqual(result, []);
  });

  it("finds multiple non-overlapping patterns", () => {
    const result = match("TP-Link Archer A7 v5", ["TP", "A7"]);
    assert.equal(result.length, 2);
    assert.equal(result[0].begin, 0);
    assert.equal(result[1].begin, 15);
  });

  it("merges overlapping ranges", () => {
    const result = match("ABCDEF", ["BCD", "CDE"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 1);
    assert.equal(result[0].length, 4);
  });

  it("merges adjacent ranges", () => {
    const result = match("ABCDEF", ["AB", "CD"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 0);
    assert.equal(result[0].length, 4);
  });

  it("handles single-character pattern", () => {
    const result = match("ABC", ["B"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 1);
    assert.equal(result[0].length, 1);
  });

  it("handles empty patterns array", () => {
    const result = match("TP-Link", []);
    assert.deepEqual(result, []);
  });

  it("handles pattern that matches at the very end", () => {
    const result = match("TP-Link Archer A7 v5", ["V5"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 18);
    assert.equal(result[0].length, 2);
  });

  it("handles pattern equal to entire string", () => {
    const result = match("ABC", ["ABC"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 0);
    assert.equal(result[0].length, 3);
  });

  it("handles duplicate patterns", () => {
    const result = match("ABCABC", ["ABC", "ABC"]);
    assert.ok(result.length >= 1);
  });

  it("finds first occurrence for repeated pattern text", () => {
    const result = match("XAXAX", ["X"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 0);
    assert.equal(result[0].length, 1);
  });

  it("handles three non-overlapping patterns", () => {
    const result = match("AA BB CC DD", ["AA", "CC", "DD"]);
    assert.equal(result.length, 3);
  });

  it("merges three overlapping ranges into one", () => {
    const result = match("ABCDEFGH", ["BCD", "DEF", "FGH"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 1);
    assert.equal(result[0].length, 7);
  });

  it("handles special characters in the value", () => {
    const result = match("TP-Link (Archer) [A7]", ["ARCHER"]);
    assert.equal(result.length, 1);
    assert.equal(result[0].begin, 9);
  });
});
