// Entry point for the orb-forge variant of the firmware selector.
// Replaces the upstream device-picker flow with one driven by recipe YAML
// files served from /recipes/ (see orb-forge's recipes/ directory).

import { $, show, hide, showAlert, hideAlert } from "./utils.js";
import {
  loadAllRecipes,
  getRecipeById,
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
    validateForm();
  });

  form.addEventListener("input", validateForm);
  form.addEventListener("submit", onSubmit);

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

  const formValues = {
    orb_token: $("#orb-token").value.trim(),
    root_password: $("#orb-root-password").value,
    // First resolved key is assumed to be the Orb apk signing key.
    // _common.yaml writes it to /etc/apk/keys/orb-packages.pem so
    // the running device can verify new Orb versions fetched by
    // orb-update. Recipes must list the Orb key first in
    // repository_keys — enforced by convention, not schema, today.
    orb_apk_key: keyContents[0] || "",
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
    // Recipe `packages` is a list of ADDITIONS on top of the profile's
    // default packages — NOT a complete replacement list. diff_packages
    // MUST be false for this semantics: when true, ASU interprets the
    // list as a full override and silently removes every profile default
    // the recipe didn't explicitly re-list, stripping base-files and
    // a bunch of busybox applets in the process. That's the upstream
    // selector's mode (it pre-fills a textarea with the full default
    // list), but it's the wrong shape for a recipe system.
    packages: recipe.packages || [],
    diff_packages: false,
    repositories: recipe.repositories || {},
    repositories_mode: "append",
    repository_keys: keyContents,
    defaults: defaultsScript,
  };

  submitBuild(buildRequest);
}

document.addEventListener("DOMContentLoaded", init);
