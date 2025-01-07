
---
title: "Rust: Sharing a Single Object Across Multiple Owners"
date: 2025-01-07T0:17:07-07:00
tags: ['Rust']
---

## Rust: Sharing a Single Object Across Multiple Owners

Today, I found an interesting way to share a single object(C) among multiple
owners(A and B)

```rust
use std::ffi::c_void;

#[derive(Debug)]
pub struct A<'a> {
    mut_ref: &'a mut C,
}

#[derive(Debug)]
pub struct B<'a> {
    mut_ref: &'a mut C,
}

// Common object C shared between object A and object B
#[derive(Debug)]
struct C {
    val: u32,
}

fn main() {
    // - Using stack objects
    println!("Object c shared b/w multiple stack based objects");
    let mut common = C { val: 100 };
    let mut c = &mut common;

    let mut a = A { mut_ref: &mut c };
    let mut a_ptr = &mut a as *mut A as *mut c_void;
    let mut b = B { mut_ref: &mut c };
    let mut b_ptr = &mut b as *mut B as *mut c_void;

    let mut a_obj = unsafe { &mut *(a_ptr as *mut A) };
    let mut b_obj = unsafe { &mut *(b_ptr as *mut B) };

    a_obj.mut_ref.val = 2000; // mutate c from a
    println!("{:?}", a_obj.mut_ref.val); // 2000
    println!("{:?}", b_obj.mut_ref.val); // 2000

    b_obj.mut_ref.val = 4000; // mutate c from b
    println!("{:?}", a_obj.mut_ref.val); // 4000
    println!("{:?}", b_obj.mut_ref.val); // 4000

    // - Using heap objects
    println!("Object c shared b/w multiple heap based objects");
    let mut common = C { val: 100 };
    let mut c = &mut common;

    let mut a = A { mut_ref: &mut c };
    let mut a_ptr = Box::into_raw(Box::new(a)) as *mut c_void;
    let mut b = B { mut_ref: &mut c };
    let mut b_ptr = Box::into_raw(Box::new(b)) as *mut c_void;

    let a_obj = unsafe { Box::<A>::from_raw(a_ptr as *mut A) };
    let b_obj = unsafe { Box::<B>::from_raw(b_ptr as *mut B) };

    a_obj.mut_ref.val = 2000; // mutate c from a
    println!("{:?}", a_obj.mut_ref.val); // 2000
    println!("{:?}", b_obj.mut_ref.val); // 2000

    b_obj.mut_ref.val = 4000; // mutate c from b
    println!("{:?}", a_obj.mut_ref.val); // 4000
    println!("{:?}", b_obj.mut_ref.val); // 4000
}
```

Getting curious I asked ChatGPT below question:

### Question: Why Part 1 works but not Part 2?
```rust
// Part 1
let mut common = C { val: 100 };
let mut c = &mut common;

let mut a = A { mut_ref: &mut c };
let mut a_ptr = &mut a as *mut A as *mut c_void;
let mut b = B { mut_ref: &mut c };
let mut b_ptr = &mut b as *mut B as *mut c_void;

// Part 2
let mut common = C { val: 100 };
let mut c = &mut common;

let mut a = A { mut_ref: &mut c };
let mut b = B { mut_ref: &mut c };
let mut a_ptr = &mut a as *mut A as *mut c_void;
let mut b_ptr = &mut b as *mut B as *mut c_void;
```

### Answer(From ChatGPT):
The distinction lies in how the Rust borrow checker analyzes the lifetimes
and mutability of references during compilation. Let's break this down:

#### Why Part 1 Works:
1. Order of Operations:
- `a` is created with a mutable reference to `c`.
- `a_ptr` is cast to a `*mut c_void`. At this point, the borrow checker no
    longer tracks the borrow because it has been converted to a raw pointer.
- After this, `b` is created with a mutable reference to `c`.
- Finally, `b_ptr` is cast to a `*mut c_void`.

2. Temporary Escape from Borrow Checking:
- The cast to `*mut c_void` removes the borrow checker’s visibility into
    how the mutable reference (`mut_ref`) in `A` is being used. Rust assumes
    you are responsible for managing aliasing and mutability safety when you
    use raw pointers.

3. Sequential Mutability:
- Since `a` is converted to `a_ptr` (a raw pointer) before `b` is created,
    the borrow checker treats the mutable borrow in `a` as no longer active.

#### Why Part 2 Fails:
1. Simultaneous Mutable Borrows:
- In this case, both `A` and `B` are holding mutable references to `c` at
    the same time. This violates Rust's borrowing rules, which prohibit
    multiple mutable borrows of the same data simultaneously.

2. Borrow Checker Enforcement:
- When you write `let mut b = B { mut_ref: &mut c };`, the borrow checker
    detects that there is already an outstanding mutable borrow of `c` held
    by `A`. Even though you intend to cast `a` and `b` to raw pointers
    later, the borrow checker enforces its rules at the point of assignment,
    not at the point of casting.

3. Raw Pointer Cast Comes Too Late:
- Unlike in the first case, the raw pointer cast (`a_ptr` and `b_ptr`)
    happens after the violation has already occurred. At the point where `b`
    is created, the mutable borrow in `A` is still active, leading to a
    compile-time error.

#### Key Takeaway
The difference comes down to when the mutable borrow is considered
invalidated:
- In the working code, converting `A` to a raw pointer before creating `B`
invalidates the borrow in `A` in the borrow checker's view.
- In the non-working code, both `A` and `B` are created before any cast to
raw pointers, so the borrow checker detects overlapping mutable borrows.

Part 1 ensures that the borrow associated with `A` is no longer tracked before
creating `B`.
