fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android validate

```sh
[bundle exec] fastlane android validate
```

Validate the Google Play service-account key (no upload)

### android internal

```sh
[bundle exec] fastlane android internal
```

Upload the latest signed AAB to the INTERNAL testing track (solo QA)

### android promote

```sh
[bundle exec] fastlane android promote
```

Promote the latest INTERNAL build to production — full rollout (all users)

### android release

```sh
[bundle exec] fastlane android release
```

Upload the latest signed AAB straight to production — full rollout (all users)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
