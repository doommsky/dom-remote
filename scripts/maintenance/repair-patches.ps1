<#
.SYNOPSIS
    Repairs git patch files that were written through a lossy PowerShell pipeline.

.DESCRIPTION
    The backup script that produced these patches wrote them with
    Out-File / '>' redirection, which introduced three defects:

      1. A UTF-8 BOM (EF BB BF) was prepended to the file.
      2. All line endings were converted to CRLF.
      3. The UTF-8 payload was decoded through the OEM code page 850
         (the console code page) and re-encoded as UTF-8, producing
         mojibake: '->' became 'ÔåÆ', '--' became 'ÔÇö',
         'n-tilde' became '├▒', 'e-acute' became '├®'.

    Defect 3 is the one that actually breaks `git apply`: the patch text
    no longer matches the bytes in the target files.

    This script reverses all three:
      - strips the BOM
      - re-encodes the text to CP850 and decodes it back as UTF-8
        (reversing the mojibake)
      - normalizes CRLF back to LF

    The result is byte-identical to what `git diff --output=<file>` writes.

.PARAMETER Path
    A patch file or a directory containing *.patch files.

.PARAMETER InPlace
    Overwrite the original files instead of writing *.repaired.patch
    alongside them. Off by default so the originals are preserved.

.PARAMETER Suffix
    Suffix used for the repaired output files. Default '.repaired.patch'.

.EXAMPLE
    .\repair-patches.ps1 -Path 'C:\Users\DOOM98\BACKUPS\GitBundles'

.EXAMPLE
    .\repair-patches.ps1 -Path 'C:\...\submodule_changes_2026-10-26_224501.patch' -InPlace
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Path,

    [switch]$InPlace,

    [string]$Suffix = '.repaired.patch'
)

$ErrorActionPreference = 'Stop'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
# Exception fallbacks so an unmappable character is reported instead of
# silently becoming '?' and corrupting the patch further.
$cp850 = [System.Text.Encoding]::GetEncoding(
    850,
    [System.Text.EncoderFallback]::ExceptionFallback,
    [System.Text.DecoderFallback]::ExceptionFallback
)

if (Test-Path -LiteralPath $Path -PathType Leaf) {
    $files = @(Get-Item -LiteralPath $Path)
}
elseif (Test-Path -LiteralPath $Path -PathType Container) {
    $files = @(Get-ChildItem -LiteralPath $Path -Filter '*.patch' -File)
}
else {
    throw "Path not found: $Path"
}

if ($files.Count -eq 0) {
    Write-Output "No .patch files found under $Path"
    return
}

$results = foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)

    $hadBom = $bytes.Length -ge 3 -and
              $bytes[0] -eq 0xEF -and
              $bytes[1] -eq 0xBB -and
              $bytes[2] -eq 0xBF
    if ($hadBom) {
        $bytes = $bytes[3..($bytes.Length - 1)]
    }

    $crlf = 0
    $lf = 0
    for ($i = 0; $i -lt $bytes.Length; $i++) {
        if ($bytes[$i] -eq 10) {
            $lf++
            if ($i -gt 0 -and $bytes[$i - 1] -eq 13) { $crlf++ }
        }
    }

    $text = [System.Text.Encoding]::UTF8.GetString($bytes)

    try {
        # Reverse the CP850 mojibake: text -> CP850 bytes -> UTF-8 text.
        $fixed = [System.Text.Encoding]::UTF8.GetString($cp850.GetBytes($text))
    }
    catch {
        [pscustomobject]@{
            File   = $file.Name
            Status = 'FAILED'
            Detail = "mojibake reverse failed: $($_.Exception.Message)"
        }
        continue
    }

    # Normalize to LF so the patch matches git's own output byte for byte.
    $fixed = $fixed -replace "`r`n", "`n"

    if ($InPlace) {
        $target = $file.FullName
    }
    else {
        $target = Join-Path $file.DirectoryName ($file.BaseName + $Suffix)
    }

    [System.IO.File]::WriteAllText($target, $fixed, $utf8NoBom)

    [pscustomobject]@{
        File   = $file.Name
        Status = 'OK'
        Detail = "BOM=$hadBom CRLF=$crlf/LF=$lf -> $target"
    }
}

$results | Format-Table -AutoSize -Wrap

$failed = @($results | Where-Object { $_.Status -ne 'OK' })
if ($failed.Count -gt 0) {
    Write-Output "FAILED: $($failed.Count) file(s) could not be repaired."
    exit 1
}

Write-Output "Repaired $($results.Count) patch file(s)."
