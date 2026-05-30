$ErrorActionPreference = "Continue"

function New-AuditResult {
    param(
        [string]$Name,
        [string]$Status,
        $Value = $null,
        [string]$Notes = ""
    )

    [pscustomobject]@{
        name = $Name
        status = $Status
        value = $Value
        notes = $Notes
    }
}

function Test-CommandAvailable {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue

    if ($command) {
        return New-AuditResult -Name $Name -Status "available" -Value $command.Source -Notes $command.CommandType
    }

    return New-AuditResult -Name $Name -Status "not_found"
}

function Get-RegistryValueSafe {
    param(
        [string]$Path,
        [string]$Name
    )

    try {
        return (Get-ItemProperty -Path $Path -Name $Name -ErrorAction Stop).$Name
    } catch {
        return $null
    }
}

function Get-DotNetFrameworkInfo {
    $items = @()

    try {
        $basePath = "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP"
        $keys = Get-ChildItem $basePath -Recurse -ErrorAction Stop

        foreach ($key in $keys) {
            $props = Get-ItemProperty -Path $key.PSPath -ErrorAction SilentlyContinue

            if ($props.Version -or $props.Release) {
                $items += [pscustomobject]@{
                    key = $key.PSChildName
                    version = $props.Version
                    release = $props.Release
                    install = $props.Install
                    servicePack = $props.SP
                }
            }
        }
    } catch {
        $items += [pscustomobject]@{
            error = $_.Exception.Message
        }
    }

    return $items
}

function Get-InstalledProgramMatches {
    param([string[]]$Patterns)

    $matches = @()
    $registryPaths = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    foreach ($path in $registryPaths) {
        try {
            $programs = Get-ItemProperty $path -ErrorAction SilentlyContinue

            foreach ($program in $programs) {
                if (-not $program.DisplayName) {
                    continue
                }

                foreach ($pattern in $Patterns) {
                    if ($program.DisplayName -match $pattern) {
                        $matches += [pscustomobject]@{
                            displayName = $program.DisplayName
                            displayVersion = $program.DisplayVersion
                            publisher = $program.Publisher
                            installDate = $program.InstallDate
                            registryPath = $path
                        }
                        break
                    }
                }
            }
        } catch {
        }
    }

    return $matches | Sort-Object displayName -Unique
}

function Test-FileWriteAccess {
    param([string]$Directory)

    $testPath = Join-Path $Directory ("pixelsim-write-test-" + [guid]::NewGuid().ToString() + ".tmp")

    try {
        "test" | Out-File -FilePath $testPath -Encoding UTF8 -Force
        Remove-Item $testPath -Force
        return New-AuditResult -Name "Project folder write access" -Status "available" -Value $Directory
    } catch {
        return New-AuditResult -Name "Project folder write access" -Status "blocked_or_failed" -Value $Directory -Notes $_.Exception.Message
    }
}

