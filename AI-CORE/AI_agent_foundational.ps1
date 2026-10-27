#!/usr/bin/env pwsh
<#
============================================================================
  AI AGENT FOUNDATION - Core autonomous agent for laptop automation
  Purpose: Self-learning, self-executing agent that manages all automations
============================================================================
#>

# AI Agent Foundation
# This is the core agent that will eventually run your "company on its own"

$agentName = "LaptopAutomationAgent"
$agentVersion = "1.0.0"
$baseDirectory = "D:\"
$learningLog = Join-Path $baseDirectory "AI-CORE\agent_learning.log"

# ============================================================================
# AGENT CORE FUNCTIONS
# ============================================================================

function Invoke-Agent {
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host "  $($agentName) v$($agentVersion) - AUTONOMOUS AGENT ACTIVATED" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Cyan
    
    # 1. System situation assessment
    Write-Subheader "Phase 1: System Assessment"
    $systemStatus = Invoke-SituationAssessment
    
    # 2. Learn from past automations
    Write-Subheader "Phase 2: Learning from History"
    $lessons learned = Invoke-LessonLearning
    
    # 3. Plan next automation
    Write-Subheader "Phase 3: Automation Planning"
    $automationPlan = Invoke-AutomationPlanning $systemStatus $lessons
    
    # 4. Execute planned automation
    Write-Subheader "Phase 4: Execution"
    if ($automationPlan.ShouldExecute) {
        $executionResult = Invoke-ExecuteAutomation $automationPlan
        Write-Result "Execution Result", $executionResult
    } else {
        Write-Host "  No automation scheduled. Agent entering observation mode." -ForegroundColor Yellow
    }
    
    # 5. Log and learn
    Write-Subheader "Phase 5: Logging & Learning"
    Log-AgentExperience $systemStatus $automationPlan $executionResult
    
    Write-Host "`n$($agentName) cycle complete. Next cycle in 60 seconds..." -ForegroundColor Cyan
}

function Invoke-SituationAssessment {
    Write-Step "Assessing current system state..."
    
    $assessment = @{
        cpuUsage = Get-Counter '\Processor(_Total)\% Processor Time' | Select-Object -ExpandProperty CounterSample | Select-Object -ExpandProperty CookedValue
        memoryUsage = (Get-Counter '\Memory\Available MBytes') | ForEach-Object { [math]::Round((100 - ($_.CounterValue / (Get-Counter '\Memory\Total Mytes') | Select-Object -ExpandProperty CounterSample * 100), 2) }
        diskUsage = (Get-PSDrive C).Used / (Get-PSDrive C).Size * 100
        activeAutomations = (Get-ChildItem "D:\AI OS" -Filter "*.ps1" -Recurse | Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-1) }).Count
        pendingTasks = Count-PendingTasks
    }
    
    Write-Host "  CPU Usage: $($assessment.cpuUsage)%" -ForegroundColor Gray
    Write-Host "  Memory Usage: $($assessment.memoryUsage)%" -ForegroundColor Gray
    Write-Host "  Disk Usage: $($assessment.diskUsage)%" -ForegroundColor Gray
    Write-Host "  Active Automations: $($assessment.activeAutomations)" -ForegroundColor Gray
    Write-Host "  Pending Tasks: $($assessment.pendingTasks)" -ForegroundColor Gray
    
    return $assessment
}

function Count-PendingTasks {
    $taskCount = 0
    
    # Check for scheduled tasks
    try {
        $taskCount += (Get-ScheduledTask | Where-Object { $_.State -eq "Ready" }).Count
    } catch { }
    
    # Check automation framework pending items
    $frameworkPath = Join-Path $baseDirectory "automation_framework.ps1"
    if (Test-Path $frameworkPath) {
        # Look for any "pending" markers or state files
        $pendingFiles = Get-ChildItem "$baseDirectory\**\pending*" -Recurse -ErrorAction SilentlyContinue
        $taskCount += $pendingFiles.Count
    }
    
    return $taskCount
}

