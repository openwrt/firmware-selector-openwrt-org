/* exported config */

var config = {
  // Show help text for images
  show_help: true,

  // Versions list (optional)
  versions: ["23.05.4", "19.07.10"],

  // Pre-selected version (optional)
  default_version: "23.05.4",

  // Image download URL (e.g. "https://downloads.openwrt.org")
  image_url: "../misc",

  // Insert snapshot versions (optional)
  //show_snapshots: true,

  // Info link URL (optional)
  info_url: "https://openwrt.org/start?do=search&id=toh&q={title} @toh",

  // Attended Sysupgrade Server support (optional)
  asu_url: "https://sysupgrade.openwrt.org",
  asu_extra_packages: ["luci"],
};
