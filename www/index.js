/* global translations, config */
/* exported init */
let current_device = {};
let current_language = "en";
let url_params = undefined;

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

function show(query) {
  (typeof query === "string" ? $(query) : query).classList.remove("hide");
}

function hide(query) {
  (typeof query === "string" ? $(query) : query).classList.add("hide");
}

function split(str) {
  return str.match(/[^\s,]+/g) || [];
}

function getModelTitles(titles) {
  return titles.map((e) => {
    if (e.title) {
      return e.title;
    } else {
      return (
        (e.vendor || "") +
        " " +
        (e.model || "") +
        " " +
        (e.variant || "")
      ).trim();
    }
  });
}

function setupSelectList(select, items, onselection) {
  for (const item of items.sort().reverse()) {
    const option = document.createElement("OPTION");
    option.innerHTML = item;
    select.appendChild(option);
  }

  // pre-select version from URL or config.json
  const preselect = url_params.get("version") || config.default_version;
  if (preselect) {
    $("#versions").value = preselect;
  }

  select.addEventListener("change", () => {
    onselection(items[select.selectedIndex]);
  });

  if (select.selectedIndex >= 0) {
    onselection(items[select.selectedIndex]);
  }
}

// Change the translation of the entire document
function translate() {
  const mapping = translations[current_language];
  for (const tr in mapping) {
    $$("." + tr).forEach((e) => {
      e.innerText = mapping[tr];
    });
  }
}

function normalize(s) {
  // not allowed to change length of string
  return s.toUpperCase().replace(/[-_.]/g, " ");
}

