#!/usr/bin/env pwsh
<#
============================================================================
  AUTOMATION FRAMEWORK - Clean & Efficient Edition
  Purpose: Discover, manage, and execute all laptop automations
  Author: Self-running AI agent project
  Version: 2.0.0 - Fresh start, clean structure
============================================================================
#>

# ============================================================================
# FRAMEWORK CORE CONFIGURATION
# ============================================================================

$framework = @{
    Name = "Laptop Automation Framework"
    Version = "2.0.0"
    BasePath = "D:\"
    Author = "User"
    Created = Get-Date
    Description = "Clean, efficient automation framework for self-running laptop operations"
}

$automationFolders = @(
    "AI OS",
    "AI-CORE", 
    "AI-TEAM-RUNNER",
    "AgentRoom",
    "Repos",
    "DOM STORAGE",
    "WORK-FILES",
    "WORK-APPS",
    "AI OS BACKUPS",
    "open-cowork-main"
)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Hdr { Write-Host "`n$args[0]" -ForegroundColor Cyan }
function Write-Shdr { Write-Host "  $args[0]" -ForegroundColor Yellow }
function Write-Step { Write-Host "  >> $args[0]" -ForegroundColor Green }
function Write-Result { Write-Host "  $args[0]" -ForegroundColor Green }
function Write-Warn { Write-Host "  ! $args[0]" -ForegroundColor Yellow }
function Write-Err { Write-Host "  X $args[0]" -ForegroundColor Red }

# ============================================================================
# 1. DISCOVER AUTOMATION MODULES
# ============================================================================

function Discover-Modules {
    Write-Host "Scanning for automation modules..." -ForegroundColor Gray
    $modules = @()

    foreach ($folder in $automationFolders) {
        $path = Join-Path $framework.BasePath $folder
        if (Test-Path $path) {
            $scripts = Get-ChildItem $path -Filter "*.ps1" -Recurse -ErrorAction SilentlyContinue
            $module = [PSCustomObject]@{
                Name = $folder
                Path = $path
                ScriptCount = ($scripts | Measure-Object).Count
                TotalSizeMB = if ($scripts) { [math]::Round(($scripts | Measure-Object -Property Length -Sum).Sum/1MB, 2) } else { 0 }
                LastModified = (Get-Item $path).LastWriteTime
            }
            $modules += $module
        }
    }

    $userDirs = @(
        "C:\Users\DOOM98\Documents",
        "C:\Users\DOOM98\Desktop", 
        "C:\Users\DOOM98\Downloads"
    )

    foreach ($ud in $userDirs) {
        if (Test-Path $ud) {
            $scripts = Get-ChildItem $ud -Filter "*.ps1" -Recurse -ErrorAction SilentlyContinue
            if ($scripts) {
                $module = [PSCustomObject]@{
                    Name = "User:" + (Split-Path $ud -Leaf)
                    Path = $ud
                    ScriptCount = $scripts.Count
                    TotalSizeMB = [math]::Round(($scripts | Measure-Object -Property Length -Sum).Sum/1MB, 2)
                    LastModified = (Get-Item $ud).LastWriteTime
                }
                $modules += $module
            }
        }
    }

    return $modules
}

# ============================================================================
# 2. EXECUTE AUTOMATION SCRIPT
# ============================================================================

function Execute-Script {
    param(
        [string]$moduleName,
        [string]$scriptName
    )

    $fullModulePath = Join-Path $framework.BasePath $moduleName
    $scriptPath = if ($scriptName) { Join-Path $fullModulePath $scriptName } else { $fullModulePath }

    if (Test-Path $scriptPath) {
        Write-Step "Running: $scriptPath"
        & powershell -ExecutionPolicy Bypass -File "$scriptPath" 2>&1
    } else {
        Write-Err "Script not found: $scriptPath"
        Write-Host "Available scripts in ${fullModulePath}:" -ForegroundColor Gray
        Get-ChildItem $fullModulePath -Filter "*.ps1" | ForEach-Object { Write-Host "  - $($_.Name)" }
    }
}

# ============================================================================
# 3. SYSTEM MONITORING & REPORTING
# ============================================================================

function Generate-Report {
    Write-Host "Generating Automation Report..." -ForegroundColor Cyan
    $modules = Discover-Modules

    Write-Host "`n=== AUTOMATION FRAMEWORK REPORT ===" -ForegroundColor Cyan
    Write-Host "Framework: $($framework.Name) v$($framework.Version)" -ForegroundColor White
    Write-Host "Generated: $($framework.Created)" -ForegroundColor White
    Write-Host "Total Modules: $($modules.Count)" -ForegroundColor White
    $totalScripts = ($modules | ForEach-Object { $_.ScriptCount } | Measure-Object -Sum).Sum
    Write-Host "Total Scripts: $totalScripts" -ForegroundColor White

    Write-Host "`nModule Breakdown:" -ForegroundColor Cyan
    $modules | Format-Table @{Name="Folder"; Expression={$_.Name}}, 
                          @{Name="Scripts"; Expression={$_.ScriptCount}}, 
                          @{Name="Size MB"; Expression={[math]::Round($_.TotalSizeMB,2)}}, 
                          @{Name="Last Modified"; Expression={$_.LastModified}} -AutoSize

    $drive = Get-Volume C
    Write-Host "`nSystem Statistics:" -ForegroundColor Cyan
    Write-Host "  Drive C: $([math]::Round($drive.Size/1GB, 2)) GB total" -ForegroundColor White
    Write-Host "  Free: $([math]::Round($drive.SizeRemaining/1GB, 2)) GB" -ForegroundColor White
    Write-Host "  Used: $([math]::Round(((($drive.Size - $drive.SizeRemaining) / $drive.Size) * 100), 2))%" -ForegroundColor White

    return $modules
}

