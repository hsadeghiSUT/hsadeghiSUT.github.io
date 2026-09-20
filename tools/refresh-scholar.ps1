<#
    refresh-scholar.ps1 — the local half of keeping the citation figures current.

    WHY THERE ARE TWO HALVES
    ------------------------
    The site is published twice (README §11.1): hsadeghi.org on GitHub Pages,
    and sharif.edu/~hsadeghi/ on the university's own server, from the same
    files. `.github/workflows/refresh-scholar.yml` keeps the GitHub copy
    current on its own, twice a day, and cannot reach the mirror. This script
    is for the mirror — and for anyone who publishes by uploading files by hand
    rather than by pushing to Git.

    It is also the better-behaved of the two in one respect: it asks Google
    from a home or campus address rather than from a datacentre, which is the
    kind of address Scholar answers without a captcha.

    WHAT IT DOES
    ------------
      1. Reads data/scholar.json and remembers the figures.
      2. Runs `node tools/fetch-scholar.mjs`.
      3. Runs `node tools/check-scholar.mjs` over whatever that wrote.
      4. Says what changed, and — if anything did — which single file has to
         reach each server.
      5. Appends one line to tools/scholar-refresh.log.

    It never edits data/scholar.json itself, never uploads anything, and never
    touches Git. Deciding what to publish stays a person's decision; this only
    makes sure the number in the file is today's.

    IT ALWAYS EXITS 0 unless you pass -Strict. A captcha is an ordinary
    outcome, and Task Scheduler showing a red "last result" once a week for
    something that behaved correctly teaches you to ignore it.

    USAGE
        pwsh -File tools/refresh-scholar.ps1              refresh and report
        pwsh -File tools/refresh-scholar.ps1 -DryRun      ask, print, write nothing
        pwsh -File tools/refresh-scholar.ps1 -Strict      exit 1 if Scholar refused
        pwsh -File tools/refresh-scholar.ps1 -Register    install the daily task
        pwsh -File tools/refresh-scholar.ps1 -Unregister  remove it again

    -Register creates a Windows scheduled task called "Refresh Scholar
    snapshot" that runs this script every day at 07:40, only when the machine
    is awake and on a network. It changes nothing else about the system and
    -Unregister removes it. Nothing is installed unless you pass that switch.
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Strict,
    [switch]$Register,
    [switch]$Unregister,
    # The hour the registered task runs. Morning, so a day's worth of new
    # citations is on the site before anyone looks at it.
    [string]$At = '07:40'
)

$ErrorActionPreference = 'Stop'
# ...but a non-zero exit from `node` is a RESULT here, not an error. PowerShell 7.4
# turns native exit codes into terminating errors when this is left on, which would
# make a captcha - the one outcome this script is written to survive - throw instead
# of being reported. The exit codes are read explicitly below.
$PSNativeCommandUseErrorActionPreference = $false

# The site root is one level up from tools/, however this script was invoked.
$Root    = Split-Path -Parent $PSScriptRoot
$Snap    = Join-Path $Root 'data/scholar.json'
$LogPath = Join-Path $PSScriptRoot 'scholar-refresh.log'
$TaskName = 'Refresh Scholar snapshot'

function Write-Log([string]$Text) {
    $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm')
    Add-Content -LiteralPath $LogPath -Value "$stamp  $Text" -Encoding utf8
}

function Read-Figures {
    <# The three numbers, or $null when there is no readable snapshot. #>
    if (-not (Test-Path -LiteralPath $Snap)) { return $null }
    try {
        $d = Get-Content -LiteralPath $Snap -Raw -Encoding utf8 | ConvertFrom-Json
        if (-not $d.metrics) { return $null }
        return [pscustomobject]@{
            Citations = [int]$d.metrics.citations
            H         = [int]$d.metrics.hIndex
            I10       = [int]$d.metrics.i10Index
            Papers    = @($d.papers).Count
            Fetched   = [string]$d.fetched
        }
    } catch { return $null }
}

function Format-Figures($f) {
    if (-not $f) { return '(no snapshot)' }
    '{0} citations, h {1}, i10 {2}, {3} cited papers' -f $f.Citations, $f.H, $f.I10, $f.Papers
}

# ---------------------------------------------------------------------------
# -Register / -Unregister — the scheduled task
# ---------------------------------------------------------------------------

if ($Unregister) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed the scheduled task '$TaskName'."
    } else {
        Write-Host "There is no scheduled task called '$TaskName'."
    }
    exit 0
}

