---
title: "Rust: Cargo: Profiles"
date: 2025-06-12 20:25:13
toc: true
tags: ["Rust"]
---

# Rust: Cargo: Profiles

Cargo has a concept called
[**profiles**](https://doc.rust-lang.org/cargo/reference/profiles.html), mainly
`dev` and `release` (in the .NET/Windows world, these are equivalent to `debug`
and `release`). Today, we're not going to talk about the specific details of
these profiles, but instead focus on their interaction between a binary crate
and a library crate.

At work, we have a library crate that contains the core implementation of our
product, and a binary crate that pulls in this library. To guarantee
correctness, we wanted the library crate to use certain predetermined compiler
switches. That led me to wonder how the `[profile.dev]` settings are actually
used. As part of that investigation, I discovered something surprising. Spoiler:
I didn’t find a solution to the original problem, but I did learn something
useful that’s worth sharing.

**TL;DR:** The `[profile.*]` section in a library crate is mostly ignored for
normal library crates(excluding other types of library crates). When Cargo
builds the binary crate, it compiles all dependent library crates using the
binary crate's profile settings.

---

## Example Demonstration

To verify this, I ran a small experiment.

I created a simple library crate that intentionally causes an integer overflow.
Normally, Rust panics on overflow in debug builds. You can disable this behavior
by setting `overflow-checks = false` in the profile section. That’s what I did
in the library crate. Meanwhile, the binary crate that depends on it has
`overflow-checks = true`.

Now let’s observe what happens when overflow occurs.

```rust
// mylib/src/lib.rs
pub fn add(inc: u8) -> u8 {
    let x: u8 = 250 + inc;  // This can trigger a runtime panic
    x
}
```

```toml
# mylib/Cargo.toml
[package]
name = "mylib"
version = "0.1.0"
edition = "2021"

[dependencies]

[profile.dev]
overflow-checks = false  # Disable overflow checks
```

The binary crate looks like this:

```rust
// myexe/src/main.rs
use mylib::add;

fn main() {
    let result = add(11); // 250 + 11 = 261, wraps to 5
    assert_eq!(result, 5); // Should not panic if mylib settings are used
}
```

```toml
# myexe/Cargo.toml
[package]
name = "myexe"
version = "0.1.0"
edition = "2021"

[dependencies]
mylib = { path = "../mylib" }

[profile.dev]
overflow-checks = true  # Enable overflow checks
```

Now let’s compile and run:

```cmd
D:\repos\testing\myexe>cargo run
   Compiling mylib v0.1.0 (D:\repos\testing\mylib)
   Compiling myexe v0.1.0 (D:\repos\testing\myexe)
    Finished dev [unoptimized + debuginfo] target(s) in 0.31s
     Running `target\debug\myexe.exe`
thread 'main' panicked at D:\repos\testing\mylib\src\lib.rs:2:17:
attempt to add with overflow
note: run with `RUST_BACKTRACE=1` to display a backtrace
error: process didn't exit successfully: `target\debug\myexe.exe` (exit code: 101)
```

Despite the library disabling overflow checks, the binary still panics. This
confirms that the library's `[profile.dev]` settings were not respected.

If we flip the scenario — enabling overflow checks in the library and disabling
them in the binary — the panic does **not** occur:

```cmd
D:\repos\testing\myexe>cargo run
    Finished dev [unoptimized + debuginfo] target(s) in 0.01s
     Running `target\debug\myexe.exe`
```

---

## Digging Deeper with `--verbose`

To understand what’s happening under the hood, we can inspect the compiler flags using `cargo build --verbose`.

```cmd
cargo clean
cargo build --verbose
```

Here’s the relevant output:

```text
Compiling mylib v0.1.0 (D:\repos\testing\mylib)
Running `...rustc.exe ... -C overflow-checks=off ...`

Compiling myexe v0.1.0 (D:\repos\testing\myexe)
Running `...rustc.exe ... -C overflow-checks=off ...`
```

Both `mylib` and `myexe` are compiled with `-C overflow-checks=off`, even though
the binary crate’s Cargo.toml explicitly had `overflow-checks=true`. This shows
that the binary crate's profile settings **are applied across the board**, even
to dependent libraries.

---

## What About Workspaces?

The behavior doesn't change even if the library crate is inside the same
workspace. The profile settings declared at the workspace level mainly apply to
test targets, examples, benchmarks, and binaries. Regular libraries will still
inherit the settings from the crate that depends on them.

---

## Conclusion

Library-specific profile settings are mostly **ignored** during normal
compilation. The consuming binary crate's profile dictates how all dependencies
are compiled. If you need strict guarantees for how a library is compiled (e.g.,
turning on or off overflow checks), you'll have to enforce those via build
scripts, CI, or external tooling — not just Cargo profiles.

Let me know if you've found any workarounds, because I’m still hunting for one!

