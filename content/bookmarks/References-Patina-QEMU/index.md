---
title: "Patina QEMU Cheat Sheet"
tags: ['References', 'Patina']
---

## Patina QEMU Host Toolchains

![Patina QEMU Host Toolchains](Patina-QEMU-Host-Toolchains.svg)

Some of the commands below may be redundant, but they are included for
completeness. On Linux, the toolchain tag must be specified explicitly for SBSA
builds; otherwise, the build will fail and need to be repeated.

## Windows

### Q35/MSVC

```bash
python -m venv q35
q35\Scripts\activate.bat
pip install --upgrade -r pip-requirements.txt
stuart_setup  -c Platforms/QemuQ35Pkg/PlatformBuild.py
stuart_update -c Platforms/QemuQ35Pkg/PlatformBuild.py
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=VS2022
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=VS2022 --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="E:\repos\patina-dxe-core-qemu\target\x86_64-unknown-uefi\debug\qemu_q35_dxe_core.efi"        # Build + QEMU
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=VS2022 --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="E:\repos\patina-dxe-core-qemu\target\x86_64-unknown-uefi\debug\qemu_q35_dxe_core.efi" PATH_TO_OS="C:\foo.qcow2"  # Build + QEMU + Boot to OS

python .\build_and_run_rust_binary.py --fw-patch-repo E:\repos\patina-fw-patcher --custom-efi E:\repos\patina-dxe-core-qemu\target\x86_64-unknown-uefi\debug\qemu_q35_dxe_core.efi -s 56789
python build_and_run_rust_binary.py -t VS2022 -p q35 -g 50002

```

## Linux

### Q35/GCC5

```bash
python -m venv q35
. q35\bin\activate
pip install --upgrade -r pip-requirements.txt
stuart_setup  -c Platforms/QemuQ35Pkg/PlatformBuild.py
stuart_update -c Platforms/QemuQ35Pkg/PlatformBuild.py
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=GCC5
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=GCC5 --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi"        # Build + QEMU
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=GCC5 --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi" PATH_TO_OS="/home/vineel/foo.qcow2"  # Build + QEMU + Boot to OS

python ./build_and_run_rust_binary.py --fw-patch-repo /home/vineel/repos/patina-fw-patcher --custom-efi /home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi -s 56789
python build_and_run_rust_binary.py -t GCC5 -p q35 -g 50002

```

### Q35/CLANGPDB

```bash
python -m venv q35
. q35\bin\activate
pip install --upgrade -r pip-requirements.txt
stuart_setup  -c Platforms/QemuQ35Pkg/PlatformBuild.py
stuart_update -c Platforms/QemuQ35Pkg/PlatformBuild.py
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGPDB
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGPDB --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi"        # Build + QEMU
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGPDB --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi" PATH_TO_OS="/home/vineel/foo.qcow2"  # Build + QEMU + Boot to OS

python ./build_and_run_rust_binary.py --fw-patch-repo /home/vineel/repos/patina-fw-patcher --custom-efi /home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi -s 56789
python build_and_run_rust_binary.py -t CLANGPDB -p q35 -g 50002

```

### Q35/CLANGDWARF

```bash
python -m venv q35
. q35\bin\activate
pip install --upgrade -r pip-requirements.txt
stuart_setup  -c Platforms/QemuQ35Pkg/PlatformBuild.py
stuart_update -c Platforms/QemuQ35Pkg/PlatformBuild.py
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGDWARF
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGDWARF --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi"        # Build + QEMU
stuart_build  -c Platforms/QemuQ35Pkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGDWARF --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi" PATH_TO_OS="/home/vineel/foo.qcow2"  # Build + QEMU + Boot to OS

python ./build_and_run_rust_binary.py --fw-patch-repo /home/vineel/repos/patina-fw-patcher --custom-efi /home/vineel/repos/patina-dxe-core-qemu/target/x86_64-unknown-uefi/debug/qemu_q35_dxe_core.efi -s 56789
python build_and_run_rust_binary.py -t CLANGDWARF -p q35 -g 50002

```

### SBSA/GCC5

```bash
python -m venv sbsa
. sbsa\bin\activate
pip install --upgrade -r pip-requirements.txt
stuart_setup  -c Platforms/QemuSbsaPkg/PlatformBuild.py
stuart_update -c Platforms/QemuSbsaPkg/PlatformBuild.py
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=GCC5
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=GCC5 --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi"        # Build + QEMU
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=GCC5 --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi" PATH_TO_OS="/home/vineel/foo.qcow2"  # Build + QEMU + Boot to OS
python ./build_and_run_rust_binary.py --fw-patch-repo /home/vineel/repos/patina-fw-patcher --custom-efi /home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi -s 56789
python build_and_run_rust_binary.py -t GCC5 -p sbsa -g 50002

```

### SBSA/CLANGPDB

```bash
python -m venv sbsa
. sbsa\bin\activate
pip install --upgrade -r pip-requirements.txt
stuart_setup  -c Platforms/QemuSbsaPkg/PlatformBuild.py
stuart_update -c Platforms/QemuSbsaPkg/PlatformBuild.py
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGPDB
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGPDB --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi"        # Build + QEMU
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGPDB --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi" PATH_TO_OS="/home/vineel/foo.qcow2"  # Build + QEMU + Boot to OS
python ./build_and_run_rust_binary.py --fw-patch-repo /home/vineel/repos/patina-fw-patcher --custom-efi /home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi -s 56789
python build_and_run_rust_binary.py -t CLANGPDB -p sbsa -g 50002

```

### SBSA/CLANGDWARF

```bash
python -m venv sbsa
. sbsa\bin\activate
pip install --upgrade -r pip-requirements.txt
stuart_setup  -c Platforms/QemuSbsaPkg/PlatformBuild.py
stuart_update -c Platforms/QemuSbsaPkg/PlatformBuild.py
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGDWARF
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGDWARF --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi"        # Build + QEMU
stuart_build  -c Platforms/QemuSbsaPkg/PlatformBuild.py TOOL_CHAIN_TAG=CLANGDWARF --flashrom BLD_*_DXE_CORE_BINARY_OVERRIDE="/home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi" PATH_TO_OS="/home/vineel/foo.qcow2"  # Build + QEMU + Boot to OS
python ./build_and_run_rust_binary.py --fw-patch-repo /home/vineel/repos/patina-fw-patcher --custom-efi /home/vineel/repos/patina-dxe-core-qemu/target/aarch64-unknown-uefi/debug/qemu_sbsa_dxe_core.efi -s 56789
python build_and_run_rust_binary.py -t CLANGDWARF -p sbsa -g 50002

```
