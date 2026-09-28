$ErrorActionPreference = 'Stop'
$harness = Join-Path $PSScriptRoot 'agents.ps1'
$state = Join-Path ([IO.Path]::GetTempPath()) ('aura-agents-test-' + [guid]::NewGuid().ToString('N'))
$jobs = @()
function Expect-Failure([scriptblock]$Operation) {
    $failed = $false
    try { & $Operation | Out-Null } catch { $failed = $true }
    if (!$failed) { throw 'Expected rejection, but operation succeeded.' }
}
try {
    $first = & $harness claim -Id first -Task 'First' -Scopes web/app -StateDirectory $state | ConvertFrom-Json
    Expect-Failure { & $harness claim -Id overlap -Task 'Overlap' -Scopes web/app/page.tsx -StateDirectory $state }
    Expect-Failure { & $harness claim -Id parent -Task 'Parent' -Scopes web -StateDirectory $state }
    Expect-Failure { & $harness finish -Id first -Owner wrong -Note 'Wrong owner' -StateDirectory $state }
    Expect-Failure { & $harness claim -Id escape -Task 'Escape' -Scopes '../outside' -StateDirectory $state }
    $null = & $harness claim -Id sibling -Task 'Sibling' -Scopes web/lib -StateDirectory $state
    Expect-Failure { & $harness claim -Id first -Owner $first.owner -Task 'Expand' -Scopes web/app,web/lib -StateDirectory $state }
    $rows = Get-Content (Join-Path $state 'tasks.json') -Raw | ConvertFrom-Json
    if ((($rows | Where-Object id -eq first).scopes -join ',') -ne 'web/app') { throw 'Failed claim changed scopes.' }
    $null = & $harness finish -Id first -Owner $first.owner -Note 'Complete' -StateDirectory $state
    $null = & $harness claim -Id successor -Task 'Reuse finished scope' -Scopes web/app -StateDirectory $state
    $null = & $harness release -Id successor -Note 'Recovery verified' -StateDirectory $state
    foreach ($id in @('race-a','race-b')) {
        $jobs += Start-Job -ScriptBlock {
            param($script, $directory, $taskId)
            try { $null = & $script claim -Id $taskId -Task 'Race' -Scopes backend -StateDirectory $directory; 'won' }
            catch { if ($_.Exception.Message -like '*conflicts with task*') { 'conflict' } else { throw } }
        } -ArgumentList $harness,$state,$id
    }
    $results = @($jobs | Wait-Job | Receive-Job -ErrorAction Stop)
    if (@($results | Where-Object { $_ -eq 'won' }).Count -ne 1 -or @($results | Where-Object { $_ -eq 'conflict' }).Count -ne 1) { throw 'Concurrent claim arbitration failed.' }
    $null = & $harness context -StateDirectory $state
    'PASS: overlap, parent scope, owner, invalid path, independent scopes, atomic failed expansion, completion, recovery, concurrent arbitration, context.'
} finally {
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
    $resolved = [IO.Path]::GetFullPath($state)
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolved -Leaf) -like 'aura-agents-test-*') {
        if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
    }
}
