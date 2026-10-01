# Publica o site institucional da NativeLab em https://nativelab.online/
# Uso (PowerShell, na pasta github-pages):  .\publicar-site.ps1 "mensagem do commit"
# A fonte de verdade é "site/". Nunca editar os arquivos da raiz do github-pages direto.
# A NativeClass (/nativeclass) continua sendo publicada pelo publicar.ps1.

param([string]$Mensagem = "Atualiza o site da NativeLab")

$ErrorActionPreference = "Stop"
$aqui = $PSScriptRoot
$origem = Join-Path $aqui "..\site"

# trava: não publica com os dados de exemplo do CONFIG
$main = Get-Content (Join-Path $origem "assets\js\main.js") -Raw
if ($main -match '5500000000000' -or $main -match 'nativelab\.com\.br') {
  throw "O CONFIG de site/assets/js/main.js ainda tem WhatsApp ou e-mail de exemplo. Preencha antes de publicar."
}

# espelha site/ na raiz, preservando a NativeClass, o domínio e os scripts
robocopy $origem $aqui /MIR `
  /XD "nativeclass" ".git" ".impeccable" `
  /XF "CNAME" ".nojekyll" "publicar.ps1" "publicar-site.ps1" "LEIA-ME.md" "LEIA-ME.txt" `
  /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Falha ao copiar os arquivos (robocopy $LASTEXITCODE)." }

Set-Location $aqui
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host "Nada mudou. Nada a publicar."; exit 0 }
git commit -m $Mensagem
git pull --rebase -q   # o GitHub às vezes grava o CNAME sozinho
git push
Write-Host "Publicado. Em 1 a 2 minutos estará em https://nativelab.online/"
