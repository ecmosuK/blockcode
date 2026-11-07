#!/usr/bin/env python3
"""Local ESP-IDF build service for BlockCode watch apps.

Run from an ESP-IDF-exported shell. The web UI posts generated C++ here; this
service builds a loadable ESP32-S3 ELF and wraps it in Quantum OS's .app format.
"""

from __future__ import annotations

import json
import base64
import gzip
import mimetypes
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import threading
import time
import wave
import zlib
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
ELF_PROJECT = ROOT / "watch-elf-app"
BUILD_CACHE = Path(os.environ.get(
    "BLOCKCODE_BUILD_CACHE",
    os.environ.get("LOCALAPPDATA", os.environ.get("TEMP", tempfile.gettempdir())),
)) / "BlockCodeWatchBuild" / "watch-elf-app"
IDF_PATH = Path(os.environ.get("IDF_PATH", ""))
IDF_PYTHON_ENV_PATH = Path(os.environ.get("IDF_PYTHON_ENV_PATH", ""))
MAX_REQUEST_BYTES = 16 * 1024 * 1024
MAX_ELF_BYTES = 1024 * 1024
BUILD_LOCK = threading.Lock()
UPLOAD_LOCK = threading.Lock()
DEFAULT_WEB_ORIGIN = "https://quarkband.dudekjell.workers.dev"
ALLOWED_WEB_ORIGINS = {
    origin.strip()
    for origin in os.environ.get("BLOCKCODE_ALLOWED_ORIGINS", DEFAULT_WEB_ORIGIN).split(",")
    if origin.strip()
}
VOICE_CALL_RE = re.compile(r'\bwatch_(?:say|speak)\(\s*("(?:\\.|[^"\\])*")')
VOICE_STUB_RE = re.compile(
    r'static float watch_play_speech\(const char \*text\)\s*\{\s*'
    r'\(void\)text;\s*// The local build service replaces this with embedded voice clips\.\s*'
    r'return 0\.0f;\s*\}'
)

# main/os/app_format.h: 84-byte metadata prefix + 48x48 RGB565 icon.
APP_HEADER = struct.Struct("<IHH24s24s16sIII")
APP_MAGIC = 0x5041534F
APP_VERSION = 1
ICON_BYTES = 48 * 48 * 2
APP_CODE_OFFSET = APP_HEADER.size + ICON_BYTES


def fixed_utf8(value: str, size: int) -> bytes:
    # Keep a trailing NUL while avoiding a split UTF-8 sequence.
    raw = value.encode("utf-8")[: size - 1]
    while raw:
        try:
            raw.decode("utf-8")
            break
        except UnicodeDecodeError:
            raw = raw[:-1]
    return raw + bytes(size - len(raw))


def validate_request(payload: object) -> tuple[str, str, str]:
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")
    source = payload.get("source")
    app_id = payload.get("id")
    name = payload.get("name")
    if not isinstance(source, str) or not source.strip():
        raise ValueError("No generated C++ source was provided.")
    if len(source.encode("utf-8")) > MAX_REQUEST_BYTES:
        raise ValueError("Generated source is too large.")
    if not isinstance(app_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,22}", app_id):
        raise ValueError("App ID must be 1–23 lowercase letters, digits, _ or -.")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("App name is required.")
    return source, app_id, name.strip()


def list_serial_ports() -> list[dict[str, str]]:
    try:
        from serial.tools import list_ports
    except ImportError as exc:
        raise RuntimeError("Serial port selection requires pyserial in the ESP-IDF Python environment.") from exc
    return [
        {
            "device": port.device,
            "description": port.description or port.device,
            "hwid": port.hwid or "",
        }
        for port in list_ports.comports()
    ]


def validate_upload_port(payload: object) -> str:
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object.")
    port = payload.get("port")
    if not isinstance(port, str) or not port.strip() or len(port) > 128:
        raise ValueError("Choose a connected watch before uploading.")
    if not re.fullmatch(r"[A-Za-z0-9_./:\\-]+", port):
        raise ValueError("The selected serial port is invalid.")
    if port not in {device["device"] for device in list_serial_ports()}:
        raise ValueError("The selected serial port is no longer connected. Choose a connected watch and retry.")
    return port