function Get-BrowserInfo {
    $browsers = @()
    $candidates = @(
        @{ name = "Chrome"; paths = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe", "$env:LocalAppData\Google\Chrome\Application\chrome.exe") },
        @{ name = "Edge"; paths = @("$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe", "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe") },
        @{ name = "Firefox"; paths = @("$env:ProgramFiles\Mozilla Firefox\firefox.exe", "$env:ProgramFiles(x86)\Mozilla Firefox\firefox.exe") }
    )

    foreach ($candidate in $candidates) {
        foreach ($path in $candidate.paths) {
            if (Test-Path $path) {
                $item = Get-Item $path -ErrorAction SilentlyContinue
                $browsers += [pscustomobject]@{
                    name = $candidate.name
                    path = $path
                    version = $item.VersionInfo.ProductVersion
                }
            }
        }
    }

    return $browsers
}

function New-BrowserAuditHtml {
    param([string]$Path)

    $html = @'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PixelSim Browser Capability Audit</title>
  <style>
    body { margin: 0; padding: 24px; background: #0b0d14; color: #f4f7ff; font-family: Arial, sans-serif; }
    h1 { margin-top: 0; }
    button { padding: 10px 14px; font-weight: 700; cursor: pointer; }
    pre { white-space: pre-wrap; background: #151925; border: 1px solid #30384f; padding: 16px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>PixelSim Browser Capability Audit</h1>
  <button id="run">Run Browser Audit</button>
  <button id="download">Download JSON Report</button>
  <pre id="out">Click Run Browser Audit.</pre>

  <script>
    var latestReport = null;

    function testCanvas2D() {
      var c = document.createElement('canvas');
      return !!c.getContext('2d');
    }

    function testWebGL() {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    }

    function testWorker() {
      return typeof Worker !== 'undefined';
    }

    function testLocalStorage() {
      try {
        localStorage.setItem('pixelsim_audit_test', '1');
        localStorage.removeItem('pixelsim_audit_test');
        return true;
      } catch (e) {
        return false;
      }
    }

    function testIndexedDB() {
      return typeof indexedDB !== 'undefined';
    }

    function testFullscreen() {
      return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen);
    }

    function testFileAPIs() {
      return {
        fileReader: typeof FileReader !== 'undefined',
        blob: typeof Blob !== 'undefined',
        urlCreateObjectURL: !!(window.URL && URL.createObjectURL),
        fileInput: true
      };
    }

    function canvasBenchmark() {
      var c = document.createElement('canvas');
      c.width = 800;
      c.height = 450;
      var ctx = c.getContext('2d');
      var start = performance.now();
      var draws = 0;

      while (performance.now() - start < 500) {
        ctx.fillStyle = '#' + ((draws * 2654435761) >>> 0).toString(16).slice(0, 6).padStart(6, '0');
        ctx.fillRect((draws * 7) % c.width, (draws * 13) % c.height, 4, 4);
        draws++;
      }

      return Math.round(draws * 2);
    }

    async function getStorageEstimate() {
      if (navigator.storage && navigator.storage.estimate) {
        return await navigator.storage.estimate();
      }
      return null;
    }

    async function runAudit() {
      var report = {
        generatedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        locationProtocol: location.protocol,
        capabilities: {
          canvas2D: testCanvas2D(),
          webgl: testWebGL(),
          webWorkers: testWorker(),
          localStorage: testLocalStorage(),
          indexedDB: testIndexedDB(),
          fullscreen: testFullscreen(),
          fileAPIs: testFileAPIs(),
          storageEstimate: await getStorageEstimate(),
          canvasDrawsPerSecond: canvasBenchmark()
        }
      };

      latestReport = report;
      document.getElementById('out').textContent = JSON.stringify(report, null, 2);
    }

    function downloadReport() {
      if (!latestReport) {
        return;
      }

      var blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pixelsim-browser-audit.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    document.getElementById('run').addEventListener('click', runAudit);
    document.getElementById('download').addEventListener('click', downloadReport);
  </script>
</body>
</html>
'@

    $html | Out-File -FilePath $Path -Encoding UTF8 -Force
}

$root = Get-Location
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $root "audit-output"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$results = [ordered]@{}
$results.generatedAt = (Get-Date).ToString("o")
$results.auditScope = "Local-only PixelSim capability audit. No network tests and no bypass attempts."
$results.workingDirectory = $root.Path

$results.powershell = [pscustomobject]@{
    version = $PSVersionTable.PSVersion.ToString()
    edition = $PSVersionTable.PSEdition
    host = $Host.Name
    hostVersion = $Host.Version.ToString()
    executionPolicyProcess = Get-ExecutionPolicy -Scope Process
    executionPolicyCurrentUser = Get-ExecutionPolicy -Scope CurrentUser
    executionPolicyLocalMachine = Get-ExecutionPolicy -Scope LocalMachine
}

$results.windows = [pscustomobject]@{
    osCaption = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).Caption
    osVersion = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).Version
    architecture = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).OSArchitecture
}

$results.dotNetFramework = Get-DotNetFrameworkInfo
$results.commands = @(
    Test-CommandAvailable "powershell.exe"
    Test-CommandAvailable "cscript.exe"
    Test-CommandAvailable "wscript.exe"
    Test-CommandAvailable "csc.exe"
    Test-CommandAvailable "MSBuild.exe"
    Test-CommandAvailable "dotnet.exe"
    Test-CommandAvailable "git.exe"
)

$wshLm = Get-RegistryValueSafe -Path "HKLM:\Software\Microsoft\Windows Script Host\Settings" -Name "Enabled"
$wshCu = Get-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows Script Host\Settings" -Name "Enabled"

$results.windowsScriptHost = [pscustomobject]@{
    hklmEnabled = $wshLm
    hkcuEnabled = $wshCu
    note = "Null usually means no explicit registry block was found."
}

$results.officeMatches = Get-InstalledProgramMatches -Patterns @("Microsoft 365", "Microsoft Office", "Access", "Excel", "Visual Studio", "SQL Server", "SQLite", "ODBC")
$results.browsers = Get-BrowserInfo
$results.fileSystem = @(
    Test-FileWriteAccess -Directory $root.Path
)

$browserAuditPath = Join-Path $outDir "pixelsim-browser-audit.html"
New-BrowserAuditHtml -Path $browserAuditPath
$results.browserAuditHtml = $browserAuditPath

$jsonPath = Join-Path $outDir ("pixelsim-windows-audit-" + $timestamp + ".json")
$txtPath = Join-Path $outDir ("pixelsim-windows-audit-" + $timestamp + ".txt")

$results | ConvertTo-Json -Depth 8 | Out-File -FilePath $jsonPath -Encoding UTF8 -Force
$results | Format-List | Out-File -FilePath $txtPath -Encoding UTF8 -Force

Write-Host "PixelSim local capability audit complete."
Write-Host "JSON report: $jsonPath"
Write-Host "Text report: $txtPath"
Write-Host "Browser audit page: $browserAuditPath"
Write-Host "Open the browser audit page locally and click Run Browser Audit."
Write-Host "Do not post reports publicly without reviewing/redacting environment details."
