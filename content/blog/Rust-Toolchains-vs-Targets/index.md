---
title: "Rust: Toolchains vs Targets"
date: 2025-06-14 18:10:57
toc: true
tags: ["Rust"]
---

# Rust: Toolchains vs Targets

I've been using Rust for a year but never took the time to understand the
difference between a *toolchain* and a *target*. For most people, this
distinction isn't necessary—but I work on UEFI, which is not a typical
environment for Rust development.

I finally found time today to dig into this and understand the difference.

To get started, I make heavy use of Windows Sandbox to try things out. I
launched Windows Sandbox and downloaded `rustup-init.exe`. When the installer
runs, it detects the host operating system and architecture, and tries to
install the `stable-x86_64-pc-windows-msvc` toolchain. The first part,
`stable-`, refers to the *channel* (Rust has `stable`, `beta`, `nightly`, etc.),
and the rest of the toolchain name is self-explanatory. This installs the
relevant binaries to `~\.rustup\toolchains\stable-x86_64-pc-windows-msvc`

If we explore that directory, it becomes clearer:

```cmd
├── bin
│   ├── cargo-clippy.exe
│   ├── cargo-fmt.exe
│   ├── cargo.exe                               <-- Cargo
│   ├── clippy-driver.exe
│   ├── rust-windbg.cmd
│   ├── rustc.exe                               <-- The main compiler
│   ├── rustc_driver-a71ba2c5a3b674ac.dll
│   ├── rustc_driver-a71ba2c5a3b674ac.pdb
│   ├── rustc_main-72a9ff7b4aa9ab57.pdb
│   ├── rustdoc.exe
│   ├── rustfmt.exe
│   ├── std-d7a86f21fcd377c7.dll
│   └── std-d7a86f21fcd377c7.pdb
├── etc
│   └── bash_completion.d
├── lib
│   └── rustlib                                <-- host built .rlibs will go here
├── libexec
│   └── rust-analyzer-proc-macro-srv.exe
└── share
    ├── doc
    ├── man
    └── zsh
```
Inside `lib/rustlib`:

```cmd
lib/rustlib
├── components
├── etc
├── manifest-cargo-x86_64-pc-windows-msvc
├── manifest-clippy-preview-x86_64-pc-windows-msvc
├── manifest-rust-docs-x86_64-pc-windows-msvc
├── manifest-rust-src
├── manifest-rust-std-x86_64-pc-windows-msvc
├── manifest-rustc-x86_64-pc-windows-msvc
├── manifest-rustfmt-preview-x86_64-pc-windows-msvc
├── multirust-channel-manifest.toml
├── multirust-config.toml
├── rust-installer-version
└── x86_64-pc-windows-msvc                                     <-- The actual host target
    ├── bin                                                    <-- some more tools
    │   ├── gcc-ld
    │   │   ├── ld.lld.exe
    │   │   ├── ld64.lld.exe
    │   │   ├── lld-link.exe
    │   │   └── wasm-ld.exe
    │   └── rust-lld.exe
    └── lib
        ├── liballoc-c032859c81f4576b.rlib
        ├── libcfg_if-c91146a1b584a0a7.rlib
        ├── libcompiler_builtins-1f67c2a5a11a0b2e.rlib
        ├── libcore-dfdcb1635a201156.rlib                       <-- .rlib for lib core
        ├── libgetopts-1e0fa40794c35c34.rlib
        ├── libhashbrown-5e5ab7fb8d3e9a6b.rlib
        ├── libpanic_abort-c993e2b64d4e3e00.rlib
        ├── libpanic_unwind-97f6a0482881a03a.rlib
        ├── libproc_macro-71e312399c702b2a.rlib
        ├── libprofiler_builtins-9434e4a801ee8b5f.rlib
        ├── librustc_demangle-f8c4d6a2240f107f.rlib
        ├── librustc_std_workspace_alloc-7846558dfa99a578.rlib
        ├── librustc_std_workspace_core-628fee62996a202b.rlib
        ├── librustc_std_workspace_std-69744bf5a30d431b.rlib
        ├── libstd-d7a86f21fcd377c7.rlib
        ├── libstd_detect-803b4d5ce4fcd522.rlib                 <-- .rlib for lib std
        ├── libsysroot-5a1eb55846eb9586.rlib
        ├── libtest-afc8c579c7d286c1.rlib
        ├── libunicode_width-2cda9e7ff746aad4.rlib
        ├── libunwind-3adc2db30827f7fe.rlib
        ├── std-d7a86f21fcd377c7.dll
        ├── std-d7a86f21fcd377c7.dll.lib
        └── std-d7a86f21fcd377c7.pdb
```

