#powershell -Command .\gen.ps1 -InFile infilepath -OutFile outfilepath

param ($InFile, $OutFile)

$HtmlHeader = @"
<!DOCTYPE html>
<html>
    <body>
        <pre>

"@;
$InFileContent = (Get-Content $InFile) -join "`n";
$InFileContent = $InFileContent -replace 'img:{(.*?)}', '<img src="$1"/>'
$HtmlFooter = @"

        </pre>
    </body>
</html>
"@;

Set-Content -Encoding UTF8 -Path $OutFile -Value "$HtmlHeader$InFileContent$HtmlFooter"
