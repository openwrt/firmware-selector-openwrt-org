/* exported config */

var config = {
  // Show help text for images
  show_help: true,

  // Path to were overview.json can be found
  versions: {
    "22.03.5": "../misc/22.03.5",
    "19.07.10": "../misc/19.07.10",
  },

  // Pre-selected version (optional)
  default_version: "22.03.5",

  // Image download URL
  image_url: "https://downloads.openwrt.org/releases/{path}",

  // Info link URL (optional)
  info_url: "https://openwrt.org/start?do=search&id=toh&q={title} @toh",

  // Attended Sysupgrade Server support (optional)
  //asu_url: "https://sysupgrade.openwrt.org",
};
