/* exported config */

var config = {
  // Show help text for images
  show_help: true,

  // Path to were overview.json can be found
  versions: {
    "18.06.9": "../misc/18.06.9/",
    "19.07.5": "../misc/19.07.5",
    SNAPSHOT: "../misc/SNAPSHOT",
  },

  // Pre-selected version (optional)
  default_version: "19.07.5",

  // Image download URL (optional)
  //image_url: "https://downloads.openwrt.org/releases/{version}/{target}",

  // Info link URL (optional)
  info_url: "https://openwrt.org/start?do=search&id=toh&q={title} @toh",
  asu_url: "https://sysupgrade.openwrt.org",
};