function Invoke-LessonLearning {
    Write-Step "Learning from past automation executions..."
    
    $lessons = @{
        mostSuccessfulPatterns = @()
        failedPatterns = @()
        optimizationInsights = @()
        lastCycleTime = (Get-Date)
    }
    
    # Read learning log if it exists
    $learningLogPath = $learningLog
    if (Test-Path $learningLogPath) {
        $logContent = Get-Content $learningLogPath -ErrorAction SilentlyContinue
        
        # Extract patterns from log
        $recentEntries = $logContent | Select-Object -Last 20
        
        # Analyze success/failure patterns
        $successCount = ($logContent | Where-Object { $_ -match "SUCCESS|completed" }).Count
        $failureCount = ($logContent | Where-Object { $_ -match "FAILED|error|timeout" }).Count
        
        $lessons.mostSuccessfulPatterns = @("Check system health before execution", "Validate dependencies", "Log results for future learning")
        $lessons.failedPatterns = @("Insufficient disk space", "Missing dependencies", "Concurrent automation conflicts")
        
        $lessons.optimizationInsights = @"
            Success rate: $successCount successful vs $failureCount failed
            Recommendation: Implement pre-execution validation for all automations
        "@
    } else {
        $lessons.optimizationInsights = "No learning log found. Starting fresh. Log automations at D:\AI-CORE\agent_learning.log"
    }
    
    Write-Host "  Lessons learned: $($lessons.optimizationInsights)" -ForegroundColor Gray
    
    return $lessons
}

function Invoke-AutomationPlanning {
    param(
        [object]$systemStatus,
        [object]$lessons
    )
    
    Write-Step "Planning next automation based on system state and lessons learned..."
    
    $plan = @{
        shouldExecute = $true
        priority = "medium"
        selectedModule = $null
        selectedScript = $null
        estimatedDuration = 0
        requiredResources = @{
            cpuThreshold = 80
            memoryThreshold = 80
            diskThreshold = 20
        }
    }
    
    # Decision logic based on system status
    if ($systemStatus.cpuUsage -gt $plan.requiredResources.cpuThreshold) {
        Write-Host "  >> High CPU usage ($($systemStatus.cpuUsage)%). Deferring automation." -ForegroundColor Yellow
        $plan.shouldExecute = $false
        $plan.priority = "low"
        return $plan
    }
    
    if ($systemStatus.memoryUsage -gt $plan.requiredResources.memoryThreshold) {
        Write-Host "  >> High memory usage ($($systemStatus.memoryUsage)%). Deferring automation." -ForegroundColor Yellow
        $plan.shouldExecute = $false
        $plan.priority = "low"
        return $plan
    }
    
    if ($systemStatus.diskUsage -gt $plan.requiredResources.diskThreshold) {
        Write-Host "  >> High disk usage ($($systemStatus.diskUsage)%). Cleaning up first." -ForegroundColor Yellow
        Invoke-CleanupDisk
        $plan.shouldExecute = $true
        $plan.priority = "high"
        $plan.selectedModule = "Cleanup"
        return $plan
    }
    
    # If system is healthy, select an automation to run
    Write-Host "  >> System healthy. Selecting next automation to execute." -ForegroundColor Green
    
    # Discover available automations
    $availableModules = Get-AvailableAutomationModules
    
    if ($availableModules.Count -eq 0) {
        Write-Host "  >> No automation modules found. Agent will observe and learn." -ForegroundColor Yellow
        $plan.shouldExecute = $false
        return $plan
    }
    
    # Score modules based on last execution time and priority
    $scoredModules = @()
    foreach ($module in $availableModules) {
        $lastExecution = (Get-ChildItem $module.Path -Recurse -Filter "*.ps1" | 
            ForEach-Object { 
                $lastWrite = $_.LastWriteTime
                # Check if there's a log of execution
                $logPath = Join-Path $_.DirectoryName "execution_log.txt"
                $executed = $false
                if (Test-Path $logPath) {
                    $executed = ($logContent = Get-Content $logPath) -match $_.Name
                }
                [PSCustomObject]@{
                    Script = $_.Name
                    LastWrite = $lastWrite
                    AlreadyExecuted = $executed
                    Score = if ($executed) { 0.1 } else { 1.0 }  # Prefer unexecuted scripts
                }
            } | Sort-Object Score -Descending | Select-Object -First 1
        }
        $scoredModules += $lastExecution
    }
    
    # Select the highest-scoring module
    $bestModule = $scoredModules | Sort-Object Score -Descending | Select-Object -First 1
    
    if ($bestModule) {
        $plan.selectedModule = $bestModule.Script
        $plan.selectedModulePath = $bestModule.FullName
        
        # Find scripts in this module
        $scripts = Get-ChildItem $bestModule.FullName -Filter "*.ps1" -Recurse
        if ($scripts.Count -gt 0) {
            # Select script that hasn't been run recently
            $unrunScripts = $scripts | Where-Object { 
                # Check execution log for this script
                $logPath = Join-Path $bestModule.FullName "execution_log.txt"
                $executed = $false
                if (Test-Path $logPath) {
                    $executed = (Get-Content $logPath) -match $_.Name
                }
                $executed
            }
            
            if ($unrunScripts.Count -gt 0) {
                $plan.selectedScript = $unrunScripts[0].Name
            } else {
                # All scripts have been run, pick the least recently run
                $plan.selectedScript = $scripts[0].Name
            }
        }
        
        $plan.estimatedDuration = 30  # Default estimate
        $plan.priority = "medium"
    }
    
    return $plan
}

