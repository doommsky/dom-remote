#!/usr/bin/env pwsh
<#
============================================================================
  AI AGENT FOUNDATION - Clean & Modular Edition
  Purpose: Core autonomous agent for laptop automation
  Version: 2.0.0 - Fresh start, modular design
============================================================================
#>

# ============================================================================
# AGENT CORE CONFIGURATION
# ============================================================================

$agent = @{
    Name = "LaptopAutomationAgent"
    Version = "2.0.0"
    BaseDirectory = "D:\"
    LearningLog = "D:\AI-CORE\agent_learning.log"
    ConfigPath = "D:\AI-CORE\agent_config.json"
    CycleDelay = 60  # seconds between cycles
}

# ============================================================================
# AGENT CORE FUNCTIONS
# ============================================================================

function Invoke-Agent-Cycle {
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host "  $($agent.Name) v$($agent.Version) - CYCLE ACTIVATED" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Cyan
    
    # Phase 1: System assessment
    $system = Invoke- assess-System
    
    # Phase 2: Learn from history
    $lessons = Invoke-Learn-History
    
    # Phase 3: Plan automation
    $plan = Invoke-Plan-Automation $system $lessons
    
    # Phase 4: Execute if scheduled
    if ($plan.ShouldExecute) {
        Write-Subheader "Executing: $($plan.SelectedModule) - $($plan.SelectedScript)"
        $result = Invoke-Execute $plan
        Log-Experience $system $plan $result
    } else {
        Write-Host "  >> No automation scheduled. Agent observing." -ForegroundColor Yellow
    }
    
    Write-Host "`n$($agent.Name) cycle complete. Next in $($agent.CycleDelay)s..." -ForegroundColor Cyan
    Start-Sleep -Seconds $agent.CycleDelay
}

function Invoke-assess-System {
    Write-Step "Assessing system state..."
    
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time' | Select-Object -ExpandProperty CounterSample | Select-Object -ExpandProperty CookedValue)
    $memory = (Get-Counter '\Memory\Available MBytes' | ForEach-Object { [math]::Round((100 - ($_.CounterValue / (Get-Counter '\Memory\Total Mytes') | Select-Object -ExpandProperty CounterSample) * 100), 2) })
    $disk = (Get-PSDrive C).Used / (Get-PSDrive C).Size * 100
    
    Write-Host "  CPU: $($cpu)%" -ForegroundColor Gray
    Write-Host "  Memory: $($memory)%" -ForegroundColor Gray
    Write-Host "  Disk: $($disk)%" -ForegroundColor Gray
    
    return @{
        CPU = $cpu
        Memory = $memory
        Disk = $disk
        Healthy = ($cpu -lt 80 -and $memory -lt 80 -and $disk -lt 80)
    }
}

function Invoke-Learn-History {
    Write-Step "Learning from past executions..."
    
    $logPath = $agent.LearningLog
    $lessons = @{
        SuccessPatterns = @()
        FailurePatterns = @()
        Optimization = "Starting fresh - no prior data"
    }
    
    if (Test-Path $logPath) {
        $recent = Get-Content $logPath | Select-Object -Last 10
        $success = ($recent | Where-Object { $_ -match "SUCCESS|completed" }).Count
        $failed = ($recent | Where-Object { $_ -match "FAILED|error|timeout" }).Count
        
        $lessons.SuccessPatterns = @("Check prerequisites", "Validate system health", "Log results")
        $lessons.FailurePatterns = @("Insufficient resources", "Missing dependencies", "Execution errors")
        $lessons.Optimization = "Success: $success, Failed: $failed. Implement pre-flight checks."
    } else {
        "No learning log at $logPath. Starting fresh." | Out-File -FilePath $logPath -Encoding UTF8
        $lessons.Optimization = "Fresh start. Log all automation executions here."
    }
    
    return $lessons
}

function Invoke-Plan-Automation {
    param($system, $lessons)
    
    $plan = @{
        ShouldExecute = $false
        Priority = "none"
        SelectedModule = $null
        SelectedScript = $null
        EstimatedDuration = 0
    }
    
    # If system unhealthy, defer
    if (-not $system.Healthy) {
        Write-Host "  >> System unhealthy. Deferring automation." -ForegroundColor Yellow
        return $plan
    }
    
    # Discover available modules
    $modules = Get-Available-Modules
    
    if ($modules.Count -eq 0) {
        Write-Host "  >> No modules found. Agent observing." -ForegroundColor Yellow
        return $plan
    }
    
    # Select module that hasn't been run recently
    $now = Get-Date
    $bestModule = $modules | ForEach-Object {
        $scriptPath = Join-Path $_.Path "scripts.ps1"  # placeholder
        $scriptName = $_.Name
        
        # Check learning log for last execution
        $lastExecuted = $null
        if (Test-Path $agent.LearningLog) {
            $logContent = Get-Content $agent.LearningLog -ErrorAction SilentlyContinue
            $scriptMatches = $logContent | Where-Object { $_ -match "$($scriptName)" }
            if ($scriptMatches) {
                $lastLine = $scriptMatches | Select-Object -First 1
                $lastExecuted = ($lastLine | Split-String -Separator '[') | Where-Object { $_.TrimStart() -match 'Timestamp' } | Select-Object -First 1
            }
        }
        
        [PSCustomObject]@{
            Module = $_.Name
            Path = $_.Path
            LastExecuted = $lastExecuted
            Score = if ($lastExecuted) { [math]::Max(0, 1 - ((Get-Date) - (Get-Date)).TotalDays / 30) } else { 1.0 }
        }
    } | Sort-Object Score -Descending | Select-Object -First 1
    
    if ($bestModule) {
        $plan.ShouldExecute = $true
        $plan.Priority = "medium"
        $plan.SelectedModule = $bestModule.Module
        $plan.SelectedScript = "system_health_check.ps1"  # default first script
        $plan.EstimatedDuration = 30
    }
    
    return $plan
}

