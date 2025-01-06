---
title: "Rust: From vs Into traits - Why implementing From<T> on U enables us to call T.into() to get to U"
date: 2025-01-06T06:17:07-07:00
tags: ['Rust']
---

## Rust: From vs Into traits - Why implementing `From<T>` on `U` enables us to call `T.into()` to get to `U`?
```rust
impl From<A> for B {
    fn from(a: A) -> B {
        // convert A to B
    }
}
```
Because we just implemented the new static `from()` method on `B`, if you have an instance of `A` you can get to `B`.
```rust
let a: A = ...;
let b: B = B::from(a); // like this
```
But generally we don't do this because it is not rustic enough.
Instead we do below
```rust
let b: B = a.into();
```
Q. Wait a second, where does this `.into()` come from? Because we didn't implement any `into()` function on my `A`?
A. Yes you did not implement it. But rust gave it for free. How?
Now this gets us in to blanket implementations in Rust. Which a fancy way of saying, implementing something on all types. In other words, doing something like below
```rust
impl<T> Trait1 for T {
    ....
}
```
Now in case of From what the rust standard library does is, below blanket implementation.
```rust
impl<T, U> Into<U> for T  // For all T, implement Into<U>
where
    U: From<T>,           // if U already has an implementation to convert to T
{
    fn into(self) -> U {
        U::from(self)
    }
}
```
It provides a blanket implementation of `Into<U>` trait on all `T` where `U` has an implementation of `From<T>`. In other words, This is, in a way saying the compiler has implemented the other half for us for free.
```rust
impl Into<B> for A {
    fn into(self) -> B {
        B::from(self)
    }
}
```
So for any given instance of `A` we can call `.into()` on it to convert in to the other type.
