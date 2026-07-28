$key = 'AQ.Ab8RN6LapALLAlTyAZOrWvXsAA6jbRVsOMDROrLU8VDf5Urdmw'
Write-Host "Waiting 60 seconds for quota reset..."
Start-Sleep -Seconds 60

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=$key"
$body = '{"contents":[{"parts":[{"text":"Say hello in Arabic"}]}],"generationConfig":{"maxOutputTokens":50,"temperature":0.7}}'
try {
    $r = Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 20
    Write-Host "SUCCESS!"
    Write-Host "Text: $($r.candidates[0].content.parts[0].text)"
    Write-Host "Tokens: $($r.usageMetadata.totalTokenCount)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Body: $($reader.ReadToEnd())"
    }
}
