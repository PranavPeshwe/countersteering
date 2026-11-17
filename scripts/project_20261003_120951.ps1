param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('install', 'dev', 'build', 'typecheck', 'test', 'test-browser', 'browsers', 'reference', 'preview', 'open-preview')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5) {
    throw 'Run this script with Windows PowerShell 5.x.'
}

$root = Split-Path -Parent $PSScriptRoot
$artifacts = 'Q:\pp_exp\pp_countersteering_artifacts'
if (-not (Test-Path -LiteralPath $artifacts -PathType Container)) {
    throw "Required generated-output directory is unavailable: $artifacts"
}

foreach ($name in @('tmp', 'npm-cache', 'node_modules', 'playwright-browsers', 'screenshots', 'reference', 'browser-profile')) {
    New-Item -ItemType Directory -Path (Join-Path $artifacts $name) -Force | Out-Null
}

$env:TEMP = Join-Path $artifacts 'tmp'
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $artifacts 'npm-cache'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $artifacts 'playwright-browsers'
$env:PYTHONPYCACHEPREFIX = Join-Path $artifacts 'pycache'

$localModules = Join-Path $root 'node_modules'
$targetModules = Join-Path $artifacts 'node_modules'
if (Test-Path -LiteralPath $localModules) {
    $item = Get-Item -LiteralPath $localModules
    if ($item.LinkType -ne 'Junction' -or $item.Target -notcontains $targetModules) {
        throw "node_modules must be a junction to $targetModules. No existing directory was changed."
    }
} else {
    New-Item -ItemType Junction -Path $localModules -Target $targetModules | Out-Null
}

Set-Location $root
if ($Action -eq 'install') {
    Copy-Item -LiteralPath (Join-Path $root 'package.json') -Destination (Join-Path $artifacts 'package.json') -Force
    $sourceLock = Join-Path $root 'package-lock.json'
    if (Test-Path -LiteralPath $sourceLock) {
        Copy-Item -LiteralPath $sourceLock -Destination (Join-Path $artifacts 'package-lock.json') -Force
    }
    & npm.cmd install --prefix $artifacts --no-fund
    $installExit = $LASTEXITCODE
    if ($installExit -ne 0) { exit $installExit }
    Copy-Item -LiteralPath (Join-Path $artifacts 'package-lock.json') -Destination $sourceLock -Force
    exit 0
}

$vite = Join-Path $localModules 'vite\bin\vite.js'
$tsc = Join-Path $localModules 'typescript\lib\tsc.js'
$playwright = Join-Path $localModules '@playwright\test\cli.js'

switch ($Action) {
    'dev' { & node.exe --max-http-header-size=65536 $vite --host 127.0.0.1 --port 5173 --strictPort }
    'typecheck' { & node.exe $tsc --noEmit }
    'test' { & node.exe (Join-Path $localModules 'vitest\vitest.mjs') run }
    'test-browser' { & node.exe $playwright test }
    'browsers' { & node.exe $playwright install chromium }
    'reference' { & node.exe (Join-Path $PSScriptRoot 'generate_reference_20261003_120951.mjs') }
    'preview' { & node.exe --max-http-header-size=65536 $vite preview --host 127.0.0.1 --port 4173 --strictPort }
    'open-preview' { & node.exe (Join-Path $PSScriptRoot 'open_preview_20261003_120951.mjs') }
    'build' {
        & node.exe $tsc --noEmit
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & node.exe $vite build
    }
}
exit $LASTEXITCODE
