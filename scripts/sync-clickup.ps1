$ErrorActionPreference = "Stop"

try {
    Invoke-RestMethod `
        -Uri "http://localhost:3000/api/clickup/tasks" `
        -Method GET | Out-Null

    $snapshot = Get-ChildItem ".\data\history\*.json" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    Write-Host "Sincronização do ClickUp concluída com sucesso." -ForegroundColor Green
    Write-Host "Snapshot: $($snapshot.Name)" -ForegroundColor Cyan
}
catch {
    Write-Host "Erro na sincronização do ClickUp:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
