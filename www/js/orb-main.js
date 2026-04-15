// Entry point for the orb-forge variant of the firmware selector.
// Replaces the upstream device-picker flow with one driven by recipe YAML
// files served from /recipes/ (see orb-forge's recipes/ directory).

import { $, show, hide, showAlert, hideAlert } from "./utils.js";
import {
  loadAllRecipes,
  getRecipeById,
  renderDeviceLinks,
  mergedPackages,
  resolveKeys,
  assembleDefaults,
} from "./orb-recipes.js";
import { submitBuild } from "./orb-asu.js";

const state = {
  common: null,
  recipes: [],
  currentRecipe: null,
};

async function init() {
  hideAlert();

  try {
    const { common, recipes } = await loadAllRecipes();
    state.common = common;
    state.recipes = recipes;
  } catch (err) {
    showAlert(`Failed to load recipes: ${err.message}`);
    return;
  }

  if (state.recipes.length === 0) {
    showAlert(
      "No recipes found in /recipes/. Add a YAML file to orb-forge's recipes/ directory and recreate the selector service."
    );
    return;
  }

  populateDeviceDropdown();
  wireForm();
}

function populateDeviceDropdown() {
  const select = $("#orb-device");
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.innerText = "Choose a device";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  for (const recipe of state.recipes) {
    const opt = document.createElement("option");
    opt.value = recipe.id;
    opt.innerText = recipe.title || recipe.id;
    select.appendChild(opt);
  }
}

function wireForm() {
  const form = $("#orb-form");
  const select = $("#orb-device");

  select.addEventListener("change", () => {
    state.currentRecipe = getRecipeById(state.recipes, select.value);
    $("#orb-device-description").innerText =
      state.currentRecipe?.description || "";

    // Device links (OpenWrt wiki, vendor docs, orb.net docs).
    renderDeviceLinks($("#orb-device-links"), state.currentRecipe);

    // Recipe options (e.g. Wi-Fi module selection). Each option becomes
    // a labeled dropdown. Selections are collected at build time and
    // their packages merged into the request.
    renderOptions(state.currentRecipe);

    // Show Wi-Fi fields only for recipes with capabilities.wifi.
    const wifiGroup = $("#orb-wifi-group");
    if (state.currentRecipe?.capabilities?.wifi) {
      show(wifiGroup);
    } else {
      hide(wifiGroup);
    }

    // Show the "Install to eMMC" group only for recipes that declare
    // an install block — recipes without one don't support the flow.
    // The hint text below the checkbox comes from the recipe's
    // install.hint field so recipe authors can note device-specific
    // caveats (e.g. "not all E20C models have eMMC").
    const installGroup = $("#orb-install-group");
    if (state.currentRecipe?.install) {
      show(installGroup);
      $("#orb-install-hint").innerText =
        state.currentRecipe.install.hint || "";
    } else {
      hide(installGroup);
    }
    validateForm();
  });

  form.addEventListener("input", validateForm);
  form.addEventListener("submit", onSubmit);

  // Password show/hide toggles
  document.querySelectorAll(".orb-toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (input) {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.textContent = showing ? "show" : "hide";
      }
    });
  });

  validateForm();
}

function validateForm() {
  const device = $("#orb-device").value;
  const token = $("#orb-token").value.trim();
  const rootPw = $("#orb-root-password").value;
  const valid = !!device && !!token && !!rootPw;
  $("#orb-build").disabled = !valid;
  return valid;
}

