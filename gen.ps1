#powershell -Command .\gen.ps1


Function ReplaceInlines
{
    param ($Content)

    $Content = $Content -replace '`i(.*?)i`', '<i>$1</i>';
    $Content = $Content -replace '`b(.*?)b`', '<b>$1</b>';
    $Content = $Content -replace "(?ms)``c`r`n(.*?)`r`n\s*?c``", "<div class=`"code`">`$1</div>";
    $Content = $Content -replace "(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|`$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|`$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|`$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])", "<a target='_blank' class='link' href='`$0'>`$0</a>" ;

    return $Content
}

Function GetContentTitle
{
    param ($InFile)

    return ([io.fileinfo] $InFile).Basename -Replace "-"," "
}

Function CanLineBeBold
{
    param ($Line)
    if ($Line.Length -gt 0 -and (-not $Line.StartsWith(" "))) {
        return "<b>$($Line)</b>"
    }
    else {
        return $Line
    }
}

Function Generate-HTML
{

    param ($InFile)

$HtmlHeader = "<!DOCTYPE html>
<html lang=`"en`">
   <head>
       <meta charset=`"utf-8`">
       <link rel=`"shortcut icon`" type=`"image/x-icon`" href=`"../../images/favicon.ico`">
       <title>$(GetContentTitle -InFile $InFile)</title>
   </head>
    <style>

    a.link {
        border-bottom: 1px dashed #a30000;
        color: #a30000;
        text-decoration: none;
    }
    pre {
       width:650px;
       margin: 0 auto;
    }
    .code {
        color:limegreen;
        border-radius:5px;
        background-color:#2d3238;
        padding:5px;
        overflow: auto; /* enables horizontal scroll bars to code blocks */
    }
    .center {
		display: inline-block;
		margin: 0 auto;
		max-width: 650px;
	}
    </style>

    <body>
        <pre>
";
    $Lines = (Get-Content $InFile -Encoding UTF8);
    # If it appears like a tag we replace the < and > with &lt; and &gt;
    $Lines = $Lines | % {$_ -replace '<(.*?)>', '&lt$1&gt;'}
    # Words which look like beginning of the tag we replace '<word' with '< word'
    $Lines = $Lines | % {$_ -replace '<([a-zA-Z]+?)', '< $1'}
    $Lines = $Lines | % {CanLineBeBold -Line $_}
    $InFileContent = $Lines -join "`r`n";
    $InFileContent = ReplaceInlines -Content $InFileContent
    $InFileContent = $InFileContent -replace 'img:{(.*?)}', '<a href="$1" target="_blank"><img class="center" src="$1"/></a>'

$HtmlFooter = "
        </pre>
        <div>
            <script src=`"https://utteranc.es/client.js`"
                repo=`"vineelkovvuri/vineelkovvuri.github.io`"
                issue-term=`"pathname`"
                theme=`"github-light`"
                crossorigin=`"anonymous`"
                async>
            </script>
        </div>
    </body>
</html>";

    $OutFile = $InFile -replace ".txt$", ".html"
    Set-Content -Encoding UTF8 -Path $OutFile -Value "$HtmlHeader$InFileContent$HtmlFooter"

}

dir -Recurse .\articles\*.txt | % {Generate-HTML $_.FullName}


<#
$x | % { if ($_ -eq "===") { "=" * $prev.Length } else {$_; $prev = $_}}


Function LineBreak
{
    param ($Line)
    Write-Host "`t $Line"
    if ($Line.StartsWith(" ") -or
        $Line.StartsWith("|") -or
        $Line.StartsWith("+") -or
        $Line.StartsWith("-"))
         {
        return $Line;
    }

    $newLine = "";
    while ($Line.Length -gt 80) {
        $count = 80;
        $count1 = 80;
        $count2 = 80;

        while ($Line[$count1] -ne ' ' -and $count1 -gt 0) { $count1--;} #Write-Host "Count1 : $count1 $($Line[$count1])";
        while ($Line[$count2] -ne ' ' -and $count2 -lt $Line.Length) { $count2++; } #Write-Host "Count2 : $count2 $($Line[$count2])";
        if ($count - $count1 -gt $count2 - $count) {
            $count = $count2;
        } else {
            $count = $count1;
        }
        if ($count -gt 0 -and $count -lt $Line.Length) {
            $newLine += $Line.SubString(0, $count) + "`n";
            $Line = $Line.SubString($count + 1);
        } else {
            break;
        }
    }
    $newLine += $Line;
    return $newLine;
}


dir -Recurse *.txt | % {

$filename = $_.FullName;
Write-Host $filename
$con = Get-Content $filename;
$mcon = $con | % { LineBreak -Line $_ }

$mcon = $mcon -join "`n"

Set-Content -Encoding UTF8 -Path "$filename" -Value $mcon
}



dir -Recurse *.txt | % {

$filename = $_.FullName;
$con = Get-Content $filename;
$mcon = $con | % { if ($_ -eq "===") { "=" * $prev.Length } else {$_; $prev = $_}}

$mcon = $mcon -join "`n"

Set-Content -Encoding UTF8 -Path "$filename" -Value $mcon
}
#>