def read_upload_response(connection: object, needle: bytes, timeout: float) -> str:
    deadline = time.monotonic() + timeout
    response = bytearray()
    while time.monotonic() < deadline:
        chunk = connection.read(max(1, min(connection.in_waiting or 1, 4096)))
        if not chunk:
            continue
        response.extend(chunk)
        if b"QOS_ERR" in response:
            raise RuntimeError(response.decode("utf-8", errors="replace").strip())
        if needle in response:
            return response.decode("utf-8", errors="replace").strip()
    raise RuntimeError(
        "Timed out waiting for " + needle.decode("ascii") +
        " from the watch. Check its USB connection and firmware."
    )


def upload_app_over_serial(package: bytes, app_id: str, port: str) -> str:
    if not package or len(package) > 4 * 1024 * 1024:
        raise ValueError("The built app is empty or larger than the watch upload limit (4 MiB).")
    try:
        import serial
    except ImportError as exc:
        raise RuntimeError("The ESP-IDF Python environment is missing pyserial. Repair the BlockCode setup and retry.") from exc

    checksum = zlib.crc32(package) & 0xFFFFFFFF
    header = f"QOSUPLOAD {len(package)} {checksum:08x} {app_id}.app\n".encode("ascii")
    with serial.Serial(port, baudrate=115200, timeout=0.1, write_timeout=10) as connection:
        connection.dtr = False
        connection.rts = False
        time.sleep(2.2)
        connection.reset_input_buffer()
        connection.write(header)
        connection.flush()
        read_upload_response(connection, b"QOS_READY", 30)

        for offset in range(0, len(package), 1024):
            connection.write(package[offset:offset + 1024])
        connection.flush()
        return read_upload_response(connection, b"QOS_OK", 30)


def cpp_string(value: str) -> str:
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"').replace('\r', '\\r').replace('\n', '\\n') + '"'


def synthesize_english(text: str, output: Path) -> bytes:
    """Render a 16 kHz mono PCM clip using the platform's installed speech engine."""
    if os.name == "nt":
        text64 = base64.b64encode(text.encode("utf-8")).decode("ascii")
        path64 = base64.b64encode(str(output).encode("utf-8")).decode("ascii")
        script = f"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{text64}'))
