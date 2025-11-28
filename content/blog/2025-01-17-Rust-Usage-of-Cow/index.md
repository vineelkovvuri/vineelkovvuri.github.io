---
title: "Rust: Usage of Cow(Clone on Write)"
date: 2025-01-17 14:03:43
toc: true
tags: ['Rust']
---

# Rust: Usage of Cow(Clone on Write)

Today, After reading following blog
post(https://hermanradtke.com/2015/05/29/creating-a-rust-function-that-returns-string-or-str.html/),
I finally understood the need for Cow in Rust. Below is my code sample with
relevant comments.

```rust
use std::borrow::Cow;

#[derive(Clone, Debug)]
struct Book {
    name: String,
    price: u32,
}

fn update_book_price<'a>(book: &'a Book, price: u32) -> Cow<'a, Book> {
    // If the price matches, there's no need to create a new book.
    if book.price == price {
        return Cow::Borrowed(book);
    }

    // If the price does not match, create a new book (updating the title to
    // make it easy to distinguish the objects).
    Cow::Owned(Book {
        name: format!("{}-updated", book.name.clone()),
        price,
    })
}

fn main() {
    let book = Book {
        name: "Rust programming".to_string(),
        price: 100,
    };

    // CASE 1: Since there is no change in price, we get a `Cow` wrapped
    // borrowed version of the existing book.
    let updated_book: Cow<'_, Book> = update_book_price(&book, 100);
    // The returned `Cow` object is always immutable. The following line will
    // not work even though we can access the object fields via the `Deref`
    // trait:
    // updated_book.price = 200;
    println!("{:?}", updated_book); // Book { name: "Rust programming", price: 100 }

    // If we ever need to own the above object (e.g., for modifying it), we can
    // call `into_owned()` on `Cow` to get a cloned version of the book.
    // This cloned object will be mutable.
    let mut updated_book: Book = updated_book.into_owned();
    updated_book.price = 200;
    println!("{:?}", updated_book); // Book { name: "Rust programming", price: 200 }

    // ========================================

    // CASE 2: Since the price has changed, we get a `Cow` wrapped owned version
    // of the book. This owned version is the object we created in the
    // `update_book_price()` method.
    let updated_book: Cow<'_, Book> = update_book_price(&book, 300);
    // Again, the returned object is immutable, so the following line will not
    // work:
    // updated_book.price = 400;
    println!("{:?}", updated_book); // Book { name: "Rust programming-updated", price: 300 }

    // If we ever need to own this object (e.g., for modifying it), we can call
    // `into_owned()` on `Cow` to get the owned object. Importantly, in this
    // case, `Cow` simply returns the already owned object instead of cloning
    // it. The returned object will be mutable.
    let mut updated_book: Book = updated_book.into_owned();
    updated_book.price = 400;
    println!("{:?}", updated_book); // Book { name: "Rust programming-updated", price: 400 }

    // Takeaway 1: `Cow` allows us to defer cloning a borrowed object until it
    // is required for modification (ownership). When ownership is needed, `Cow`
    // provides the following behavior via `into_owned()`:
    // 1. `Cow` either calls `clone()` on the borrowed object.
    // 2. Or, `Cow` directly returns the underlying owned object.

    // Takeaway 2: With the help of `Cow` (Clone-On-Write), we can design
    // methods optimized to return the borrowed object wrapped inside `Cow`.
    // This approach helps delay the cloning process. Specifically, the
    // `update_book_price()` method returns either a borrowed `Cow` or an owned
    // `Cow`, catering to both cases. However, this flexibility is not always
    // necessary. Since every type `T` that `Cow` wraps requires
    // `#[derive(Clone)]`, `Cow` can decide when to clone the borrowed object
    // and when to return the underlying owned object directly, depending on the
    // need when `into_owned()` is called.

    // Reference: https://hermanradtke.com/2015/05/29/creating-a-rust-function-that-returns-string-or-str.html/
}
```