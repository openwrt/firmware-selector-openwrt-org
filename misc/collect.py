#!/usr/bin/env python3
"""
Create JSON files and update www/config.js, www/data for the OpenWrt Firmware Selector.
"""

from pathlib import Path
import tempfile
import datetime
import argparse
import time
import json
import glob
import sys
import os
import re

try:
    from packaging.version import Version
except ImportError:
    # Python 3.10 deprecated distutils
    from distutils.version import StrictVersion as Version

SUPPORTED_METADATA_VERSION = 1
BUILD_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

assert sys.version_info >= (3, 5), "Python version too old. Python >=3.5.0 needed."


def write_json(path, content, formatted):
    print("write: {}".format(path))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as file:
        if formatted:
            json.dump(content, file, indent="  ", sort_keys=True)
        else:
            json.dump(content, file, sort_keys=True)


# generate an overview of all models of a build
def create_overview_json(release_name, profiles):
    profiles_list = []
    for profile in profiles:
        profiles_list.append(
            {
                "target": profile["target"],
                "titles": profile["titles"],
                "model_id": profile["model_id"],
            }
        )

    return {"release": release_name, "profiles": profiles_list}


def update_config(www_path, versions, args):
    config_path = os.path.join(www_path, "config.js")

    if os.path.isfile(config_path):
        content = ""
        with open(str(config_path), "r", encoding="utf-8") as file:
            content = file.read()

        latest_version = "0.0.0"
        if args.insert_latest_release:
            latest_version = "latest"
        else:
            # find latest release
            for version in versions.keys():
                try:
                    if Version(version) > Version(latest_version):
                        latest_version = version
                except ValueError:
                    print("Warning: Non numeric version: {}".format(version))
                    continue

        content = re.sub(
            "versions:[\\s]*{[^}]*}", "versions: {}".format(versions), content
        )
        content = re.sub(
            "default_version:.*,",
            'default_version: "{}",'.format(latest_version),
            content,
        )
        with open(str(config_path), "w+") as file:
            print("write: {}".format(config_path))
            file.write(content)
    else:
        sys.stderr.write("Warning: File not found: {}\n".format(config_path))


def add_profile(releases, args, file_path, file_content, file_last_modified):
    version = file_content["version_number"]

    if args.version_pattern:
        if not re.fullmatch(args.version_pattern, version):
            return

    for model_id, model_obj in file_content["profiles"].items():
        profile = {**file_content, **model_obj}
        profile["build_at"] = file_last_modified
        profile["image_path"] = file_path
        profile["model_id"] = model_id
        del profile["profiles"]
        releases.setdefault(version, []).append(profile)


"""
Insert an artificial release that contains the latest
profile for each model.
"""


def create_latest_release(releases, args):
    def get_identifiers(profile):
        def normalize(identifier):
            return identifier.replace("-", "_").lower().strip()

        for device in profile["supported_devices"]:
            yield normalize(device)
        for title in profile["titles"]:
            if "title" in title:
                yield normalize(title["title"])
            else:
                yield normalize(
                    f"{title['vendor']} {title['model']} {title.get('variant', '')}"
                )

    uniques = {}
    for release, profiles in releases.items():
        if args.latest_release_pattern:
            if not re.fullmatch(args.latest_release_pattern, release):
                continue

        version = None
        try:
            version = Version(release)
        except ValueError:
            # ignore versions that we cannot compare
            continue

        for profile in profiles:
            ids = list(get_identifiers(profile))

            entry = None
            for i in ids:
                entry = uniques.get(i, None)
                if entry is not None:
                    break

            if entry is None:
                entry = [profile]
            elif version > Version(entry[0]["version_number"]):
                entry[0] = profile

            for i in ids:
                uniques[i] = entry

    # get unique profile objects
    return {id(p[0]): p[0] for p in uniques.values()}.values()


