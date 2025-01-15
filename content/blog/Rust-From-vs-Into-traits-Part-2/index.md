---
title: "Rust: From and Into trait - Part 2"
date: 2025-01-14 23:33:54
tags: ['Rust']
---

## Rust: From and Into trait usage

Knowing how Rust's `From` and `Into` traits work is one part of the story, but
being able to use them efficiently is another. In this code sample, we will
explore how to define functions or methods that accept parameters which can be
converted from and into the expected types.

In this code, we have two functions, `increment()` and `increment2()`, and we
will see how they work with the `From` trait implemented for the `Number` type.

```rust
struct Number(u64);

fn increment(n: Number) -> Number {
    Number(n.0 + 1)
}

fn increment2<T>(n: T) -> Number
where
    T: Into<Number>,
{
    let number = n.into(); // Conversion is done by the method itself
    Number(number.0 + 1)
}

impl From<u64> for Number {
    fn from(value: u64) -> Self {
        Self(value)
    }
}

fn main() {
    // Just because we have implemented the From<u64> do not make the conversion
    // from 10 to Number implicit. Below line do not compile.
    let num = increment(10);
    // You have to explicitly request the conversion by calling .into()
    let num = increment(10.into());
    // Or even better, make the increment2 method accept any type that can be
    // converted into a Number. Since u64 can be converted into Number (as it
    // implements From<u64>), increment2() can call the .into() method itself to
    // perform the conversion. At the call site, we simply pass the u64 as a
    // parameter.
    let num = increment2(10);
}
```