# ============================================================================
# 4. AI AGENT INITIALIZATION
# ============================================================================

function Init-Agent {
    Write-Host "Initializing AI Agent Framework..." -ForegroundColor Cyan
    $configPath = Join-Path $framework.BasePath "AI-CORE\agent_config.json"

    if (-not (Test-Path $configPath)) {
        $config = @{
            AgentName = "LaptopAutomationAgent"
            Version = $framework.Version
            BasePath = $framework.BasePath
            FirstRun = $true
            LastCycle = Get-Date
            ActiveModules = @()
        }
        $config | ConvertTo-Json -Depth 3 | Out-File -FilePath $configPath -Encoding UTF8
        Write-Step "Agent configuration created at $configPath" -ForegroundColor Green
    } else {
        Write-Step "Agent configuration already exists" -ForegroundColor Gray
        $config = Get-Content $configPath | ConvertFrom-Json
    }

    return $config
}

# ============================================================================
# 5. MAIN MENU
# ============================================================================

function Show-Menu {
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "  $($framework.Name) v$($framework.Version)" -ForegroundColor White
    Write-Host "  Clean & Efficient Automation Framework" -ForegroundColor White
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor White
    Write-Host "  1. Discover All Automations" -ForegroundColor Green
    Write-Host "  2. Generate Automation Report" -ForegroundColor Green
    Write-Host "  3. Execute Automation Script" -ForegroundColor Green
    Write-Host "  4. Initialize AI Agent" -ForegroundColor Green
    Write-Host "  5. Manage Automation Modules" -ForegroundColor Green
    Write-Host "  6. Exit" -ForegroundColor Red
    Write-Host "" -ForegroundColor White
    Write-Host "========================================================================" -ForegroundColor Cyan
}

# ============================================================================
# MAIN EXECUTION LOOP
# ============================================================================

if (-not (Get-ExecutionPolicy -Scope Process -ErrorAction SilentlyContinue)) {
    Write-Warn "Execution policy may limit script functionality"
}

do {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-6)"

    switch ($choice) {
        "1" {
            Write-Host "`n--- Discovering Automation Modules ---" -ForegroundColor Cyan
            $modules = Discover-Modules
            if ($modules.Count -eq 0) {
                Write-Host "No automation modules found. Check your folder structure." -ForegroundColor Yellow
            } else {
                $modules | Format-Table @{Name="Folder"; Expression={$_.Name}}, 
                                      @{Name="Scripts"; Expression={$_.ScriptCount}}, 
                                      @{Name="Size MB"; Expression={[math]::Round($_.TotalSizeMB,2)}}, 
                                      @{Name="Path"; Expression={$_.Path}} -AutoSize
            }
            Read-Host "Press Enter to continue..."
        }

        "2" {
            Generate-Report
            Read-Host "Press Enter to continue..."
        }

        "3" {
            Write-Host "`n--- Execute Automation ---" -ForegroundColor Cyan
            Write-Host "Available modules:" -ForegroundColor Gray
            $modules = Discover-Modules
            if ($modules.Count -gt 0) {
                $i = 1
                $modules | ForEach-Object {
                    Write-Host "$i. $($_.Name) ($($_.ScriptCount) scripts)"
                    $i++
                }
                $sel = Read-Host "Select module number (or type script name)"

                if ($sel -as [int] -and $sel -ge 1 -and $sel -le $modules.Count) {
                    $module = $modules[$sel-1]
                    $scripts = Get-ChildItem $module.Path -Filter "*.ps1" -Recurse
                    Write-Host "`nScripts in $($module.Name):" -ForegroundColor Gray
                    $j = 1
                    $scripts | ForEach-Object { Write-Host "$j. $($_.Name)" ; $j++ }
                    $scriptSel = Read-Host "Select script number"
                    Execute-Script $module.Name $scripts[$scriptSel-1].Name
                } else {
                    Execute-Script $modules[0].Name $sel
                }
            }
            Read-Host "Press Enter to continue..."
        }

        "4" {
            Init-Agent
            Read-Host "Press Enter to continue..."
        }

        "5" {
            Write-Host "`n--- Module Management ---" -ForegroundColor Cyan
            Write-Host "1. List all modules"
            Write-Host "2. Add new module folder"
            Write-Host "3. Remove module folder"
            $mchoice = Read-Host "Enter choice (1-3)"

            switch ($mchoice) {
                "1" {
                    $modules = Discover-Modules
                    $modules | Format-Table Name, ScriptCount, @{Expression={[math]::Round($_.TotalSizeMB,2)};Label="Size MB"} -AutoSize
                }
                "2" {
                    $newFolder = Read-Host "Enter new folder name (relative to D:\)"
                    $fullPath = Join-Path $framework.BasePath $newFolder
                    if (-not (Test-Path $fullPath)) {
                        New-Item -ItemType Directory -Path $fullPath | Out-Null
                        Write-Host "Created: D:$newFolder" -ForegroundColor Green
                    }
                }
                "3" {
                    $modules = Discover-Modules
                    $i = 1
                    $modules | ForEach-Object { Write-Host "$i. $($_.Name)" ; $i++ }
                    $remSel = Read-Host "Select module to remove (number)"
                    $remModule = $modules[$remSel-1]
                    Remove-Item -Path $remModule.Path -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Host "Removed: $($remModule.Name)" -ForegroundColor Green
                }
            }
            Read-Host "Press Enter to continue..."
        }

        "6" {
            Write-Host "Goodbye! Your automations will continue running." -ForegroundColor Cyan
            break
        }

        default {
            Write-Host "Invalid choice. Please enter 1-6." -ForegroundColor Red
            Read-Host "Press Enter to continue..."
        }
    }
} while ($choice -ne "6")