---
title: "Rust: Self Referential Structures"
date: 2025-06-18 23:22:57
toc: true
tags: ["Rust"]
---

# Rust: Self-Referential Structures

Today, I learned something very interesting about Rust references—specifically,
fields of a structure referring to other fields in the same structure.
Apparently, this is not possible. At first, it didn’t make much sense to me
because I assumed all fields are owned by the struct, so what’s the problem if
one field holds a reference to another?

However, when I tried to construct such a structure, things became clearer.
Let’s look at the code sample below:

```rust
struct BadOne<'a> {
    age: u32,
    reference: &'a u32, // This tries to hold a reference to the value of `age`.
}

impl<'a> BadOne<'a> {
    fn new() -> BadOne<'a> {
        let age = 10;
        let reference = &age;
        BadOne { age, reference }
    }
}
```

VSCode’s Rust Analyzer immediately reported the following error at the line
`BadOne { age, reference }`:

```
cannot return value referencing local variable `age`
returns a value referencing data owned by the current function
main.rs(10, 35): `age` is borrowed here
```

Unfortunately, the error message is not very comprehensible. When working with
lifetimes and references, it’s better to use `cargo check` instead of relying
solely on Rust Analyzer. Below is the much clearer output from `cargo check`:

```
error[E0515]: cannot return value referencing local variable `age`
  --> src/main.rs:11:9
   |
10 |         let reference = &age;
   |                         ---- `age` is borrowed here
11 |         BadOne { age, reference }
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^ returns a value referencing data owned by the current function
```

After pondering this for a while, it became evident that:

1. `age` is owned by the function `new()`.
2. We take an immutable reference to `age`.
3. Then we try to move `age` into the `BadOne` struct while still holding a
   reference to it.

**In short, there’s no way to transfer ownership of `age` to the new `BadOne`
instance while simultaneously storing a reference to it in another field of the
same struct.** In other words, we cannot create structs where one field refers
to another field of the same instance.

Let’s look at a slightly more advanced example that might make it seem like we
can overcome this limitation:

```rust
struct BadTwo<'a> {
    age: u32,
    reference: Vec<&'a u32>,
}
impl<'a> BadTwo<'a> {
    fn new() -> BadTwo<'a> {
        let age = 10;
        BadTwo { age, reference: vec![] }
    }

    fn take_ref(&mut self) {
        let age_ref = &self.age;
        self.reference.push(age_ref);
    }
}
```

In this example, we try to hide the fact that a reference to `age` is taken—not
during construction—but later, in the `take_ref()` method. However, trying to
compile this will still result in an error:

```
error: lifetime may not live long enough
  --> src/main.rs:14:9
   |
6  | impl<'a> BadTwo<'a> {
   |      -- lifetime `'a` defined here
...
12 |     fn take_ref(&mut self) {
   |                 - let's call the lifetime of this reference `'1`
13 |         let age_ref = &self.age;
14 |         self.reference.push(age_ref);
   |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ argument requires that `'1` must outlive `'a`
```

Once again, the error messages are informative but still require some
interpretation. When we enter the `take_ref()` function, `&mut self` has a new
short-lived lifetime, let’s say `'1`, which is typically shorter than `'a` (the
struct’s lifetime). The compiler is saying: “You’re creating a reference
(`&self.age`) that lives only as long as the function call, but you’re trying to
store it in a vector that must live as long as the struct (`'a`)." This is not
allowed.

In other words, no matter how we try, it is (almost) impossible to create a
reference to a field within the same struct.

I say “almost” because there’s one more slightly more advanced example. Spoiler:
it still doesn’t break Rust’s borrow checker guarantees.

```rust
struct BadTwo<'a> {
    age: u32,
    reference: Vec<&'a u32>,
}
impl<'a> BadTwo<'a> {
    fn new() -> BadTwo<'a> {
        let age = 10;
        BadTwo { age, reference: vec![] }
    }

    fn take_ref(&'a mut self) { // <--- Notice the `'a` on `&'a mut self`
        let age_ref = &self.age;
        self.reference.push(age_ref);
    }

    fn print(&self) {
        println!("{}", self.age);
    }
}

pub fn main() {
    let mut b2 = BadTwo::new();
    {
        b2.take_ref();
    }
    b2.print();
}
```

By annotating `&mut self` with `'a`, the compiler is satisfied. But what exactly
is going on?

By adding `'a`, we’re telling the compiler: "The mutable reference to self (`&'a
mut self`) must live as long as `'a`, the struct’s lifetime." As a result, this
mutable borrow now lives far beyond the duration of the function—it is tied to
the entire lifetime of the struct. That effectively *locks* the struct into a
state where the mutable borrow never ends, which makes the struct unusable
afterward.

So in the `main()` function, once we call `b2.take_ref()`, we cannot call
`b2.print()` anymore:

```
error[E0502]: cannot borrow `b2` as immutable because it is also borrowed as mutable
  --> src/main.rs:28:5
   |
26 |         b2.take_ref();
   |         -- mutable borrow occurs here
27 |     }
28 |     b2.print();
   |     ^^
   |     |
   |     immutable borrow occurs here
   |     mutable borrow later used here
```

---

In conclusion, Rust does **not** allow self-referential structures—whether
linked lists, binary trees, or even simpler cases **where one field refers to
another field of the same instance**.
