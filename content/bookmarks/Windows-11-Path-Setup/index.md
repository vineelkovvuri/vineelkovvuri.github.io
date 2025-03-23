---
title: "Windows 11 Path Setup"
tags: ['WindowsSetup']
---

```powershell
# Setup Environment Variables

Set-ExecutionPolicy Unrestricted;

Function AppendPathVariable {
    param($Path = $null)

    $UserPath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User);
    $SystemPath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine);

    if (!$UserPath.Contains($Path.ToLower()) -and !$SystemPath.Contains($Path.ToLower())) {
        [Environment]::SetEnvironmentVariable("Path", $UserPath + ";$($Path)", [System.EnvironmentVariableTarget]::User)
    }
}

[Environment]::SetEnvironmentVariable("_NT_SOURCE_PATH", "SRV*C:\Sources", [System.EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("_NT_SYMBOL_PATH", "SRV*C:\Symbols*https://symweb.azurefd.net;SRV*C:\Symbols*https://msdl.microsoft.com/download/symbols", [System.EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("YAZI_FILE_ONE", "C:\Program Files\Git\usr\bin\file.exe", [System.EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("YAZI_CONFIG_HOME", "$($env:USERPROFILE)\.config\yazi", [System.EnvironmentVariableTarget]::User)

AppendPathVariable -Path "$($env:USERPROFILE)\AppData\Local\DBG\UI"
AppendPathVariable -Path "$($env:USERPROFILE)\OneDrive\Softs\Tools\rg"
AppendPathVariable -Path "$($env:USERPROFILE)\OneDrive\Softs\Tools\SysinternalsSuite"
AppendPathVariable -Path "$($env:USERPROFILE)\OneDrive\Softs\Tools\WezTerm"
AppendPathVariable -Path "$($env:USERPROFILE)\OneDrive\Softs\Tools\poppler"
AppendPathVariable -Path "C:\Program Files\Git\usr\bin"
AppendPathVariable -Path "C:\Program Files\Git\cmd"
AppendPathVariable -Path "C:\Program Files\Sublime Text"
AppendPathVariable -Path "C:\Program Files\eSpeak NG"
AppendPathVariable -Path "C:\Program Files (x86)\Meld\meld"
AppendPathVariable -Path "C:\msys64\ucrt64\bin"
AppendPathVariable -Path "C:\Program Files\GitHub CLI\"
AppendPathVariable -Path "C:\Program Files\LLVM\bin"

# Exclude some paths from Windows Defender Scans
Add-MpPreference -ExclusionPath "$($env:USERPROFILE)\.cargo"
Add-MpPreference -ExclusionPath "$($env:USERPROFILE)\.rustup"

# Manually restart after installing below optional packages
dism /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism /online /enable-feature /featurename:Containers-DisposableClientVM /all /norestart
dism /online /enable-feature /featurename:Microsoft-Hyper-V-All /all /norestart
dism /online /enable-feature /featurename:HypervisorPlatform /all /norestart

# Replace notepad.exe with Notepad4.exe to work from Run prompt
# Should use notepad4.exe from cmd and other places
$registryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\notepad.exe"
$exePath = "$($env:USERPROFILE)\OneDrive\Softs\Tools\rg\Notepad4.exe"
Set-ItemProperty -Path $registryPath -Name "(Default)" -Value $exePath
```