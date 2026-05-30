$ErrorActionPreference = "Continue"

$AuditVersion = "2026-05-30.2"

function Add-ReportProperty {
    param(
        [psobject]$Report,
        [string]$Name,
        $Value
    )

    $Report | Add-Member -MemberType NoteProperty -Name $Name -Value $Value -Force
}

function New-AuditResult {
    param(
        [string]$Name,
        [string]$Status,
        $Value = $null,
        [string]$Notes = ""
    )

    $item = New-Object PSObject
    Add-ReportProperty $item "name" $Name
    Add-ReportProperty $item "status" $Status
    Add-ReportProperty $item "value" $Value
    Add-ReportProperty $item "notes" $Notes
    return $item
}

function ConvertTo-JsonSafeObject {
    param($InputObject)

    if ($null -eq $InputObject) {
        return $null
    }

    if ($InputObject -is [string] -or $InputObject -is [int] -or $InputObject -is [long] -or $InputObject -is [double] -or $InputObject -is [decimal] -or $InputObject -is [bool]) {
        return $InputObject
    }

    if ($InputObject -is [datetime]) {
        return $InputObject.ToString("o")
    }

    if ($InputObject -is [System.Collections.IDictionary]) {
        $obj = New-Object PSObject
        foreach ($key in $InputObject.Keys) {
            Add-ReportProperty $obj ([string]$key) (ConvertTo-JsonSafeObject $InputObject[$key])
        }
        return $obj
    }

    if ($InputObject -is [System.Collections.IEnumerable] -and -not ($InputObject -is [string])) {
        $array = @()
        foreach ($item in $InputObject) {
            $array += ConvertTo-JsonSafeObject $item
        }
        return $array
    }

    if ($InputObject -is [psobject]) {
        $obj = New-Object PSObject
        foreach ($property in $InputObject.PSObject.Properties) {
            if ($property.Name -like "PS*") {
                continue
            }
            Add-ReportProperty $obj ([string]$property.Name) (ConvertTo-JsonSafeObject $property.Value)
        }
        return $obj
    }

    return [string]$InputObject
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

        $result = New-Object PSObject
        Add-ReportProperty $result "name" $Name
        Add-ReportProperty $result "status" "available"
        Add-ReportProperty $result "source" $command.Source
        Add-ReportProperty $result "commandType" ([string]$command.CommandType)
        Add-ReportProperty $result "version" $version
        return $result
    }

    $missing = New-Object PSObject
    Add-ReportProperty $missing "name" $Name
    Add-ReportProperty $missing "status" "not_found"
    Add-ReportProperty $missing "source" $null
    Add-ReportProperty $missing "commandType" $null
    Add-ReportProperty $missing "version" $null
    return $missing
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
    } catch {
        try {
            $os = Get-WmiObject Win32_OperatingSystem -ErrorAction Stop
        } catch {
            $obj = New-Object PSObject
            Add-ReportProperty $obj "error" $_.Exception.Message
            return $obj
        }
    }

    $obj = New-Object PSObject
    Add-ReportProperty $obj "caption" $os.Caption
    Add-ReportProperty $obj "version" $os.Version
    Add-ReportProperty $obj "architecture" $os.OSArchitecture
    return $obj
}

