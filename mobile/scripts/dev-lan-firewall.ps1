<#
.SYNOPSIS
  Abre la LAN local para probar la app móvil en un teléfono físico (Expo Go).

.DESCRIPTION
  Windows bloquea TODO el tráfico entrante cuando la red está marcada como
  «Pública» y no hay reglas de entrada. Con eso, el teléfono no alcanza ni a
  Metro (8081) ni a Django (8000): Expo Go se queda en blanco y termina en
  «Sorry about that», y Metro nunca imprime «Android Bundling».

  Este script:
    1. Marca la interfaz de red como **Privada** (red de casa/oficina).
    2. Crea dos reglas de entrada TCP, **solo para el perfil Privado**:
       - 8081 → Metro (bundler de Expo)
       - 8000 → Django runserver

  Alcance mínimo a propósito: dos puertos, TCP, perfil privado. No toca los
  perfiles Público ni de Dominio.

.PARAMETER InterfaceAlias
  Interfaz a marcar como privada. Por defecto 'Ethernet'. Ver con `ipconfig`.

.PARAMETER Remove
  Revierte: elimina las reglas creadas. No devuelve la red a «Pública».

.EXAMPLE
  # PowerShell COMO ADMINISTRADOR, desde la raíz del repo:
  powershell -ExecutionPolicy Bypass -File mobile\scripts\dev-lan-firewall.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File mobile\scripts\dev-lan-firewall.ps1 -Remove
#>
[CmdletBinding()]
param(
  # Por defecto se detecta la interfaz activa: la IP de la PC cambia al saltar
  # de Ethernet a Wi-Fi, y con ella el perfil de red que hay que ajustar.
  [string]$InterfaceAlias,
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error 'Ejecute este script en una consola de PowerShell abierta como Administrador.'
  exit 1
}

$reglas = @(
  @{ Nombre = 'DigitalFlow dev - Metro (Expo) 8081'; Puerto = 8081 },
  @{ Nombre = 'DigitalFlow dev - Django runserver 8000'; Puerto = 8000 }
)

if ($Remove) {
  foreach ($regla in $reglas) {
    if (Get-NetFirewallRule -DisplayName $regla.Nombre -ErrorAction SilentlyContinue) {
      Remove-NetFirewallRule -DisplayName $regla.Nombre
      Write-Output "Regla eliminada: $($regla.Nombre)"
    }
  }
  Write-Output 'Listo. La red sigue como esté configurada; cámbiela a Pública a mano si lo desea.'
  exit 0
}

if (-not $InterfaceAlias) {
  $activa = Get-NetConnectionProfile |
    Where-Object { $_.IPv4Connectivity -eq 'Internet' } |
    Select-Object -First 1
  if (-not $activa) {
    Write-Error 'No se encontró una interfaz de red activa. Pase -InterfaceAlias a mano (ver `ipconfig`).'
    exit 1
  }
  $InterfaceAlias = $activa.InterfaceAlias
  Write-Output "Interfaz activa detectada: $InterfaceAlias"
}

$perfil = Get-NetConnectionProfile -InterfaceAlias $InterfaceAlias
if ($perfil.NetworkCategory -ne 'Private') {
  Set-NetConnectionProfile -InterfaceAlias $InterfaceAlias -NetworkCategory Private
  Write-Output "Red '$InterfaceAlias': Pública -> Privada"
} else {
  Write-Output "Red '$InterfaceAlias' ya es Privada"
}

foreach ($regla in $reglas) {
  if (Get-NetFirewallRule -DisplayName $regla.Nombre -ErrorAction SilentlyContinue) {
    Write-Output "Regla ya existente: $($regla.Nombre)"
    continue
  }
  New-NetFirewallRule -DisplayName $regla.Nombre `
    -Direction Inbound -Action Allow -Protocol TCP `
    -LocalPort $regla.Puerto -Profile Private | Out-Null
  Write-Output "Regla creada: $($regla.Nombre)"
}

Write-Output ''
Write-Output 'Hecho. Ahora, desde el teléfono (misma red Wi-Fi que esta PC):'
Write-Output '  1. cd mobile ; pnpm start -c'
Write-Output '  2. Escanear el QR con Expo Go'
Write-Output '  3. Metro debe imprimir «Android Bundling». Si no aparece, el teléfono'
Write-Output '     sigue sin alcanzar esta PC (¿otra red / aislamiento de clientes en el router?).'
