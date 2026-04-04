import { $, $$, hideAlert, showAlert } from "./utils.js";

let currentLanguage = "";
let currentLanguageJson = {};

function apply(language, languageJson) {
  currentLanguage = language;
  currentLanguageJson = languageJson;
  for (const tr in languageJson) {
    $$(`.${tr}`).forEach((e) => {
      if (e.placeholder !== undefined) {
        e.placeholder = languageJson[tr];
      } else {
        e.innerText = languageJson[tr];
      }
    });
  }
}

export function translate(lang) {
  const newLang = lang || currentLanguage || "en";
  if (currentLanguage === newLang) {
    apply(currentLanguage, currentLanguageJson);
  } else {
    fetch(`langs/${newLang}.json`)
      .then((obj) => {
        if (obj.status !== 200) {
          throw new Error(`Failed to fetch ${obj.url}`);
        }
        hideAlert();
        return obj.json();
      })
      .then((mapping) => apply(newLang, mapping))
      .catch((err) => showAlert(err.message));
  }
}

export function initTranslation() {
  const select = $("#languages-select");

  const long = (navigator.language || navigator.userLanguage).toLowerCase();
  const short = long.split("-")[0];
  if (select.querySelector(`[value="${long}"]`)) {
    select.value = long;
  } else if (select.querySelector(`[value="${short}"]`)) {
    select.value = short;
  } else {
    select.value = currentLanguage || "en";
  }

  select.onchange = function () {
    const option = select.options[select.selectedIndex];
    $("#languages-button").textContent = option.text.replace(/ \(.*/, "");
    translate(option.value);
  };

  select.onchange();
}
