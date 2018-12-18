#powershell -Command .\gen.ps1

Function GetContentTitle
{
    param ($InFile)

    return ([io.fileinfo] $InFile).Basename -Replace "-"," "
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
    <body>
        <pre>
";
    $Lines = (Get-Content $InFile -Encoding UTF8);
    # If it appears like a tag we replace the < and > with &lt; and &gt;
    $Lines = $Lines | % {$_ -replace '<(.*?)>', '&lt$1&gt;'}
    # Words which look like beginning of the tag we replace '<word' with '< word'
    $Lines = $Lines | % {$_ -replace '<([a-zA-Z]+?)', '< $1'}
    $InFileContent = $Lines -join "`r`n";
    $InFileContent = $InFileContent -replace 'img:{(.*?)}', '<img src="$1"/>'

$HtmlFooter = "
        </pre>
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