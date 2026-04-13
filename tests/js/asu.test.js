import { mockElement } from "./setup.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createAsuRequestBuilder } from "../../www/js/asu.js";

/** Translation module fetches lang JSON after status updates; tests only care about ASU API calls. */
function fetchWithLangStub(handler) {
  return (url, opts) => {
    if (String(url).includes("langs/")) {
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ _: "stub" }),
      });
    }
    return handler(url, opts);
  };
}

function makeContext(overrides = {}) {
  return {
    config: { asu_url: "http://asu.example.com" },
    progress: {},
    ofsVersion: "1.0",
    getCurrentDevice: () => ({}),
    updateImages: () => {},
    ...overrides,
  };
}

describe("createAsuRequestBuilder", () => {
  it("returns a function", () => {
    const build = createAsuRequestBuilder(makeContext());
    assert.equal(typeof build, "function");
  });

  it("does not call the ASU API when no device is selected", () => {
    let asuFetchCalled = false;
    globalThis.fetch = fetchWithLangStub(() => {
      asuFetchCalled = true;
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    });

    const build = createAsuRequestBuilder(makeContext());
    build();
    assert.equal(asuFetchCalled, false);
  });

  it("does not call the ASU API when getCurrentDevice returns null", () => {
    let asuFetchCalled = false;
    globalThis.fetch = fetchWithLangStub(() => {
      asuFetchCalled = true;
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    });

    const build = createAsuRequestBuilder(
      makeContext({ getCurrentDevice: () => null })
    );
    build();
    assert.equal(asuFetchCalled, false);
  });

  it("sends POST to the build API when device is selected", async () => {
    let capturedUrl, capturedMethod;
    globalThis.fetch = fetchWithLangStub((url, opts) => {
      capturedUrl = url;
      capturedMethod = opts.method;
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({ version_number: "23.05.4", bin_dir: "d" }),
      });
    });

    const build = createAsuRequestBuilder(
      makeContext({
        getCurrentDevice: () => ({ id: "my-router", target: "ramips/mt7621" }),
      })
    );
    build();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(capturedUrl, "http://asu.example.com/api/v1/build");
    assert.equal(capturedMethod, "POST");
  });

  it("includes profile, target, and diff_packages in request body", async () => {
    let capturedBody;
    globalThis.fetch = fetchWithLangStub((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({ version_number: "23.05.4", bin_dir: "d" }),
      });
    });

    const build = createAsuRequestBuilder(
      makeContext({
        getCurrentDevice: () => ({ id: "my-router", target: "ramips/mt7621" }),
      })
    );
    build();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(capturedBody.profile, "my-router");
    assert.equal(capturedBody.target, "ramips/mt7621");
    assert.equal(capturedBody.diff_packages, true);
  });

  it("includes client version in request body", async () => {
    let capturedBody;
    globalThis.fetch = fetchWithLangStub((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({ version_number: "23.05.4", bin_dir: "d" }),
      });
    });

    const build = createAsuRequestBuilder(
      makeContext({
        ofsVersion: "2.5.0",
        getCurrentDevice: () => ({ id: "dev", target: "t" }),
      })
    );
    build();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(capturedBody.client, "ofs/2.5.0");
  });

  it("includes resolved custom repositories and keys in request body", async () => {
    let capturedBody;
    const previousQuerySelector = document._qsImpl;
    const select = mockElement({ value: "23.05.4" });
    const qsMap = {
      "#versions": select,
    };
    document._qsImpl = (selector) => qsMap[selector] || mockElement();

    globalThis.fetch = fetchWithLangStub((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({ version_number: "23.05.4", bin_dir: "d" }),
      });
    });

    const build = createAsuRequestBuilder(
      makeContext({
        config: {
          asu_url: "http://asu.example.com",
          asu_repositories: {
            custom:
              "https://repo.example/{openwrt_branch}/{openwrt_version}/{target}/{subtarget}",
          },
          asu_repository_keys: ["pubkey-1"],
          asu_repositories_mode: "append",
        },
        getCurrentDevice: () => ({ id: "dev", target: "ramips/mt7621" }),
      })
    );
    build();
    await new Promise((r) => setTimeout(r, 50));
    document._qsImpl = previousQuerySelector;

    assert.deepEqual(capturedBody.repositories, {
      custom: "https://repo.example/23.05/23.05.4/ramips/mt7621",
    });
    assert.deepEqual(capturedBody.repository_keys, ["pubkey-1"]);
    assert.equal(capturedBody.repositories_mode, "append");
  });

  it("sends empty repositories_mode for unsupported mode values", async () => {
    let capturedBody;
    globalThis.fetch = fetchWithLangStub((_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({ version_number: "23.05.4", bin_dir: "d" }),
      });
    });

    const build = createAsuRequestBuilder(
      makeContext({
        config: {
          asu_url: "http://asu.example.com",
          asu_repositories_mode: "unsupported",
        },
        getCurrentDevice: () => ({ id: "dev", target: "ramips/mt7621" }),
      })
    );
    build();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(capturedBody.repositories_mode, "");
  });

  it("sends GET with hash appended when requestHash is provided", async () => {
    let capturedUrl, capturedMethod, capturedBody;
    globalThis.fetch = fetchWithLangStub((url, opts) => {
      capturedUrl = url;
      capturedMethod = opts.method;
      capturedBody = opts.body;
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({ version_number: "23.05.4", bin_dir: "d" }),
      });
    });

    const build = createAsuRequestBuilder(
      makeContext({
        getCurrentDevice: () => ({ id: "dev", target: "t" }),
      })
    );
    build("hash123");
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(
      capturedUrl,
      "http://asu.example.com/api/v1/build/hash123"
    );
    assert.equal(capturedMethod, "GET");
    assert.equal(capturedBody, null);
  });

  it("calls updateImages with version and asu_image_url on 200", async () => {
    let updatedArgs;
    globalThis.fetch = fetchWithLangStub(() =>
      Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve({ version_number: "23.05.4", bin_dir: "output" }),
      })
    );

    const build = createAsuRequestBuilder(
      makeContext({
        getCurrentDevice: () => ({ id: "dev", target: "t" }),
        updateImages: (...args) => {
          updatedArgs = args;
        },
      })
    );
    build();
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(updatedArgs[0], "23.05.4");
    assert.equal(updatedArgs[1].id, "dev");
    assert.equal(
      updatedArgs[1].asu_image_url,
      "http://asu.example.com/store/output"
    );
  });

  it("handles network error without throwing", async () => {
    globalThis.fetch = fetchWithLangStub(() =>
      Promise.reject(new Error("Connection refused"))
    );

    const build = createAsuRequestBuilder(
      makeContext({
        getCurrentDevice: () => ({ id: "dev", target: "t" }),
      })
    );

    assert.doesNotThrow(() => build());
    await new Promise((r) => setTimeout(r, 50));
  });

  it("handles non-200/202 response without throwing", async () => {
    globalThis.fetch = fetchWithLangStub(() =>
      Promise.resolve({
        status: 500,
        json: () => Promise.resolve({ detail: "Internal error" }),
      })
    );

    const build = createAsuRequestBuilder(
      makeContext({
        getCurrentDevice: () => ({ id: "dev", target: "t" }),
      })
    );

    assert.doesNotThrow(() => build());
    await new Promise((r) => setTimeout(r, 100));
  });
});
