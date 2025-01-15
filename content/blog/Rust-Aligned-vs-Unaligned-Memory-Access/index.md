---
title: "Rust: Aligned vs Unaligned Memory Access"
date: 2025-01-14 19:05:52
tags: ['Rust']
---

## Rust: Rust-Aligned-vs-Unaligned-Memory-Access

Unlike C, Rust enforces some rules when trying to access memory. Mainly it
requires consideration to alignment of the data that we are trying to read.
Below code will illustrate the details.

```rust
#![allow(unused)]

fn main() {
    let data: [u8; 10] = [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xAA];

    // Alignment Tidbit: Alignment depends on the data type we are using. u8 has
    // an alignment of 1, so u8 values can be accessed at any address. In
    // contrast, u16 has an alignment of 2, so they can only be accessed at
    // addresses aligned by 2.

    // Case 1: unaligned u16 access from raw pointer. This will panic
    let data_ptr = data.as_ptr();
    unsafe {
        let ptr = data_ptr.add(1) as *const u16; // interpreting the underlying address as u16
        let x = *ptr; // This dereference will panic: misaligned pointer dereference: address must be a multiple of 0x2 but is 0x7ffdec94efcd
        println!("x: {x}");
    }

    // Slices: Accessing elements through a slice will have the same alignment
    // as its underlying data. So this prevent unaligned access. Also we cannot
    // interpret a u8 array as a u16 slice unlike raw pointer access
    // Case 2: aligned u8 access from slice
    let slice = &data[1..2];
    let value = slice[0]; // This works
    println!("slice: {value}");

    // Case 3: unaligned u16 access from a slice using unsafe. This will panic
    unsafe {
        let data_ptr: *const u8 = data.as_ptr();
        let unaligned_data_ptr: *const u8 = data_ptr.add(1);
         // slice::from_raw_parts will panic as unaligned *const u8 is being
         // interpreted as *const u16 .
        let unaligned_slice =
            unsafe { core::slice::from_raw_parts(data_ptr as *const u16, 2 as usize) };
        let value = slice[0];
        println!("unaligned_slice: {value}");
    }

    // Takeaway 1: The takeaway here is that when interpreting *const u8 as u16
    // or u32, we cannot simply cast *const u8 as *const u16 and dereference
    // that location and except u16. Instead, we can only access the *const u8
    // as two u8 values and then use bit math to combine those bytes to form a
    // u16.

    // Takeaway 2: When creating an array of u8(with odd number of elements),
    // the address at which the array starts in memory need not be a power of 2.
    // Because u8's have an alignment of 1. If that is the case, and trying to
    // interpret data + 1 address location as u16 will not trigger a panic. Be
    // aware of that!
    let data: [u8; 5] = [0x11, 0x22, 0x33, 0x44, 0x55];
    let data_ptr = data.as_ptr();
    unsafe {
        let ptr = data_ptr.add(1) as *const u16; // interpreting the underlying address as u16
        let x = *ptr; // This dereference will NOT trigger a panic!
        println!("{x}");
    }
}
```
