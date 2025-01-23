---
title: "Rust: Function Lifetime Ellison Rules"
date: 2025-01-23 00:34:26
tags: ['Rust']
---

## Rust: Function Lifetime Ellison Rules

Lifetime elision in functions
https://doc.rust-lang.org/reference/lifetime-elision.html#lifetime-elision-in-functions


```rust
// Below is how the rust compiler assigns the lifetime parameters implicitly.
// Any function parameters(both inputs and outputs) which fall beyond these
// rules will require explicit lifetime annotations by the programmer.
//
// Life Time Ellison Rules:
// 1. Each elided lifetime in the parameters becomes a distinct lifetime
//    parameter.
//      fn foo(x: &i32); => fn foo<'a>(x: &'a i32);
//      fn foo(x: &i32, y: &i32); => fn foo<'a, 'b>(x: &'a i32, y: &'b i32);
// 2. If there is exactly one lifetime used in the parameters (elided or not),
//    that lifetime is assigned to all elided output lifetimes.
//      fn foo(x: &i32) -> &i32; => fn foo<'a>(x: &'a i32) -> &'a i32
//      fn f(x: &I) -> (&I, &I) => fn f<'a>(x: &'a I) -> (&'a I, &'a I)
// 3. If the receiver has type &Self or &mut Self, then the lifetime of that
//    reference to Self is assigned to all elided output lifetime parameters.
//      fn f(&self, y: &I, z: &I) -> &I => fn f(&'a self, y: &'b I, z: &'c I) -> &'a I

// ---------------------------------------------------------------------------
// Case 1: Returning a local variable as a reference
fn repro1<'a>() -> &'a str {
    let x: String = "asfdasdf".to_string();
    x.as_str() // returns a value referencing data owned by the current function
}

// ---------------------------------------------------------------------------
// Case 2: Returning a &str but via using objects
struct Phone {
    pub name: String,
}

impl Phone {
    // Here the return type's lifetime is determined by the &self parameter(Rule
    // 3).
    pub fn get_name(&self) -> &str {
        self.name.as_str()
    }
}

fn repro2<'a>() -> &'a str {
    let phone = Phone {
        name: "iPhone 15 Pro Max".to_string(),
    };

    //     --> src/main.rs:34:5
    //     |
    //  34 |     phone.get_name()
    //     |     -----^^^^^^^^^^^
    //     |     |
    //     |     returns a value referencing data owned by the current function
    //     |     `phone` is borrowed here

    // The reason why we are getting above error is, In this function, we are
    // trying to return the name with a different lifetime('a) which can live
    // longer than the phone object itself(which is tied to the local variable)
    phone.get_name()
}

// ---------------------------------------------------------------------------
// Case 3: Accidentally returning a local object while returning an error type
pub type MyResult<'a, T> = Result<T, Error<'a>>;

#[derive(Debug, PartialEq)]
pub enum Error<'a> {
    NotFound(&'a str),
}

pub struct Book<'a> {
    pub name: &'a str,
}

impl<'a> Book<'a> {
    // pub(crate) fn get_page_fixed<'b>(&self) -> MyResult<'b, ()> {
    //     Ok(())
    // }

    // As per Rule 3, the result/error type is now owning the lifetime of the
    // &self.
    pub(crate) fn get_page(&self) -> MyResult<'_, ()> {
        Ok(())
    }
}

fn repro3<'a>() -> MyResult<'a, ()> {
    let book = Book { name: "some book" };

    //     error[E0515]: cannot return value referencing local variable `book`
    //     --> src/main.rs:61:17
    //      |
    //   61 |     let _page = book.get_page()?;
    //      |                 ----^^^^^^^^^^^^
    //      |                 |
    //      |                 returns a value referencing data owned by the current function
    //      |                 `book` is borrowed here

    // As per Rule 3, get_page() return type is bound to the book lifetime. What
    // this means is, if we call this method and try to propagate the returned
    // error(using the ? operator), we are accidentally trying to outlive the
    // lifetime of book object.
    let _page = book.get_page()?;

    // For the above get_page() example, the fix is to not tie the lifetime of
    // MyResult to the &self, instead we have to declare it as shown in
    // get_page_fixed() with different lifetime parameter.
    Ok(())
}

fn main() {
    repro1();
    repro2();
    repro3();
}
```