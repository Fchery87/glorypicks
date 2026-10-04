$ErrorActionPreference = "Continue"

$repoRoot = Split-Path -Parent $PSScriptRoot
$checks = @(
    @{
        Name = "frontend typecheck"
        WorkingDirectory = Join-Path $repoRoot "frontend"
        Command = "npm"
        Arguments = @("run", "typecheck")
    },
    @{
        Name = "frontend tests"
        WorkingDirectory = Join-Path $repoRoot "frontend"
        Command = "npm"
        Arguments = @("test")
    },
    @{
        Name = "frontend production build"
        WorkingDirectory = Join-Path $repoRoot "frontend"
        Command = "npm"
        Arguments = @("run", "build")
    },
    @{
        Name = "backend tests"
        WorkingDirectory = Join-Path $repoRoot "backend"
        Command = "python"
        Arguments = @("-m", "pytest", "-q", "-p", "no:cacheprovider")
    }
)

$results = @()

foreach ($check in $checks) {
    Write-Host ""
    Write-Host "==> $($check.Name)"
    $started = Get-Date
    Push-Location $check.WorkingDirectory
    try {
        $arguments = [string[]]$check.Arguments
        & $check.Command @arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
    $duration = ((Get-Date) - $started).TotalSeconds
    $result = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }
    $results += [PSCustomObject]@{
        Name = $check.Name
        Result = $result
        ExitCode = $exitCode
        DurationSeconds = [Math]::Round($duration, 2)
    }
    Write-Host "<== $result $($check.Name) exit=$exitCode duration=$([Math]::Round($duration, 2))s"
}

Write-Host ""
Write-Host "Verification summary"
$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Result -eq "FAIL" })
if ($failed.Count -gt 0) {
    Write-Error "$($failed.Count) verification check(s) failed."
    exit 1
}

Write-Host "All GloryPicks verification checks passed."
