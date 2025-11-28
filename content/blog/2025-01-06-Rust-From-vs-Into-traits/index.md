---
title: "Rust: From vs Into traits"
date: 2025-01-06T06:17:07-07:00
toc: true
tags: ['Rust']
---

# Why does implementing `From<T>` on `U` enable calling `T.into()` to get `U`?

```rust
impl From<A> for B {
    fn from(a: A) -> B {
        // Convert A to B
    }
}
```

By implementing the `from()` static method on `B`, you can convert an instance of `A` to `B`:

```rust
let a: A = ...;
let b: B = B::from(a); // This works
```

However, in practice, we often avoid using this directly, as it isn't considered idiomatic Rust. Instead, we do the following:

```rust
let b: B = a.into();
```

## Q: Wait a second, where does this `.into()` come from? We didn't implement any `into()` function on `A`.

A: Correct, you didn't implement it yourself. Rust provides it automatically. How?

This involves **blanket implementations** in Rust, which is a way of implementing something for all types. Essentially, this is done using a construct like:

```rust
impl<T> Trait1 for T {
    ...
}
```

In the case of the `From` trait, the Rust standard library provides the following blanket implementation:

```rust
impl<T, U> Into<U> for T  // For all types T, implement Into<U>
where
    U: From<T>,           // If U already implements From<T>
{
    fn into(self) -> U {
        U::from(self)
    }
}
```

This means that the standard library provides a blanket implementation of the `Into<U>` trait for all `T` where `U` already has an implementation of `From<T>`. In simpler terms, the compiler automatically implements the counterpart `Into` for you.

Effectively, it is as if the compiler wrote this for you:

```rust
impl Into<B> for A {
    fn into(self) -> B {
        B::from(self)
    }
}
```

Thus, for any instance of `A`, you can call `.into()` to convert it to `B`.