$path = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{path64}'))
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 3
$format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$synth.SetOutputToWaveFile($path, $format)
$synth.Speak($text)
$synth.Dispose()
"""
        encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
            text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60, check=False,
        )
        if result.returncode != 0 or not output.is_file():
            raise RuntimeError("Windows speech synthesis failed: " + (result.stdout[-2000:].strip() or "no WAV was created"))
    else:
        espeak = shutil.which("espeak-ng")
        ffmpeg = shutil.which("ffmpeg")
        if not espeak or not ffmpeg:
            raise RuntimeError("Linux voice builds require espeak-ng and ffmpeg.")
        raw_output = output.with_name(output.stem + "-espeak.wav")
        try:
            result = subprocess.run(
                [espeak, "-w", str(raw_output), text[:200]],
                text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60, check=False,
            )
            if result.returncode != 0 or not raw_output.is_file():
                raise RuntimeError("eSpeak synthesis failed: " + (result.stdout[-2000:].strip() or "no WAV was created"))
            result = subprocess.run(
                [ffmpeg, "-y", "-i", str(raw_output), "-ar", "16000", "-ac", "1", "-sample_fmt", "s16", str(output)],
                text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60, check=False,
            )
            if result.returncode != 0 or not output.is_file():
                raise RuntimeError("Could not convert eSpeak audio: " + (result.stdout[-2000:].strip() or "no WAV was created"))
        finally:
            raw_output.unlink(missing_ok=True)

    with wave.open(str(output), "rb") as wav:
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getframerate() != 16000:
            raise RuntimeError("Windows speech returned an unsupported WAV format (expected 16 kHz mono PCM16).")
        return wav.readframes(wav.getnframes())


def embed_voice_clips(source: str) -> str:
    """Compile Say/Speak strings into app-local PCM clips for the ES8311 speaker."""
    literals = VOICE_CALL_RE.findall(source)
    if not literals:
        return source

    texts: list[str] = []
    for literal in literals:
        text = json.loads(literal)
        if text and text not in texts:
            texts.append(text)
    if len(texts) > 16:
        raise ValueError("A watch app can contain at most 16 distinct spoken phrases.")

    clips: list[tuple[str, list[int]]] = []
    total_samples = 0
    with tempfile.TemporaryDirectory(prefix="blockcode-voice-") as temp:
        for index, text in enumerate(texts):
            wav_path = Path(temp) / f"voice-{index}.wav"
            raw = synthesize_english(text[:200], wav_path)
            if len(raw) % 2:
                raw = raw[:-1]
            samples = [value[0] for value in struct.iter_unpack("<h", raw)]
            total_samples += len(samples)
            if total_samples > 16000 * 20:
                raise ValueError("Voice clips exceed 20 seconds total. Shorten the spoken text and rebuild.")
            clips.append((text, samples))

    if not clips:
        return source

    generated: list[str] = []
    for index, (_, samples) in enumerate(clips):
        generated.append(f"static const int16_t watch_voice_{index}[] = {{")
        for start in range(0, len(samples), 24):
            generated.append("  " + ", ".join(str(v) for v in samples[start:start + 24]) + ",")
        generated.append("};")
    generated.append("static float watch_play_speech(const char *text) {")
    for index, (text, samples) in enumerate(clips):
        generated.append(
            f"  if (strcmp(text, {cpp_string(text)}) == 0) "
            f"{{ qos_app_play_audio(watch_voice_{index}, {len(samples)}); return {len(samples) / 16000.0:.5f}f; }}"
        )
    generated.append("  return 0.0f;")
    generated.append("}")
    voice_code = "\n".join(generated) + "\n"

    # Preserve preview timing: the speech block duration includes the audio,
    # rather than waiting for the clip and then sleeping a second time.
    say_pattern = re.compile(r'void watch_say\(const char \*text, float seconds\)\s*\{.*?\n\}', re.S)
    say_replacement = (
        'void watch_say(const char *text, float seconds) {\n'
        '  qos_app_say(text);\n'
        '  float speech_seconds = watch_play_speech(text);\n'
        '  if (seconds > speech_seconds) watch_wait(seconds - speech_seconds);\n'
        '}'
    )
    source, say_count = say_pattern.subn(say_replacement, source, count=1)
    speak_pattern = re.compile(r'void watch_speak\(const char \*text\)\s*\{.*?\n\}', re.S)
    speak_replacement = (
        'void watch_speak(const char *text) {\n'
        '  qos_app_say(text);\n'
        '  watch_play_speech(text);\n'
        '}'
    )
    source, speak_count = speak_pattern.subn(speak_replacement, source, count=1)
    if not say_count and not speak_count:
        raise RuntimeError("Couldn't find a generated Say/Speak function for the embedded voice clips.")

    if "qos_app_play_audio(" not in source:
        source = source.replace(
            '#include <stdint.h>',
            '#include <stdint.h>\nextern "C" void qos_app_play_audio(const int16_t *, uint32_t);',
            1,
        )

    if VOICE_STUB_RE.search(source):
        source = VOICE_STUB_RE.sub(voice_code.rstrip(), source, count=1)
    elif "static float watch_play_speech(" not in source:
        marker = 'extern "C" {'
        if marker not in source:
            raise RuntimeError("Could not insert generated speaker audio into the app source.")
        source = source.replace(marker, voice_code + "\n" + marker, 1)

    if len(source.encode("utf-8")) > MAX_REQUEST_BYTES:
        raise ValueError("Embedded voice data makes this app too large. Shorten or remove spoken phrases.")
    return source


def make_package(elf_path: Path, app_id: str, name: str) -> bytes:
    elf = elf_path.read_bytes()
    if len(elf) < 20 or elf[:4] != b"\x7fELF":
        raise RuntimeError("ESP-IDF did not produce a valid ELF image.")
    # ELF e_machine: EM_XTENSA (94), little endian.
    if struct.unpack_from("<H", elf, 18)[0] != 94:
        raise RuntimeError("The generated ELF is not an Xtensa ESP32-S3 image.")
    if len(elf) > MAX_ELF_BYTES:
        raise RuntimeError(
            f"Generated app image is {len(elf):,} bytes, above the watch loader's "
            f"{MAX_ELF_BYTES:,}-byte limit. Remove assets or simplify the app."
        )
    if len(elf) > 0xFFFFFFFF:
        raise RuntimeError("ELF image is too large for the .app format.")

    header = APP_HEADER.pack(
        APP_MAGIC,
        APP_VERSION,
        0,
        fixed_utf8(app_id, 24),
        fixed_utf8(name, 24),
        fixed_utf8("BlockCode", 16),
        APP_CODE_OFFSET,
        len(elf),
        0,  # entry_off is reserved; esp_elf uses the ELF entry point.
    )
    return header + bytes(ICON_BYTES) + elf


def configure_build_partition(project: Path) -> None:
    """Use ESP-IDF's 1.5 MiB single-app partition for generated BlockCode apps."""
    sdkconfig = project / "sdkconfig"
    lines = sdkconfig.read_text(encoding="utf-8").splitlines() if sdkconfig.is_file() else []
    settings = {
        "CONFIG_PARTITION_TABLE_SINGLE_APP": "# CONFIG_PARTITION_TABLE_SINGLE_APP is not set",
        "CONFIG_PARTITION_TABLE_SINGLE_APP_LARGE": "CONFIG_PARTITION_TABLE_SINGLE_APP_LARGE=y",
        "CONFIG_PARTITION_TABLE_FILENAME": 'CONFIG_PARTITION_TABLE_FILENAME="partitions_singleapp_large.csv"',
    }

    updated: list[str] = []
    written: set[str] = set()
    for line in lines:
        key = line.removeprefix("# ").split("=", 1)[0].removesuffix(" is not set")
        if key in settings:
            if key not in written:
                updated.append(settings[key])
                written.add(key)
        else:
            updated.append(line)
    for key, value in settings.items():
        if key not in written:
            updated.append(value)
    sdkconfig.write_text("\n".join(updated) + "\n", encoding="utf-8")


