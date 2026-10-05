param([switch]$Install)
$ErrorActionPreference = 'Stop'
$companionRoot = Split-Path -Parent $PSScriptRoot
$cadPython = Join-Path $companionRoot '_build\venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $cadPython)) {
    $venvPath = Join-Path $companionRoot '_build\venv'
    python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) { throw 'Creating the CAD Python environment failed.' }
    $Install = $true
}
if ($Install) {
    & $cadPython -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Installing the CAD dependencies failed.' }
}
foreach ($scriptName in @('build_companion.py', 'verify_exports.py', 'render_review.py', 'build_wiring.py', 'finish_package.py')) {
    & $cadPython (Join-Path $PSScriptRoot $scriptName)
    if ($LASTEXITCODE -ne 0) { throw "CAD build stopped at $scriptName" }
}
Write-Output 'Aura R1 files rebuilt and checked. Open companion/START_HERE.html.'
