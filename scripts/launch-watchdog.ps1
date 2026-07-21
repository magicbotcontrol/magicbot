$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'cloudflare-tunnel-common.ps1')

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.runtime\cycle-watchdog'
$watchdogPidPath = Join-Path $runtimeRoot 'watchdog.pid'
$watchdogScriptPath = Join-Path $PSScriptRoot 'cycle-watchdog.ps1'
$envMap = Get-ProjectEnvMap -ProjectRoot $projectRoot

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Body = $null
  )

  $params = @{
    Method = $Method
    Uri = $Url
    TimeoutSec = 30
  }

  if ($PSBoundParameters.ContainsKey('Body') -and $Method -notin @('GET', 'HEAD') -and $null -ne $Body) {
    $params['ContentType'] = 'application/json'
    $params['Body'] = $Body
  }

  return Invoke-RestMethod @params
}

function Wait-ApiHealth {
  param(
    [string]$HealthUrl
  )

  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    try {
      $health = Invoke-JsonRequest -Method 'GET' -Url $HealthUrl
      if ($health.ok) {
        return
      }
    } catch {
    }

    Start-Sleep -Seconds 2
  }

  throw "A API nao ficou saudavel em tempo habil: $HealthUrl"
}

function Start-WatchdogProcess {
  if (Test-Path $watchdogPidPath) {
    $existingPid = (Get-Content $watchdogPidPath -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if ($existingPid -match '^\d+$') {
      $runningProcess = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
      if ($runningProcess) {
        Write-Host "Watchdog ja estava rodando no PID $existingPid."
        return
      }
    }
  }

  Start-Process powershell.exe -WindowStyle Minimized -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $watchdogScriptPath
  ) | Out-Null

  for ($attempt = 0; $attempt -lt 15; $attempt += 1) {
    if (Test-Path $watchdogPidPath) {
      $startedPid = (Get-Content $watchdogPidPath -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
      if ($startedPid -match '^\d+$') {
        Write-Host "Watchdog iniciado no PID $startedPid."
        return
      }
    }

    Start-Sleep -Milliseconds 500
  }

  throw 'O watchdog nao confirmou inicializacao pelo arquivo PID.'
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'start-worker-host.ps1')
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao iniciar a stack local. Codigo: $LASTEXITCODE"
}

$healthUrl = 'http://127.0.0.1:4174/api/health'
Wait-ApiHealth -HealthUrl $healthUrl

$accounts = @()
$response = Invoke-JsonRequest -Method 'GET' -Url 'http://127.0.0.1:4174/api/contas'
if ($null -ne $response) {
  $accounts = @($response)
}

$reconnectableAccounts = @($accounts | Where-Object { $_.credencial_configurada -eq $true })
foreach ($account in $reconnectableAccounts) {
  Write-Host "Enviando reconexao para $($account.apelido)..."
  Invoke-JsonRequest -Method 'POST' -Url "http://127.0.0.1:4174/api/contas/$($account.id)/connect" -Body '{}'
}

New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
Start-WatchdogProcess

$panelUrl = if ($envMap.ContainsKey('WORKER_PANEL_URL') -and -not [string]::IsNullOrWhiteSpace([string]$envMap['WORKER_PANEL_URL'])) {
  [string]$envMap['WORKER_PANEL_URL']
} else {
  ''
}

Write-Host ''
Write-Host 'ZENQUANT WATCHDOG iniciado com sucesso.'
Write-Host "Health local: $healthUrl"
Write-Host "Contas com reconexao enviada: $($reconnectableAccounts.Count)"
Write-Host "Log do watchdog: $(Join-Path $runtimeRoot 'watchdog.log')"

if ($panelUrl) {
  Write-Host "Painel configurado em: $panelUrl"
}
