# Publica a LP da NativeClass em https://nativelab.online/nativeclass
# Uso (PowerShell, na pasta github-pages):  .\publicar.ps1 "mensagem do commit"
# A fonte de verdade é "Aulas ao vivo LP/site/". Nunca editar github-pages/nativeclass/ direto.

param([string]$Mensagem = "Atualiza a LP da NativeClass")

$ErrorActionPreference = "Stop"
$aqui = $PSScriptRoot
$origem = Join-Path $aqui "..\Aulas ao vivo LP\site"
$destino = Join-Path $aqui "nativeclass"

# espelha a LP (apaga no destino o que saiu da origem), sem o LEIA-ME interno
robocopy $origem $destino /MIR /XF "LEIA-ME.md" /XD ".impeccable" /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Falha ao copiar os arquivos (robocopy $LASTEXITCODE)." }

Set-Location $aqui
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host "Nada mudou. Nada a publicar."; exit 0 }
git commit -m $Mensagem
git pull --rebase -q   # o GitHub às vezes grava o CNAME sozinho
git push
Write-Host "Publicado. Em 1 a 2 minutos estará em https://nativelab.online/nativeclass/"
