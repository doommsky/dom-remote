$c = Get-PSDrive C
$d = Get-PSDrive D
[PSCustomObject]@{
    C_FreeGB = [math]::Round($c.Free/1GB, 2)
    C_UsedGB = [math]::Round($c.Used/1GB, 2)
    C_TotalGB = [math]::Round(($c.Used+$c.Free)/1GB, 2)
    D_FreeGB = [math]::Round($d.Free/1GB, 2)
    D_UsedGB = [math]::Round($d.Used/1GB, 2)
    D_TotalGB = [math]::Round(($d.Used+$d.Free)/1GB, 2)
}