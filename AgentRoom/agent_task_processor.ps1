#!/usr/bin/env pwsh
<#
============================================================================
  AUTOMATION SCRIPT: Agent Room Task Processor
  Purpose: Process tasks from AgentRoom task queue and execute them
  Agent: LaptopAutomationAgent
============================================================================
#>

Write-Host "=== Agent Room Task Processor ===" -ForegroundColor Cyan
Write-Host "Checking for tasks at: $(Get-Date)" -ForegroundColor White

# Task queue location
$taskQueue = "D:\AgentRoom\tasks"
$completedDir = "D:\AgentRoom\completed"
$logFile = "D:\AgentRoom\task_processing.log"

# Ensure directories exist
if (-not (Test-Path $taskQueue)) {
    New-Item -ItemType Directory -Path $taskQueue -Force | Out-Null
    Write-Host "  Created task queue: $taskQueue" -ForegroundColor Gray
}

if (-not (Test-Path $completedDir)) {
    New-Item -ItemType Directory -Path $completedDir -Force | Out-Null
    Write-Host "  Created completed dir: $completedDir" -ForegroundColor Gray
}

# Look for task files ( .task extension or files without extension but with .json metadata)
$taskFiles = @()
$taskFiles += Get-ChildItem $taskQueue -Filter "*.task" -ErrorAction SilentlyContinue
$taskFiles += Get-ChildItem $taskQueue -Filter "*.json" -ErrorAction SilentlyContinue | Where-Object {
    $_.Extension -eq ".json" -and ($_.Name -match "task|task_queue")
}

if (-not $taskFiles) {
    Write-Host "  No tasks found in queue." -ForegroundColor Yellow
    Write-Host "  Agent entering observation mode." -ForegroundColor Gray
    Write-Host "`n=== Agent Room Complete ===" -ForegroundColor Cyan
    exit
}

Write-Host "  Found $($taskFiles.Count) task(s) to process." -ForegroundColor Green

foreach ($taskFile in $taskFiles) {
    Write-Host "`n  Processing: $($taskFile.Name)" -ForegroundColor White
    
    # Read task metadata
    $taskContent = Get-Content $taskFile.FullName -Encoding UTF8
    $taskData = $null
    
    try {
        $taskData = $taskContent | ConvertFrom-Json
    } catch {
        Write-Host "  ⚠ Not valid JSON, treating as task name." -ForegroundColor Yellow
        $taskData = @{ Name = $taskFile.NameWithoutExtension; Type = "script"; Target = $taskFile.FullName }
    }
    
    # Determine task type and target
    $taskType = $taskData.Type -or "script"
    $target = $taskData.Target -or ($taskFile.FullName -replace "\.task$", "")
    $priority = $taskData.Priority -or "normal"
    $description = $taskData.Description -or "No description provided"
    
    Write-Host "    Type: $($taskType)" -ForegroundColor Gray
    Write-Host "    Priority: $($priority)" -ForegroundColor Gray
    Write-Host "    Description: $($description)" -ForegroundColor Gray
    
    # Execute the task based on type
    $executionResult = $null
    
    switch ($taskType) {
        "script" {
            Write-Host "    Executing script..." -ForegroundColor Gray
            $start = Get-Date
            & powershell -ExecutionPolicy Bypass -File "$target" 2>&1
            $end = Get-Date
            $duration = ($end - $start).TotalSeconds
            Write-Host "    Script executed in $($duration)s" -ForegroundColor Green
            $executionResult = "Completed in $($duration)s"
        }
        
        "web" {
            Write-Host "    Web operation (placeholder)" -ForegroundColor Yellow
            $executionResult = "Web task noted: $($description)"
        }
        
        "file" {
            Write-Host "    File operation..." -ForegroundColor Gray
            # Example: organize files, rename, etc.
            $executionResult = "File task: $($description)"
        }
        
        default {
            Write-Host "    Unknown task type. Running as generic script." -ForegroundColor Yellow
            & powershell -ExecutionPolicy Bypass -File "$target" 2>&1
            $executionResult = "Executed: $($target)"
        }
    }
    
    # Log the execution
    $logEntry = "[$(Get-Date)] TASK: $($taskData.Name) | Type: $($taskType) | Priority: $($priority) | Result: $($executionResult) | Description: $($description)`n"
    $logEntry | Out-File -FilePath $logFile -Append -Encoding UTF8
    
    # Move task to completed folder
    $completedPath = Join-Path $completedDir $taskFile.Name
    try {
        Move-Item -Path $taskFile.FullName -Destination $completedPath -Force -ErrorAction SilentlyContinue
        Write-Host "    → Moved to completed" -ForegroundColor Green
    } catch {
        Write-Host "    ! Could not move to completed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Agent Room Task Processing Complete ===" -ForegroundColor Cyan
Write-Host "Processed $($taskFiles.Count) task(s)." -ForegroundColor White