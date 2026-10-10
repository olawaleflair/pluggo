# Third-party packages

PlugGo's project code is MIT licensed. Dependencies retain their own copyright, license and notice terms. This repository distributes source and package references, not installed dependencies or prebuilt binaries.

The package lock preserves exact versions and license metadata. [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt) retains 196 upstream license/notice files available in the installed macOS ARM64 dependency tree used for this release. That file is an attribution record, not a claim that every platform's optional package or every upstream component has been audited.

## Frontend packages

The installed license files for these packages were inspected and are included in the attribution record:

| Package | Locked version | License |
| --- | --- | --- |
| React | 19.2.4 | MIT |
| React DOM | 19.2.4 | MIT |
| Scheduler | 0.27.0 | MIT |
| React Router | 7.18.4 | MIT |
| React Router DOM | 7.18.4 | MIT |
| Lucide React and icons | 0.575.0 | ISC; upstream notice also acknowledges MIT-derived Feather icons |

Preserve these upstream notices when redistributing frontend bundles. Third-party brands are illustrative and are not endorsed by this project.

## Development tools and optional binaries

Direct build/lint tools mostly use MIT; Wrangler uses MIT OR Apache-2.0. Transitive lock entries also include ISC, BSD, Apache-2.0, MPL-2.0, LGPL-3.0-or-later, CC0-1.0, CC-BY-4.0 and Python-2.0 terms. Do not describe the entire dependency tree as MIT licensed.

Examples needing particular care if you redistribute tooling or binary packages:

- Sharp's optional libvips packages and some Sharp variants include LGPL-3.0-or-later terms.
- Lightning CSS packages use MPL-2.0.
- caniuse-lite uses CC-BY-4.0.
- argparse uses Python-2.0.

Some installed tooling packages do not include a top-level license file, including Wrangler, Miniflare, workerd, native tool wrappers and libvips. Their package metadata is not a substitute for all redistribution obligations. They are not vendored in this source release. Consult the exact upstream license, notice and source requirements before publishing containers, installed dependency archives or binaries, and check the packages installed on your target platform.

The unused React/Vite starter SVGs, external portfolio media and historical payment integration are excluded from this release. CSS references an Inter font family but no font file is shipped or downloaded by this source.
