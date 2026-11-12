# BlockCode

BlockCode is a browser-based visual coding playground. Its editor, preview,
sprite/background tools, and C++ code generation run in the browser; projects
are saved in that browser's local storage.

## Run locally

From the repository root, start a static web server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/>. On Windows, `py -m http.server 8000` also works.

## Run as a Windows desktop app

Install Node.js, then run these commands from the repository root:

```powershell
npm install
npm start
```

To create a Windows installer, run `npm run dist`. The installer is written to
`Downloads/blockcode setup.exe`; it creates Start menu and desktop shortcuts.
The installer includes the watch build script, firmware project, and a pinned copy
of Espressif's installation manager, but it does **not** download the multi-gigabyte
toolchain during installation.

On first launch, BlockCode automatically downloads the pinned ESP-IDF 6.1 and
ESP32-S3 build tools, verifies the archive's SHA-256, and installs them under
`%LOCALAPPDATA%\BlockCode\toolchains\esp-idf-6.1-esp32s3`. Setup runs in the
background with progress, cancel, retry, and repair controls, so the editor stays
usable while it runs. It requires an internet connection and roughly 15 GB of free
disk space. App updates reuse the installed toolchain without downloading it again.
BlockCode then starts its local build service automatically and uploads directly
over USB without requiring a separate Quantum OS checkout.

Setup details are saved to `%LOCALAPPDATA%\BlockCode\toolchain.log`; build-service
startup details are saved to `%APPDATA%\BlockCode\logs\build-service.log`.
Override `IDF_PATH`, `IDF_TOOLS_PATH`, and `IDF_PYTHON_ENV_PATH` before launching
BlockCode to use an existing ESP-IDF installation instead. For development or
air-gapped machines, set `BLOCKCODE_TOOLCHAIN_ARCHIVE` to a local offline `.zst`
archive. Set `BLOCKCODE_TOOLCHAIN_AUTO_SETUP=1` when running from a source checkout
to start setup immediately instead of waiting for the first build.

When developing from a source checkout, start
`tools/start-build-service.ps1` in its configured ESP-IDF environment before
launching the desktop app, or let BlockCode provision its managed toolchain.

Use **New**, **Open**, **Save**, and **Save As** in the top toolbar to manage
`.blockcode` project files. Projects include scripts for every sprite, custom
sprites and backgrounds, and variables/lists. Keyboard shortcuts are Ctrl+N,
Ctrl+O, Ctrl+S, and Ctrl+Shift+S.
On launch, choose **Open a project** to select a saved file or **Make a new
project** to start with an empty workspace.

The installed desktop app checks the `ecmosuK/quarkband` GitHub Releases for
updates at startup. Choose **Download update** and then **Restart to update**
when one is available. To publish an update, push a version tag such as
`v1.0.1`; the Windows release workflow builds the installer and publishes the
update metadata. Install the updater-enabled installer once before receiving
future updates.

## Publish with GitHub Pages

1. In the repository's **Settings → Pages**, set the source to **GitHub Actions**.
2. Push to `main` or run **Deploy BlockCode to GitHub Pages** from the **Actions** tab.
3. Open the published URL shown in the workflow run (typically
   <https://ecmosuk.github.io/quarkband/>).

The Pages workflow publishes only the browser app and its required assets. It
does not publish the ESP32 watch build service or firmware project. Building or
uploading a watch app still requires the separate local ESP-IDF setup described
in `tools/start-build-service.ps1`.

## Build watch apps from the hosted site

The hosted editor sends build requests to the build service on your own
computer. Start `tools/start-build-service.ps1` in its configured ESP-IDF
environment; keep it running while building. The service allows the
`https://quarkband.dudekjell.workers.dev` site by default. For a different site
origin, set `BLOCKCODE_ALLOWED_ORIGINS` to a comma-separated list of exact
origins before starting the service. In Chrome or Edge, allow local-network
access for the site if the browser asks.

## Deploy the whole site and build API to Render

The Render setup serves the frontend and build API from one Flask web service.
The repository can remain private; connect Render to it through your Git
provider, then deploy the `render.yaml` Blueprint. Render builds the Docker
image using ESP-IDF 6.1 and Linux speech tools. The first container build and
the first watch-app build can take several minutes.

The Render build endpoint is public and does not require a token. To limit
resource use, it accepts up to 20 builds per client IP per hour, and only one
build can run at a time. Set `BLOCKCODE_BUILD_LIMIT_PER_HOUR` in Render to
change the per-IP limit. Anyone can submit builds, so monitor your Render
usage and disable the service if it is abused.

On Render Free, the service spins down after 15 minutes without traffic, so
the first visit may take about a minute to wake. If ESP-IDF builds exceed the
free instance's resources, use a larger plan. The Render-hosted **Upload to
Watch** flow uses Web Serial in Chrome or Edge over HTTPS: choose the connected
watch when prompted, then leave it connected while Render builds and transfers
the app. Other browsers can use **Build watch .app** to download the package
and upload it with the local Quantum OS uploader. The local service and GitHub
Pages workflow continue to work as before.
