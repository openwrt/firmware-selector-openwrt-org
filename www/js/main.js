import { $, show, showAlert } from "./utils.js";
import { initTranslation } from "./translation.js";
import { createAsuRequestBuilder } from "./asu.js";
import { updateImages } from "./images.js";
import {
  insertSnapshotVersions,
  normalizeOverviewProfiles,
  setModel,
  setupProfilesAutocomplete,
  setupSelectList,
  setupUciDefaults,
} from "./models.js";

let currentDevice = {};
let urlParams;
let customDevicePackages = {};
const ofsVersion = "%GIT_VERSION%";
const progress = {
  "tr-init": 5,
  "tr-queued": 10,
  "tr-started": 12,
  "tr-container-setup": 15,
  "tr-download-imagebuilder": 20,
  "tr-validate-manifest": 30,
  "tr-unpack-imagebuilder": 40,
  "tr-calculate-packages-hash": 60,
  "tr-building-image": 80,
};

const config = window.config;

function setCurrentDevice(next) {
  currentDevice = next;
}

function updateImagesBound(version, mobj) {
  return updateImages(version, mobj, {
    config,
    currentDevice,
    customDevicePackages,
  });
}

const buildAsuRequest = createAsuRequestBuilder({
  config,
  progress,
  ofsVersion,
  getCurrentDevice: () => currentDevice,
  updateImages: updateImagesBound,
});

async function init() {
  urlParams = new URLSearchParams(window.location.search);
  $("#ofs-version").innerText = ofsVersion;

  if (typeof config.asu_url !== "undefined") {
    show("#asu");
  }

  customDevicePackages = await fetch("device_packages.json", {
    cache: "no-cache",
  })
    .then((obj) => (obj.status === 200 ? obj.json() : {}))
    .catch(() => ({}));

  const upstreamConfig = await fetch(config.image_url + "/.versions.json", {
    cache: "no-cache",
  })
    .then((obj) => {
      if (obj.status === 200) {
        return obj.json();
      }
      return { versions_list: [] };
    })
    .then((obj) => {
      const unsupportedVersionsRe = /^(19\.07\.\d|18\.06\.\d|17\.01\.\d)$/;
      const versions = obj.versions_list.filter(
        (version) => !unsupportedVersionsRe.test(version)
      );

      if (config.upcoming_version) {
        versions.push(obj.upcoming_version);
      }

      if (config.show_snapshots) {
        insertSnapshotVersions(versions);
      }

      return {
        versions: versions,
        image_url_override: obj.image_url_override,
        default_version: obj.stable_version,
      };
    })
    .catch((err) => showAlert(err.message));

  if (!upstreamConfig) {
    return;
  }

  if (!config.versions) {
    config.versions = upstreamConfig.versions;
  }
  if (!config.default_version) {
    config.default_version = upstreamConfig.default_version;
  }
  config.overview_urls = {};
  config.image_urls = {};

  const overviewUrl = config.image_url;
  const imageUrl = upstreamConfig.image_url_override || config.image_url;
  for (const version of config.versions) {
    if (version === "SNAPSHOT") {
      config.overview_urls[version] = `${overviewUrl}/snapshots/`;
      config.image_urls[version] = `${imageUrl}/snapshots/`;
    } else {
      config.overview_urls[version] = `${overviewUrl}/releases/${version}`;
      config.image_urls[version] = `${imageUrl}/releases/${version}`;
    }
  }

  console.log("versions: " + config.versions);

  setupSelectList(
    $("#versions"),
    config.versions,
    (version) => {
      const currentOverviewUrl = `${config.overview_urls[version]}/.overview.json`;
      fetch(currentOverviewUrl, { cache: "no-cache" })
        .then((obj) => {
          if (obj.status !== 200) {
            throw new Error(`Failed to fetch ${obj.url}`);
          }
          return obj.json();
        })
        .then((obj) => normalizeOverviewProfiles(obj))
        .then((obj) => {
          setupProfilesAutocomplete(version, obj, {
            updateImages: updateImagesBound,
            changeModelContext: {
              config,
              updateImages: updateImagesBound,
              setCurrentDevice,
            },
          });

          setModel(
            obj,
            currentDevice.target || urlParams.get("target"),
            currentDevice.id || urlParams.get("id")
          );
          $("#models").onkeyup();
        })
        .catch((err) => showAlert(err.message));
    },
    urlParams,
    config
  );

  setupUciDefaults();
  updateImagesBound();
  initTranslation();

  const asuButton = $("#asu-request-build");
  if (asuButton) {
    asuButton.addEventListener("click", (e) => {
      e.preventDefault();
      buildAsuRequest();
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
