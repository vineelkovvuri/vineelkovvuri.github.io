---
title: "Windows Registry Tweaks"
tags: ['WindowsSetup']
---

```reg
Windows Registry Editor Version 5.00

; Enable Long Path support
[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem]
"LongPathsEnabled"=dword:00000001

; Enable Developer Mode - Required for Git symlink support
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock]
"AllowDevelopmentWithoutDevLicense"=dword:00000001

; Disable_Show_More_Options_Context_Menu
[HKEY_CURRENT_USER\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32]
@=""

; Dont show tabs from apps when snapping or Alt+Tab for all users
[HKEY_CURRENT_USER\Software\Policies\Microsoft\Windows\Explorer]
"MultiTaskingAltTabFilter"=dword:00000004

; Dont show tabs from apps when snapping or Alt+Tab for all users
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Explorer]
"MultiTaskingAltTabFilter"=dword:00000004

; Disable Search box suggestions in start menu
[HKEY_CURRENT_USER\SOFTWARE\Policies\Microsoft\Windows\Explorer]
"DisableSearchBoxSuggestions"=dword:00000001

[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Search]
"BingSearchEnabled"=dword:00000000

; Disable cortana in search
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Windows Search]
"AllowCortana"=dword:00000000
"CortanaConsent"=dword:00000000

; Disable_Chat_Taskbar Windows 11
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"TaskbarMn"=dword:00000000

; Disable Copilot button on taskbar
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"ShowCopilotButton"=dword:00000000

; Disable Copilot service for current user
[HKEY_CURRENT_USER\Software\Policies\Microsoft\Windows\WindowsCopilot]
"TurnOffWindowsCopilot"=dword:00000001

; Disable Copilot service for all users
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot]
"TurnOffWindowsCopilot"=dword:00000001

; Remove "Ask Copilot" Context Menu for All Users
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Blocked]
"{CB3B0003-8088-4EDE-8769-8B354AB2FF8C}"="Ask Copilot"

; Disable_AI_Recall
[HKEY_CURRENT_USER\Software\Policies\Microsoft\Windows\WindowsAI]
"DisableAIDataAnalysis"=dword:00000001
"DisableClickToDo"=dword:00000001
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\WindowsAI]
"DisableAIDataAnalysis"=dword:00000001
"DisableClickToDo"=dword:00000001

; Disable Windows Spotlight on Windows 11
[HKEY_CURRENT_USER\Software\Policies\Microsoft\Windows\CloudContent]
"DisableSpotlightCollectionOnDesktop"=dword:00000001

; Disable_Include_in_library_from_context_menu
[-HKEY_CLASSES_ROOT\Folder\ShellEx\ContextMenuHandlers\Library Location]
[-HKEY_LOCAL_MACHINE\SOFTWARE\Classes\Folder\ShellEx\ContextMenuHandlers\Library Location]

; Get fun facts, tips and more from Windows and Cortana on your lock screen
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-338387Enabled"=dword:00000000
"RotatingLockScreenOverlayEnabled"=dword:00000000

; Disable_Telemetry Begin ------------------
; Let Apps use Advertising ID for Relevant Ads in Windows 10
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo]
"Enabled"=dword:00000000

; Tailored experiences with diagnostic data for Current User
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Privacy]
"TailoredExperiencesWithDiagnosticDataEnabled"=dword:00000000

; Online Speech Recognition
[HKEY_CURRENT_USER\Software\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy]
"HasAccepted"=dword:00000000

; Improve Inking & Typing Recognition
[HKEY_CURRENT_USER\Software\Microsoft\Input\TIPC]
"Enabled"=dword:00000000

; Inking & Typing Personalization
[HKEY_CURRENT_USER\Software\Microsoft\InputPersonalization]
"RestrictImplicitInkCollection"=dword:00000001
"RestrictImplicitTextCollection"=dword:00000001

[HKEY_CURRENT_USER\Software\Microsoft\InputPersonalization\TrainedDataStore]
"HarvestContacts"=dword:00000000

[HKEY_CURRENT_USER\Software\Microsoft\Personalization\Settings]
"AcceptedPrivacyPolicy"=dword:00000000

; Send only Required Diagnostic and Usage Data
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection]
"AllowTelemetry"=dword:00000000

; Disable Let Windows improve Start and search results by tracking app launches
; [HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
; "Start_TrackProgs"=dword:00000000

; Disable Activity History
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\System]
"PublishUserActivities"=dword:00000000

; Set Feedback Frequency to Never
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Siuf\Rules]
"NumberOfSIUFInPeriod"=dword:00000000
"PeriodInNanoSeconds"=-
; Disable_Telemetry End ------------------

; Disable widgets service
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\PolicyManager\default\NewsAndInterests\AllowNewsAndInterests]
"value"=dword:00000000

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Dsh]
"AllowNewsAndInterests"=dword:00000000

; Disable_Windows_Suggestions --------------
; Show me the Windows welcome experience after updates and occasionally when I sign in to highlight what's new and suggested
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-310093Enabled"=dword:00000000

; Occasionally show suggestions in Start
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-338388Enabled"=dword:00000000
"SystemPaneSuggestionsEnabled"=dword:00000000

; Show recommendations for tips, shortcuts, new apps, and more in start
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"Start_IrisRecommendations"=dword:00000000

; Get tips, tricks, and suggestions as you use Windows
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-338389Enabled"=dword:00000000
"SoftLandingEnabled"=dword:00000000

; Show me suggested content in the Settings app
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-338393Enabled"=dword:00000000
"SubscribedContent-353694Enabled"=dword:00000000
"SubscribedContent-353696Enabled"=dword:00000000
"SubscribedContent-353698Enabled"=dword:00000000

; Disable Show me notifications in the Settings app
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\SystemSettings\AccountNotifications]
"EnableAccountNotifications"=dword:00000000

; Suggest ways I can finish setting up my device to get the most out of Windows
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\UserProfileEngagement]
"ScoobeSystemSettingEnabled"=dword:00000000

; Sync provider ads
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"ShowSyncProviderNotifications"=dword:00000000

; Automatic Installation of Suggested Apps
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SilentInstalledAppsEnabled"=dword:00000000

; Disable "Suggested" app notifications (Ads for MS services)
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\Windows.SystemToast.Suggested]
"Enabled"=dword:00000000

; Disable Show me suggestions for using my mobile device with Windows (Phone Link suggestions)
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Mobility]
"OptedIn"=dword:00000000

; Disable Show account-related notifications
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"Start_AccountNotifications"=dword:00000000

; Disable_Windows_Suggestions end --------------

; Hide_3D_Objects_Folder
[-HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}]
[-HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}]

; Hide Gallery on Navigation Pane for current user
[HKEY_CURRENT_USER\Software\Classes\CLSID\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}]
"System.IsPinnedToNameSpaceTree"=dword:00000000

; Add `Show Gallery` option to File Explorer folder options, with default set to disabled
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced\NavPane\ShowGallery]
"CheckedValue"=dword:00000001
"DefaultValue"=dword:00000000
"HKeyRoot"=dword:80000001
"Id"=dword:0000000d
"RegPath"="Software\\Classes\\CLSID\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}"
"Text"="Show Gallery"
"Type"="checkbox"
"UncheckedValue"=dword:00000000
"ValueName"="System.IsPinnedToNameSpaceTree"


; Hide Home on Navigation Pane for current user
[HKEY_CURRENT_USER\Software\Classes\CLSID\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}]
@="CLSID_MSGraphHomeFolder"
"System.IsPinnedToNameSpaceTree"=dword:00000000

; Add `Show Home` option to File Explorer folder options, with default set to disabled
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced\NavPane\ShowHome]
"CheckedValue"=dword:00000001
"DefaultValue"=dword:00000000
"HKeyRoot"=dword:80000001
"Id"=dword:0000000d
"RegPath"="Software\\Classes\\CLSID\\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}"
"Text"="Show Home"
"Type"="checkbox"
"UncheckedValue"=dword:00000000
"ValueName"="System.IsPinnedToNameSpaceTree"

; Hide_Music_Folder
[-HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{3dfdf296-dbec-4fb4-81d1-6a3438bcf4de}]
[-HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Explorer\MyComputer\NameSpace\{3dfdf296-dbec-4fb4-81d1-6a3438bcf4de}]

; Hide_Search_Taskbar
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Search]
"SearchboxTaskbarMode"=dword:00000000

; Hide_Taskview
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"ShowTaskViewButton"=dword:00000000

; Hide_duplicate_removable_drives_from_navigation_pane_of_File_Explorer
[-HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\DelegateFolders\{F5FB2C77-0E2F-4A16-A381-3E560C68BC83}]

; Launch_File_Explorer_To_This_PC
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"LaunchTo"=dword:00000001

; Show_Extensions_For_Known_File_Types
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"HideFileExt"=dword:00000000

; Disable_Edge_AI_Features
; Disable Microsoft Edge MSN news feed, sponsored links, shopping assistant and more.
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge]
"CopilotCDPPageContext"=dword:00000000
"CopilotPageContext"=dword:00000000
"HubsSidebarEnabled"=dword:00000000
"EdgeEntraCopilotPageContext"=dword:00000000
"EdgeHistoryAISearchEnabled"=dword:00000000
"ComposeInlineEnabled"=dword:00000000
"GenAILocalFoundationalModelSettings"=dword:00000001
"NewTabPageBingChatEnabled"=dword:00000000
"NewTabPageContentEnabled"=dword:00000000
"NewTabPageHideDefaultTopSites"=dword:00000001
"EdgeShoppingAssistantEnabled"=dword:00000000
"TabServicesEnabled"=dword:00000000
"AlternateErrorPagesEnabled"=dword:00000000

; Disable_Notepad_AI_Features
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\WindowsNotepad]
"DisableAIFeatures"=dword:00000001

; Disable_Paint_AI_Features
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Paint]
"DisableCocreator"=dword:00000001
"DisableGenerativeFill"=dword:00000001
"DisableImageCreator"=dword:00000001
"DisableGenerativeErase"=dword:00000001
"DisableRemoveBackground"=dword:00000001

; Disable Show mobile device in Start
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Start\Companions\Microsoft.YourPhone_8wekyb3d8bbwe]
"IsEnabled"=dword:00000000

; Disable MS 365 Ads in Settings Home
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\CloudContent]
"DisableConsumerAccountStateContent"=dword:00000001

; Disable_Start_Recommended
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\Explorer]
"HideRecommendedSection"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\PolicyManager\current\device\Start]
"HideRecommendedSection"=dword:00000001

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\PolicyManager\current\device\Education]
"IsEducationEnvironment"=dword:00000001

; Change start menu layout to show more pins
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"Start_Layout"=dword:00000001

; Disable_Sticky_Keys_Shortcut
[HKEY_CURRENT_USER\Control Panel\Accessibility\StickyKeys]
"Flags"="506"

; Show me the Windows welcome experience after updates and occasionally when I sign in to highlight what's new and suggested
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-310093Enabled"=dword:00000000

; Occasionally show suggestions in Start
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-338388Enabled"=dword:00000000
"SystemPaneSuggestionsEnabled"=dword:00000000

; Show recommendations for tips, shortcuts, new apps, and more in start
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"Start_IrisRecommendations"=dword:00000000

; Get tips, tricks, and suggestions as you use Windows
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-338389Enabled"=dword:00000000
"SoftLandingEnabled"=dword:00000000

; Show me suggested content in the Settings app
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SubscribedContent-338393Enabled"=dword:00000000
"SubscribedContent-353694Enabled"=dword:00000000
"SubscribedContent-353696Enabled"=dword:00000000
"SubscribedContent-353698Enabled"=dword:00000000

; Disable Show me notifications in the Settings app
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\SystemSettings\AccountNotifications]
"EnableAccountNotifications"=dword:00000000

; Suggest ways I can finish setting up my device to get the most out of Windows
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\UserProfileEngagement]
"ScoobeSystemSettingEnabled"=dword:00000000

; Sync provider ads
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"ShowSyncProviderNotifications"=dword:00000000

; Automatic Installation of Suggested Apps
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager]
"SilentInstalledAppsEnabled"=dword:00000000

; Disable "Suggested" app notifications (Ads for MS services)
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\Windows.SystemToast.Suggested]
"Enabled"=dword:00000000

; Disable Show me suggestions for using my mobile device with Windows (Phone Link suggestions)
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Mobility]
"OptedIn"=dword:00000000

; Disable Show account-related notifications
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced]
"Start_AccountNotifications"=dword:00000000

; Disable Windows Backup reminder notifications
[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Notifications\Settings\Windows.SystemToast.BackupReminder]
"Enabled"=dword:00000000

;-------------------Make sure "New text document" is present on context menu new--------
[-HKEY_CLASSES_ROOT\.txt\ShellNew]
[HKEY_CLASSES_ROOT\.txt\ShellNew]
"ItemName"=hex(2):40,00,25,00,53,00,79,00,73,00,74,00,65,00,6d,00,52,00,6f,00,\
  6f,00,74,00,25,00,5c,00,73,00,79,00,73,00,74,00,65,00,6d,00,33,00,32,00,5c,\
  00,6e,00,6f,00,74,00,65,00,70,00,61,00,64,00,2e,00,65,00,78,00,65,00,2c,00,\
  2d,00,34,00,37,00,30,00,00,00
"NullFile"=""


[-HKEY_CLASSES_ROOT\.txt]

[HKEY_CLASSES_ROOT\.txt]
@="txtfile"
"Content Type"="text/plain"
"PerceivedType"="text"

[HKEY_CLASSES_ROOT\.txt\PersistentHandler]
@="{5e941d80-bf96-11cd-b579-08002b30bfeb}"

[HKEY_CLASSES_ROOT\.txt\ShellNew]
"ItemName"=hex(2):40,00,25,00,53,00,79,00,73,00,74,00,65,00,6d,00,52,00,6f,00,\
  6f,00,74,00,25,00,5c,00,73,00,79,00,73,00,74,00,65,00,6d,00,33,00,32,00,5c,\
  00,6e,00,6f,00,74,00,65,00,70,00,61,00,64,00,2e,00,65,00,78,00,65,00,2c,00,\
  2d,00,34,00,37,00,30,00,00,00
"NullFile"=""

[-HKEY_CLASSES_ROOT\SystemFileAssociations\.txt]

[HKEY_CLASSES_ROOT\SystemFileAssociations\.txt]
"PerceivedType"="document"

[-HKEY_CLASSES_ROOT\txtfile]

[HKEY_CLASSES_ROOT\txtfile]
@="Text Document"
"EditFlags"=dword:00210000
"FriendlyTypeName"=hex(2):40,00,25,00,53,00,79,00,73,00,74,00,65,00,6d,00,52,\
  00,6f,00,6f,00,74,00,25,00,5c,00,73,00,79,00,73,00,74,00,65,00,6d,00,33,00,\
  32,00,5c,00,6e,00,6f,00,74,00,65,00,70,00,61,00,64,00,2e,00,65,00,78,00,65,\
  00,2c,00,2d,00,34,00,36,00,39,00,00,00

[HKEY_CLASSES_ROOT\txtfile\DefaultIcon]
@=hex(2):25,00,53,00,79,00,73,00,74,00,65,00,6d,00,52,00,6f,00,6f,00,74,00,25,\
  00,5c,00,73,00,79,00,73,00,74,00,65,00,6d,00,33,00,32,00,5c,00,69,00,6d,00,\
  61,00,67,00,65,00,72,00,65,00,73,00,2e,00,64,00,6c,00,6c,00,2c,00,2d,00,31,\
  00,30,00,32,00,00,00

[HKEY_CLASSES_ROOT\txtfile\shell\open\command]
@=hex(2):25,00,53,00,79,00,73,00,74,00,65,00,6d,00,52,00,6f,00,6f,00,74,00,25,\
  00,5c,00,73,00,79,00,73,00,74,00,65,00,6d,00,33,00,32,00,5c,00,4e,00,4f,00,\
  54,00,45,00,50,00,41,00,44,00,2e,00,45,00,58,00,45,00,20,00,25,00,31,00,00,\
  00

[HKEY_CLASSES_ROOT\txtfile\shell\print\command]
@=hex(2):25,00,53,00,79,00,73,00,74,00,65,00,6d,00,52,00,6f,00,6f,00,74,00,25,\
  00,5c,00,73,00,79,00,73,00,74,00,65,00,6d,00,33,00,32,00,5c,00,4e,00,4f,00,\
  54,00,45,00,50,00,41,00,44,00,2e,00,45,00,58,00,45,00,20,00,2f,00,70,00,20,\
  00,25,00,31,00,00,00

[HKEY_CLASSES_ROOT\txtfile\shell\printto\command]
@=hex(2):25,00,53,00,79,00,73,00,74,00,65,00,6d,00,52,00,6f,00,6f,00,74,00,25,\
  00,5c,00,73,00,79,00,73,00,74,00,65,00,6d,00,33,00,32,00,5c,00,6e,00,6f,00,\
  74,00,65,00,70,00,61,00,64,00,2e,00,65,00,78,00,65,00,20,00,2f,00,70,00,74,\
  00,20,00,22,00,25,00,31,00,22,00,20,00,22,00,25,00,32,00,22,00,20,00,22,00,\
  25,00,33,00,22,00,20,00,22,00,25,00,34,00,22,00,00,00

[-HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.txt]

[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.txt\OpenWithList]

[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.txt\OpenWithProgids]
"txtfile"=hex(0):

[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.txt\UserChoice]
"Hash"="hyXk/CpboWw="
"ProgId"="txtfile"

[-HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\Roaming\OpenWith\FileExts\.txt]

[HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\Roaming\OpenWith\FileExts\.txt\UserChoice]
"Hash"="FvJcqeZpmOE="
"ProgId"="txtfile"
;----------------------------------------------------




```