if ($Register) {
    # `pwsh` if it is there, `powershell` otherwise — the task has to name a real
    # executable, and which one exists depends on the machine.
    $shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh' } else { 'powershell' }
    $exe   = (Get-Command $shell).Source

    $action  = New-ScheduledTaskAction -Execute $exe `
        -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $PSCommandPath) `
        -WorkingDirectory $Root
    $trigger = New-ScheduledTaskTrigger -Daily -At $At
    # Do not wake the machine, do not run on battery, and give up rather than
    # hang about: this is a small courtesy to Google's servers and to the
    # laptop, not something that has to happen at a particular instant.
    $settings = New-ScheduledTaskSettingsSet `
        -StartWhenAvailable `
        -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
        -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 30)

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
        -Settings $settings -Description 'Refreshes data/scholar.json for the Hamed Sadeghi website.' -Force | Out-Null

    Write-Host "Registered '$TaskName' — daily at $At."
    Write-Host "Remove it with:  pwsh -File `"$PSCommandPath`" -Unregister"
    exit 0
}

# ---------------------------------------------------------------------------
# The refresh itself
# ---------------------------------------------------------------------------

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warning 'Node is not on PATH, so the fetcher cannot run. Install Node 18 or newer.'
    Write-Log 'skipped - node not found'
    exit ($(if ($Strict) { 1 } else { 0 }))
}

Push-Location $Root
$code = 0
try {
    $before = Read-Figures
    Write-Host ''
    Write-Host 'Before:  ' -NoNewline; Write-Host (Format-Figures $before)
    if ($before -and $before.Fetched) { Write-Host "         snapshot dated $($before.Fetched)" }
    Write-Host ''

    # Not $args: that is an automatic variable in PowerShell and writing to it
    # is a good way to confuse a future reader about where these came from.
    $fetchArgs = @('tools/fetch-scholar.mjs')
    if ($DryRun) { $fetchArgs += '--dry-run' }

    # The fetcher prints its own report; let it through rather than capturing it.
    & node @fetchArgs
    $fetchExit = $LASTEXITCODE

    if ($fetchExit -ne 0) {
        Write-Host ''
        Write-Warning 'Scholar did not answer cleanly - a captcha, a consent page or a timeout.'
        Write-Warning 'data/scholar.json was left exactly as it was, so the site keeps showing'
        Write-Warning 'the figures it already had. Try again in a few minutes, or tomorrow.'
        Write-Log ('refused   - snapshot left at: ' + (Format-Figures $before))
        if ($Strict) { $code = 1 }
        return
    }

    if ($DryRun) {
        Write-Host ''
        Write-Host '-DryRun: nothing was written.'
        Write-Log 'dry run   - nothing written'
        return
    }

    # The same guard a person would run by hand. If this is unhappy, say so
    # loudly - a snapshot that check-scholar cannot vouch for must not be
    # uploaded anywhere.
    Write-Host ''
    & node 'tools/check-scholar.mjs'
    $checkExit = $LASTEXITCODE

    $after = Read-Figures
    Write-Host ''
    Write-Host 'After:   ' -NoNewline; Write-Host (Format-Figures $after)

    if ($checkExit -ne 0) {
        Write-Host ''
        Write-Warning 'check-scholar.mjs is not happy with what was written. Do NOT upload'
        Write-Warning 'data/scholar.json until that is understood.'
        Write-Log ('WROTE BUT CHECK FAILED - ' + (Format-Figures $after))
        $code = 1
        return
    }

    $moved = ($null -eq $before) -or
             ($before.Citations -ne $after.Citations) -or
             ($before.H -ne $after.H) -or
             ($before.I10 -ne $after.I10) -or
             ($before.Papers -ne $after.Papers)

    Write-Host ''
    if ($moved) {
        $delta = if ($before) { $after.Citations - $before.Citations } else { $after.Citations }
        $sign  = if ($delta -ge 0) { '+' } else { '' }
        Write-Host ('The figures moved ({0}{1} citations).' -f $sign, $delta) -ForegroundColor Green
        Write-Host ''
        Write-Host 'One file changed, and it has to reach both copies of the site:'
        Write-Host ''
        Write-Host '    data/scholar.json'
        Write-Host ''
        Write-Host '  hsadeghi.org   git add data/scholar.json; git commit -m "Scholar"; git push'
        Write-Host '                 - or nothing at all, if the GitHub Action is running. See'
        Write-Host '                   .github/workflows/refresh-scholar.yml'
        Write-Host '  sharif.edu     upload data/scholar.json into the mirror''s data/ folder'
        Write-Host ''
        Write-Log ('updated   - ' + (Format-Figures $after))
    } else {
        Write-Host 'No change - the profile says the same thing it said last time.'
        Write-Host 'Nothing needs uploading for the figures themselves. The date stamp inside'
        Write-Host 'data/scholar.json did move, and that is what the 400-day freshness guard in'
        Write-Host 'assets/js/modules/scholar.js reads, so send the file across every few months'
        Write-Host 'even on a quiet week.'
        Write-Log ('no change - ' + (Format-Figures $after))
    }
} finally {
    Pop-Location
}

exit $code
