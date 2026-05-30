$ErrorActionPreference = "Continue"

function New-AuditResult {
    param(
        [string]$Name,
        [string]$Status,
        $Value = $null,
        [string]$Notes = ""
    )

    return [pscustomobject]@{
        name = $Name
        status = $Status
        value = $Value
        notes = $Notes
    }
}

function Add-ReportProperty {
    param(
        [psobject]$Report,
        [string]$Name,
        $Value
    )

    $Report | Add-Member -MemberType NoteProperty -Name $Name -Value $Value -Force
}

function Test-CommandAvailable {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue

    if ($command) {
        $version = $null
        try {
            if ($command.Source -and (Test-Path $command.Source)) {
                $item = Get-Item $command.Source -ErrorAction SilentlyContinue
                if ($item -and $item.VersionInfo) {
                    $version = $item.VersionInfo.ProductVersion
                }
            }
        } catch {
        }

        return [pscustomobject]@{
            name = $Name
            status = "available"
            source = $command.Source
            commandType = [string]$command.CommandType
            version = $version
        }
    }

    return [pscustomobject]@{
        name = $Name
        status = "not_found"
        source = $null
        commandType = $null
        version = $null
    }
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

function Get-OsInfoSafe {
    try {
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        return [pscustomobject]@{
            caption = $os.Caption
            version = $os.Version
            architecture = $os.OSArchitecture
        }
    } catch {
        try {
            $os = Get-WmiObject Win32_OperatingSystem -ErrorAction Stop
            return [pscustomobject]@{
                caption = $os.Caption
                version = $os.Version
                architecture = $os.OSArchitecture
            }
        } catch {
            return [pscustomobject]@{
                error = $_.Exception.Message
            }
        }
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

function Join-PathIfBaseExists {
    param(
        [string]$Base,
        [string]$Child
    )

    if ([string]::IsNullOrWhiteSpace($Base)) {
        return $null
    }

    return Join-Path $Base $Child
}

function Get-BrowserInfo {
    $browsers = @()
    $programFiles = $env:ProgramFiles
    $programFilesX86 = ${env:ProgramFiles(x86)}
    $localAppData = $env:LocalAppData

    $candidatePaths = @(
        [pscustomobject]@{ name = "Chrome"; path = (Join-PathIfBaseExists $programFiles "Google\Chrome\Application\chrome.exe") },
        [pscustomobject]@{ name = "Chrome"; path = (Join-PathIfBaseExists $programFilesX86 "Google\Chrome\Application\chrome.exe") },
        [pscustomobject]@{ name = "Chrome"; path = (Join-PathIfBaseExists $localAppData "Google\Chrome\Application\chrome.exe") },
        [pscustomobject]@{ name = "Edge"; path = (Join-PathIfBaseExists $programFiles "Microsoft\Edge\Application\msedge.exe") },
        [pscustomobject]@{ name = "Edge"; path = (Join-PathIfBaseExists $programFilesX86 "Microsoft\Edge\Application\msedge.exe") },
        [pscustomobject]@{ name = "Edge"; path = (Join-PathIfBaseExists $localAppData "Microsoft\Edge\Application\msedge.exe") },
        [pscustomobject]@{ name = "Firefox"; path = (Join-PathIfBaseExists $programFiles "Mozilla Firefox\firefox.exe") },
        [pscustomobject]@{ name = "Firefox"; path = (Join-PathIfBaseExists $programFilesX86 "Mozilla Firefox\firefox.exe") }
    )

    foreach ($candidate in $candidatePaths) {
        if ($candidate.path -and (Test-Path $candidate.path)) {
            $item = Get-Item $candidate.path -ErrorAction SilentlyContinue
            $browsers += [pscustomobject]@{
                name = $candidate.name
                path = $candidate.path
                version = $item.VersionInfo.ProductVersion
            }
        }
    }

    return $browsers
}

function Get-ComRegistrationInfo {
    $progIds = @(
        "Excel.Application",
        "Access.Application",
        "Word.Application",
        "PowerPoint.Application",
        "Scripting.FileSystemObject",
        "WScript.Shell",
        "ADODB.Connection"
    )

    $items = @()

    foreach ($progId in $progIds) {
        $items += [pscustomobject]@{
            progId = $progId
            registered = (Test-Path ("Registry::HKEY_CLASSES_ROOT\" + $progId))
        }
    }

    return $items
}

function Get-OdbcDriverInfo {
    $items = @()
    $paths = @(
        "HKLM:\SOFTWARE\ODBC\ODBCINST.INI\ODBC Drivers",
        "HKLM:\SOFTWARE\WOW6432Node\ODBC\ODBCINST.INI\ODBC Drivers",
        "HKCU:\SOFTWARE\ODBC\ODBCINST.INI\ODBC Drivers"
    )

    foreach ($path in $paths) {
        try {
            $props = Get-ItemProperty -Path $path -ErrorAction Stop
            foreach ($property in $props.PSObject.Properties) {
                if ($property.Name -like "PS*") {
                    continue
                }

                $items += [pscustomobject]@{
                    driver = $property.Name
                    value = $property.Value
                    registryPath = $path
                }
            }
        } catch {
        }
    }

    return $items | Sort-Object driver -Unique
}

function Get-RuntimeInventory {
    $runtimeCommands = @(
        "powershell.exe",
        "pwsh.exe",
        "cscript.exe",
        "wscript.exe",
        "csc.exe",
        "MSBuild.exe",
        "dotnet.exe",
        "git.exe",
        "node.exe",
        "npm.cmd",
        "python.exe",
        "py.exe",
        "java.exe",
        "javac.exe"
    )

    $commandResults = @()

    foreach ($commandName in $runtimeCommands) {
        $commandResults += Test-CommandAvailable $commandName
    }

    $programMatches = Get-InstalledProgramMatches -Patterns @(
        "Microsoft 365",
        "Microsoft Office",
        "Access",
        "Excel",
        "Word",
        "Visual Studio",
        "Build Tools",
        "SQL Server",
        "SQLite",
        "ODBC",
        "\.NET",
        "ASP\.NET",
        "Visual C\+\+",
        "Redistributable",
        "Java",
        "JDK",
        "JRE",
        "Python",
        "Node\.js",
        "Git",
        "PowerShell"
    )

    return [pscustomobject]@{
        commands = $commandResults
        installedProgramMatches = $programMatches
        comRegistrations = Get-ComRegistrationInfo
        odbcDrivers = Get-OdbcDriverInfo
    }
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
    button { padding: 10px 14px; font-weight: 700; cursor: pointer; margin-right: 8px; }
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

    function padHex(value) {
      while (value.length < 6) value = '0' + value;
      return value.slice(0, 6);
    }

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
        ctx.fillStyle = '#' + padHex(((draws * 2654435761) >>> 0).toString(16));
        ctx.fillRect((draws * 7) % c.width, (draws * 13) % c.height, 4, 4);
        draws++;
      }

      return Math.round(draws * 2);
    }

    function getStorageEstimate(callback) {
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function(estimate) {
          callback(estimate);
        }).catch(function(error) {
          callback({ error: String(error) });
        });
      } else {
        callback(null);
      }
    }

    function runAudit() {
      getStorageEstimate(function(storageEstimate) {
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
            storageEstimate: storageEstimate,
            canvasDrawsPerSecond: canvasBenchmark()
          }
        };

        latestReport = report;
        document.getElementById('out').textContent = JSON.stringify(report, null, 2);
      });
    }

    function downloadReport() {
      if (!latestReport) return;
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

$report = New-Object PSObject
Add-ReportProperty -Report $report -Name "generatedAt" -Value ((Get-Date).ToString("o"))
Add-ReportProperty -Report $report -Name "auditScope" -Value "Local-only PixelSim capability audit. No network tests and no bypass attempts."
Add-ReportProperty -Report $report -Name "workingDirectory" -Value $root.Path

$psInfo = [pscustomobject]@{
    version = $PSVersionTable.PSVersion.ToString()
    edition = $PSVersionTable.PSEdition
    host = $Host.Name
    hostVersion = $Host.Version.ToString()
    executionPolicyProcess = (Get-ExecutionPolicy -Scope Process)
    executionPolicyCurrentUser = (Get-ExecutionPolicy -Scope CurrentUser)
    executionPolicyLocalMachine = (Get-ExecutionPolicy -Scope LocalMachine)
}
Add-ReportProperty -Report $report -Name "powershell" -Value $psInfo
Add-ReportProperty -Report $report -Name "windows" -Value (Get-OsInfoSafe)
Add-ReportProperty -Report $report -Name "dotNetFramework" -Value (Get-DotNetFrameworkInfo)

$commands = @(
    Test-CommandAvailable "powershell.exe"
    Test-CommandAvailable "pwsh.exe"
    Test-CommandAvailable "cscript.exe"
    Test-CommandAvailable "wscript.exe"
    Test-CommandAvailable "csc.exe"
    Test-CommandAvailable "MSBuild.exe"
    Test-CommandAvailable "dotnet.exe"
    Test-CommandAvailable "git.exe"
)
Add-ReportProperty -Report $report -Name "commands" -Value $commands

$wshLm = Get-RegistryValueSafe -Path "HKLM:\Software\Microsoft\Windows Script Host\Settings" -Name "Enabled"
$wshCu = Get-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows Script Host\Settings" -Name "Enabled"
$wshInfo = [pscustomobject]@{
    hklmEnabled = $wshLm
    hkcuEnabled = $wshCu
    note = "Null usually means no explicit registry block was found."
}
Add-ReportProperty -Report $report -Name "windowsScriptHost" -Value $wshInfo
Add-ReportProperty -Report $report -Name "officeMatches" -Value (Get-InstalledProgramMatches -Patterns @("Microsoft 365", "Microsoft Office", "Access", "Excel", "Visual Studio", "SQL Server", "SQLite", "ODBC"))
Add-ReportProperty -Report $report -Name "installedRuntimesAndTools" -Value (Get-RuntimeInventory)
Add-ReportProperty -Report $report -Name "browsers" -Value (Get-BrowserInfo)
Add-ReportProperty -Report $report -Name "fileSystem" -Value @((Test-FileWriteAccess -Directory $root.Path))

$browserAuditPath = Join-Path $outDir "pixelsim-browser-audit.html"
New-BrowserAuditHtml -Path $browserAuditPath
Add-ReportProperty -Report $report -Name "browserAuditHtml" -Value $browserAuditPath

$jsonPath = Join-Path $outDir ("pixelsim-windows-audit-" + $timestamp + ".json")
$txtPath = Join-Path $outDir ("pixelsim-windows-audit-" + $timestamp + ".txt")

try {
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding UTF8 -Force
} catch {
    $fallback = [pscustomobject]@{
        generatedAt = (Get-Date).ToString("o")
        jsonError = $_.Exception.Message
        note = "JSON export failed, but text report and browser audit were still created."
    }
    $fallback | ConvertTo-Json -Depth 3 | Out-File -FilePath $jsonPath -Encoding UTF8 -Force
}

$report | Format-List | Out-File -FilePath $txtPath -Encoding UTF8 -Force

Write-Host "PixelSim local capability audit complete."
Write-Host "JSON report: $jsonPath"
Write-Host "Text report: $txtPath"
Write-Host "Browser audit page: $browserAuditPath"
Write-Host "Open the browser audit page locally and click Run Browser Audit."
Write-Host "Do not post reports publicly without reviewing/redacting environment details."
