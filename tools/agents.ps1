[CmdletBinding()]
param(
    [Parameter(Position=0)][ValidateSet('context','status','claim','note','finish','release')][string]$Action = 'context',
    [string]$Id, [string]$Task, [string[]]$Scopes, [string]$Owner, [string]$Note,
    [string]$StateDirectory
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (!$StateDirectory) { $StateDirectory = Join-Path $root '.agent-state' }
$null = New-Item -ItemType Directory -Force -Path $StateDirectory
$registry = Join-Path $StateDirectory 'tasks.json'
$lock = $null
$deadline = [DateTime]::UtcNow.AddSeconds(15)
while (!$lock) {
    try { $lock = [IO.File]::Open((Join-Path $StateDirectory 'registry.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
    catch [IO.IOException] {
        if ([DateTime]::UtcNow -ge $deadline) { throw 'Registry busy. Retry after the current operation completes.' }
        Start-Sleep -Milliseconds 100
    }
}
try {
    $rows = @()
    if (Test-Path -LiteralPath $registry) {
        $loaded = Get-Content -Raw -LiteralPath $registry | ConvertFrom-Json
        $rows = @($loaded)
    }
    if ($Action -in @('context','status')) {
        if ($Action -eq 'context') {
            'Project: Aura | C3 firmware + Android control + Python voice backend + Next.js portal'
            'Routing and checks: AGENTS.md | Workflow: markdowns/agent_workflow.md'
            'Read only task-relevant files; claim write paths before editing.'
        }
        'ACTIVE TASKS'
        $rows | Where-Object status -eq 'active' | Select-Object id,task,scopes,updated,note | ConvertTo-Json -Depth 5
        'RECENT HANDOFFS (last 8)'
        $rows | Where-Object status -ne 'active' | Sort-Object updated -Descending | Select-Object -First 8 id,task,status,updated,note | ConvertTo-Json -Depth 5
        return
    }
    if ($Id -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$') { throw 'Use a task ID of 1-80 letters, digits, underscores, or hyphens.' }
    $entry = $rows | Where-Object id -eq $Id | Select-Object -First 1
    if ($Action -eq 'claim') {
        if (!$Task -or !$Scopes) { throw 'claim requires -Task and -Scopes.' }
        if ($entry -and ($entry.status -ne 'active' -or !$Owner -or $entry.owner -ne $Owner)) { throw 'Task ID already exists or owner token is incorrect. Use a unique ID.' }
        $normalized = @($Scopes | ForEach-Object { $_ -split ',' } | ForEach-Object {
            $scope = $_.Trim().Replace('\','/').TrimEnd('/')
            if (!$scope -or [IO.Path]::IsPathRooted($scope) -or $scope -match '[:*?\[\]]' -or $scope -match '(^|/)\.\.?(/|$)') { throw "Invalid relative scope: $_" }
            $scope.ToLowerInvariant()
        } | Select-Object -Unique)
        foreach ($other in $rows | Where-Object { $_.status -eq 'active' -and $_.id -ne $Id }) {
            foreach ($a in $normalized) { foreach ($b in $other.scopes) {
                if ($a -eq $b -or $a.StartsWith($b + '/') -or $b.StartsWith($a + '/')) { throw "Scope '$a' conflicts with task '$($other.id)' ($b)." }
            } }
        }
        if (!$entry) {
            $entry = [pscustomobject]@{ id=$Id; task=$Task; scopes=$normalized; owner=[guid]::NewGuid().ToString('N'); status='active'; updated=''; note='' }
            $rows += $entry
        } else { $entry.task=$Task; $entry.scopes=$normalized }
    } else {
        if (!$entry -or $entry.status -ne 'active') { throw 'No active task with this ID.' }
        if ($Action -ne 'release' -and (!$Owner -or $Owner -ne $entry.owner)) { throw 'Correct -Owner token is required.' }
        if (!$Note) { throw 'A -Note is required for progress, completion, or recovery.' }
        $entry.note=$Note
        if ($Action -eq 'finish') { $entry.status='finished' }
        if ($Action -eq 'release') { $entry.status='released' }
    }
    $entry.updated = [DateTime]::UtcNow.ToString('o')
    $temp = Join-Path $StateDirectory ([guid]::NewGuid().ToString('N') + '.tmp')
    [IO.File]::WriteAllText($temp, (ConvertTo-Json -InputObject @($rows) -Depth 6))
    if (Test-Path -LiteralPath $registry) {
        $backup = Join-Path $StateDirectory 'tasks.previous.json'
        [IO.File]::Replace($temp, $registry, $backup)
    }
    else { [IO.File]::Move($temp, $registry) }
    $entry | ConvertTo-Json -Depth 5
} finally { if ($lock) { $lock.Dispose() } }
