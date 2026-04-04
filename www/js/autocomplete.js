import { $$, split } from "./utils.js";

export function match(value, patterns) {
  const item = value.toUpperCase();
  const matches = [];
  for (const p of patterns) {
    const i = item.indexOf(p);
    if (i === -1) return [];
    matches.push({ begin: i, length: p.length });
  }

  matches.sort((a, b) => a.begin > b.begin);

  let prev = null;
  const ranges = [];
  for (const m of matches) {
    if (prev && m.begin <= prev.begin + prev.length) {
      prev.length = Math.max(prev.length, m.begin + m.length - prev.begin);
    } else {
      ranges.push(m);
      prev = m;
    }
  }
  return ranges;
}

export function setupAutocompleteList(input, items, onbegin, onend) {
  let currentFocus = -1;
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  items.sort(collator.compare);

  input.oninput = function () {
    onbegin();

    const pattern = this.value;
    closeAllLists();

    if (pattern.length === 0) {
      return false;
    }

    if (items.includes(pattern)) {
      closeAllLists();
      onend(input);
      return false;
    }

    const list = document.createElement("DIV");
    list.setAttribute("id", this.id + "-autocomplete-list");
    list.setAttribute("class", "autocomplete-items");
    this.parentNode.appendChild(list);

    const patterns = split(pattern.toUpperCase());
    let count = 0;
    for (const item of items) {
      const matches = match(item, patterns);
      if (matches.length === 0) {
        continue;
      }

      count += 1;
      if (count >= 15) {
        const div = document.createElement("DIV");
        div.innerText = "...";
        list.appendChild(div);
        break;
      }

      const div = document.createElement("DIV");
      let prev = 0;
      let html = "";
      for (const m of matches) {
        html += item.substr(prev, m.begin - prev);
        html += `<strong>${item.substr(m.begin, m.length)}</strong>`;
        prev = m.begin + m.length;
      }
      html += item.substr(prev);
      html += `<input type="hidden" value="${item}">`;
      div.innerHTML = html;

      div.addEventListener("click", function () {
        input.value = this.getElementsByTagName("input")[0].value;
        closeAllLists();
        onend(input);
      });

      list.appendChild(div);
    }
  };

  input.onkeydown = function (e) {
    let x = document.getElementById(this.id + "-autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode === 40) {
      currentFocus += 1;
      setActive(x);
    } else if (e.keyCode === 38) {
      currentFocus -= 1;
      setActive(x);
    } else if (e.keyCode === 13) {
      e.preventDefault();
      if (currentFocus > -1) {
        if (x) x[currentFocus].click();
      }
    }
  };

  input.onkeyup = function (e) {
    if (e && (e.key === "Enter" || e.keyCode === 13)) {
      onend(input);
    }
  };

  function setActive(xs) {
    if (!xs) return false;
    for (const x of xs) {
      x.classList.remove("autocomplete-active");
    }
    if (currentFocus >= xs.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = xs.length - 1;
    xs[currentFocus].classList.add("autocomplete-active");
    xs[currentFocus].setAttribute("tabindex", "0");
    return true;
  }

  input.setAttribute("tabindex", "0");

  function closeAllLists(elmnt) {
    for (const x of $$(".autocomplete-items")) {
      if (elmnt !== x && elmnt !== input) {
        x.parentNode.removeChild(x);
      }
    }
  }

  document.addEventListener("click", (e) => {
    closeAllLists(e.target);
  });
}
