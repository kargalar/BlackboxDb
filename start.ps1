$ErrorActionPreference = 'Stop'

function Find-FreePort {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [int[]] $ExcludedPorts
    )

    $firstPort = 4000
    $lastPort = 4999

    foreach ($port in $firstPort..$lastPort) {
        if ($ExcludedPorts -contains $port) {
            continue
        }

        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)

        try {
            $listener.Start()
            return $port
        }
        catch [System.Net.Sockets.SocketException] {
            continue
        }
        finally {
            $listener.Stop()
        }
    }

    throw "4000-4999 araliginda kullanilabilir port bulunamadi."
}

$rootPath = $PSScriptRoot
$backendPath = Join-Path $rootPath 'server'
$frontendPath = Join-Path $rootPath 'web'
$backendPort = Find-FreePort -ExcludedPorts @()
$frontendPort = Find-FreePort -ExcludedPorts @($backendPort)
$frontendUrl = "http://localhost:$frontendPort"
$graphqlUrl = "http://localhost:$backendPort/graphql"

Write-Host "BlackboxDb baslatiliyor..."
Write-Host "Backend:  $graphqlUrl"
Write-Host "Frontend: $frontendUrl"

$backendCommand = "set PORT=$backendPort&& set FRONTEND_URL=$frontendUrl&& npm run dev"
$frontendCommand = "set PORT=$frontendPort&& set NEXT_PUBLIC_GRAPHQL_URL=$graphqlUrl&& set NEXT_PUBLIC_SITE_URL=$frontendUrl&& npm run dev -- --port $frontendPort"

Start-Process -FilePath $env:ComSpec -ArgumentList @('/k', $backendCommand) -WorkingDirectory $backendPath
Start-Process -FilePath $env:ComSpec -ArgumentList @('/k', $frontendCommand) -WorkingDirectory $frontendPath

Start-Sleep -Seconds 5
Start-Process $frontendUrl
