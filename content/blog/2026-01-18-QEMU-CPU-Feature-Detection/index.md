---
title: "QEMU CPU Feature Detection"
date: 2026-01-18 10:45:00
toc: false
tags: ["General"]
---

QEMU is an amazing tool for developing embedded software. Many times, we need to
determine the feature set supported by a chosen CPU. Below is a quick and
practical way to do that.

For example, on the x86 QEMU system emulator, we can first list the available
x64 CPU models using the following command:

```cmd
D:\> qemu-system-x86_64.exe -cpu help
Available CPUs:
  486                   (alias configured by machine type)
  486-v1
  Broadwell             (alias configured by machine type)
  Broadwell-IBRS        (alias of Broadwell-v3)
  Broadwell-noTSX       (alias of Broadwell-v2)
  Broadwell-noTSX-IBRS  (alias of Broadwell-v4)
  Broadwell-v1          Intel Core Processor (Broadwell)
...
  EPYC-v1               AMD EPYC Processor
  EPYC-v2               AMD EPYC Processor (with IBPB)
  EPYC-v3               AMD EPYC Processor
  EPYC-v4               AMD EPYC-v4 Processor
  EPYC-v5               AMD EPYC-v5 Processor
  GraniteRapids         (alias configured by machine type)
  GraniteRapids-v1      Intel Xeon Processor (GraniteRapids)
  GraniteRapids-v2      Intel Xeon Processor (GraniteRapids)
  GraniteRapids-v3      Intel Xeon Processor (GraniteRapids) [with gnr-sp cache model and 0x1f leaf]
...
  Skylake-Client        (alias configured by machine type)
  Skylake-Client-IBRS   (alias of Skylake-Client-v2)
...
  kvm32                 (alias configured by machine type)
  kvm32-v1              Common 32-bit KVM processor
  kvm64                 (alias configured by machine type)
  kvm64-v1              Common KVM processor
  pentium               (alias configured by machine type)
  pentium-v1
  pentium2              (alias configured by machine type)
  pentium2-v1
  pentium3              (alias configured by machine type)
  pentium3-v1
  phenom                (alias configured by machine type)
  phenom-v1             AMD Phenom(tm) 9550 Quad-Core Processor
  qemu32                (alias configured by machine type)
  qemu32-v1             QEMU Virtual CPU version 2.5+
  qemu64                (alias configured by machine type)
  qemu64-v1             QEMU Virtual CPU version 2.5+
  base                  base CPU model type with no features enabled
  host                  processor with all supported host features
  max                   Enables all features supported by the accelerator on the current host
````

Next, the script below can be used to determine the CPU features supported by a
chosen CPU model.

```powershell
# Start QEMU with QMP in the background
Start-Process qemu-system-x86_64.exe `
    -ArgumentList "-S -qmp tcp:127.0.0.1:4444,server,nowait" `
    -NoNewWindow

# Wait for QEMU to start
Start-Sleep -Seconds 5

# Connect to the QMP socket
$client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 4444)
$stream = $client.GetStream()
$reader = New-Object System.IO.StreamReader($stream)
$writer = New-Object System.IO.StreamWriter($stream)

# Read the QMP greeting
$reader.ReadLine()

# Enable QMP capabilities
$writer.WriteLine('{"execute": "qmp_capabilities"}')
$writer.Flush()
$reader.ReadLine()

# Query the features supported by a given CPU (qemu64 in this example)
$writer.WriteLine('{"execute": "query-cpu-model-expansion", "arguments": {"type": "full", "model": {"name": "qemu64"}}}')
$writer.Flush()
$reader.ReadLine()

$client.Close()
```

Below is the feature set supported by the `qemu64` CPU model. These features can
be enabled or disabled using `+feature` and `-feature` in the QEMU command line.

```json
{
    "return": {
        "model": {
            "name": "qemu64",
            "props": {
                "3dnow": false,
                "3dnowext": false,
                "3dnowprefetch": false,
                "abm": false,
                "ace2-en": false,
                "ace2": false,
                "acpi": false,
                ...
                "xfd": false,
                "xgetbv1": false,
                "xlevel": 2147483658,
                "xlevel2": 0,
                "xop": false,
                "xsave": false,
                "xsavec": false,
                "xsaveerptr": false,
                "xsaveopt": false,
                "xsaves": false,
                "xstore-en": false,
                "xstore": false,
                "xtpr": false,
                "zero-fcs-fds": false
            }
        }
    }
}
```