async function onSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const recipe = state.currentRecipe;
  if (!recipe) return;

  // Resolve repository keys BEFORE assembling the defaults script so
  // the first key (by convention: the Orb apk signing key) can be
  // Mustache-substituted into _common.yaml's feed-persistence block.
  let keyContents;
  try {
    keyContents = await resolveKeys(recipe.repository_keys || []);
  } catch (err) {
    showAlert(`Failed to load repository keys: ${err.message}`);
    return;
  }

  // The install-to-eMMC checkbox is only meaningful when the selected
  // recipe declares an install block — otherwise we force it false so
  // _common.yaml's {{#install_to_emmc}} section doesn't render.
  const installBlock = recipe.install || null;
  const installToEmmc =
    !!installBlock && $("#orb-install-to-emmc").checked;

  const formValues = {
    orb_token: $("#orb-token").value.trim(),
    root_password: $("#orb-root-password").value,
    // First resolved key is assumed to be the Orb apk signing key.
    // _common.yaml writes it to /etc/apk/keys/orb-packages.pem so
    // the running device can verify new Orb versions fetched by
    // orb-update. Recipes must list the Orb key first in
    // repository_keys — enforced by convention, not schema, today.
    orb_apk_key: keyContents[0] || "",
    // Wi-Fi config — only meaningful for recipes with capabilities.wifi.
    // The recipe's defaults template uses {{#wifi_ssid}} as a section
    // guard so the whole Wi-Fi block is omitted when SSID is empty.
    wifi_ssid: $("#orb-wifi-ssid").value.trim(),
    wifi_password: $("#orb-wifi-password").value,
    wifi_encryption: $("#orb-wifi-encryption").value,
    wifi_country: ($("#orb-wifi-country").value || "US").toUpperCase().trim(),
    // Installer config — mirrored from the recipe's install block
    // into flat Mustache variables that _common.yaml's installer
    // heredoc interpolates. Empty strings when the recipe has no
    // install block (in which case install_to_emmc is also false
    // and the whole block gets elided by the Mustache section).
    install_to_emmc: installToEmmc,
    install_sd_device: installBlock?.sd_device || "",
    install_emmc_device: installBlock?.emmc_device || "",
    install_size_from_partition: installBlock?.size_from_partition || "",
    install_status_led: installBlock?.status_led || "",
  };
  const extraDefaults = $("#orb-extra-defaults").value;

  const defaultsScript = assembleDefaults(
    state.common,
    recipe,
    formValues,
    extraDefaults
  );

  const buildRequest = {
    distro: "openwrt",
    version: recipe.version,
    target: recipe.target,
    profile: recipe.profile,
    // Packages sent to ASU is the union of _common.yaml's packages
    // (orb-forge-wide dependencies like micrond for orb-update's
    // cron) and the selected recipe's packages (device-specific
    // extras like orb). This is a list of ADDITIONS on top of the
    // profile's default packages — NOT a complete replacement list.
    // diff_packages MUST be false for this semantics: when true, ASU
    // interprets the list as a full override and silently removes
    // every profile default not in it, stripping base-files and a
    // bunch of busybox applets. That's the upstream selector's mode
    // (it pre-fills a textarea with the full default list), but it's
    // the wrong shape for a recipe system.
    packages: mergedPackages(state.common, recipe, collectSelectedOptions(recipe)),
    diff_packages: false,
    repositories: recipe.repositories || {},
    repositories_mode: "append",
    repository_keys: keyContents,
    defaults: defaultsScript,
  };

  submitBuild(buildRequest, recipe);
}

// Renders recipe options (e.g. Wi-Fi module selection) as labeled
// dropdowns in the #orb-options container. Each option defined in
// recipe.options becomes a <select> with id="orb-opt-{name}".
function renderOptions(recipe) {
  const container = $("#orb-options");
  container.innerHTML = "";
  if (!recipe || !recipe.options) return;

  for (const [name, opt] of Object.entries(recipe.options)) {
    const div = document.createElement("div");

    const label = document.createElement("label");
    label.setAttribute("for", `orb-opt-${name}`);
    label.textContent = opt.label || name;
    div.appendChild(label);

    const select = document.createElement("select");
    select.id = `orb-opt-${name}`;
    for (const [key, choice] of Object.entries(opt.choices || {})) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = choice.label || key;
      if (key === (opt.default || "")) option.selected = true;
      select.appendChild(option);
    }
    div.appendChild(select);

    container.appendChild(div);
  }
}

// Reads the current selection from each recipe-option dropdown and
// returns an object like { wifi_module: "intel_be200" }.
function collectSelectedOptions(recipe) {
  const result = {};
  if (!recipe || !recipe.options) return result;
  for (const name of Object.keys(recipe.options)) {
    const el = document.getElementById(`orb-opt-${name}`);
    if (el) result[name] = el.value;
  }
  return result;
}

document.addEventListener("DOMContentLoaded", init);
