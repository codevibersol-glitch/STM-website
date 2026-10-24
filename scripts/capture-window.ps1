# Takes pictures of the running game window for the site's gallery (npm run shots uses what lands here).
# Read-only: it copies pixels from the screen. It sends no key, no click and no message to the game.
#
#   powershell -NoProfile -File scripts/capture-window.ps1 [-Count 3] [-DelaySeconds 45] [-Out shots-src/ingame] [-Process WowClassic]
#
# The game window must be visible and not covered by another window. If the copy comes out black, it
# tries PrintWindow instead. Look at every frame before keeping it: other players' names, chat and
# anything personal must be cropped or blurred (shots.config.json) before it goes on the site.

param(
  [string]$Process = 'WowClassic',
  [string]$Out = 'shots-src/ingame',
  [int]$Count = 1,
  [int]$DelaySeconds = 45
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class GameWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@

[void][GameWin]::SetProcessDPIAware()

function Get-GameWindow {
  $p = Get-Process -Name $Process -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if (-not $p) { throw "No visible window for process '$Process'. Is the game running?" }
  if ([GameWin]::IsIconic($p.MainWindowHandle)) { throw "The game window is minimized." }
  return $p
}

function Test-Black([System.Drawing.Bitmap]$bmp) {
  $sum = 0.0
  $n = 0
  for ($y = 8; $y -lt $bmp.Height; $y += [Math]::Max(1, [int]($bmp.Height / 12))) {
    for ($x = 8; $x -lt $bmp.Width; $x += [Math]::Max(1, [int]($bmp.Width / 16))) {
      $c = $bmp.GetPixel($x, $y)
      $sum += ($c.R + $c.G + $c.B) / 3.0
      $n++
    }
  }
  return (($sum / $n) -lt 4)
}

$outDir = Join-Path (Get-Location) $Out
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

for ($i = 1; $i -le $Count; $i++) {
  $win = Get-GameWindow
  $h = $win.MainWindowHandle
  $rect = New-Object GameWin+RECT
  [void][GameWin]::GetClientRect($h, [ref]$rect)
  $w = $rect.Right - $rect.Left
  $ht = $rect.Bottom - $rect.Top
  $pt = New-Object GameWin+POINT
  [void][GameWin]::ClientToScreen($h, [ref]$pt)

  $bmp = New-Object System.Drawing.Bitmap $w, $ht
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($pt.X, $pt.Y, 0, 0, $bmp.Size)
  $g.Dispose()

  $how = 'screen copy'
  if (Test-Black $bmp) {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $hdc = $g.GetHdc()
    [void][GameWin]::PrintWindow($h, $hdc, 3)
    $g.ReleaseHdc($hdc)
    $g.Dispose()
    $how = 'PrintWindow'
    if (Test-Black $bmp) { Write-Warning 'The frame is still black: the game window is probably covered or not drawn.' }
  }

  $file = Join-Path $outDir ("ingame-{0}.png" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("{0}  ({1}x{2}, {3})" -f $file, $w, $ht, $how)

  if ($i -lt $Count) { Start-Sleep -Seconds $DelaySeconds }
}
