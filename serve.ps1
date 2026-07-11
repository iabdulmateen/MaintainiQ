# MaintainIQ Native PowerShell Web Server
# Serves files locally on http://localhost:8080/ with correct MIME types for ES Modules
$port = 8080
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "=========================================================="
Write-Host "MaintainIQ local web server started!"
Write-Host "Open: http://localhost:$port/ in your browser"
Write-Host "Press Ctrl+C in this terminal to stop the server"
Write-Host "=========================================================="
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream)
        
        $requestLine = $reader.ReadLine()
        if ($null -eq $requestLine) {
            $client.Close()
            continue
        }
        
        $parts = $requestLine.Split(" ")
        if ($parts.Length -lt 2) {
            $client.Close()
            continue
        }
        
        $urlPath = $parts[1].Split("?")[0]
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        
        # Sanitize path to prevent directory traversal
        $sanitizedPath = $urlPath.Replace("../", "").Replace("..\", "")
        $localPath = Join-Path (Get-Item .).FullName $sanitizedPath.TrimStart("/").Replace("/", "\")
        
        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            
            $contentType = "text/plain"
            if ($localPath.EndsWith(".html")) { $contentType = "text/html; charset=utf-8" }
            elseif ($localPath.EndsWith(".css")) { $contentType = "text/css; charset=utf-8" }
            elseif ($localPath.EndsWith(".js")) { $contentType = "application/javascript; charset=utf-8" }
            elseif ($localPath.EndsWith(".png")) { $contentType = "image/png" }
            elseif ($localPath.EndsWith(".jpg") -or $localPath.EndsWith(".jpeg")) { $contentType = "image/jpeg" }
            elseif ($localPath.EndsWith(".svg")) { $contentType = "image/svg+xml" }
            
            $header = "HTTP/1.1 200 OK`r`n" +
                      "Content-Type: $contentType`r`n" +
                      "Content-Length: $($bytes.Length)`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Connection: close`r`n`r`n"
            
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            $notFound = "HTTP/1.1 404 Not Found`r`nContent-Length: 9`r`nConnection: close`r`n`r`nNot Found"
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes($notFound)
            $stream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }
        
        $client.Close()
    }
} catch {
    Write-Host "Error occurred: $_"
} finally {
    $listener.Stop()
    Write-Host "Server stopped."
}