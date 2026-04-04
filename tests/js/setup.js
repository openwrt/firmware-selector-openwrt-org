// Minimal DOM stubs so that browser-dependent modules (utils.js, etc.)
// can be loaded in Node.js without errors.
//
// Tests that need to observe DOM interactions can override the delegating
// hooks on the document object: _qsImpl, _qsaImpl, _createImpl.

const noop = () => {};

export function mockElement(overrides) {
  return {
    setAttribute: noop,
    getAttribute: () => "",
    appendChild: noop,
    remove: noop,
    closest: () => mockElement(),
    classList: { add: noop, remove: noop },
    addEventListener: noop,
    childNodes: [],
    firstChild: null,
    parentNode: { removeChild: noop, appendChild: noop },
    getElementsByTagName: () => [],
    querySelector: () => null,
    innerText: "",
    innerHTML: "",
    value: "",
    tagName: "DIV",
    style: {},
    textContent: "",
    href: "",
    placeholder: undefined,
    open: false,
    selectedIndex: -1,
    options: [],
    content: { firstChild: null },
    onchange: null,
    onclick: null,
    oninput: null,
    onkeydown: null,
    onkeyup: null,
    onmouseover: null,
    ...overrides,
  };
}

export function trackableElement(overrides) {
  const classes = new Set();
  return {
    _classes: classes,
    ...mockElement({
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
      },
      ...overrides,
    }),
  };
}

if (!globalThis.document) {
  globalThis.document = {
    _qsImpl: () => mockElement(),
    _qsaImpl: () => [],
    _createImpl: () => mockElement(),
    querySelector(...args) { return this._qsImpl(...args); },
    querySelectorAll(...args) { return this._qsaImpl(...args); },
    createElement(...args) { return this._createImpl(...args); },
    getElementById: () => null,
    addEventListener: noop,
    location: { href: "http://localhost/" },
  };
}

if (!globalThis.navigator) {
  globalThis.navigator = { language: "en" };
}

if (!globalThis.window) {
  globalThis.window = globalThis;
}

if (!globalThis.history) {
  globalThis.history = { replaceState: noop };
}
