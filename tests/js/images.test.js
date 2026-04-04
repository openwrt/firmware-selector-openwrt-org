import "./setup.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getModelTitles,
  getHelpTextClass,
  sortImages,
  isAnyDeviceSelected,
  commonPrefix,
  getNameDifference,
} from "../../www/js/images.js";

describe("getModelTitles", () => {
  it("returns title property when present", () => {
    const titles = [{ title: "TP-Link Archer A7 v5" }];
    assert.deepEqual(getModelTitles(titles), ["TP-Link Archer A7 v5"]);
  });

  it("concatenates vendor, model, variant when no title", () => {
    const titles = [{ vendor: "TP-Link", model: "Archer A7", variant: "v5" }];
    assert.deepEqual(getModelTitles(titles), ["TP-Link Archer A7 v5"]);
  });

  it("handles missing vendor/model/variant gracefully", () => {
    const titles = [{ model: "Archer A7" }];
    assert.deepEqual(getModelTitles(titles), ["Archer A7"]);
  });

  it("handles all fields empty", () => {
    const titles = [{}];
    assert.deepEqual(getModelTitles(titles), [""]);
  });

  it("handles multiple titles", () => {
    const titles = [
      { title: "Device A" },
      { vendor: "Vendor", model: "Model" },
    ];
    assert.deepEqual(getModelTitles(titles), ["Device A", "Vendor Model"]);
  });
});

describe("getHelpTextClass", () => {
  it("returns sysupgrade class", () => {
    assert.equal(
      getHelpTextClass({ type: "sysupgrade", name: "img.bin" }),
      "tr-sysupgrade-help"
    );
  });

  it("returns factory class", () => {
    assert.equal(
      getHelpTextClass({ type: "factory", name: "img.bin" }),
      "tr-factory-help"
    );
  });

  it("returns factory class for trx type", () => {
    assert.equal(
      getHelpTextClass({ type: "trx", name: "img.bin" }),
      "tr-factory-help"
    );
  });

  it("returns factory class for chk type", () => {
    assert.equal(
      getHelpTextClass({ type: "chk", name: "img.bin" }),
      "tr-factory-help"
    );
  });

  it("returns initramfs class based on name", () => {
    assert.equal(
      getHelpTextClass({ type: "kernel", name: "initramfs.bin" }),
      "tr-initramfs-help"
    );
  });

  it("returns kernel class", () => {
    assert.equal(
      getHelpTextClass({ type: "kernel", name: "kernel.bin" }),
      "tr-kernel-help"
    );
  });

  it("returns kernel class for zimage", () => {
    assert.equal(
      getHelpTextClass({ type: "zimage", name: "img.bin" }),
      "tr-kernel-help"
    );
  });

  it("returns rootfs class", () => {
    assert.equal(
      getHelpTextClass({ type: "rootfs", name: "img.bin" }),
      "tr-rootfs-help"
    );
  });

  it("returns sdcard class", () => {
    assert.equal(
      getHelpTextClass({ type: "sdcard", name: "img.bin" }),
      "tr-sdcard-help"
    );
  });

  it("returns tftp class", () => {
    assert.equal(
      getHelpTextClass({ type: "tftp", name: "img.bin" }),
      "tr-tftp-help"
    );
  });

  it("returns eva class", () => {
    assert.equal(
      getHelpTextClass({ type: "eva", name: "img.bin" }),
      "tr-eva-help"
    );
  });

  it("returns uboot class", () => {
    assert.equal(
      getHelpTextClass({ type: "uboot", name: "img.bin" }),
      "tr-uboot-help"
    );
  });

  it("returns uboot class for u-boot variant", () => {
    assert.equal(
      getHelpTextClass({ type: "u-boot", name: "img.bin" }),
      "tr-uboot-help"
    );
  });

  it("returns kernel class for uimage type", () => {
    assert.equal(
      getHelpTextClass({ type: "uimage", name: "img.bin" }),
      "tr-kernel-help"
    );
  });

  it("returns dtb class for .dtb type", () => {
    assert.equal(
      getHelpTextClass({ type: ".dtb", name: "img.bin" }),
      "tr-dtb-help"
    );
  });

  it("returns cpximg class for cpximg type", () => {
    assert.equal(
      getHelpTextClass({ type: "cpximg", name: "img.bin" }),
      "tr-cpximg-help"
    );
  });

  it("returns initramfs class even when type is not kernel", () => {
    assert.equal(
      getHelpTextClass({ type: "other", name: "openwrt-initramfs.bin" }),
      "tr-initramfs-help"
    );
  });

  it("returns sysupgrade class for combined-sysupgrade", () => {
    assert.equal(
      getHelpTextClass({ type: "combined-sysupgrade", name: "img.bin" }),
      "tr-sysupgrade-help"
    );
  });

  it("returns other class for unknown type", () => {
    assert.equal(
      getHelpTextClass({ type: "something", name: "img.bin" }),
      "tr-other-help"
    );
  });
});

