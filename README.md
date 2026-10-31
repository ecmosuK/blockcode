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
