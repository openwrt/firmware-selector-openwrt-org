export const $ = document.querySelector.bind(document);
export const $$ = document.querySelectorAll.bind(document);

export function show(query) {
  (typeof query === "string" ? $(query) : query).classList.remove("hide");
}

export function hide(query) {
  (typeof query === "string" ? $(query) : query).classList.add("hide");
}

export function split(str) {
  return str.match(/[^\s,]+/g) || [];
}

export function htmlToElement(html) {
  const e = document.createElement("template");
  e.innerHTML = html.trim();
  return e.content.firstChild;
}

export function showAlert(message) {
  $("#alert").innerText = message;
  show("#alert");
}

export function hideAlert() {
  hide("#alert");
  $("#alert").innerText = "";
}

export function setValue(query, value) {
  const e = $(query);
  const p = e.closest(".row");
  if (value !== undefined && value.length > 0) {
    if (e.tagName === "A") {
      e.href = value;
    } else {
      e.innerText = value;
    }
    show(e);
    show(p);
  } else {
    hide(e);
    hide(p);
  }
}

export function formatDate(date) {
  if (date) {
    const d = Date.parse(date);
    return new Date(d).toLocaleString();
  }
  return date;
}

export function append(parent, tag) {
  const element = document.createElement(tag);
  parent.appendChild(element);
  return element;
}
