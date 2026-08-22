$port = 8080
$prefix = "http://*:$port/"
$listener = New-Object System.Net.HttpListener

try {
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Prefixes.Add("http://127.0.0.1:$port/")
} catch {
    $listener.Prefixes.Add("http://localhost:$port/")
}

$listener.Start()
Write-Host "HTTP Server started on http://localhost:$port/ and http://127.0.0.1:$port/"

$baseDir = $PSScriptRoot

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $localPath = $request.Url.LocalPath
            if ($localPath -eq "/" -or [string]::IsNullOrWhiteSpace($localPath)) {
                $localPath = "/index.html"
            }

            $relativePath = $localPath.TrimStart('/').Replace('/', '\')
            $filePath = Join-Path $baseDir $relativePath

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".svg"  { "image/svg+xml" }
                    default { "application/octet-stream" }
                }

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.StatusCode = 200
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        } catch {
            Write-Host "Request error: $_"
        } finally {
            try { $response.OutputStream.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
}
