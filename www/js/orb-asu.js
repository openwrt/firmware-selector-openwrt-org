// ASU build submission and polling for orb-forge.
//
// Same-origin: the selector's nginx reverse-proxies /api/ and /store/ to
// asu-server, so the browser never makes a cross-origin request and ASU
// does not need to emit CORS headers. See selector/nginx.conf.

import { $, show, hide } from "./utils.js";

const API_BASE = "/api/v1";
const POLL_INTERVAL_MS = 5000;

export async function submitBuild(buildRequest) {
  const statusEl = $("#orb-status");
  const downloadsEl = $("#orb-downloads");
  const downloadListEl = $("#orb-download-list");
  const buildButton = $("#orb-build");

  buildButton.disabled = true;
  show(statusEl);
  hide(downloadsEl);
  downloadListEl.innerHTML = "";
  setStatus(statusEl, "Submitting build request...");

  let res;
  try {
    res = await fetch(`${API_BASE}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequest),
    });
  } catch (err) {
    setStatus(statusEl, `Network error: ${err.message}`, "error");
    buildButton.disabled = false;
    return;
  }

  if (res.status !== 202 && res.status !== 200) {
    const body = await res.text();
    setStatus(statusEl, `ASU rejected the request (HTTP ${res.status}):\n${body}`, "error");
    buildButton.disabled = false;
    return;
  }

  let data = await res.json();
  const requestHash = data.request_hash;
  if (!requestHash) {
    setStatus(statusEl, `ASU response has no request_hash:\n${JSON.stringify(data, null, 2)}`, "error");
    buildButton.disabled = false;
    return;
  }

  // Poll until done or failed. ASU returns 202 while working, 200 when
  // the build is complete, and 5xx (with a detail/stderr body) on failure.
  while (true) {
    setStatus(statusEl, formatStatus(data));

    if (data.imagebuilder_status === "done" || (data.images && data.images.length)) {
      renderDownloads(data, downloadListEl);
      show(downloadsEl);
      setStatus(statusEl, "Build complete.", "success");
      buildButton.disabled = false;
      return;
    }

    if (isFailure(data)) {
      const msg = formatFailure(data);
      setStatus(statusEl, msg, "error");
      buildButton.disabled = false;
      return;
    }

    await sleep(POLL_INTERVAL_MS);
    const pollRes = await fetch(`${API_BASE}/build/${requestHash}`, { cache: "no-cache" });
    data = await pollRes.json();
  }
}

function isFailure(data) {
  if (data.imagebuilder_status === "failed") return true;
  const detail = typeof data.detail === "string" ? data.detail : "";
  return detail === "failed" || detail.toLowerCase().startsWith("error");
}

function formatFailure(data) {
  const parts = [];
  if (data.detail) parts.push(data.detail);
  if (data.imagebuilder_status) parts.push(`imagebuilder_status=${data.imagebuilder_status}`);
  let msg = `Build failed.\n${parts.join("\n")}`;
  if (data.stderr) {
    msg += "\n\n" + data.stderr;
  }
  return msg;
}

function formatStatus(data) {
  const parts = [];
  if (data.imagebuilder_status) {
    parts.push(data.imagebuilder_status);
  } else if (data.detail) {
    parts.push(String(data.detail));
  }
  if (data.queue_position !== undefined && data.queue_position !== null) {
    parts.push(`queue position ${data.queue_position}`);
  }
  return parts.join(" · ") || "Working...";
}

function setStatus(el, text, variant) {
  el.innerText = text;
  el.classList.remove("orb-status-error", "orb-status-success");
  if (variant === "error") el.classList.add("orb-status-error");
  if (variant === "success") el.classList.add("orb-status-success");
}

function renderDownloads(data, listEl) {
  const binDir = data.bin_dir;
  const images = data.images || [];
  listEl.innerHTML = "";
  for (const img of images) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `/store/${binDir}/${img.name}`;
    a.innerText = img.name;
    a.setAttribute("download", img.name);
    li.appendChild(a);
    if (img.sha256) {
      const code = document.createElement("code");
      code.innerText = " sha256:" + img.sha256.slice(0, 16) + "…";
      li.appendChild(code);
    }
    listEl.appendChild(li);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
