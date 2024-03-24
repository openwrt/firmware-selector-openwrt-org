/* exported config */

var config = {
  // Show help text for images
  show_help: true,

  // Path to were overview.json can be found
  versions: {
    "22.03.5": "https://downloads.openwrt.org/releases/22.03.5",
    "19.07.10": "https://downloads.openwrt.org/releases/19.07.10",
  },

  // Show snapshots (optional)
  show_snapshots: true,

  // Pre-selected version (optional)
  default_version: "22.03.5",

  // Image download URL
  image_url: "https://downloads.openwrt.org",

  // Info link URL (optional)
  info_url: "https://openwrt.org/start?do=search&id=toh&q={title} @toh",

  // Attended Sysupgrade Server support (optional)
  asu_url: "https://sysupgrade.openwrt.org",
  // asu_extra_packages: [ "luci" ],
};
