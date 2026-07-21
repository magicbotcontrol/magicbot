param(
  [int]$CheckEverySeconds = 120,
  [int]$SnapshotEverySeconds = 10800,
  [int]$ReconnectCooldownSeconds = 300,
  [int]$HealthFailureRestartThreshold = 3,
  [int]$MaxIterations = 0
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'cloudflare-tunnel-common.ps1')

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.runtime\cycle-watchdog'
$nodeModulesBin = Join-Path $projectRoot 'node_modules\.bin'
$pm2 = Join-Path $nodeModulesBin 'pm2.cmd'
$pm2ErrorLog = Join-Path $env:USERPROFILE '.pm2\logs\zenquant-worker-error-1.log'
$pm2OutLog = Join-Path $env:USERPROFILE '.pm2\logs\zenquant-worker-out-1.log'
$debugLogPath = Join-Path $projectRoot '.dbg\trae-debug-log-rescue-disconnect-cycle.ndjson'
$watchdogLogPath = Join-Path $runtimeRoot 'watchdog.log'
$watchdogPidPath = Join-Path $runtimeRoot 'watchdog.pid'
$apiBaseUrl = 'http://127.0.0.1:4174/api'
$workerBaseUrl = 'http://127.0.0.1:4175/internal'
$projectEnv = Get-ProjectEnvMap -ProjectRoot $projectRoot
$workerToken = if ($projectEnv.ContainsKey('WORKER_INTERNAL_TOKEN') -and -not [string]::IsNullOrWhiteSpace([string]$projectEnv['WORKER_INTERNAL_TOKEN'])) {
  [string]$projectEnv['WORKER_INTERNAL_TOKEN']
} elseif ($projectEnv.ContainsKey('AUTOMATION_API_TOKEN')) {
  [string]$projectEnv['AUTOMATION_API_TOKEN']
} else {
  ''
}

$script:lastSnapshotAt = Get-Date
$script:healthFailureCount = 0
$script:lastReconnectAttemptAt = @{}

New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null

if (Test-Path $watchdogPidPath) {
  $existingPid = (Get-Content $watchdogPidPath -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($existingPid -match '^\d+$') {
    $runningProcess = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
    if ($runningProcess) {
      Write-Host "Watchdog ja em execucao no PID $existingPid. Encerrando nova instancia."
      exit 0
    }
  }
}

Set-Content -Path $watchdogPidPath -Value $PID -Encoding ASCII

function Write-WatchdogLog {
  param(
    [string]$Message,
    [string]$Level = 'INFO'
  )

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $line = "[$timestamp][$Level] $Message"
  Add-Content -Path $watchdogLogPath -Value $line -Encoding UTF8
  Write-Host $line
}

function ConvertTo-PrettyJson {
  param(
    $Value
  )

  return $Value | ConvertTo-Json -Depth 12
}

function Write-JsonFile {
  param(
    [string]$Path,
    $Value
  )

  ConvertTo-PrettyJson -Value $Value | Set-Content -Path $Path -Encoding UTF8
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = @{},
    [string]$Body = $null,
    [int]$TimeoutSec = 30
  )

  $params = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    UseBasicParsing = $true
    TimeoutSec = $TimeoutSec
  }

  if ($PSBoundParameters.ContainsKey('Body') -and $Method -notin @('GET', 'HEAD') -and $null -ne $Body) {
    $params['ContentType'] = 'application/json'
    $params['Body'] = $Body
  }

  return Invoke-RestMethod @params
}

function Get-SafeResult {
  param(
    [scriptblock]$Action
  )

  try {
    return & $Action
  } catch {
    return @{
      ok = $false
      error = $_.Exception.Message
    }
  }
}

