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

  const formValues = {
    orb_token: $("#orb-token").value.trim(),
    root_password: $("#orb-root-password").value,
  };
  const extraDefaults = $("#orb-extra-defaults").value;

  const defaultsScript = assembleDefaults(
    state.common,
    recipe,
    formValues,
    extraDefaults
  );

  let keyContents;
  try {
    keyContents = await resolveKeys(recipe.repository_keys || []);
  } catch (err) {
    showAlert(`Failed to load repository keys: ${err.message}`);
    return;
  }

  const buildRequest = {
    distro: "openwrt",
    version: recipe.version,
    target: recipe.target,
    profile: recipe.profile,
    packages: recipe.packages || [],
    diff_packages: true,
    repositories: recipe.repositories || {},
    repositories_mode: "append",
    repository_keys: keyContents,
    defaults: defaultsScript,
  };

  submitBuild(buildRequest);
}

document.addEventListener("DOMContentLoaded", init);