function Invoke-Execute {
    param($plan)
    
    $scriptPath = Join-Path "D:\" $plan.SelectedModule $plan.SelectedScript
    
    $result = @{
        Success = $false
        Output = ""
        Duration = 0
        Error = $null
    }
    
    if (Test-Path $scriptPath) {
        $start = Get-Date
        try {
            $output = & powershell -ExecutionPolicy Bypass -File "$scriptPath" 2>&1
            $end = Get-Date
            $result.Duration = ($end - $start).TotalSeconds
            $result.Success = $true
            $result.Output = $output
            Write-Host "  >> Completed in $($result.Duration)s" -ForegroundColor Green
        } catch {
            $end = Get-Date
            $result.Duration = ($end - $start).TotalSeconds
            $result.Error = $_.Exception.Message
            Write-Host "  >> Failed: $($result.Error)" -ForegroundColor Red
        }
    } else {
        $result.Error = "Script not found: $scriptPath"
        Write-Host "  >> Error: $($result.Error)" -ForegroundColor Red
    }
    
    return $result
}

function Log-Experience {
    param($system, $plan, $result)
    
    $entry = [PSCustomObject]@{
        Timestamp = (Get-Date).ToString("o")
        Agent = $agent.Name
        System = @{
            CPU = $system.CPU
            Memory = $system.Memory
            Disk = $system.Disk
            Healthy = $system.Healthy
        }
        Plan = @{
            Module = $plan.SelectedModule
            Script = $plan.SelectedScript
            Priority = $plan.Priority
        }
        Result = @{
            Success = $result.Success
            Duration = $result.Duration
            Error = $result.Error
        }
    }
    
    $logPath = $agent.LearningLog
    $entry | Out-File -FilePath $logPath -Append -Encoding UTF8
    
    # Keep log manageable (last 50 entries)
    $max = 50
    $all = Get-Content $logPath -ErrorAction SilentlyContinue
    if ($all.Count -gt $max) {
        $all | Select-Object -Last $max | Out-File -FilePath $logPath -Encoding UTF8
    }
}

# ============================================================================
# DISCOVERY & UTILITY
# ============================================================================

function Get-Available-Modules {
    $modules = @()
    $baseFolders = @("AI OS", "AI-CORE", "AI-TEAM-RUNNER", "AgentRoom")
    
    foreach ($folder in $baseFolders) {
        $path = Join-Path $agent.BaseDirectory $folder
        if (Test-Path $path) {
            $fs = Get-ChildItem $path -Directory -ErrorAction SilentlyContinue
            if ($fs) {
                $modules += [PSCustomObject]@{
                    Name = $folder
                    Path = $fs.FullName
                }
            }
        }
    }
    
    return $modules
}

# ============================================================================
# AGENT STARTUP SEQUENCE
# ============================================================================

function Invoke-Agent-Startup {
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host "  $($agent.Name) STARTUP SEQUENCE" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Cyan
    
    # Ensure config exists
    $configPath = $agent.ConfigPath
    if (-not (Test-Path $configPath)) {
        Write-Step "Creating agent configuration..."
        $initial = @{
            AgentName = $agent.Name
            Version = $agent.Version
            BaseDirectory = $agent.BaseDirectory
            FirstRun = $true
            LastCycle = Get-Date
            ActiveModules = @()
        }
        $initial | ConvertTo-Json -Depth 3 | Out-File -FilePath $configPath -Encoding UTF8
        Write-Step "Configuration created" -ForegroundColor Green
    }
    
    # Verify modules
    Write-Step "Scanning modules..."
    $modules = Get-Available-Modules
    Write-Host "  Found $($modules.Count) module folder(s)" -ForegroundColor Gray
    
    # Check learning log
    $logPath = $agent.LearningLog
    if (Test-Path $logPath) {
        $logAge = (Get-Date) - (Get-Item $logPath).LastWriteTime
        Write-Host "  Learning log: $($logAge.TotalDays) days old" -ForegroundColor Gray
    }
    
    Write-Host "`n$($agent.Name) ready for autonomous operation." -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Cyan
}

# ============================================================================
# ENTRY POINT
# ============================================================================

# If run directly, start the agent
if ($MyInvocation.MyCommand.Name -eq '.Invoke-Agent-Cycle' -or $MyInvocation.MyCommand.Name -eq 'Invoke-Agent-Cycle') {
    Invoke-Agent-Startup
    
    # Run continuous cycles
    do {
        try {
            Invoke-Agent-Cycle
        } catch {
            Write-Host "  >> Cycle error: $($_.Exception.Message)" -ForegroundColor Red
            Start-Sleep -Seconds 30
        }
    } while ($true)
}

# Export key functions if imported as module
Export-ModuleMember -Function *Invoke-Agent-Cycle, *Invoke-Agent-Startup, *Get-Available-Modules, *Invoke-Execute, *Log-Experience