function Save-WatchdogBundle {
  param(
    [string]$Reason,
    $Accounts = $null
  )

  $timestamp = Get-Date
  $stamp = $timestamp.ToString('yyyyMMdd-HHmmss')
  $safeReason = ($Reason -replace '[^a-zA-Z0-9_-]', '-')
  $bundleDir = Join-Path $runtimeRoot "$stamp-$safeReason"
  New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null

  if ($null -eq $Accounts) {
    $Accounts = Get-SafeResult { Invoke-JsonRequest -Method 'GET' -Url "$apiBaseUrl/contas" }
  }

  $apiHealth = Get-SafeResult { Invoke-JsonRequest -Method 'GET' -Url "$apiBaseUrl/health" }
  $workerHealth = if ([string]::IsNullOrWhiteSpace($workerToken)) {
    @{ ok = $false; skipped = $true; reason = 'worker-token-ausente' }
  } else {
    Get-SafeResult { Invoke-JsonRequest -Method 'GET' -Url "$workerBaseUrl/health" -Headers @{ 'x-worker-token' = $workerToken } }
  }
  $debugLogs = Get-SafeResult { Invoke-JsonRequest -Method 'GET' -Url 'http://127.0.0.1:7777/logs' -TimeoutSec 15 }
  $pm2State = if (Test-Path $pm2) {
    Get-SafeResult {
      $json = & $pm2 jlist 2>&1
      if ($LASTEXITCODE -ne 0) {
        throw "Falha ao consultar PM2. Codigo: $LASTEXITCODE"
      }
      if ([string]::IsNullOrWhiteSpace([string]$json)) {
        return @()
      }
      return $json | ConvertFrom-Json
    }
  } else {
    @{ ok = $false; error = 'pm2-nao-encontrado' }
  }

  Write-JsonFile -Path (Join-Path $bundleDir 'metadata.json') -Value @{
    reason = $Reason
    captured_at = $timestamp.ToString('o')
    check_every_seconds = $CheckEverySeconds
    snapshot_every_seconds = $SnapshotEverySeconds
  }
  Write-JsonFile -Path (Join-Path $bundleDir 'accounts.json') -Value $Accounts
  Write-JsonFile -Path (Join-Path $bundleDir 'api-health.json') -Value $apiHealth
  Write-JsonFile -Path (Join-Path $bundleDir 'worker-health.json') -Value $workerHealth
  Write-JsonFile -Path (Join-Path $bundleDir 'debug-logs.json') -Value $debugLogs
  Write-JsonFile -Path (Join-Path $bundleDir 'pm2-state.json') -Value $pm2State

  if (Test-Path $pm2ErrorLog) {
    Get-Content $pm2ErrorLog -Tail 160 | Set-Content -Path (Join-Path $bundleDir 'pm2-worker-error-tail.log') -Encoding UTF8
  }

  if (Test-Path $pm2OutLog) {
    Get-Content $pm2OutLog -Tail 80 | Set-Content -Path (Join-Path $bundleDir 'pm2-worker-out-tail.log') -Encoding UTF8
  }

  if (Test-Path $debugLogPath) {
    Get-Content $debugLogPath -Tail 200 | Set-Content -Path (Join-Path $bundleDir 'debug-log-tail.ndjson') -Encoding UTF8
  }

  Write-WatchdogLog "Bundle salvo em $bundleDir para motivo: $Reason"
}

function Restart-LocalProcesses {
  if (-not (Test-Path $pm2)) {
    Write-WatchdogLog 'PM2 nao encontrado para reiniciar API/worker.' 'WARN'
    return
  }

  Set-Location $projectRoot
  $env:Path = "$nodeModulesBin;$env:Path"

  & $pm2 restart zenquant-api --update-env | Out-Null
  & $pm2 restart zenquant-worker --update-env | Out-Null
  & $pm2 save | Out-Null

  Write-WatchdogLog 'API e worker reiniciados pelo watchdog.' 'WARN'
}

