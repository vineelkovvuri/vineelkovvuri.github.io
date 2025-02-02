---
title: "Windows 11 WinGet"
---

```powershell

# Install winget from store
# winget search -q ""

# Essentials
winget install -h --id "voidtools.Everything"                      --accept-source-agreements   --accept-package-agreements
winget install -h --id "WinsiderSS.SystemInformer"                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "Google.Chrome"                             --accept-source-agreements   --accept-package-agreements
winget install -h --id "Mozilla.Firefox"                           --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.VisualStudioCode"                --accept-source-agreements   --accept-package-agreements --override "/VERYSILENT /SP- /MERGETASKS='!runcode,!desktopicon,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath'"
winget install -h --id "SublimeHQ.SublimeText.4"                   --accept-source-agreements   --accept-package-agreements --override  "/VERYSILENT /SP- /MERGETASKS=contextentry"
winget install -h --id "SumatraPDF.SumatraPDF"                     --accept-source-agreements   --accept-package-agreements
winget install -h --id "AndrewZhezherun.WinDjView"                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "7zip.7zip"                                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "FastStone.Capture"                         --accept-source-agreements   --accept-package-agreements  & REM vineel XPCMI-ICDFU-JVKNW-OGZLO
winget install -h --id "9NKSQGP7F2NH"                              --accept-source-agreements   --accept-package-agreements & REM Whatsapp
winget install -h --id "mRemoteNG.mRemoteNG"                       --accept-source-agreements   --accept-package-agreements
winget install -h --id "Daum.PotPlayer"                            --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.PowerToys"                       --accept-source-agreements   --accept-package-agreements
winget install -h --id "9MSPC6MP8FM4"                              --accept-source-agreements   --accept-package-agreements & REM Microsoft Whiteboard
winget install -h --id "tailscale.tailscale"                       --accept-source-agreements   --accept-package-agreements
winget install -h --id "Discord.Discord"                           --accept-source-agreements   --accept-package-agreements


# Development
winget install -h --id "Git.Git"                                   --accept-source-agreements   --accept-package-agreements
winget install -h --id "Github.cli"                                --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.VisualStudio.2022.Community"     --accept-source-agreements   --accept-package-agreements
winget install -h --id "Rustlang.Rustup"                           --accept-source-agreements   --accept-package-agreements
winget install -h --id "Embarcadero.Dev-C++"                       --accept-source-agreements   --accept-package-agreements
winget install -h --id "JetBrains.IntelliJIDEA.Community"          --accept-source-agreements   --accept-package-agreements
winget install -h --id "Insomnia.Insomnia"                         --accept-source-agreements   --accept-package-agreements
winget install -h --id "Meld.Meld"                                 --accept-source-agreements   --accept-package-agreements
winget install -h "python3"                                        --accept-source-agreements   --accept-package-agreements
winget install -h --id "LLVM.LLVM"                                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "Kitware.CMake"                             --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.Azure.StorageExplorer"           --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.PerfView"                        --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.WinDbg"                          --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.TimeTravelDebugging"             --accept-source-agreements   --accept-package-agreements
winget install -h --id "MSYS2.MSYS2"                               --accept-source-agreements   --accept-package-agreements
# pacman -S mingw-w64-ucrt-x86_64-toolchain
winget install -h --id "Nlitesoft.NTLite"                          --accept-source-agreements   --accept-package-agreements
winget install -h --id "OpenJS.NodeJS.LTS"                         --accept-source-agreements   --accept-package-agreements
winget install -h --id "ScooterSoftware.BeyondCompare4"            --accept-source-agreements   --accept-package-agreements
winget install -h --id "Telerik.Fiddler.Classic"                   --accept-source-agreements   --accept-package-agreements
winget install -h --id "WiresharkFoundation.Wireshark"             --accept-source-agreements   --accept-package-agreements
winget install -h --id "Zoom.Zoom"                                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "Hex-Rays.IDA.Free"                         --accept-source-agreements   --accept-package-agreements
winget install -h --id "Oracle.JDK.23"                             --accept-source-agreements   --accept-package-agreements
rem winget install -h --id "MITMediaLab.Scratch.3"                     --accept-source-agreements   --accept-package-agreements

winget install -h --id "eSpeak-NG.eSpeak-NG"                       --accept-source-agreements   --accept-package-agreements

# Entertainment
winget install -h --id "VideoLAN.VLC"                              --accept-source-agreements   --accept-package-agreements

# Utilities
winget install -h --id "AntibodySoftware.WizTree"                  --accept-source-agreements   --accept-package-agreements
winget install -h --id "HandBrake.HandBrake"                       --accept-source-agreements   --accept-package-agreements
winget install -h --id "REALiX.HWiNFO"                             --accept-source-agreements   --accept-package-agreements
winget install -h --id "Rufus.Rufus"                               --accept-source-agreements   --accept-package-agreements
winget install -h --id "ventoy.Ventoy"                             --accept-source-agreements   --accept-package-agreements

# Restricted
# winget install -h --id "qBittorrent.qBittorrent"                  --accept-source-agreements   --accept-package-agreements
# winget install -h --id "TeamViewer.TeamViewer"                    --accept-source-agreements   --accept-package-agreements
# winget install -h --id "TorProject.TorBrowser"                    --accept-source-agreements   --accept-package-agreements

# Optional
winget install -h --id "Microsoft.AzureCLI"                        --accept-source-agreements   --accept-package-agreements
winget install -h --id "9P7KNL5RWT25"                              --accept-source-agreements   --accept-package-agreements & REM Sysinternals Suite
winget install -h --id "Alacritty.Alacritty"                       --accept-source-agreements   --accept-package-agreements
winget install -h --id "CrystalDewWorld.CrystalDiskMark"           --accept-source-agreements   --accept-package-agreements
winget install -h --id "GIMP.GIMP"                                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "Postman.Postman"                           --accept-source-agreements   --accept-package-agreements
winget install -h --id "HeidiSQL.HeidiSQL"                         --accept-source-agreements   --accept-package-agreements
winget install -h --id "DBBrowserForSQLite.DBBrowserForSQLite"     --accept-source-agreements   --accept-package-agreements
winget install -h --id "Apple.iTunes"                              --accept-source-agreements   --accept-package-agreements
winget install -h --id "Inkscape.Inkscape"                         --accept-source-agreements   --accept-package-agreements
winget install -h --id "KDE.Krita"                                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "KiCad.KiCad"                               --accept-source-agreements   --accept-package-agreements
winget install -h --id "WinSCP.WinSCP"                             --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.PerfView"                        --accept-source-agreements   --accept-package-agreements
winget install -h --id "SoftwareFreedomConservancy.QEMU"           --accept-source-agreements   --accept-package-agreements
winget install -h --id "AngusJohnson.ResourceHacker"               --accept-source-agreements   --accept-package-agreements
winget install -h --id "DigiDNA.iMazingHEICConverter"              --accept-source-agreements   --accept-package-agreements
winget install -h --id "Audacity.Audacity"                         --accept-source-agreements   --accept-package-agreements
winget install -h --id "XK72.Charles"                              --accept-source-agreements   --accept-package-agreements
winget install -h --id "LIGHTNINGUK.ImgBurn"                       --accept-source-agreements   --accept-package-agreements
winget install -h --id "icsharpcode.ILSpy"                         --accept-source-agreements   --accept-package-agreements
winget install -h --id "TechPowerUp.GPU-Z"                         --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.Azure.AZCopy.10"                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "Mp3tag.Mp3tag"                             --accept-source-agreements   --accept-package-agreements
winget install -h --id "cURL.cURL"                                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "sharkdp.fd"                                --accept-source-agreements   --accept-package-agreements
winget install -h --id "BurntSushi.ripgrep.MSVC"                   --accept-source-agreements   --accept-package-agreements
winget install -h --id "zyedidia.micro"                            --accept-source-agreements   --accept-package-agreements
winget install -h --id "yt-dlp.yt-dlp"                             --accept-source-agreements   --accept-package-agreements
winget install -h --id "jqlang.jq"                                 --accept-source-agreements   --accept-package-agreements
winget install -h --id "zufuliu.notepad4"                          --accept-source-agreements   --accept-package-agreements
winget install -h --id "CPUID.CPU-Z"                               --accept-source-agreements   --accept-package-agreements
winget install -h --id "Gyan.FFmpeg"                               --accept-source-agreements   --accept-package-agreements
winget install -h --id "junegunn.fzf"                              --accept-source-agreements   --accept-package-agreements
winget install -h --id "Cockos.LICEcap"                            --accept-source-agreements   --accept-package-agreements
winget install -h --id "MHNexus.HxD"                               --accept-source-agreements   --accept-package-agreements
winget install -h --id "Microsoft.PowerShell"                      --accept-source-agreements   --accept-package-agreements


winget install -h --id "Oracle.VirtualBox"                         --accept-source-agreements   --accept-package-agreements

# winget upgrade --all

# Not needed anymore
winget install -h --id "Adobe.Acrobat.Reader.64-bit"               --accept-source-agreements   --accept-package-agreements
winget install -h --id "PuTTY.PuTTY"                               --accept-source-agreements   --accept-package-agreements
winget install -h --id "TTYPlus.MTPutty"                           --accept-source-agreements   --accept-package-agreements
```