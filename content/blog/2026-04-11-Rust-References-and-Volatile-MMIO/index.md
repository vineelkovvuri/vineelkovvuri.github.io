---
title: "Rust: Why References Are Unsound for Volatile MMIO Access"
date: 2026-04-11 10:00:00
toc: true
tags: ["Rust"]
---

## Rust: Why References Are Unsound for Volatile MMIO Access

Rust references (`&T` / `&mut T`) carry a powerful guarantee: they are always valid and dereferenceable. The compiler and LLVM lean on this guarantee to generate faster code, sometimes reading through a reference *before* your code actually asks for it. For normal memory that's a free optimization. For Memory-Mapped I/O (MMIO) registers, it's a disaster - every read can trigger a hardware side-effect.

### How LLVM Exploits Dereferenceable References

Consider a simple function:

```rust
fn foo(x: &u32) -> u32 {
    if some_condition() {
        *x
    } else {
        0
    }
}
```

Because `x` is a Rust reference, the compiler knows it is non-null and always points to valid, readable memory. LLVM is free to **speculatively load** the value early - before the branch:

```text
tmp = *x            // speculative read - always safe for normal memory
if some_condition()
    return tmp
else
    return 0
```

This is perfectly sound for regular memory: reading a `u32` from a valid address twice (or early) has no observable side-effects. The value is the same whether you read it now or later.

### The MMIO Problem

MMIO registers are mapped into the processor's address space, but they are *not* regular memory. Reading an MMIO register can:

- Clear an interrupt status bit
- Advance a hardware FIFO
- Start or stop a DMA transfer
- Return a different value each time (e.g., a timestamp counter)

A speculative read that LLVM inserts *on its own* could silently corrupt hardware state, and you'd never see it in your source code.

### Volatile Reads Through References Are Still Unsound

You might think: "I'll use `ptr::read_volatile()` - that tells the compiler not to optimize the read away." And you'd be half-right. `read_volatile` does prevent the *specific* read from being reordered or eliminated. But the reference *itself* still carries the `dereferenceable` attribute in LLVM IR.

```rust
fn read_from_ref(mmio_addr: &u64) -> u64 {
    unsafe {
        let mmio_addr_ptr = mmio_addr as *const u64;
        ptr::read_volatile(mmio_addr_ptr)
    }
}
```

The issue is that even before your `read_volatile` executes, LLVM might have already inserted its own load from `mmio_addr` because the `&u64` reference told it "this memory is always safe to read." Your hand-written volatile read is correct, but the *compiler-inserted* speculative read is uncontrolled and non-volatile.

**In summary:** any function that accepts an MMIO address as `&T` is unsound, regardless of whether you use `read_volatile` inside. The unsoundness comes from the reference itself, not from how you use it.

### The Sound Approach: Raw Pointers

Raw pointers (`*const T` / `*mut T`) carry **none** of the `dereferenceable` guarantees that references do. LLVM will not speculatively load through a raw pointer because it makes no assumptions about its validity.

```rust
fn read_mmio(base: *const u64) -> u64 {
    unsafe { base.read_volatile() }
}
```

Or if you start from a numeric address:

```rust
let base: usize = 0xFED0_0000;
let reg = unsafe { (base as *const u64).read_volatile() };
```

Here, there is no reference in sight. The raw pointer is only dereferenced inside the `read_volatile` call, which emits a volatile load in the LLVM IR - no speculative reads are possible.

### Quick Reference

| Approach                                       | Sound for MMIO? | Why                                                                                              |
|------------------------------------------------|-----------------|--------------------------------------------------------------------------------------------------|
| `&T` → dereference                             | **No**          | LLVM may speculatively read through `&T`                                                         |
| `&T` → cast to `*const T` → `read_volatile`    | **No**          | The `&T` still carries `dereferenceable`; speculative reads may happen before your volatile read |
| `*const T` → `read_volatile`                   | **Yes**         | No `dereferenceable` attribute, no speculative reads                                             |
| `usize` → cast to `*const T` → `read_volatile` | **Yes**         | Same as above - no reference involved                                                            |

### Takeaway

The Rust rule is straightforward: **never let an MMIO address live inside a reference.** Keep it as a raw pointer (or a plain `usize`) from the moment you obtain it. The `dereferenceable` contract that makes references so powerful for normal code is exactly what makes them dangerous for hardware I/O.
