import {
  $,
  $$,
  append,
  formatDate,
  hide,
  htmlToElement,
  setValue,
  show,
} from "./utils.js";
import { translate } from "./translation.js";

export function getModelTitles(titles) {
  return titles.map((e) => {
    if (e.title) {
      return e.title;
    }
    return ((e.vendor || "") + " " + (e.model || "") + " " + (e.variant || "")).trim();
  });
}

function getHelpTextClass(image) {
  const type = image.type;
  const name = image.name;

  if (type.includes("sysupgrade")) {
    return "tr-sysupgrade-help";
  } else if (type.includes("factory") || type === "trx" || type === "chk") {
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
  } else if (type.includes(".dtb")) {
    return "tr-dtb-help";
  } else if (type.includes("cpximg")) {
    return "tr-cpximg-help";
  } else if (type.startsWith("eva")) {
    return "tr-eva-help";
  } else if (type.includes("uboot") || type.includes("u-boot")) {
    return "tr-uboot-help";
  }
  return "tr-other-help";
}

function commonPrefix(array) {
  const A = array.sort();
  const a1 = A[0];
  const a2 = A[A.length - 1];
  let i = 0;
  while (i < a1.length && a1[i] === a2[i]) i++;
  return a1.slice(0, i);
}

function getNameDifference(images, image) {
  function ar(e) {
    return e.name.split("-");
  }
  const same = images.filter((e) => e.type === image.type);
  if (same.length > 1) {
    const prefix = commonPrefix(same.map((e) => ar(e)));
    const suffix = commonPrefix(same.map((e) => ar(e).reverse()));
    const base = ar(image);
    return base.slice(prefix.length, base.length - suffix.length).join("-");
  }
  return "";
}

function createLink(mobj, image, imageUrl) {
  const href = imageUrl + "/" + image.name;
  let label = image.type;

  const extra = getNameDifference(mobj.images, image);
  if (extra.length > 0) {
    label += ` (${extra})`;
  }

  return htmlToElement(
    `<td><a href="${href}" class="download-link"><span></span>${label.toUpperCase()}</a></td>`
  );
}

function createExtra(image, config) {
  return htmlToElement(
    "<td>" +
      (config.show_help
        ? `<div class="help-content ${getHelpTextClass(image)}"></div>`
        : "") +
      (image.sha256 ? `<div class="hash-content">sha256sum: ${image.sha256}</div>` : "") +
      "</td>"
  );
}

function sortImages(images) {
  const typePrecedence = ["sysupgrade", "factory"];
  return images.sort((a, b) => {
    const ap = typePrecedence.indexOf(a.type);
    const bp = typePrecedence.indexOf(b.type);
    return ap === -1 ? 1 : bp === -1 ? -1 : ap - bp;
  });
}

export function isAnyDeviceSelected(currentDevice) {
  return Object.keys(currentDevice).length > 0;
}

export function updateImages(version, mobj, context) {
  const { config, currentDevice } = context;

  $$("#download-table1 *").forEach((e) => e.remove());
  $$("#download-links2 *").forEach((e) => e.remove());
  $$("#download-extras2 *").forEach((e) => e.remove());

  if (mobj) {
    if ("asu_image_url" in mobj) {
      mobj.image_folder = mobj.asu_image_url;
    } else {
      const baseUrl = config.image_urls[version];
      mobj.image_folder = `${baseUrl}/targets/${mobj.target}`;
    }

    const h3 = $("#downloads1 h3");
    if ("build_cmd" in mobj) {
      h3.classList.remove("tr-downloads");
      h3.classList.add("tr-custom-downloads");
    } else {
      h3.classList.remove("tr-custom-downloads");
      h3.classList.add("tr-downloads");
    }

    translate();

    setValue("#image-model", getModelTitles(mobj.titles).join(" / "));
    setValue("#image-target", mobj.target);
    setValue("#image-version", mobj.version_number);
    setValue("#image-code", mobj.version_code);
    setValue("#image-date", formatDate(mobj.build_at));
    setValue("#image-folder", mobj.image_folder);

    setValue(
      "#image-info",
      (config.info_url || "")
        .replace("{title}", encodeURI($("#models").value))
        .replace("{target}", mobj.target)
        .replace("{id}", mobj.id)
        .replace("{version}", mobj.version_number)
    );

    setValue(
      "#image-link",
      document.location.href.split("?")[0] +
        "?version=" +
        encodeURIComponent(mobj.version_number) +
        "&target=" +
        encodeURIComponent(mobj.target) +
        "&id=" +
        encodeURIComponent(mobj.id)
    );

    mobj.images.sort((a, b) => a.name.localeCompare(b.name));

    const table1 = $("#download-table1");
    const links2 = $("#download-links2");
    const extras2 = $("#download-extras2");

    for (const image of sortImages(mobj.images)) {
      const link = createLink(mobj, image, mobj.image_folder);
      const extra = createExtra(image, config);

      const row = append(table1, "TR");
      row.appendChild(link);
      row.appendChild(extra);
    }

    for (const image of sortImages(mobj.images)) {
      const link = createLink(mobj, image, mobj.image_folder);
      const extra = createExtra(image, config);

      links2.appendChild(link);
      extras2.appendChild(extra);

      hide(extra);

      link.onmouseover = function () {
        links2.childNodes.forEach((e) => e.firstChild.classList.remove("download-link-hover"));
        link.firstChild.classList.add("download-link-hover");

        extras2.childNodes.forEach((e) => hide(e));
        hide(extra);
      };
    }

    if ("manifest" in mobj === false) {
      $("#asu").open = false;
      hide("#asu-log");
      hide("#asu-buildstatus");
      $("#asu-packages").value = mobj.default_packages
        .concat(mobj.device_packages)
        .concat(config.asu_extra_packages || [])
        .join(" ");
    }

    translate();

    if (isAnyDeviceSelected(currentDevice)) {
      history.replaceState(
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
    }

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
