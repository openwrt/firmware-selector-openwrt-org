import "./setup.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../../www/js/translation.js";

describe("translate", () => {
  it("does not throw when called without arguments", () => {
    assert.doesNotThrow(() => translate());
  });

  it("does not throw when called with the current language", () => {
    assert.doesNotThrow(() => translate("en"));
  });

  it("does not call fetch when language matches current", () => {
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    };

    translate("en");
    assert.equal(fetchCalled, false);
  });

  it("calls fetch with correct URL for a new language", async () => {
    let fetchedUrl;
    globalThis.fetch = (url) => {
      fetchedUrl = url;
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ "tr-hello": "Hallo" }),
      });
    };

    translate("de");
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(fetchedUrl, "langs/de.json");
  });

  it("does not fetch again when language was already loaded", () => {
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    };

    translate("de");
    assert.equal(fetchCalled, false);
  });

  it("fetches again when switching to another new language", async () => {
    let fetchedUrl;
    globalThis.fetch = (url) => {
      fetchedUrl = url;
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ "tr-hello": "Bonjour" }),
      });
    };

    translate("fr");
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(fetchedUrl, "langs/fr.json");
  });

  it("handles fetch rejection gracefully", async () => {
    globalThis.fetch = () => Promise.reject(new Error("Network error"));

    assert.doesNotThrow(() => translate("xx"));
    await new Promise((r) => setTimeout(r, 50));
  });

  it("handles non-200 response gracefully", async () => {
    globalThis.fetch = () =>
      Promise.resolve({ status: 404, url: "langs/zz.json" });

    assert.doesNotThrow(() => translate("zz"));
    await new Promise((r) => setTimeout(r, 50));
  });
});
