import { $, $$, hide, show, split } from "./utils.js";
import { translate } from "./translation.js";

export function createAsuRequestBuilder(context) {
  const { config, progress, ofsVersion, getCurrentDevice, updateImages } =
    context;

  function showStatus(message, loading, type) {
    const bs = $("#asu-buildstatus");
    switch (type) {
      case "error":
        bs.classList.remove("asu-info");
        bs.classList.add("asu-error");
        show(bs);
        break;
      case "info":
        bs.classList.remove("asu-error");
        bs.classList.add("asu-info");
        show(bs);
        break;
      default:
        hide(bs);
        break;
    }

    const tr = message.startsWith("tr-") ? message.replaceAll("_", "-") : "";
    let status = "";
    if (loading) {
      status += `<progress style='margin-right: 10px;' max='100' value=${
        progress[tr] || ""
      }></progress>`;
    }
    status += `<span class="${tr}">${message}</span>`;
    $("#asu-buildstatus span").innerHTML = status;
    translate();
  }

  function buildAsuRequest(requestHash) {
    $$("#download-table1 *").forEach((e) => e.remove());
    $$("#download-links2 *").forEach((e) => e.remove());
    $$("#download-extras2 *").forEach((e) => e.remove());
    hide("#asu-log");

    const currentDevice = getCurrentDevice();
    if (!currentDevice || !currentDevice.id) {
      showStatus("bad profile", false, "error");
      return;
    }

    let requestUrl = `${config.asu_url}/api/v1/build`;
    let body = JSON.stringify({
      profile: currentDevice.id,
      target: currentDevice.target,
      packages: split($("#asu-packages").value),
      defaults: $("#uci-defaults-content").value,
      version_code: $("#image-code").innerText,
      version: $("#versions").value,
      diff_packages: true,
      client: "ofs/" + ofsVersion,
    });
    let method = "POST";

    if (requestHash) {
      requestUrl += `/${requestHash}`;
      body = null;
      method = "GET";
    }

    fetch(requestUrl, {
      cache: "no-cache",
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    })
      .then((response) => {
        switch (response.status) {
          case 200:
            showStatus("tr-build-successful", false, "info");
            response.json().then((mobj) => {
              if ("stderr" in mobj) {
                $("#asu-stderr").innerText = mobj.stderr;
                $("#asu-stdout").innerText = mobj.stdout;
                show("#asu-log");
              } else {
                hide("#asu-log");
              }
              showStatus("tr-build-successful", false, "info");
              mobj.id = currentDevice.id;
              mobj.asu_image_url = config.asu_url + "/store/" + mobj.bin_dir;
              updateImages(mobj.version_number, mobj);
            });
            break;
          case 202:
            response.json().then((mobj) => {
              showStatus(
                `tr-${mobj.detail || mobj.imagebuilder_status || "init"}`,
                true,
                "info"
              );
              if (mobj.detail && mobj.queue_position) {
                $(
                  "#asu-buildstatus span"
                ).innerText += ` (${mobj.queue_position})`;
              }
              setTimeout(buildAsuRequest.bind(null, mobj.request_hash), 5000);
            });
            break;
          default:
            response.json().then((mobj) => {
              if ("stderr" in mobj) {
                $("#asu-stderr").innerText = mobj.stderr;
                $("#asu-stdout").innerText = mobj.stdout;
                show("#asu-log");
              } else {
                hide("#asu-log");
              }

              if ("detail" in mobj) {
                showStatus(mobj.detail, false, "error");
              } else if (
                "stderr" in mobj &&
                mobj.stderr.includes("images are too big")
              ) {
                showStatus("tr-build-size", false, "error");
              } else {
                showStatus("tr-build-failed", false, "error");
              }
            });
            break;
        }
      })
      .catch((err) => showStatus(err.message, false, "error"));
  }

  return buildAsuRequest;
}