// return array of matching ranges
function match(value, patterns) {
  // find matching ranges
  const item = normalize(value);
  let matches = [];
  for (const p of patterns) {
    const i = item.indexOf(p);
    if (i == -1) return [];
    matches.push({ begin: i, length: p.length });
  }

  matches.sort((a, b) => a.begin > b.begin);

  // merge overlapping ranges
  let prev = null;
  let ranges = [];
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

function setupAutocompleteList(input, items, onbegin, onend) {
  let currentFocus = -1;

  // sort numbers and other characters separately
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  items.sort(collator.compare);

  input.oninput = function () {
    onbegin();

    let pattern = this.value;

    // close any already open lists of autocompleted values
    closeAllLists();

    if (pattern.length === 0) {
      return false;
    }

    if (items.includes(pattern)) {
      return false;
    }

    // create a DIV element that will contain the items (values):
    const list = document.createElement("DIV");
    list.setAttribute("id", this.id + "-autocomplete-list");
    list.setAttribute("class", "autocomplete-items");
    // append the DIV element as a child of the autocomplete container:
    this.parentNode.appendChild(list);

    const patterns = split(normalize(pattern));
    let count = 0;
    for (const item of items) {
      const matches = match(item, patterns);
      if (matches.length == 0) {
        continue;
      }

      count += 1;
      if (count >= 15) {
        let div = document.createElement("DIV");
        div.innerText = "...";
        list.appendChild(div);
        break;
      } else {
        let div = document.createElement("DIV");
        // make matching letters bold:
        let prev = 0;
        let html = "";
        for (const m of matches) {
          html += item.substr(prev, m.begin - prev);
          html += "<strong>" + item.substr(m.begin, m.length) + "</strong>";
          prev = m.begin + m.length;
        }
        html += item.substr(prev);
        html += '<input type="hidden" value="' + item + '">';
        div.innerHTML = html;

        div.addEventListener("click", function () {
          // include selected value
          input.value = this.getElementsByTagName("input")[0].value;
          // close the list of autocompleted values,
          closeAllLists();
          onend(input);
        });

        list.appendChild(div);
      }
    }
  };

  input.onkeydown = function (e) {
    let x = document.getElementById(this.id + "-autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      // key down
      currentFocus += 1;
      // and and make the current item more visible:
      setActive(x);
    } else if (e.keyCode == 38) {
      // key up
      currentFocus -= 1;
      // and and make the current item more visible:
      setActive(x);
    } else if (e.keyCode == 13) {
      // If the ENTER key is pressed, prevent the form from being submitted,
      e.preventDefault();
      if (currentFocus > -1) {
        // and simulate a click on the 'active' item:
        if (x) x[currentFocus].click();
      }
    }
  };

  input.onfocus = function () {
    onend(input);
  };

  function setActive(xs) {
    // a function to classify an item as 'active':
    if (!xs) return false;
    // start by removing the 'active' class on all items:
    for (const x of xs) {
      x.classList.remove("autocomplete-active");
    }
    if (currentFocus >= xs.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = xs.length - 1;
    // add class 'autocomplete-active':
    xs[currentFocus].classList.add("autocomplete-active");
  }

  function closeAllLists(elmnt) {
    // close all autocomplete lists in the document,
    // except the one passed as an argument:
    for (const x of $$(".autocomplete-items")) {
      if (elmnt != x && elmnt != input) {
        x.parentNode.removeChild(x);
      }
    }
  }

  // close select list if focus is lost
  document.addEventListener("click", (e) => {
    closeAllLists(e.target);
  });

  // try to match if there is an input
  if (input.value.length) {
    input.oninput();
  }
}

function setValue(query, value) {
  const e = $(query);
  if (value !== undefined && value.length > 0) {
    if (e.tagName == "A") {
      e.href = value;
    } else {
      e.innerText = value;
    }
    show(e.parentNode);
  } else {
    hide(e.parentNode);
  }
}

function getHelpTextClass(image) {
  const type = image.type;
  const name = image.name;

  if (type.includes("sysupgrade")) {
    return "tr-sysupgrade-help";
  } else if (type.includes("factory") || type == "trx" || type == "chk") {
    return "tr-factory-help";
  } else if (name.includes("initramfs")) {
    return "tr-initramfs-help";
  } else if (
    type.includes("kernel") ||
    type.includes("zimage") ||
    type.includes("uimage")
  ) {
    return "tr-kernel-help";
  } else if (type.includes("root")) {
    return "tr-rootfs-help";
  } else if (type.includes("sdcard")) {
    return "tr-sdcard-help";
  } else if (type.includes("tftp")) {
    return "tr-tftp-help";
  } else {
    return "tr-other-help";
  }
}

function commonPrefix(array) {
  const A = array.sort();
  const a1 = A[0];
  const a2 = A[A.length - 1];
  let i = 0;
  while (i < a1.length && a1[i] === a2[i]) i++;
  return a1.slice(0, i);
}

// get difference in image names
function getNameDifference(images, image) {
  function ar(e) {
    return e.name.split("-");
  }
  const same = images.filter((e) => e.type == image.type);
  if (same.length > 1) {
    const prefix = commonPrefix(same.map((e) => ar(e)));
    const suffix = commonPrefix(same.map((e) => ar(e).reverse()));
    const base = ar(image);
    return base.slice(prefix.length, base.length - suffix.length).join("-");
  } else {
    return "";
  }
}

// add download button for image
function createLink(mobj, image, image_url) {
  const a = document.createElement("A");
  a.classList.add("download-link");
  a.href =
    image_url
      .replace("{title}", encodeURI($("#models").value))
      .replace("{target}", mobj.target)
      .replace("{id}", mobj.id)
      .replace("{version}", mobj.version_number) +
    "/" +
    image.name;

  let label = image.type;

  // distinguish labels if neccessary
  const extra = getNameDifference(mobj.images, image);
  if (extra.length > 0) {
    label += " (" + extra + ")";
  }

  const span = document.createElement("SPAN");
  span.appendChild(document.createTextNode(""));
  a.appendChild(span);
  a.appendChild(document.createTextNode(label.toUpperCase()));
  return a;
}

function append(parent, tag) {
  const element = document.createElement(tag);
  parent.appendChild(element);
  return element;
}

function updateImages(mobj, overview) {
  // remove download table
  $$("#download-links span").forEach((e) => e.remove());

  if (mobj) {
    const images = mobj.images;

    // update title translation
    translate();

    // fill out build info
    setValue("#image-model", getModelTitles(mobj.titles).join(" / "));
    setValue("#image-target", mobj.target);
    setValue("#image-version", mobj.version_number);
    setValue("#image-code", mobj.version_code);
    setValue("#image-date", mobj.build_at);
    setValue("#image-sha256", undefined);

    setValue(
      "#image-info",
      (config.info_url || overview.info_url || "")
        .replace("{title}", encodeURI($("#models").value))
        .replace("{target}", mobj.target)
        .replace("{id}", mobj.id)
        .replace("{version}", mobj.version_number)
    );

    images.sort((a, b) => a.name.localeCompare(b.name));

    const image_url = config.image_url || overview.image_url || "";

    const table = append($("#download-links"), "SPAN");

    if (config.show_help) {
      table.classList.add("download-table");
    }

    for (const image of images) {
      const link = createLink(mobj, image, image_url);
      const help = getHelpTextClass(image);
      const row = append(table, "SPAN");
      row.classList.add("download-row");

      const link_cell = append(row, "SPAN");
      link_cell.classList.add("link-cell");
      link_cell.appendChild(link);

      const extra_cell = append(row, "SPAN");
      extra_cell.classList.add("extra-cell");

      const help_div = append(extra_cell, "DIV");
      const hash_div = append(extra_cell, "DIV");

      help_div.classList.add("help-content");
      help_div.classList.add(help);

      hash_div.classList.add("hash-content");
      if (image.sha256) {
        hash_div.innerText = "sha256sum: " + image.sha256;
      }

      link.onmouseover = function () {
        // persistent highlight on a single download button
        $$(".download-link").forEach((e) =>
          e.classList.remove("download-link-hover")
        );
        link.classList.add("download-link-hover");

        // show hash in table instead of in help text
        if (!config.show_help) {
          setValue("#image-sha256", "sha256sum: " + image.sha256);
        }
      };
    }

    translate();

    // set current selection in URL
    history.pushState(
      null,
      null,
      document.location.href.split("?")[0] +
        "?version=" +
        encodeURIComponent(mobj.version_number) +
        "&target=" +
        encodeURIComponent(mobj.target) +
        "&id=" +
        encodeURIComponent(mobj.id)
    );

    hide("#notfound");
    show("#images");
  } else {
    if ($("#models").value.length > 0) {
      show("#notfound");
    } else {
      hide("#notfound");
    }
    hide("#images");
  }
}

// Update model title in search box.
// Device id might change between releases.
function setModel(overview, target, id) {
  if (target && id && $("#models").value.length == 0) {
    for (const mobj of Object.values(overview.profiles)) {
      if (mobj.id === id && mobj.target === target) {
        $("#models").value = mobj.title;
        $("#models").oninput();
        return;
      }
    }
  }
}

function changeModel(version, overview, title, base_url) {
  const entry = overview.profiles[title];
  if (entry) {
    fetch(base_url + "/" + entry.target + "/" + entry.id + ".json", {
      cache: "no-cache",
    })
      .then((obj) => {
        return obj.json();
      })
      .then((mobj) => {
        mobj["id"] = entry.id;
        updateImages(mobj, overview);
        current_device = {
          version: version,
          id: entry.id,
          target: entry.target,
        };
      });
  } else {
    updateImages();
    current_device = {};
  }
}

function init() {
  url_params = new URLSearchParams(window.location.search);

  setupSelectList($("#versions"), Object.keys(config.versions), (version) => {
    // A new version was selected
    let base_url = config.versions[version];
    fetch(base_url + "/overview.json", { cache: "no-cache" })
      .then((obj) => {
        return obj.json();
      })
      .then((obj) => {
        var dups = {};
        var profiles = [];

        // Some models exist in multiple targets when
        // a target is in the process of being renamed.
        // Appends target in brackets to make title unique.
        function resolve_duplicate(e) {
          const tu = e.title.toUpperCase();
          if (tu in dups) {
            e.title += " (" + e.target + ")";
            let o = dups[tu];
            if (o.title.toUpperCase() == tu) {
              o.title += " (" + o.target + ")";
            }
          } else {
            dups[tu] = e;
          }
        }

        for (const profile of obj.profiles) {
          for (let title of getModelTitles(profile.titles)) {
            if (title.length == 0) {
              console.warn(
                "Empty device title for device id: " +
                  profile.target +
                  ", " +
                  profile.id
              );
              continue;
            }

            const e = Object.assign({ id: profile.id, title: title }, profile);
            resolve_duplicate(e);
            profiles.push(e);
          }
        }

        // replace profiles
        obj.profiles = profiles.reduce((d, e) => ((d[e.title] = e), d), {});

        return obj;
      })
      .then((obj) => {
        setupAutocompleteList(
          $("#models"),
          Object.keys(obj.profiles),
          updateImages,
          (selectList) => {
            changeModel(version, obj, selectList.value, base_url);
          }
        );

        // set model when selected version changes
        setModel(
          obj,
          current_device["target"] || url_params.get("target"),
          current_device["id"] || url_params.get("id")
        );

        // trigger update of current selected model
        $("#models").onfocus();
      });
  });

  // hide fields
  updateImages();

  // default to browser language
  const lang = (navigator.language || navigator.userLanguage).toLowerCase();
  const lang_short = lang.split("-")[0];
  if (lang in translations) {
    current_language = lang;
  } else if (lang_short in translations) {
    current_language = lang_short;
  }

  $("#languages select").value = current_language;

  translate();

  $("#languages select").onclick = function () {
    current_language = this.children[this.selectedIndex].value;
    translate();
  };
}
