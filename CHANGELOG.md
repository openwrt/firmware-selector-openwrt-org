# Changelog

Short summaries of recent changes for people who don't use `git shortlog`

## v3.8.6 - 2023-07-05

* Translation updates and fixes (add Vietnamese)
* Fix model selection on version change
* Clear url parameters when no model was found
* Do not reset package list on ASU response

## v3.8.5 - 2023-04-10

* Translation updates and fixes
* Add uci-default setup template for custom images

## v3.8.4 - 2023-01-29

* Translation updates
* Allow to specify a custom script to run on first boot

## v3.8.3 - 2022-11-14

* Improved sorting in version select list
* Translation updates
* Enabled Arabic, Latvian and Slovak translation

## v3.8.2 - 2022-08-03

* Translation updates
* Improve ASU integration via GET requests

## v3.8.1 - 2022-06-15

* Translation updates
* Add ASU support again
  * Custom images can be requested from https://sysupgrade.openwrt.org

## v3.8.0 - 2022-04-19

* Many new translations
* More links added to firmware overview (wiki, files, self)
* Improved search function
* Fixed version dropdown list

## v3.7.1 - 2022-02-10

* Translate the firmware into more languages using Weblate.

## v3.7.0 - 2021-10-08

* On desktop screen the menu is now shown as a table which shows the help text
  and checksum by default.

## v3.6.0 - 2021-08-29

* Rework of search function so matching of multiple strings now works! This
  comes in handy if one type for example *Foobar 200* but the device is
  actually called *Foo-Bar 200*. With the improved search function the device
  is still suggested.

## v3.5.0 - 2021-08-22

* Don't offer snapshot builds of upcoming releases anymore
* Translation improvements
* Remove [*ASU*](https://github.com/aparcar/asu/) integration for now.
  * The feature wasn't fully integrated therefore it should be removed for now.