function Invoke-AccountReconnect {
  param(
    $Account
  )

  $accountId = [string]$Account.id
  $now = Get-Date

  if ($script:lastReconnectAttemptAt.ContainsKey($accountId)) {
    $elapsed = ($now - $script:lastReconnectAttemptAt[$accountId]).TotalSeconds
    if ($elapsed -lt $ReconnectCooldownSeconds) {
      return
    }
  }

  $script:lastReconnectAttemptAt[$accountId] = $now
  Write-WatchdogLog "Tentando reconectar conta $($Account.apelido) ($accountId)."

  try {
    Invoke-JsonRequest -Method 'POST' -Url "$apiBaseUrl/contas/$accountId/connect" -Body '{}' | Out-Null
  } catch {
    Write-WatchdogLog "Falha ao reconectar conta $($Account.apelido): $($_.Exception.Message)" 'ERROR'
  }
}

function Test-ShouldReconnect {
  param(
    $Account
  )

  if ($Account.credencial_configurada -ne $true) {
    return $false
  }

  return [string]$Account.connection_state -eq 'desconectada'
}

function Invoke-WatchdogIteration {
  $apiHealth = Invoke-JsonRequest -Method 'GET' -Url "$apiBaseUrl/health" -TimeoutSec 15
  if (-not $apiHealth.ok) {
    throw 'API local sem health ok.'
  }

  if (-not [string]::IsNullOrWhiteSpace($workerToken)) {
    $workerHealth = Invoke-JsonRequest -Method 'GET' -Url "$workerBaseUrl/health" -Headers @{ 'x-worker-token' = $workerToken } -TimeoutSec 15
    if (-not $workerHealth.ok) {
      throw 'Worker local sem health ok.'
    }
  }

  $accounts = @()
  $response = Invoke-JsonRequest -Method 'GET' -Url "$apiBaseUrl/contas" -TimeoutSec 20
  if ($null -ne $response) {
    $accounts = @($response)
  }

  $disconnectedAccounts = @($accounts | Where-Object { Test-ShouldReconnect -Account $_ })
  if ($disconnectedAccounts.Count -gt 0) {
    Save-WatchdogBundle -Reason 'conta-desconectada-detectada' -Accounts $accounts
    foreach ($account in $disconnectedAccounts) {
      Invoke-AccountReconnect -Account $account
    }
  }

  $needsSnapshot = ((Get-Date) - $script:lastSnapshotAt).TotalSeconds -ge $SnapshotEverySeconds
  if ($needsSnapshot) {
    Save-WatchdogBundle -Reason 'snapshot-periodico-3h' -Accounts $accounts
    $script:lastSnapshotAt = Get-Date
  }

  $summary = if ($accounts.Count -gt 0) {
    ($accounts | ForEach-Object { "$($_.apelido)=$($_.connection_state)" }) -join ', '
  } else {
    'nenhuma-conta'
  }

  Write-WatchdogLog "Checagem concluida. Contas: $summary"
}

Write-WatchdogLog "Watchdog iniciado. check=${CheckEverySeconds}s snapshot=${SnapshotEverySeconds}s cooldown=${ReconnectCooldownSeconds}s"

$iteration = 0

try {
  while ($true) {
    try {
      Invoke-WatchdogIteration
      $script:healthFailureCount = 0
    } catch {
      $script:healthFailureCount += 1
      Write-WatchdogLog "Falha na checagem do watchdog: $($_.Exception.Message)" 'ERROR'

      if ($script:healthFailureCount -ge $HealthFailureRestartThreshold) {
        Save-WatchdogBundle -Reason 'falha-health-threshold'
        Restart-LocalProcesses
        $script:healthFailureCount = 0
      }
    }

    $iteration += 1
    if ($MaxIterations -gt 0 -and $iteration -ge $MaxIterations) {
      Write-WatchdogLog "Watchdog finalizado apos $iteration iteracao(oes) de teste."
      break
    }

    Start-Sleep -Seconds $CheckEverySeconds
  }
} finally {
  Remove-Item $watchdogPidPath -Force -ErrorAction SilentlyContinue
}
