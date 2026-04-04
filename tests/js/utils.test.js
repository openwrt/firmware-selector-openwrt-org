import { trackableElement, mockElement } from "./setup.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  split,
  formatDate,
  show,
  hide,
  setValue,
  showAlert,
  hideAlert,
  htmlToElement,
  append,
} from "../../www/js/utils.js";

describe("split", () => {
  it("splits by whitespace", () => {
    assert.deepEqual(split("foo bar baz"), ["foo", "bar", "baz"]);
  });

  it("splits by commas", () => {
    assert.deepEqual(split("foo,bar,baz"), ["foo", "bar", "baz"]);
  });

  it("splits by mixed whitespace and commas", () => {
    assert.deepEqual(split("foo, bar  baz"), ["foo", "bar", "baz"]);
  });

  it("handles leading and trailing whitespace", () => {
    assert.deepEqual(split("  foo bar  "), ["foo", "bar"]);
  });

  it("returns empty array for empty string", () => {
    assert.deepEqual(split(""), []);
  });

  it("returns empty array for whitespace-only string", () => {
    assert.deepEqual(split("   "), []);
  });

  it("returns single element for single word", () => {
    assert.deepEqual(split("hello"), ["hello"]);
  });

  it("handles tabs and newlines", () => {
    assert.deepEqual(split("foo\tbar\nbaz"), ["foo", "bar", "baz"]);
  });

  it("preserves hyphens within tokens", () => {
    assert.deepEqual(split("luci-app-firewall kmod-usb2"), [
      "luci-app-firewall",
      "kmod-usb2",
    ]);
  });

  it("handles comma-separated package list without spaces", () => {
    assert.deepEqual(split("pkg1,pkg2,pkg3"), ["pkg1", "pkg2", "pkg3"]);
  });
});

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2024-01-15T10:30:00Z");
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });

  it("returns undefined for undefined input", () => {
    assert.equal(formatDate(undefined), undefined);
  });

  it("returns null for null input", () => {
    assert.equal(formatDate(null), null);
  });

  it("returns empty string for empty string input", () => {
    assert.equal(formatDate(""), "");
  });

  it("formats a date-only string", () => {
    const result = formatDate("2024-06-01");
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });
});

describe("show", () => {
  it("removes 'hide' class when passed an element", () => {
    const el = trackableElement();
    el._classes.add("hide");
    show(el);
    assert.ok(!el._classes.has("hide"));
  });

  it("looks up element via querySelector when passed a string", () => {
    const el = trackableElement();
    el._classes.add("hide");
    const orig = document._qsImpl;
    document._qsImpl = () => el;
    show("#test");
    assert.ok(!el._classes.has("hide"));
    document._qsImpl = orig;
  });
});

describe("hide", () => {
  it("adds 'hide' class when passed an element", () => {
    const el = trackableElement();
    hide(el);
    assert.ok(el._classes.has("hide"));
  });

  it("looks up element via querySelector when passed a string", () => {
    const el = trackableElement();
    const orig = document._qsImpl;
    document._qsImpl = () => el;
    hide("#test");
    assert.ok(el._classes.has("hide"));
    document._qsImpl = orig;
  });
});

describe("setValue", () => {
  function setupSetValue(tagName) {
    const el = trackableElement({ tagName });
    const row = trackableElement();
    el.closest = () => row;
    const orig = document._qsImpl;
    document._qsImpl = () => el;
    return { el, row, restore: () => { document._qsImpl = orig; } };
  }

  it("sets innerText and shows element for non-anchor with non-empty value", () => {
    const { el, row, restore } = setupSetValue("SPAN");
    setValue("#x", "hello");
    assert.equal(el.innerText, "hello");
    assert.ok(!el._classes.has("hide"));
    assert.ok(!row._classes.has("hide"));
    restore();
  });

  it("sets href for anchor element with non-empty value", () => {
    const { el, row, restore } = setupSetValue("A");
    setValue("#link", "https://example.com");
    assert.equal(el.href, "https://example.com");
    assert.ok(!el._classes.has("hide"));
    assert.ok(!row._classes.has("hide"));
    restore();
  });

  it("hides element and row when value is undefined", () => {
    const { el, row, restore } = setupSetValue("SPAN");
    setValue("#x", undefined);
    assert.ok(el._classes.has("hide"));
    assert.ok(row._classes.has("hide"));
    restore();
  });

  it("hides element and row when value is empty string", () => {
    const { el, row, restore } = setupSetValue("SPAN");
    setValue("#x", "");
    assert.ok(el._classes.has("hide"));
    assert.ok(row._classes.has("hide"));
    restore();
  });
});

describe("showAlert", () => {
  it("sets message and removes hide class", () => {
    const el = trackableElement();
    const orig = document._qsImpl;
    document._qsImpl = () => el;
    showAlert("Something went wrong");
    assert.equal(el.innerText, "Something went wrong");
    assert.ok(!el._classes.has("hide"));
    document._qsImpl = orig;
  });
});

describe("hideAlert", () => {
  it("adds hide class and clears innerText", () => {
    const el = trackableElement();
    el.innerText = "old error";
    const orig = document._qsImpl;
    document._qsImpl = () => el;
    hideAlert();
    assert.ok(el._classes.has("hide"));
    assert.equal(el.innerText, "");
    document._qsImpl = orig;
  });
});

describe("htmlToElement", () => {
  it("creates a template element and returns content.firstChild", () => {
    const sentinel = { id: "child-node" };
    const tmpl = { innerHTML: "", content: { firstChild: sentinel } };
    const orig = document._createImpl;
    document._createImpl = () => tmpl;
    const result = htmlToElement("  <div>test</div>  ");
    assert.equal(result, sentinel);
    assert.equal(tmpl.innerHTML, "<div>test</div>");
    document._createImpl = orig;
  });
});

describe("append", () => {
  it("creates element with given tag and appends to parent", () => {
    const child = mockElement({ tagName: "TR" });
    const orig = document._createImpl;
    document._createImpl = (tag) => {
      child.tagName = tag;
      return child;
    };
    let appended = null;
    const parent = { appendChild(el) { appended = el; } };
    const result = append(parent, "TR");
    assert.equal(result, child);
    assert.equal(result.tagName, "TR");
    assert.equal(appended, child);
    document._createImpl = orig;
  });
});