def write_data(releases, args):
    versions = {}

    if args.insert_latest_release:
        releases["latest"] = create_latest_release(releases, args)

    for release_name, profiles in releases.items():
        overview_json = create_overview_json(release_name, profiles)

        # write overview.json
        write_json(
            os.path.join(args.www_path, "data", release_name, "overview.json"),
            overview_json,
            args.formatted,
        )

        # write <model-id>.json files
        for profile in profiles:
            profile_path = os.path.join(
                args.www_path,
                "data",
                release_name,
                profile["target"],
                "{}.json".format(profile["model_id"]),
            )
            write_json(profile_path, profile, args.formatted)

        versions[release_name] = "data/{}".format(release_name)

    update_config(args.www_path, versions, args)


def collect_profiles(releases, base_path, tmp_path, args):
    for path in glob.glob("{}".format(tmp_path)):
        for ppath in Path(path).rglob("profiles.json"):
            with open(str(ppath), "r", encoding="utf-8") as file:
                # we assume local timezone is UTC/GMT
                last_modified = datetime.datetime.fromtimestamp(
                    os.path.getmtime(str(ppath))
                ).strftime(BUILD_DATE_FORMAT)
                add_profile(
                    releases,
                    args,
                    os.path.relpath(os.path.dirname(ppath), base_path),
                    json.loads(file.read()),
                    last_modified,
                )


def use_wget(args):
    releases = {}

    with tempfile.TemporaryDirectory() as tmp_path:
        # download all profiles.json files
        os.system(
            'wget -c -r -P {} -A "profiles.json" --limit-rate=8M --reject-regex "kmods|packages" --no-parent {}'.format(
                tmp_path, args.release_src
            )
        )

        # create overview.json files
        base = os.path.join(
            tmp_path, args.release_src.replace("https://", "").replace("http://", "")
        )

        collect_profiles(releases, base, tmp_path, args)

    write_data(releases, args)


def use_rsync(args):
    releases = {}

    with tempfile.TemporaryDirectory() as tmp_path:
        # download all profiles.json files
        os.system(
            'rsync --bwlimit="8M" --del -m -r -t -v --include="*/" --include="profiles.json" --exclude="*" {} {}'.format(
                args.release_src, tmp_path
            )
        )

        collect_profiles(releases, tmp_path, tmp_path, args)

    write_data(releases, args)


def use_find(args):
    releases = {}

    # profiles.json is generated for each subtarget
    for path in Path(args.release_src).rglob("profiles.json"):
        with open(str(path), "r", encoding="utf-8") as file:
            content = file.read()
            last_modified = time.strftime(
                BUILD_DATE_FORMAT, time.gmtime(os.path.getmtime(str(path)))
            )
            add_profile(
                releases,
                args,
                os.path.relpath(path, args.release_src),
                json.loads(content),
                last_modified,
            )

    write_data(releases, args)


def main():
    parser = argparse.ArgumentParser(
        description="""
Scan for JSON files generated by OpenWrt. Create JSON files in www/data/ and update www/config.js.

Usage Examples:
    ./misc/collect.py ~/openwrt/bin  www/
    or
    ./misc/collect.py https://downloads.openwrt.org  www/
    or
     ./misc/collect.py rsync://downloads.openwrt.org/downloads/  www/
    """,
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--formatted", action="store_true", help="Output formatted JSON data."
    )
    parser.add_argument(
        "--version-pattern",
        help="Only handle versions that match a regular expression.",
    )
    parser.add_argument(
        "--insert-latest-release",
        action="store_true",
        help='Insert a special release called "latest" that contains the latest image for every device.',
    )
    parser.add_argument(
        "--latest-release-pattern",
        help='Only include matching versions in the "latest" release.',
    )
    parser.add_argument(
        "release_src",
        help="Local folder to scan or website URL to scrape for profiles.json files.",
    )
    parser.add_argument("www_path", help="Path of the config.js.")

    args = parser.parse_args()

    if not os.path.isfile("{}/config.js".format(args.www_path)):
        print("Error: {}/config.js does not exits!".format(args.www_path))
        exit(1)

    if args.release_src.startswith("rsync"):
        use_rsync(args)
    elif args.release_src.startswith("http"):
        use_wget(args)
    else:
        use_find(args)


if __name__ == "__main__":
    main()
