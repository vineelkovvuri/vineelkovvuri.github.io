---
title: "Windows 11 WinGet"
tags: ['WindowsSetup']
---

## Tweak winget defaults using `winget settings`

```json
{
    "$schema": "https://aka.ms/winget-settings.schema.json",
    "installBehavior": {
        "preferences": {
            "acceptPackageAgreements": true,
            "acceptSourceAgreements": true,
            "silent": true
        }
    }
}
```

## Essentials

```powershell
winget install --id "voidtools.Everything"
winget install --id "WinsiderSS.SystemInformer"
winget install --id "Google.Chrome"
winget install --id "Mozilla.Firefox"
winget install --id "Microsoft.VisualStudioCode" --override "/VERYSILENT /SP- /MERGETASKS='!runcode,!desktopicon,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath'"
winget install --id "SublimeHQ.SublimeText.4" --override  "/VERYSILENT /SP- /MERGETASKS=contextentry"
winget install --id "SumatraPDF.SumatraPDF"
winget install --id "AndrewZhezherun.WinDjView"
winget install --id "7zip.7zip"
winget install --id "FastStone.Capture"
winget install --id "9NKSQGP7F2NH" # Whatsapp
winget install --id "Microsoft.PowerToys"
winget install --id "9MSPC6MP8FM4" # Microsoft Whiteboard
winget install --id "Discord.Discord"
winget install --id "mRemoteNG.mRemoteNG"
winget install --id "Daum.PotPlayer"
winget install --id "VideoLAN.VLC"
```

## Compilers

```powershell
winget install --id "MSYS2.MSYS2" # pacman -S mingw-w64-ucrt-x86_64-toolchain
winget install --id "LLVM.LLVM"
winget install --id "Microsoft.VisualStudio.2022.Community"
winget install --id "Oracle.JDK.23"
winget install --id "OpenJS.NodeJS.LTS"
winget install --id "Rustlang.Rustup"
winget install --id "JetBrains.IntelliJIDEA.Community"
winget install "python3"
```

## Development Tools and Debuggers

```powershell
winget install --id "Git.Git"
winget install --id "Github.cli"
winget install --id "Kitware.CMake"
winget install --id "WinMerge.WinMerge"
winget install --id "ScooterSoftware.BeyondCompare4"
winget install --id "Microsoft.WinDbg"
winget install --id "Microsoft.TimeTravelDebugging"
winget install --id "x64dbg.x64dbg"
winget install --id "Hex-Rays.IDA.Free"
winget install --id "Microsoft.Azure.StorageExplorer"
winget install --id "Microsoft.PerfView"
winget install --id "Telerik.Fiddler.Classic"
winget install --id "WiresharkFoundation.Wireshark"
winget install --id "Nlitesoft.NTLite"
```

## Utilities

```powershell
winget install --id "AntibodySoftware.WizTree"
winget install --id "HandBrake.HandBrake"
winget install --id "REALiX.HWiNFO"
winget install --id "Rufus.Rufus"
winget install --id "ventoy.Ventoy"
```

## Restricted

```powershell
winget install --id "RustDesk.RustDesk"
winget install --id "Tailscale.Tailscale"
winget install --id "qBittorrent.qBittorrent"
winget install --id "TorProject.TorBrowser"
```

## Optional

```powershell
winget install --id "Microsoft.AzureCLI"
winget install --id "9P7KNL5RWT25" # Sysinternals Suite
winget install --id "Alacritty.Alacritty"
winget install --id "CrystalDewWorld.CrystalDiskMark"
winget install --id "GIMP.GIMP"
winget install --id "Postman.Postman"
winget install --id "HeidiSQL.HeidiSQL"
winget install --id "DBBrowserForSQLite.DBBrowserForSQLite"
winget install --id "Inkscape.Inkscape"
winget install --id "KiCad.KiCad"
winget install --id "WinSCP.WinSCP"
winget install --id "SoftwareFreedomConservancy.QEMU"
winget install --id "AngusJohnson.ResourceHacker"
winget install --id "DigiDNA.iMazingHEICConverter"
winget install --id "Audacity.Audacity"
winget install --id "XK72.Charles"
winget install --id "LIGHTNINGUK.ImgBurn"
winget install --id "icsharpcode.ILSpy"
winget install --id "CPUID.CPU-Z"
winget install --id "TechPowerUp.GPU-Z"
winget install --id "Microsoft.Azure.AZCopy.10"
winget install --id "Mp3tag.Mp3tag"
winget install --id "cURL.cURL"
winget install --id "sharkdp.fd"
winget install --id "BurntSushi.ripgrep.MSVC"
winget install --id "zyedidia.micro"
winget install --id "yt-dlp.yt-dlp"
winget install --id "jqlang.jq"
winget install --id "zufuliu.notepad4"
winget install --id "Gyan.FFmpeg"
winget install --id "junegunn.fzf"
winget install --id "Cockos.LICEcap"
winget install --id "MHNexus.HxD"
winget install --id "Microsoft.PowerShell"
winget install --id "Embarcadero.Dev-C++"
winget install --id "Oracle.VirtualBox"
winget install --id "Adobe.Acrobat.Reader.64-bit"
winget install --id "PuTTY.PuTTY"
winget install --id "TTYPlus.MTPutty"
winget install --id "eSpeak-NG.eSpeak-NG"
winget install --id "Zoom.Zoom"
```

## winget upgrade --all