So, when we run `rustup-init.exe`, it installs host-runnable `.exe` files *and*
host-buildable `.rlib` files for the default target (`x86_64-pc-windows-msvc`).
This is the default behavior.

---

Now, since I work on UEFI, I always run: `rustup target add x86_64-unknown-uefi`

This adds another directory under `lib/rustlib`:

```cmd
lib/rustlib
├── components
├── manifest-cargo-x86_64-pc-windows-msvc
├── manifest-clippy-preview-x86_64-pc-windows-msvc
├── manifest-rust-docs-x86_64-pc-windows-msvc
├── manifest-rust-src
├── manifest-rust-std-x86_64-pc-windows-msvc
├── manifest-rust-std-x86_64-unknown-uefi
├── manifest-rustc-x86_64-pc-windows-msvc
├── manifest-rustfmt-preview-x86_64-pc-windows-msvc
├── multirust-channel-manifest.toml
├── multirust-config.toml
├── rust-installer-version
├── x86_64-pc-windows-msvc
│   ├── bin
│   │   ├── gcc-ld
│   │   │   ├── ld.lld.exe
│   │   │   ├── ld64.lld.exe
│   │   │   ├── lld-link.exe
│   │   │   └── wasm-ld.exe
│   │   └── rust-lld.exe
│   └── lib
│       ├── liballoc-c032859c81f4576b.rlib
│       ├── libcfg_if-c91146a1b584a0a7.rlib
│       ├── libcompiler_builtins-1f67c2a5a11a0b2e.rlib
│       ├── libcore-dfdcb1635a201156.rlib
│       ├── libgetopts-1e0fa40794c35c34.rlib
│       ├── libhashbrown-5e5ab7fb8d3e9a6b.rlib
│       ├── libpanic_abort-c993e2b64d4e3e00.rlib
│       ├── libpanic_unwind-97f6a0482881a03a.rlib
│       ├── libproc_macro-71e312399c702b2a.rlib
│       ├── libprofiler_builtins-9434e4a801ee8b5f.rlib
│       ├── librustc_demangle-f8c4d6a2240f107f.rlib
│       ├── librustc_std_workspace_alloc-7846558dfa99a578.rlib
│       ├── librustc_std_workspace_core-628fee62996a202b.rlib
│       ├── librustc_std_workspace_std-69744bf5a30d431b.rlib
│       ├── libstd-d7a86f21fcd377c7.rlib
│       ├── libstd_detect-803b4d5ce4fcd522.rlib
│       ├── libsysroot-5a1eb55846eb9586.rlib
│       ├── libtest-afc8c579c7d286c1.rlib
│       ├── libunicode_width-2cda9e7ff746aad4.rlib
│       ├── libunwind-3adc2db30827f7fe.rlib
│       ├── std-d7a86f21fcd377c7.dll
│       ├── std-d7a86f21fcd377c7.dll.lib
│       └── std-d7a86f21fcd377c7.pdb
└── x86_64-unknown-uefi                                 <-- add this new target directory
    └── lib
        ├── libaddr2line-fd4fe626dc9eac3b.rlib
        ├── libadler-b088dd35194f5782.rlib
        ├── liballoc-731136177e8ef7d9.rlib
        ├── libcfg_if-b1cd801320ee1d7a.rlib
        ├── libcompiler_builtins-ecc0e4d1597f6bb7.rlib
        ├── libcore-11582b155e3fe91e.rlib               <-- .rlib for lib core for uefi target
        ├── libgetopts-e754ef5dc9c65167.rlib
        ├── libgimli-5155ae5a196cfc77.rlib
        ├── libhashbrown-ebe15d8d60c1bd03.rlib
        ├── liblibc-df19c578f2e6ae8c.rlib
        ├── libmemchr-47d769e3d4e585ba.rlib
        ├── libminiz_oxide-960b5008cfaadc66.rlib
        ├── libobject-a0fa73a7d99f0471.rlib
        ├── libpanic_abort-e8a2aa9cca3ad7d9.rlib
        ├── libpanic_unwind-995a04acd82bab2e.rlib
        ├── libproc_macro-acf8bc6ecbc27bb3.rlib
        ├── libr_efi-2db192ae3744fca7.rlib
        ├── libr_efi_alloc-b2d3781ce8cb4558.rlib
        ├── librustc_demangle-26a32575c71c2df9.rlib
        ├── librustc_std_workspace_alloc-174dc4ffd730494d.rlib
        ├── librustc_std_workspace_core-def1fd15e4f4ae8a.rlib
        ├── librustc_std_workspace_std-8fd8317bcb8f6078.rlib
        ├── libstd-7dc783e751f67fda.rlib                <-- .rlib for lib std for uefi target
        ├── libstd_detect-9dc0888bef2c4a9f.rlib
        ├── libsysroot-8380d2aeed2b1e54.rlib
        ├── libtest-b27a33215908762d.rlib
        ├── libunicode_width-7eb3dd319612710b.rlib
        └── libunwind-729047b47ec9b476.rlib
```

