---
title: "Rust: Deref vs AsRef Traits"
date: 2025-06-15 14:25:20
toc: true
tags: ["Rust"]
---

# Rust: Deref vs AsRef Traits

Rust is definitely not an easily language that can be picked up over a weekend,
It embodies some very new ideas.

In Rust, most of the conversions are not implicit for a good reason. There are
few implicit conversions(also called as coercions) but all of them are well
defined and primarily done by the compiler. For example below is the list.
```rust
    // Implicit coercion from &T to *const T
    let x = 10;
    let px: *const i32 = &x;

    // Implicit coercion from &mut T to *mut T
    let mut x = 10;
    let px: *mut i32 = &mut x;

    // Implicit coercion from array to slice
    let x = [0, 1, 2, 3];
    let slice_x: &[i32] = &x;

    // Implicit coercion from closure(not capture environment) to fn type
    let inc: fn(u32) -> u32 = |x| x + 1;

```
There is one coercion which can be dictated by the user for user defined types
by implementing `Deref` trait. Rust compiler tries to leverage the `Deref` trait
implementation when it encounters a dereferencing expression like `x.`, `*x` or
when a reference is expected to a different type. To understand it better
following code will illustrate how it all comes together.

```rust
use std::ops::Deref;

struct Book {
    name: String,
    price: u32,
}

// Implements a Deref to reference the underlying String
impl Deref for Book {
    type Target = String;

    fn deref(&self) -> &Self::Target {
        &self.name
    }
}

fn main() {
    let book = Book {
        name: "The Rust Programming".to_string(),
        price: 1000,
    };

    // . is a dereferencing expression in rust. Because Book implementing
    // `Deref` trait we can call all String methods using book.<stringmethod>
    println!("{}", book.len());

    // * is also a dereferencing expression in rust. Because Book implementing
    // `Deref` trait we can do *book to capture the name as String. But because
    // we cannot move it outside of the Book object I also kept a &front of
    // *book, to make it a borrow. Now name is effectively of type &String
    let name = &*book;

    // Trying to convert book to str below also triggers a Deref trait call.
    // Here &book will be coerced in to &str. compiler see if it can produce
    // &str from &book. So first it converts &book -> &String and then &String
    // -> &str because Deref is implemented on String. NOTE: just using `let
    // name = &book;` do not perform this conversion. In the last expression
    // name is still &Book type not &str.
    let name: &str = &book;

    // One of the best explanation of `Deref` trait is found in Effective Rust,
    // Item 8 page 55

    // The Deref/DerefMut traits are somewhat special, because the Rust compiler
    // has specific behavior when dealing with types that implement them. When
    // the compiler encounters a dereferencing expression (e.g., *x), it looks
    // for and uses an implementation of one of these traits, depending on
    // whether the dereference requires mutable access or not. This Deref
    // coercion allows various smart pointer types to behave like normal
    // references and is one of the few mechanisms that allow implicit type
    // conversion in Rust (as described in Item 5).
    //
    // As a technical aside, it’s worth understanding why the Deref traits can’t
    // be generic (Deref<Target>) for the destination type. If they were, then
    // it would be possible for some type ConfusedPtr to implement both
    // Deref<TypeA> and Deref<TypeB>, and that would leave the compiler unable
    // to deduce a single unique type for an expression like *x. So instead, the
    // destination type is encoded as the associated type named Target.
}
```

So here ends the implicit conversion behavior of types by the compiler. In
addition to this Rust provides a standard way to explicitly take a reference to
an underlying type(T) using the `AsRef` trait. Below code will walk you through
how `AsRef` can be used.

```rust
use std::ops::Deref;

struct Book {
    name: String,
    price: u32,
}

// Reference Book as &String
impl AsRef<String> for Book {
    fn as_ref(&self) -> &String {
        &self.name
    }
}

// Reference Book as &u32
impl AsRef<u32> for Book {
    fn as_ref(&self) -> &u32 {
        &self.price
    }
}

fn main() {
    let book = Book {
        name: "The Rust Programming".to_string(),
        price: 1000,
    };

    // Unlike, Deref Trait, AsRef trait is not implicit. Since this is not
    // implicit, based on the context the actual object can be converted/treated
    // as any other type T(provided the object has implemented AsRef<T>). Hence
    // T is on AsRef is a generic parameter where as Target in `Deref` is an
    // associated type.

    let name: &String = book.as_ref(); // call to as_ref() is mandatory
    let price: &u32 = book.as_ref();   // call to as_ref() is mandatory

    // One of the best explanation of `Deref` trait is found in Effective Rust,
    // Item 8 page 55

    // [...] These(AsRef/AsMut) traits don’t induce special behavior in the
    // compiler but allow conversions to a reference or mutable reference via an
    // explicit call to their trait functions (as_ref() and as_mut(),
    // respectively). The destination type for these conversions is encoded as a
    // type parameter (e.g., AsRef<Point>), which means that a single container
    // type can support multiple destinations.
    //
    // For example, the standard String type implements the Deref trait with
    // Target = str, meaning that an expression like &my_string can be coerced
    // to type &str. But it also implements the following:
    // - AsRef<[u8]>, allowing conversion to a byte slice &[u8]
    // - AsRef<OsStr>, allowing conversion to an OS string
    // - AsRef<Path>, allowing conversion to a filesystem path
    // - AsRef<str>, allowing conversion to a string slice &str (as with Deref)
}
```
