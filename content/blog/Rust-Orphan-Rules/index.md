---
title: "Rust: Orphan Rules"
date: 2025-01-26 23:01:20
toc: true
tags: ['Rust']
---

# Rust: Orphan Rules

```rust
use std::fmt;
use std::ops;

struct Foo;
trait FooTrait {}

// The orphan rule prevents implementing a trait for a type unless:
// 1. You own the trait, or
// 2. You own the type, or
// 3. Both the trait and the type are local to your crate.

//------------------------------------------------------------------------------
// Example 1: Violates all the rules
// error[E0117]: only traits defined in the current crate can be implemented for types defined outside of the crate
//   --> src/main.rs:14:1
//    |
// 14 | impl fmt::Display for Vec<u32> {
//    | ^^^^^^^^^^^^^^^^^^^^^^--------
//    | |                     |
//    | |                     `Vec` is not defined in the current crate
//    | impl doesn't use only types from inside the current crate
//    |
//    = note: define and implement a trait or new type instead
impl fmt::Display for Vec<u32> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

//------------------------------------------------------------------------------
// Example 2: Satisfies Rule 1 - So no violation
impl FooTrait for Vec<u32> {}

//------------------------------------------------------------------------------
// Example 3: Violates all the rules. Because Add, u32 and Vec are all not
// implemented locally
// error[E0117]: only traits defined in the current crate can be implemented for types defined outside of the crate
//   --> src/main.rs:25:1
//    |
// 25 | impl ops::Add<u32> for Vec<u32> {
//    | ^^^^^-------------^^^^^--------
//    | |    |                 |
//    | |    |                 `Vec` is not defined in the current crate
//    | |    `u32` is not defined in the current crate
//    | impl doesn't use only types from inside the current crate
//    |
//    = note: define and implement a trait or new type instead
impl ops::Add<u32> for Vec<u32> {
    type Output = u32;
    fn add(self, rhs: u32) -> Self::Output {
        todo!()
    }
}

//------------------------------------------------------------------------------
// Example 4: Satisfies Rule 1 - So no violation - Add<Foo> makes the resulting
// trait(Add<Foo>) local.
impl ops::Add<Foo> for Vec<u32> {
    type Output = Foo;
    fn add(self, rhs: Foo) -> Self::Output {
        todo!()
    }
}
```