def idf_python() -> Path:
    candidates = (
        IDF_PYTHON_ENV_PATH / "Scripts" / "python.exe",
        IDF_PYTHON_ENV_PATH / "bin" / "python",
    )
    return next((candidate for candidate in candidates if candidate.is_file()), Path(sys.executable))


def build_watch_app(
    source: str,
    app_id: str,
    name: str,
    progress_callback: Callable[[str], None] | None = None,
) -> bytes:
    source = embed_voice_clips(source)
    if not IDF_PATH.is_dir() or not (IDF_PATH / "tools" / "idf.py").is_file():
        raise RuntimeError("IDF_PATH is not set. Start the service from an ESP-IDF shell.")
    if not ELF_PROJECT.is_dir():
        raise RuntimeError(f"ELF app template not found: {ELF_PROJECT}")

    with BUILD_LOCK:
        project = BUILD_CACHE
        project.mkdir(parents=True, exist_ok=True)
        shutil.copytree(
            ELF_PROJECT,
            project,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns("build"),
        )
        (project / "main" / "blockcode-app.cpp").write_text(source, encoding="utf-8")
        configure_build_partition(project)

        build_jobs = os.environ.get("BLOCKCODE_BUILD_JOBS", "2")
        if not build_jobs.isdecimal() or int(build_jobs) < 1:
            raise RuntimeError("BLOCKCODE_BUILD_JOBS must be a positive integer.")
        build_log = project.parent / "build.log"
        command = [
            str(idf_python()),
            str(IDF_PATH / "tools" / "idf.py"),
            "build",
        ]
        build_environment = os.environ.copy()
        build_environment["IDF_PY_BUILD_JOBS"] = build_jobs
        if progress_callback:
            progress_callback("Starting ESP-IDF build.")
        started = time.monotonic()
        with build_log.open("w", encoding="utf-8", errors="replace") as log:
            process = subprocess.Popen(
                command,
                cwd=project,
                text=True,
                stdout=log,
                stderr=subprocess.STDOUT,
                env=build_environment,
            )
            offset = 0
            latest_line = ""
            while process.poll() is None:
                time.sleep(2)
                log.flush()
                with build_log.open("r", encoding="utf-8", errors="replace") as reader:
                    reader.seek(offset)
                    new_output = reader.read()
                    offset = reader.tell()
                new_lines = [line.strip() for line in new_output.splitlines() if line.strip()]
                if new_lines:
                    latest_line = new_lines[-1]
                    print("[build-service] " + latest_line, flush=True)
                    if progress_callback:
                        progress_callback(latest_line[-240:])
                if time.monotonic() - started > 900:
                    process.kill()
                    process.wait()
                    raise subprocess.TimeoutExpired(command, 900)
            return_code = process.wait()
        output = build_log.read_text(encoding="utf-8", errors="replace")
        if return_code != 0:
            raise RuntimeError("ESP-IDF build failed:\n" + output[-12000:])
        if progress_callback:
            progress_callback("ESP-IDF build complete; packaging app.")

        elf_path = project / "build" / "blockcode_app.app.elf"
        if not elf_path.is_file():
            raise RuntimeError("Build completed but build/blockcode_app.app.elf was not produced.")
        return make_package(elf_path, app_id, name)