function Get-DotNetFrameworkInfo {
    $items = @()

    try {
        $basePath = "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP"
        $keys = Get-ChildItem $basePath -Recurse -ErrorAction Stop

        foreach ($key in $keys) {
            $props = Get-ItemProperty -Path $key.PSPath -ErrorAction SilentlyContinue

            if ($props.Version -or $props.Release) {
                $item = New-Object PSObject
                Add-ReportProperty $item "key" $key.PSChildName
                Add-ReportProperty $item "version" $props.Version
                Add-ReportProperty $item "release" $props.Release
                Add-ReportProperty $item "install" $props.Install
                Add-ReportProperty $item "servicePack" $props.SP
                $items += $item
            }
        }
    } catch {
        $item = New-Object PSObject
        Add-ReportProperty $item "error" $_.Exception.Message
        $items += $item
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
                        $item = New-Object PSObject
                        Add-ReportProperty $item "displayName" $program.DisplayName
                        Add-ReportProperty $item "displayVersion" $program.DisplayVersion
                        Add-ReportProperty $item "publisher" $program.Publisher
                        Add-ReportProperty $item "installDate" $program.InstallDate
                        Add-ReportProperty $item "registryPath" $path
                        $matches += $item
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
        @{ name = "Chrome"; path = (Join-PathIfBaseExists $programFiles "Google\Chrome\Application\chrome.exe") },
        @{ name = "Chrome"; path = (Join-PathIfBaseExists $programFilesX86 "Google\Chrome\Application\chrome.exe") },
        @{ name = "Chrome"; path = (Join-PathIfBaseExists $localAppData "Google\Chrome\Application\chrome.exe") },
        @{ name = "Edge"; path = (Join-PathIfBaseExists $programFiles "Microsoft\Edge\Application\msedge.exe") },
        @{ name = "Edge"; path = (Join-PathIfBaseExists $programFilesX86 "Microsoft\Edge\Application\msedge.exe") },
        @{ name = "Edge"; path = (Join-PathIfBaseExists $localAppData "Microsoft\Edge\Application\msedge.exe") },
        @{ name = "Firefox"; path = (Join-PathIfBaseExists $programFiles "Mozilla Firefox\firefox.exe") },
        @{ name = "Firefox"; path = (Join-PathIfBaseExists $programFilesX86 "Mozilla Firefox\firefox.exe") }
    )

    foreach ($candidate in $candidatePaths) {
        if ($candidate.path -and (Test-Path $candidate.path)) {
            $item = Get-Item $candidate.path -ErrorAction SilentlyContinue
            $browser = New-Object PSObject
            Add-ReportProperty $browser "name" $candidate.name
            Add-ReportProperty $browser "path" $candidate.path
            Add-ReportProperty $browser "version" $item.VersionInfo.ProductVersion
            $browsers += $browser
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
        $item = New-Object PSObject
        Add-ReportProperty $item "progId" $progId
        Add-ReportProperty $item "registered" (Test-Path ("Registry::HKEY_CLASSES_ROOT\" + $progId))
        $items += $item
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

                $item = New-Object PSObject
                Add-ReportProperty $item "driver" $property.Name
                Add-ReportProperty $item "value" $property.Value
                Add-ReportProperty $item "registryPath" $path
                $items += $item
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

    $inventory = New-Object PSObject
    Add-ReportProperty $inventory "commands" $commandResults
    Add-ReportProperty $inventory "installedProgramMatches" $programMatches
    Add-ReportProperty $inventory "comRegistrations" (Get-ComRegistrationInfo)
    Add-ReportProperty $inventory "odbcDrivers" (Get-OdbcDriverInfo)
    return $inventory
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
Add-ReportProperty $report "auditVersion" $AuditVersion
Add-ReportProperty $report "generatedAt" ((Get-Date).ToString("o"))
Add-ReportProperty $report "auditScope" "Local-only PixelSim capability audit. No network tests and no bypass attempts."
Add-ReportProperty $report "workingDirectory" $root.Path

$psInfo = New-Object PSObject
Add-ReportProperty $psInfo "version" $PSVersionTable.PSVersion.ToString()
Add-ReportProperty $psInfo "edition" $PSVersionTable.PSEdition
Add-ReportProperty $psInfo "host" $Host.Name
Add-ReportProperty $psInfo "hostVersion" $Host.Version.ToString()
Add-ReportProperty $psInfo "executionPolicyProcess" (Get-ExecutionPolicy -Scope Process)
Add-ReportProperty $psInfo "executionPolicyCurrentUser" (Get-ExecutionPolicy -Scope CurrentUser)
Add-ReportProperty $psInfo "executionPolicyLocalMachine" (Get-ExecutionPolicy -Scope LocalMachine)
Add-ReportProperty $report "powershell" $psInfo

Add-ReportProperty $report "windows" (Get-OsInfoSafe)
Add-ReportProperty $report "dotNetFramework" (Get-DotNetFrameworkInfo)

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
Add-ReportProperty $report "commands" $commands

$wshInfo = New-Object PSObject
Add-ReportProperty $wshInfo "hklmEnabled" (Get-RegistryValueSafe -Path "HKLM:\Software\Microsoft\Windows Script Host\Settings" -Name "Enabled")
Add-ReportProperty $wshInfo "hkcuEnabled" (Get-RegistryValueSafe -Path "HKCU:\Software\Microsoft\Windows Script Host\Settings" -Name "Enabled")
Add-ReportProperty $wshInfo "note" "Null usually means no explicit registry block was found."
Add-ReportProperty $report "windowsScriptHost" $wshInfo

Add-ReportProperty $report "officeMatches" (Get-InstalledProgramMatches -Patterns @("Microsoft 365", "Microsoft Office", "Access", "Excel", "Visual Studio", "SQL Server", "SQLite", "ODBC"))
Add-ReportProperty $report "installedRuntimesAndTools" (Get-RuntimeInventory)
Add-ReportProperty $report "browsers" (Get-BrowserInfo)
Add-ReportProperty $report "fileSystem" @((Test-FileWriteAccess -Directory $root.Path))

$browserAuditPath = Join-Path $outDir "pixelsim-browser-audit.html"
New-BrowserAuditHtml -Path $browserAuditPath
Add-ReportProperty $report "browserAuditHtml" $browserAuditPath

$jsonPath = Join-Path $outDir ("pixelsim-windows-audit-" + $timestamp + ".json")
$txtPath = Join-Path $outDir ("pixelsim-windows-audit-" + $timestamp + ".txt")

$safeReport = ConvertTo-JsonSafeObject $report
$safeReport | ConvertTo-Json -Depth 12 | Out-File -FilePath $jsonPath -Encoding UTF8 -Force
$safeReport | Format-List | Out-File -FilePath $txtPath -Encoding UTF8 -Force

Write-Host "PixelSim local capability audit complete."
Write-Host "Audit version: $AuditVersion"
Write-Host "JSON report: $jsonPath"
Write-Host "Text report: $txtPath"
Write-Host "Browser audit page: $browserAuditPath"
Write-Host "Open the browser audit page locally and click Run Browser Audit."
Write-Host "Do not post reports publicly without reviewing/redacting environment details."