describe("commonPrefix", () => {
  it("finds common prefix of sorted strings", () => {
    assert.deepEqual(commonPrefix(["abc", "abd", "abe"]), "ab");
  });

  it("returns full string when all elements are identical", () => {
    assert.deepEqual(commonPrefix(["hello", "hello"]), "hello");
  });

  it("returns empty when no common prefix exists", () => {
    assert.deepEqual(commonPrefix(["abc", "xyz"]), "");
  });

  it("handles single-element array", () => {
    assert.deepEqual(commonPrefix(["only"]), "only");
  });

  it("works with arrays of string segments (as used by getNameDifference)", () => {
    assert.deepEqual(
      commonPrefix([
        ["openwrt", "ramips", "mt7621", "sysupgrade"],
        ["openwrt", "ramips", "mt7621", "factory"],
      ]),
      ["openwrt", "ramips", "mt7621"]
    );
  });
});

describe("getNameDifference", () => {
  it("returns distinguishing segment when multiple images share a type", () => {
    const images = [
      { type: "factory", name: "openwrt-ramips-mt7621-device-eu-factory.bin" },
      { type: "factory", name: "openwrt-ramips-mt7621-device-us-factory.bin" },
    ];
    const diff = getNameDifference(images, images[0]);
    assert.equal(diff, "eu");
  });

  it("returns empty string when only one image of that type exists", () => {
    const images = [
      { type: "sysupgrade", name: "openwrt-sysupgrade.bin" },
      { type: "factory", name: "openwrt-factory.bin" },
    ];
    assert.equal(getNameDifference(images, images[0]), "");
  });

  it("returns empty string when all images have the same name", () => {
    const images = [
      { type: "factory", name: "same-name.bin" },
      { type: "factory", name: "same-name.bin" },
    ];
    assert.equal(getNameDifference(images, images[0]), "");
  });

  it("handles three images of the same type", () => {
    const images = [
      { type: "factory", name: "fw-device-eu-factory.bin" },
      { type: "factory", name: "fw-device-us-factory.bin" },
      { type: "factory", name: "fw-device-cn-factory.bin" },
    ];
    const diff = getNameDifference(images, images[1]);
    assert.equal(diff, "us");
  });
});

describe("sortImages", () => {
  it("places sysupgrade first and factory second", () => {
    const images = [
      { type: "other", name: "c" },
      { type: "factory", name: "b" },
      { type: "sysupgrade", name: "a" },
    ];
    const sorted = sortImages(images);
    assert.equal(sorted[0].type, "sysupgrade");
    assert.equal(sorted[1].type, "factory");
    assert.equal(sorted[2].type, "other");
  });

  it("keeps order for images of the same precedence", () => {
    const images = [
      { type: "rootfs", name: "b" },
      { type: "kernel", name: "a" },
    ];
    const sorted = sortImages(images);
    assert.equal(sorted[0].type, "rootfs");
    assert.equal(sorted[1].type, "kernel");
  });

  it("handles empty array", () => {
    assert.deepEqual(sortImages([]), []);
  });

  it("handles single image", () => {
    const images = [{ type: "factory", name: "a" }];
    const sorted = sortImages(images);
    assert.equal(sorted.length, 1);
    assert.equal(sorted[0].type, "factory");
  });

  it("places sysupgrade before factory even when factory comes first", () => {
    const images = [
      { type: "factory", name: "a" },
      { type: "sysupgrade", name: "b" },
    ];
    const sorted = sortImages(images);
    assert.equal(sorted[0].type, "sysupgrade");
    assert.equal(sorted[1].type, "factory");
  });

  it("keeps unknown types after known types", () => {
    const images = [
      { type: "kernel", name: "k" },
      { type: "sysupgrade", name: "s" },
      { type: "rootfs", name: "r" },
    ];
    const sorted = sortImages(images);
    assert.equal(sorted[0].type, "sysupgrade");
  });

  it("does not modify the relative order of two unknown types", () => {
    const images = [
      { type: "rootfs", name: "r" },
      { type: "kernel", name: "k" },
    ];
    const sorted = sortImages(images);
    assert.equal(sorted[0].type, "rootfs");
    assert.equal(sorted[1].type, "kernel");
  });
});

describe("isAnyDeviceSelected", () => {
  it("returns false for empty device object", () => {
    assert.equal(isAnyDeviceSelected({}), false);
  });

  it("returns true when device has properties", () => {
    assert.equal(isAnyDeviceSelected({ id: "test", target: "x" }), true);
  });

  it("returns true for device with only one property", () => {
    assert.equal(isAnyDeviceSelected({ id: "test" }), true);
  });
});
