$ErrorActionPreference = 'Stop'

# Defaults for the ESP-IDF 6.1 installation used by this PC. Existing ESP-IDF
# shell values take precedence, so this also works from another IDF install.
if (-not $env:IDF_PATH) { $env:IDF_PATH = 'C:\esp\v6.1\esp-idf' }
if (-not $env:IDF_TOOLS_PATH) { $env:IDF_TOOLS_PATH = 'C:\Espressif' }
if (-not $env:IDF_PYTHON_ENV_PATH) { $env:IDF_PYTHON_ENV_PATH = 'C:\Espressif\tools\python\v6.1\venv' }
if (-not $env:ESP_IDF_VERSION) { $env:ESP_IDF_VERSION = '6.1' }
$env:PYTHONUTF8 = '1'
$env:IDF_CCACHE_ENABLE = '1'
$env:ESP_ROM_ELF_DIR = Join-Path $env:IDF_TOOLS_PATH 'tools\esp-rom-elfs\20241011'

$idfPython = Join-Path $env:IDF_PYTHON_ENV_PATH 'Scripts\python.exe'
$idfPy = Join-Path $env:IDF_PATH 'tools\idf.py'
if (-not (Test-Path $idfPython)) { throw "IDF Python not found: $idfPython" }
if (-not (Test-Path $idfPy)) { throw "ESP-IDF not found: $env:IDF_PATH" }

$toolPaths = @(
    (Join-Path $env:IDF_TOOLS_PATH 'tools\xtensa-esp-elf\esp-15.2.0_20251204\xtensa-esp-elf\bin'),
    (Join-Path $env:IDF_TOOLS_PATH 'tools\cmake\4.0.3\bin'),
    (Join-Path $env:IDF_TOOLS_PATH 'tools\ninja\1.12.1'),
    (Join-Path $env:IDF_TOOLS_PATH 'tools\ccache\4.12.1\ccache-4.12.1-windows-x86_64'),
    (Join-Path $env:IDF_TOOLS_PATH 'tools\python\v6.1\venv\Scripts'),
    (Join-Path $env:IDF_PATH 'tools')
)
$env:PATH = (($toolPaths + @($env:PATH)) -join ';')

& $idfPython (Join-Path $PSScriptRoot 'build-service.py')