Note that this new target is still added *within the same toolchain* path:`~\.rustup\toolchains\stable-x86_64-pc-windows-msvc`


---

### Can I install other toolchains on Windows?

Before answering that, it's helpful to know what toolchains are available.

See:

* [Platform Support](https://doc.rust-lang.org/nightly/rustc/platform-support.html)
* [Rustup Components History](https://rust-lang.github.io/rustup-components-history/)

Rust classifies toolchains into tiers. Tier 1 platforms are officially supported and can run the Rust compiler natively. These include:

* `aarch64-apple-darwin`
* `aarch64-unknown-linux-gnu`
* `i686-pc-windows-msvc`
* `i686-unknown-linux-gnu`
* `x86_64-apple-darwin`
* `x86_64-pc-windows-gnu`
* `x86_64-pc-windows-msvc`
* `x86_64-unknown-linux-gnu`

Now, back to the question—can we install, say, `stable-aarch64-apple-darwin` on a Windows machine?

The short answer: **Yes**, you can install it `rustup toolchain install
stable-aarch64-apple-darwin`. But the long answer is: you **can't run** the
binaries in that toolchain (like `rustc`) on Windows because they're not PE
executables. `rustup` will even warn you:

```cmd
C:\>rustup toolchain install stable-aarch64-apple-darwin
error: DEPRECATED: future versions of rustup will require --force-non-host to install a non-host toolchain.
warning: toolchain 'stable-aarch64-apple-darwin' may not be able to run on this system.
warning: If you meant to build software to target that platform, perhaps try `rustup target add aarch64-apple-darwin` instead?
```

---

### Conclusion

To summarize: **a toolchain** refers to the `rustc` compiler that can run on the
host, whereas **a target** refers to the Rust libraries used for cross-compiling
to other platforms (including UEFI).

* **Toolchain**: The actual compiler (`rustc`, `cargo`, etc.) that runs on your host.
* **Target**: The platform you're compiling *for*—each target has its own `.rlib` files for `core`, `std`, etc.
* **Channels** (`stable`, `beta`, `nightly`) are versions of Rust, each of which can have toolchains and targets.

```
Channels (stable/beta/nightly)
└── Toolchains (x86_64-pc-windows-msvc / aarch64-apple-darwin)
    └── Targets (x86_64-pc-windows-msvc / x86_64-unknown-uefi / ...)
```

The available targets can be seen on the [rustup components history
page](https://rust-lang.github.io/rustup-components-history/). More information
about what `Tier 1`, `Tier 2`, `Tier 2.5`, and `Tier 3` mean is explained on the
[platform support
page](https://doc.rust-lang.org/nightly/rustc/platform-support.html).
