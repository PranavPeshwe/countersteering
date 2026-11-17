$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5) {
    throw 'Run this script with Windows PowerShell 5.x.'
}
$root = 'Q:\pp_exp\pp_countersteering_artifacts'
if (-not (Test-Path -LiteralPath $root -PathType Container)) {
    throw "Required generated-output directory is unavailable: $root"
}
$env:UV_CACHE_DIR = Join-Path $root 'uv-cache'
$env:UV_TOOL_DIR = Join-Path $root 'uv-tools'
$env:UV_TOOL_BIN_DIR = Join-Path $root 'uv-bin'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $root 'uv-python'
$env:UV_NATIVE_TLS = 'true'
$env:BH_HOME = Join-Path $root 'browser-harness'
$env:BH_AGENT_WORKSPACE = Join-Path $env:BH_HOME 'agent-workspace'
$env:BH_RECORD = '0'
$env:PYTHONPYCACHEPREFIX = Join-Path $root 'pycache'
$env:TEMP = Join-Path $root 'tmp'
$env:TMP = $env:TEMP
& uv.exe tool install --python 3.12 browser-harness
if ($LASTEXITCODE -eq 0) {
    $harness = Join-Path $env:UV_TOOL_BIN_DIR 'browser-harness.exe'
} else {
    Write-Warning 'The uv download failed. Retry with the isolated Python pip installer.'
    $venv = Join-Path $root 'browser-harness-venv'
    $env:PIP_CACHE_DIR = Join-Path $root 'pip-cache'
    & python.exe -m venv $venv
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & (Join-Path $venv 'Scripts\python.exe') -m pip install browser-harness
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $harness = Join-Path $venv 'Scripts\browser-harness.exe'
}
& $harness telemetry disable
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $harness recordings disable
Write-Output "Local browser harness: $harness"
exit $LASTEXITCODE