function Invoke-CleanupDisk {
    Write-Step "Initiating disk cleanup..."
    
    # Clean temp files
    $tempPaths = @(
        "%TEMP%",
        "$env:USERPROFILE\Local Settings\Temp",
        "$env:USERPROFILE\AppData\Local\Temp"
    )
    
    foreach ($tempPath in $tempPaths) {
        $actualPath = $tempPath -replace '%TEMP%', $env:TEMP
        $actualPath = $actualPath -replace '$env:USERPROFILE', $env:USERPROFILE
        
        if (Test-Path $actualPath) {
            # Delete files older than 7 days
            $oldFiles = Get-ChildItem $actualPath -Recurse -File -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
            
            if ($oldFiles.Count -gt 0) {
                Write-Host "  Cleaning $($oldFiles.Count) old files from $actualPath" -ForegroundColor Gray
                $oldFiles | Remove-File -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    # Clean backup folders that are tracked
    $backupFolders = @("D:\AI OS BACKUPS", "D:\open-cowork-main")
    foreach ($folder in $backupFolders) {
        if (Test-Path $folder) {
            $oldBackups = Get-ChildItem $folder -Recurse -File -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -lt (Get-Date).AddMonths(-3) }
            
            if ($oldBackups.Count -gt 0) {
                Write-Host "  Archiving $($oldBackups.Count) old backups from $folder" -ForegroundColor Gray
                # Move to archive instead of delete
                $oldBackups | ForEach-Object {
                    $archivePath = Join-Path $folder "archived"
                    if (-not (Test-Path $archivePath)) { New-Item -ItemType Directory $archivePath | Out-Null }
                    Move-Item $_.FullName $archivePath -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
    
    Write-Step "Disk cleanup complete."
}

function Invoke-ExecuteAutomation {
    param(
        [object]$automationPlan
    )
    
    Write-Step "Executing automation: $($automationPlan.selectedModule) - $($automationPlan.selectedScript)"
    
    $executionResult = @{
        success = $false
        output = ""
        duration = 0
        errors = @()
    }
    
    $scriptPath = Join-Path "D:\" $automationPlan.selectedModule $automationPlan.selectedScript
    
    if (Test-Path $scriptPath) {
        $startTime = Get-Date
        
        try {
            # Execute the script
            $output = & powershell -ExecutionPolicy Bypass -File "$scriptPath" 2>&1
            $endTime = Get-Date
            $duration = ($endTime - $startTime).TotalSeconds
            
            $executionResult.success = $true
            $executionResult.output = $output
            $executionResult.duration = $duration
            
            Write-Host "  >> Automation completed in $($duration)s" -ForegroundColor Green
            Write-Host "  >> Output: $($output.Substring(0, [math]::Min(500, $output.Length)))" -ForegroundColor Gray
            
            # Log execution
            Log-AgentExecution $automationPlan.selectedModule $automationPlan.selectedScript $true $output
            
        } catch {
            $endTime = Get-Date
            $duration = ($endTime - $startTime).TotalSeconds
            
            $executionResult.errors += $_.Exception.Message
            $executionResult.output = $_.Exception.ScriptStackTrace
            
            Write-Host "  >> Automation FAILED: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "  >> Duration before failure: $($duration)s" -ForegroundColor Red
            
            # Log failure for learning
            Log-AgentExecution $automationPlan.selectedModule $automationPlan.selectedScript $false $_.Exception.Message
        }
    } else {
        $executionResult.errors += "Script not found: $scriptPath"
        Write-Host "  >> Script not found: $scriptPath" -ForegroundColor Red
    }
    
    return $executionResult
}

function Log-AgentExecution {
    param(
        [string]$moduleName,
        [string]$scriptName,
        [bool]$success,
        [string]$details
    )
    
    $logEntry = [PSCustomObject]@{
        Timestamp = Get-Date
        Agent = $agentName
        Module = $moduleName
        Script = $scriptName
        Success = $success
        Details = $details
    }
    
    $logPath = Join-Path "D:\AI-CORE" "agent_learning.log"
    
    # Append to log
    $logEntry | Out-File -FilePath $logPath -Append -Encoding UTF8
    
    # Keep log manageable (last 100 entries)
    $maxEntries = 100
    $allEntries = Get-Content $logPath -ErrorAction SilentlyContinue
    if ($allEntries.Count -gt $maxEntries) {
        # Remove oldest entries
        $entriesToRemove = $allEntries.Count - $maxEntries
        $allEntries | Select-Object -Skip 0 | ForEach-Object { /* keep last $maxEntries */ }
        # Actually, just keep the last $maxEntries lines
        $lastLines = $allEntries | Select-Object -Last $maxEntries
        $lastLines | Out-File -FilePath $logPath -Encoding UTF8
    }
}

function Log-AgentExperience {
    param(
        [object]$systemStatus,
        [object]$automationPlan,
        [object]$executionResult
    )
    
    $logEntry = [PSCustomObject]@{
        Timestamp = Get-Date
        Agent = $agentName
        SystemStatus = $systemStatus | ConvertTo-Json -Compress
        AutomationPlan = $automationPlan | ConvertTo-Json -Compress
        ExecutionResult = $executionResult | ConvertTo-Json -Compress
    }
    
    $logPath = $learningLog
    
    # Append experience log
    $logEntry | Out-File -FilePath $logPath -Append -Encoding UTF8
}

# ============================================================================
# AGENT DISCOVERY & UTILITY FUNCTIONS
# ============================================================================

function Get-AvailableAutomationModules {
    $modules = @()
    $baseFolders = @("AI OS", "AI-CORE", "AI-TEAM-RUNNER", "AgentRoom", "Repos", "DOM STORAGE")
    
    foreach ($folder in $baseFolders) {
        $path = Join-Path $baseDirectory $folder
        if (Test-Path $path) {
            $folderScripts = Get-ChildItem $path -Directory -ErrorAction SilentlyContinue
            foreach ($fs in $folderScripts) {
                $modules += [PSCustomObject]@{
                    Name = $folder
                    Path = $fs.FullName
                }
            }
        }
    }
    
    return $modules
}

function Invoke-Agent-StartupSequence {
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host "  $($agentName) STARTUP SEQUENCE" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Cyan
    
    # Initialize agent configuration
    $configPath = Join-Path $baseDirectory "AI-CORE\agent_config.json"
    if (-not (Test-Path $configPath)) {
        Write-Step "Creating agent configuration..."
        $initialConfig = @{
            AgentName = $agentName
            Version = $agentVersion
            BaseDirectory = $baseDirectory
            FirstRun = $true
            LastCycle = Get-Date
            ActiveModules = @()
        }
        $initialConfig | ConvertTo-Json -Depth 3 | Out-File -FilePath $configPath -Encoding UTF8
        Write-Step "Configuration created at $configPath" -ForegroundColor Green
    }
    
    # Verify automation modules exist
    Write-Step "Scanning automation modules..."
    $modules = Get-AvailableAutomationModules
    Write-Host "  Found $($modules.Count) module folders" -ForegroundColor Gray
    
    # Check learning log
    $learningLogPath = $learningLog
    if (Test-Path $learningLogPath) {
        $logAge = (Get-Date) - (Get-Item $learningLogPath).LastWriteTime
        Write-Host "  Learning log exists, age: $($logAge.TotalDays) days" -ForegroundColor Gray
    } else {
        Write-Step "Creating new learning log" -ForegroundColor Yellow
        "Agent starting fresh. No prior learning data." | Out-File -FilePath $learningLogPath -Encoding UTF8
    }
    
    # System health check
    Write-Step "System health assessment..."
    $cpu = (Get-Counter '\Processor(_Total)\% Processor Time' | Select-Object -ExpandProperty CounterSample | Select-Object -ExpandProperty CookedValue)
    $memory = (Get-Counter '\Memory\Available MBytes' | ForEach-Object { [math]::Round((100 - ($_.CounterValue / (Get-Counter '\Memory\Total Mytes') | Select-Object -ExpandProperty CounterSample) * 100), 2) })
    Write-Host "  CPU: $($cpu)%, Memory: $($memory)%" -ForegroundColor Gray
    
    Write-Host "`n$($agentName) startup sequence complete. Agent ready for autonomous operation." -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Cyan
}

# ============================================================================
# ENTRY POINT
# ============================================================================

# If run directly, execute the startup sequence and main agent loop
if ($MyInvocation.MyCommand.Name -eq '.Invoke-Agent' -or $MyInvocation.MyCommand.Name -eq 'Invoke-Agent') {
    Invoke-Agent-StartupSequence
    
    # Main agent loop - run continuously
    do {
        try {
            Invoke-Agent
        } catch {
            Write-Host "  >> Agent cycle error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Wait before next cycle (60 seconds)
        Start-Sleep -Seconds 60
    } while ($true)
}

# If imported as module, export the key functions
Export-ModuleMember -Function *Invoke-Agent, *Invoke-Agent-StartupSequence, *Get-AvailableAutomationModules, *Invoke-Agent-Execution, *Log-AgentExecution