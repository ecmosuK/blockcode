"""Flask entry point for serving BlockCode and its Render build API."""

from __future__ import annotations

import gzip
import importlib.util
import io
import json
import os
import threading
import time
import uuid
import zlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, request, send_file, send_from_directory

from werkzeug.middleware.proxy_fix import ProxyFix

ROOT = Path(__file__).resolve().parents[1]
BUILD_SERVICE_PATH = ROOT / "tools" / "build-service.py"
BUILD_SERVICE_SPEC = importlib.util.spec_from_file_location("blockcode_build_service", BUILD_SERVICE_PATH)
if BUILD_SERVICE_SPEC is None or BUILD_SERVICE_SPEC.loader is None:
    raise RuntimeError(f"Could not load build service module from {BUILD_SERVICE_PATH}")
build_service = importlib.util.module_from_spec(BUILD_SERVICE_SPEC)
BUILD_SERVICE_SPEC.loader.exec_module(build_service)
MAX_REQUEST_BYTES = build_service.MAX_REQUEST_BYTES
JOB_TTL_SECONDS = 60 * 60
BUILD_LIMIT_PER_HOUR = max(1, int(os.environ.get("BLOCKCODE_BUILD_LIMIT_PER_HOUR", "20")))
BUILD_LIMIT_WINDOW_SECONDS = 60 * 60
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
jobs: dict[str, dict[str, Any]] = {}
jobs_lock = threading.Lock()
active_job_id: str | None = None
build_requests: dict[str, list[float]] = {}
executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="blockcode-build")


def _prune_jobs() -> None:
    cutoff = time.time() - JOB_TTL_SECONDS
    expired = [
        job_id for job_id, job in jobs.items()
        if job_id != active_job_id and job["created"] < cutoff
    ]
    for job_id in expired:
        del jobs[job_id]


def _run_build(job_id: str, source: str, app_id: str, name: str) -> None:
    global active_job_id
    try:
        package = build_service.build_watch_app(source, app_id, name)
        with jobs_lock:
            job = jobs.get(job_id)
            if job:
                job.update(status="ready", package=package)
    except Exception as exc:
        with jobs_lock:
            job = jobs.get(job_id)
            if job:
                job.update(status="failed", error=str(exc)[-12000:])
    finally:
        with jobs_lock:
            if active_job_id == job_id:
                active_job_id = None


@app.get("/")
def index() -> Response:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = html.replace(
        "window.BLOCKCODE_RENDER_BUILD_API = false;",
        "window.BLOCKCODE_RENDER_BUILD_API = true;",
        1,
    )
    return Response(html, mimetype="text/html")


@app.get("/health")
def health() -> Response:
    return jsonify(ok=True, target="esp32s3")


@app.get("/styles.css")
@app.get("/app.js")
def frontend_file() -> Response:
    return send_from_directory(ROOT, request.path.lstrip("/"))


@app.get("/assets/<path:asset_path>")
@app.get("/scripts/<path:asset_path>")
def frontend_directory_file(asset_path: str) -> Response:
    section = request.path.split("/", 2)[1]
    directory = (ROOT / section).resolve()
    candidate = (directory / asset_path).resolve()
    try:
        candidate.relative_to(directory)
    except ValueError:
        return jsonify(error="Not found."), 404
    if not candidate.is_file():
        return jsonify(error="Not found."), 404
    return send_file(candidate)


@app.post("/upload")
def upload_not_supported() -> tuple[Response, int]:
    return jsonify(error="A Render server cannot access your computer's USB port. Download the .app, then upload it locally."), 501


@app.post("/build")
def start_build() -> tuple[Response, int] | Response:
    global active_job_id
    content_length = request.content_length
    if content_length is None or content_length <= 0 or content_length > MAX_REQUEST_BYTES:
        return jsonify(error="Request body is empty or too large."), 400
    body = request.get_data(cache=False)
    encoding = request.headers.get("Content-Encoding", "").lower()
    try:
        if encoding == "gzip":
            with gzip.GzipFile(fileobj=io.BytesIO(body), mode="rb") as compressed:
                body = compressed.read(MAX_REQUEST_BYTES + 1)
        elif encoding not in ("", "identity"):
            return jsonify(error="Unsupported request compression."), 415
        if len(body) > MAX_REQUEST_BYTES:
            return jsonify(error="Generated source is too large."), 400
        payload = json.loads(body)
        source, app_id, name = build_service.validate_request(payload)
    except (ValueError, OSError, EOFError, zlib.error) as exc:
        return jsonify(error=str(exc) or "Build request is invalid."), 400

    job_id = uuid.uuid4().hex
    with jobs_lock:
        _prune_jobs()
        now = time.time()
        cutoff = now - BUILD_LIMIT_WINDOW_SECONDS
        for ip_address, timestamps in list(build_requests.items()):
            active_timestamps = [timestamp for timestamp in timestamps if timestamp > cutoff]
            if active_timestamps:
                build_requests[ip_address] = active_timestamps
            else:
                del build_requests[ip_address]
        client_ip = request.remote_addr or "unknown"
        recent_requests = [
            timestamp for timestamp in build_requests.get(client_ip, [])
            if timestamp > cutoff
        ]
        if len(recent_requests) >= BUILD_LIMIT_PER_HOUR:
            build_requests[client_ip] = recent_requests
            return jsonify(error="Build limit reached. Please try again later."), 429
        if active_job_id is not None:
            return jsonify(error="Another build is already running. Please wait for it to finish."), 429
        recent_requests.append(now)
        build_requests[client_ip] = recent_requests
        active_job_id = job_id
        jobs[job_id] = {"status": "building", "created": time.time(), "app_id": app_id}
        try:
            executor.submit(_run_build, job_id, source, app_id, name)
        except Exception:
            active_job_id = None
            jobs.pop(job_id, None)
            raise
    return jsonify(job_id=job_id, status="building"), 202


@app.get("/build/jobs/<job_id>")
def build_status(job_id: str) -> tuple[Response, int] | Response:
    with jobs_lock:
        _prune_jobs()
        job = jobs.get(job_id)
        if not job:
            return jsonify(error="Build job was not found or has expired."), 404
        result = {"status": job["status"]}
        if job["status"] == "failed":
            result["error"] = job.get("error", "Build failed.")
        return jsonify(result)


@app.get("/build/jobs/<job_id>/download")
def download_build(job_id: str) -> tuple[Response, int] | Response:
    with jobs_lock:
        _prune_jobs()
        job = jobs.get(job_id)
        if not job:
            return jsonify(error="Build job was not found or has expired."), 404
        if job["status"] != "ready":
            return jsonify(error="Build is not ready yet."), 409
        package = job["package"]
    return send_file(
        io.BytesIO(package),
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=job["app_id"] + ".app",
        max_age=0,
    )