class Handler(BaseHTTPRequestHandler):
    server_version = "BlockCodeWatchBuild/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        print("[build-service] " + fmt % args)

    def end_headers(self) -> None:
        origin = self.headers.get("Origin", "")
        parsed_origin = urlparse(origin)
        local_web_origin = (
            parsed_origin.scheme in ("http", "https")
            and parsed_origin.hostname in ("localhost", "127.0.0.1")
        )
        if origin == "null" or local_web_origin or origin in ALLOWED_WEB_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Content-Encoding")
            if self.headers.get("Access-Control-Request-Private-Network") == "true":
                self.send_header("Access-Control-Allow-Private-Network", "true")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        request_path = unquote(urlparse(self.path).path)
        if request_path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true,"target":"esp32s3"}')
            return
        if request_path == "/ports":
            try:
                self.send_json(200, {"ports": list_serial_ports()})
            except Exception as exc:
                self.send_json(500, {"error": str(exc)})
            return
        relative = request_path.lstrip("/") or "index.html"
        candidate = (ROOT / relative).resolve()
        try:
            candidate.relative_to(ROOT.resolve())
        except ValueError:
            self.send_error(404)
            return
        if not candidate.is_file():
            self.send_error(404)
            return

        content = candidate.read_bytes()
        content_type, _ = mimetypes.guess_type(candidate.name)
        if candidate.suffix.lower() in (".js", ".mjs"):
            content_type = "application/javascript"
        if candidate.suffix.lower() == ".svg":
            content_type = "image/svg+xml"
        self.send_response(200)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, status: int, obj: dict[str, object]) -> None:
        data = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:
        endpoint = urlparse(self.path).path
        if endpoint not in ("/build", "/upload"):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_REQUEST_BYTES:
                raise ValueError("Request body is empty or too large.")
            request_body = self.rfile.read(length)
            if self.headers.get("Content-Encoding", "").lower() == "gzip":
                try:
                    request_body = gzip.decompress(request_body)
                except (OSError, EOFError) as exc:
                    raise ValueError("Build request has invalid gzip data.") from exc
                if len(request_body) > MAX_REQUEST_BYTES:
                    raise ValueError("Generated source is too large.")
            payload = json.loads(request_body)
            source, app_id, name = validate_request(payload)
            serial_port = validate_upload_port(payload) if endpoint == "/upload" else None
            print(f"[build-service] building {app_id} with ESP-IDF ELF loader")
            package = build_watch_app(source, app_id, name)

            if endpoint == "/upload":
                with UPLOAD_LOCK:
                    print(f"[build-service] uploading {app_id}.app to {serial_port} over USB-Serial-JTAG")
                    message = upload_app_over_serial(package, app_id, serial_port)
                self.send_json(200, {"ok": True, "id": app_id, "name": name, "message": message})
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", f'attachment; filename="{app_id}.app"')
            self.send_header("Content-Length", str(len(package)))
            self.end_headers()
            self.wfile.write(package)
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
        except subprocess.TimeoutExpired:
            message = "USB upload timed out." if endpoint == "/upload" else "ESP-IDF build timed out after 15 minutes."
            self.send_json(504, {"error": message})
        except Exception as exc:  # report actionable compiler/configuration diagnostics
            self.send_json(500, {"error": str(exc)})


def main() -> None:
    if not ELF_PROJECT.is_dir():
        raise SystemExit(f"Missing ELF app project: {ELF_PROJECT}")
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("BlockCode watch build service listening on http://127.0.0.1:8765")
    print("Open http://127.0.0.1:8765/ so sprite images can be embedded into built apps.")
    print("Use Build watch .app or Upload to watch over USB; press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping build service.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
