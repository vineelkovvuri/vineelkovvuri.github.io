---
title: "Rust: Trait Objects, Dynamic Dispatch and VTables"
date: 2025-06-15 18:58:12
toc: true
tags: ["Rust"]
---

# Rust: Trait Objects, Dynamic Dispatch and VTables

Even though Rust do not support the traditional inheritance/virtual function to
enable dynamic dispatch(runtime polymorphism). It does support traits based
runtime polymorphism, which may seems drastically different superficially when
compared to other OOP languages, under the hood it is all the same(virtual
functions/vtables etc).

First of all, Rust based polymorphism is done via Trait objects(aka &dyn T),
where T is the trait. So lets say we want a function to accept an object that
implement say an interface I, usually in C# we do below

```C#
public void func(IStack istack)
{
    istack.push(...);
}
```

Where as in Rust to do the same we do something like below,

```rust
fn func(istack: &dyn IStack)
{
    istack.push(...);
}
```

both examples look the same except in the function signature. In Rust `istack:
IStack` do not make sense because `IStack` do not have size defined at compile
time. So Rust instead takes only reference to the Trait which is a fat pointer
whose size is defined at compile time.

### Why `&dyn T` why not `&T`?

- Early versions of Rust allowed `&Trait` without `dyn`. However, this led to confusion because:
  - It wasn’t obvious whether `&Trait` implied dynamic dispatch.
  - The syntax conflicted with potential future features (like associated types or trait aliases).
- Introducing `dyn` made the language more consistent and future-proof.


## How is dynamic dispatch achieved with trait objects?

Below we have two structs `HardBook` and `EBook` and trait called `FileType`
which will be implemented by both the structs. Below code explains how the
function `print_file_type()` which takes trait object performs dynamic
dispatch(using **vtable** reference) and also how the compiler generates the
vtables at the call sites in `main()`.

```rust
use std::ops::Deref;

struct HardBook {
    name: String,
    price: u32,
}
struct EBook {
    name: String,
    price: u32,
}

trait FileType {
    fn get_file_type(&self) -> &'static str;
    fn get_file_type2(&self) -> &'static str;
}

impl FileType for HardBook {
    fn get_file_type(&self) -> &'static str {
        "pdf"
    }
    fn get_file_type2(&self) -> &'static str {
        "chm"
    }
}

impl FileType for EBook {
    fn get_file_type(&self) -> &'static str {
        "pdf"
    }
    fn get_file_type2(&self) -> &'static str {
        "chm"
    }
}

// The compiler cannot generate a direct address to the function
// `get_file_type()` because it doesn't know whether the object will be a
// `HardBook` or an `EBook`.
//
// If `get_file_type()` were the only function being called using the
// `file_type` reference, then the compiler might have been able to pass each
// implementation explicitly at the call sites of `print_file_type()`.
//
// However, imagine if this function also wanted to call `get_file_type2()`
// using the same `file_type` reference later. This makes it impossible for the
// compiler to resolve everything statically. compiler needs a way to pass a
// reference to all possible functions callable through `file_type`
//
// This problem isn't unique to Rust—any language that supports polymorphism or
// virtual function calls faces the same issue. To solve it, compilers use a
// mechanism called a *vtable* (virtual method table). It’s a fancy term for a
// table the compiler generates that contains pointers to all the methods
// callable through the `file_type` trait object.
//
// For example, in this program, we have two implementations of the `FileType`
// trait: one for `HardBook` and one for `EBook`. You can observe how the
// compiler handles this by examining the generated code on godbolt.org:
// https://godbolt.org/z/e4hqfTfc3

// .Lanon.13ff5358f31b330175d7102895a9d46f.14:
//   .quad core::ptr::drop_in_place<example::HardBook>::h48b86849593de02f
//   .asciz " \000\000\000\000\000\000\000\b\000\000\000\000\000\000"
//   .quad <example::HardBook as example::FileType>::get_file_type::hb9f455e889e90bd8
//   .quad <example::HardBook as example::FileType>::get_file_type2::h754d723fd56f0043
//
// .Lanon.13ff5358f31b330175d7102895a9d46f.15:
//   .quad core::ptr::drop_in_place<example::EBook>::ha10892f992c3e4eb
//   .asciz " \000\000\000\000\000\000\000\b\000\000\000\000\000\000"
//   .quad <example::EBook as example::FileType>::get_file_type::h3685dd1c77ba87cc
//   .quad <example::EBook as example::FileType>::get_file_type2::hdfc25991911e83b4
fn print_file_type(file_type: &dyn FileType) {
    // rsi is already loaded with appropriate vtable(check the site in main()).
    // Now, we perform the actual call using `call qword ptr [rsi + 24]` below.
    // + 24 here mean calling the function `get_file_type()` function.

    // example::print_file_type::h585db75d68692941:
    //   sub rsp, 24
    //   mov qword ptr [rsp + 8], rdi
    //   mov qword ptr [rsp + 16], rsi
    //   call qword ptr [rsi + 24]
    //   add rsp, 24
    //   ret
    file_type.get_file_type();

    // In essence, vtables provide another level of indirection to the final
    // implementation. NOTE: Rust compiler do not generate this vtable unless
    // trait object(&dyn T) is being used in the code.

    // This is a perfect example of below quote :-)
    // "All problems in computer science can be solved by another level of
    // indirection." — David Wheeler
}

pub fn main() {
    let book = HardBook {
        name: "The Rust Programming".to_string(),
        price: 1000,
    };

    let book2 = EBook {
        name: "Th Rust Programming".to_string(),
        price: 2000,
    };

    // Loading rsi with the pointer to 1st VTable
    //   lea rsi, [rip + .Lanon.13ff5358f31b330175d7102895a9d46f.14]
    //   lea rdi, [rsp + 16]
    //   call example::print_file_type::h585db75d68692941
    print_file_type(&book);

    // Loading rsi with the pointer to 2nd VTable
    //   lea rsi, [rip + .Lanon.13ff5358f31b330175d7102895a9d46f.15]
    //   lea rdi, [rsp + 80]
    //   call example::print_file_type::h585db75d68692941
    print_file_type(&book2);
}
```
