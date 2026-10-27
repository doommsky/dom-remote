#!/usr/bin/env pwsh
<#
============================================================================
  AUTOMATION SCRIPT: System Health Check
  Purpose: Check system health and generate a report
  Agent: LaptopAutomationAgent
============================================================================
#>

Write-Host "=== System Health Check Automation ===" -ForegroundColor Cyan
Write-Host "Running at: $(Get-Date)" -ForegroundColor White

# Collect system metrics
$cpu = (Get-Counter '\Processor(_Total)\% Processor Time' | Select-Object -ExpandProperty CounterSample | Select-Object -ExpandProperty CookedValue)
$memory = (Get-Counter '\Memory\Available MBytes' | ForEach-Object { [math]::Round((100 - ($_.CounterValue / (Get-Counter '\Memory\Total Mytes') | Select-Object -ExpandProperty CounterSample) * 100), 2) })
$disk = (Get-PSDrive C).Used / (Get-PSDrive C).Size * 100

# Write results
Write-Host "CPU Usage: $($cpu)%" -ForegroundColor $if ($cpu -gt 80) { Red } else { Green }
Write-Host "Memory Usage: $($memory)%" -ForegroundColor $if ($memory -gt 80) { Red } else { Green }
Write-Host "Disk Usage: $($disk)%" -ForegroundColor $if ($disk -gt 80) { Red } else { Green }

# Check for large files that could be cleaned
$largeFiles = Get-ChildItem "C:\Users\DOOM98\Downloads" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 10MB } | Sort-Object Length -Descending | Select-Object -First 5

if ($largeFiles) {
    Write-Host "`nLarge files in Downloads:" -ForegroundColor Yellow
    $largeFiles | ForEach-Object { Write-Host "  - $($_.Name): $([math]::Round($_.Length/1MB, 2)) MB" }
}

# Generate a simple health summary
$healthStatus = ""
if ($cpu -lt 70 -and $memory -lt 70 -and $disk -lt 70) {
    $healthStatus = "HEALTHY"
} elseif ($cpu -lt 85 -or $memory -lt 85 -or $disk -lt 85) {
    $healthStatus = "WARNING"
} else {
    $healthStatus = "CRITICAL"
}

Write-Host "`nOverall Status: $($healthStatus)" -ForegroundColor $if ($healthStatus -eq "HEALTHY") { Green } elseif ($healthStatus -eq "WARNING") { Yellow } else { Red }

# Log the health check
$logEntry = "[$(Get-Date)] Health Check - CPU: $cpu%, Memory: $memory%, Disk: $disk% - Status: $healthStatus`n"
$logPath = "D:\AI-CORE\health_log.txt"
$logEntry | Out-File -FilePath $logPath -Append -Encoding UTF8

Write-Host "`n=== Health Check Complete ===" -ForegroundColor Cyan