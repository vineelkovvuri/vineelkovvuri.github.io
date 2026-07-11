---
title: "Windows De-bloat Script"
tags: ['WindowsSetup']
---

```powershell
# https://github.com/Raphire/Win11Debloat
# List of app package names
$appList = @(
    "Microsoft.3DBuilder",
    "Microsoft.549981C3F5F10", # Cortana app
    "Microsoft.BingFinance",
    "Microsoft.BingFoodAndDrink",
    "Microsoft.BingHealthAndFitness",
    "Microsoft.BingNews",
    "Microsoft.BingSports",
    "Microsoft.BingTranslator",
    "Microsoft.BingTravel",
    "Microsoft.BingWeather",
    "Microsoft.Getstarted", # Cannot be uninstalled in Windows 11
    "Microsoft.Messaging",
    "Microsoft.Microsoft3DViewer",
    "Microsoft.MicrosoftJournal",
    "Microsoft.MicrosoftOfficeHub",
    "Microsoft.MicrosoftPowerBIForWindows",
    "Microsoft.MicrosoftSolitaireCollection",
    "Microsoft.MicrosoftStickyNotes",
    "Microsoft.MixedReality.Portal",
    "Microsoft.NetworkSpeedTest",
    "Microsoft.News",
    "Microsoft.Office.OneNote",
    "Microsoft.Office.Sway",
    "Microsoft.OneConnect",
    "Microsoft.Print3D",
    "Microsoft.SkypeApp",
    "Microsoft.Todos",
    "Microsoft.WindowsAlarms",
    "Microsoft.WindowsFeedbackHub",
    "Microsoft.WindowsMaps",
    "Microsoft.WindowsSoundRecorder",
    "Microsoft.XboxApp", # Old Xbox Console Companion App
    "Microsoft.ZuneVideo",
    "MicrosoftCorporationII.MicrosoftFamily", # Family Safety App
    "MicrosoftCorporationII.QuickAssist",
    "MicrosoftTeams", # Old MS Teams personal (MS Store)
    "MSTeams", # New MS Teams app

    "ACGMediaPlayer",
    "ActiproSoftwareLLC",
    "AdobeSystemsIncorporated.AdobePhotoshopExpress",
    "Amazon.com.Amazon",
    "AmazonVideo.PrimeVideo",
    "Asphalt8Airborne ",
    "AutodeskSketchBook",
    "CaesarsSlotsFreeCasino",
    "COOKINGFEVER",
    "CyberLinkMediaSuiteEssentials",
    "DisneyMagicKingdoms",
    "Disney",
    "DrawboardPDF",
    "Duolingo-LearnLanguagesforFree",
    "EclipseManager",
    "Facebook",
    "FarmVille2CountryEscape",
    "fitbit",
    "Flipboard",
    "HiddenCity",
    "HULULLC.HULUPLUS",
    "iHeartRadio",
    "Instagram",
    "king.com.BubbleWitch3Saga",
    "king.com.CandyCrushSaga",
    "king.com.CandyCrushSodaSaga",
    "LinkedInforWindows",
    "MarchofEmpires",
    "Netflix",
    "NYTCrossword",
    "OneCalendar",
    "PandoraMediaInc",
    "PhototasticCollage",
    "PicsArt-PhotoStudio",
    "Plex",
    "PolarrPhotoEditorAcademicEdition",
    "Royal Revolt",
    "Shazam",
    "Sidia.LiveWallpaper",
    "SlingTV",
    "Spotify",
    "TikTok",
    "TuneInRadio",
    "Twitter",
    "Viber",
    "WinZipUniversal",
    "Wunderlist",
    "XING",
    "Microsoft.PowerAutomateDesktop",
    "Microsoft.YourPhone", # Phone link
    "Microsoft.ZuneMusic",
    "MicrosoftWindows.CrossDevice",
    "Microsoft.WindowsNotepad", # Don't like the new Notepad with AI crap
    "Microsoft.MSPaint",                      # Paint 3D
    "Clipchamp.Clipchamp",
    "Microsoft.TeamsXboxGameBarWidget",
    "Microsoft.Windows.Cortana",
    "Microsoft.Windows.DevHome",
    "Microsoft.Windows.DevHomeGitHubExtension",
    "Microsoft.M365Companions"
    "Microsoft.GamingApp",                    # Modern Xbox Gaming App, required for installing some PC games
    "Microsoft.OutlookForWindows",            # New mail app: Outlook for Windows
    "Microsoft.People",                       # Required for & included with Mail & Calendar
    "Microsoft.Windows.DevHome",
    "Microsoft.windowscommunicationsapps",    # Mail & Calendar
    "Microsoft.XboxGameOverlay",              # Game overlay, required/useful for some games
    "Microsoft.XboxGamingOverlay",            # Game overlay, required/useful for some games
    "Microsoft.Copilot",                      # New Windows Copilot app
    "Microsoft.Windows.Photos",               # Use FastStone Image viewer
    "Microsoft.Paint",                        # Classic Paint
    "Microsoft.ScreenSketch",                 # Snipping Tool. Use FSCapture
    "Microsoft.BingSearch"                    # Web Search from Microsoft Bing (Integrates into Windows Search)
    )

# Iterate over each app name and try to remove it
foreach ($appName in $appList) {
    Write-Host "Processing $appName..." -ForegroundColor Yellow
    Get-AppxPackage -Name $appName -PackageTypeFilter Main, Bundle, Resource -AllUsers |
    Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
}

# ------------------------------------------------------------------------------------------------------------- #
#  The apps below this line will NOT be uninstalled by default. Remove the # character in front of any app you  #
#   want to UNINSTALL by default.                                                                               #
# ------------------------------------------------------------------------------------------------------------- #
#Microsoft.Edge                         # Edge browser (Can only be uninstalled in European Economic Area)
#Microsoft.GetHelp                      # Required for some Windows 11 Troubleshooters
#Microsoft.OneDrive                     # OneDrive consumer
#Microsoft.Whiteboard                   # Only preinstalled on devices with touchscreen and/or pen support
#Microsoft.WindowsCalculator
#Microsoft.WindowsCamera
#Microsoft.WindowsStore                 # Microsoft Store, WARNING: This app cannot be reinstalled!
#Microsoft.WindowsTerminal              # New default terminal app in windows 11
#Microsoft.Xbox.TCUI                    # UI framework, seems to be required for MS store, photos and certain games
#Microsoft.XboxIdentityProvider         # Xbox sign-in framework, required for some games
#Microsoft.XboxSpeechToTextOverlay      # Might be required for some games, WARNING: This app cannot be reinstalled!


# --------------------------------------------------------------------------------------------------------------- #
#  The apps below this line will NOT be uninstalled by default, unless selected during custom mode app selection  #
#   or when launching the script with the specific parameters found in the README.md. Remove the # character in   #
#   front of any app you want to UNINSTALL by default.                                                            #
# --------------------------------------------------------------------------------------------------------------- #
#Microsoft.RemoteDesktop
```