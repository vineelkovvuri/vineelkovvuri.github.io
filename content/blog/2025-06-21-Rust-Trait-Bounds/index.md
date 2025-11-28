---
title: "Rust: Trait Bounds"
date: 2025-06-21 21:11:47
toc: true
tags: ["Rust"]
---

# Rust: Trait Bounds


Traits in Rust is one of core features of the language. But it deserve some
explanation. Though they may sometimes be called similar to interfaces they are
far more flexible. Lets try to understand what they are and how they can be
used.


```rust
trait Book {
    fn get_type(&self) -> String;
}
```

This defines trait not a type. traits != types. Traits can be thought of a
collection of features that are applicable to the implementing type. Traits
themselves are not very useful unless they are implemented by types.

```rust
impl Book for EBook {
    fn get_type(&self) -> String {
        return "Hard Bounded".to_string();
    }
}

impl Book for HardBook {
    fn get_type(&self) -> String {
        return "Pdf".to_string();
    }
}
```

By applying `Book` trait to `Ebook` and `HardBook` we are establishing a
contract with the implementing types(like interfaces). Now the beauty is we can
write functions which can work on the trait generically.


```rust
fn protect<T>(book: T)
where
T: Book {
    book.get_type()
}
```

## Generic Traits

```rust
trait Book<F> {
    fn set_type(&self, book_type: F);
}
```


Jokes apart, Rust lifetimes are notoriously difficult to master. I have to
confess — I don't fully understand them either. But today’s article will shed
some light on the topic.

The concept of lifetimes in programming languages is not new — every variable in
C, for instance, has a lifetime associated with it. In simple terms, a
**lifetime** indicates how long a variable remains alive and can be safely used.
However, in most other languages, this concept is hidden, and we generally do
not have the tools to explicitly express it. While this may often seem
unnecessary, it's precisely the kind of topic that, when mishandled, can lead to
hard-to-debug crashes or bugs — such as dangling references.

Fortunately or unfortunately, Rust brings this concept to the forefront and
provides special syntax to express lifetimes. Before we go any further, we need
to understand exactly **where** lifetimes are used. Lifetimes come into play
when dealing with **references**. Unlike most other languages, Rust guarantees
the safety of reference variables while they are being used. This is only
possible if the Rust compiler (specifically, the *borrow checker*) can prove
that the variable a reference points to will remain valid for the entire
duration of that reference's use. This is made possible by explicitly annotating
references with an additional **lifetime parameter**.

We specify the lifetime of a reference using the `'a` syntax. Writing lifetime
annotations on every reference would hurt the language’s usability, so the
compiler tries to **infer** them in common cases. This process is known as
**lifetime elision**. Fortunately, the rules for when we need to specify
lifetimes and when the compiler can infer them are relatively straightforward.
We’ll discuss them in more detail later.

> **Tip 1:** Rust Analyzer in VS Code helps display inlay hints for
> compiler-inferred lifetimes. You can enable this by going to **Settings >
> Extensions > Rust Analyzer > Inlay Hints > Lifetime Elision Hints**. This can
> be quite handy at times.

> **Tip 2:** Always rely on `cargo check` to get detailed information about any
> lifetime parameter violations.

Now lets look at some cases to understand the lifetimes better.

**Case 1: References confined to a single scope:**

```rust
let x = 10;
let y = &x;
```

It is safe to use `y` as long as `x` is alive. Rust can infer the lifetime of
`x` and the validity of `y` because they are declared in the same scope. So, we
don't need to explicitly specify the lifetime of the reference here. However,
this becomes particularly necessary when passing and returning references in
functions.

**Case 2: Function returning References to local variables:**

```rust
fn func() -> &u32 {
    let a = 10;
    &a
}
```

```txt
error[E0106]: missing lifetime specifier
 --> src\main.rs:2:14
  |
2 | fn func() -> &u32 {
  |              ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but there is no value for it to be borrowed from

error[E0515]: cannot return reference to local variable `a`
 --> src\main.rs:4:5
  |
4 |     &a
  |     ^^ returns a reference to data owned by the current function
```

You cannot simply do that! As we know from working in C, the lifetime of the
variable `a` is limited to the end of the function. So, trying to return a
reference to that variable is a footgun. The only way to return a reference to a
local variable is if we know that the variable has a `'static` lifetime (we’ll
talk about this later).

**Case 3: Function returning References to input reference variables:**

```rust
fn func(arr: &[u32]) -> &u32 {
    &arr[0]
}
```
With Rust analyzer inlay hits
```rust
fn func<'0>(arr: &'0 [u32]) -> &'0 u32 {
    &arr[2]
}
```

This works because we are trying to return a reference to an element of a slice
that shares the same lifetime (as indicated by the lifetime parameter).

**By default, the compiler will automatically assign a lifetime to the input
parameter, and the same lifetime is assigned to all output reference
parameters.** However, if there are multiple input reference parameters, the
compiler will assign different lifetime parameters to each. In such cases, the
output reference parameter must explicitly specify which input lifetime it is
tied to, as shown below.

```rust
fn func(arr1: &[u32], arr2: &[u32]) -> &u32 {
    &arr1[0]
}
```

With Rust analyzer inlay hits
```rust
fn func<`0,`1>(arr1: &`0 [u32], arr2: &`1 [u32]) -> &u32 {
    &arr1[0]                                        ^---- Compiler cannot infer
}                                                         the lifetime as there
                                                          are more than one
```

**Solution:** Pick a lifetime from one of the input parameters to let the
compiler know that the returned reference comes from `arr1`.

```rust
fn func<'a>(arr1: &'a[u32], arr2: &[u32]) -> &'a u32 {
    &arr1[0]
}
```

Now this raises the question: what if the function has to return a reference
from `arr2` based on some logic? Again, we have to prove to the compiler that,
in either case, the lifetime of the reference being returned is long enough. We
can specify this as shown below.

```rust
fn func<'a, 'b>(arr1: &'a [u32], arr2: &'b [u32]) -> &'b u32
where
    'a: 'b,
{
    &arr2[0]
}
```

The constraint `'a: 'b` means that `'a` lives at least as long as `'b`, and we
specify that the returned reference has at least the `'b` lifetime. By doing
this, we guarantee to the compiler that no matter what we return (a reference to
an element of `arr2` or `arr1`), the returned reference will live long enough.
**Note:** We specify the shortest lifetime annotation (`'b`) in the return type.


**Case 4: Structures containing references:**

Now lets look at the case where structure fields can reference some other data.

```rust
struct BookView {
  price: &u32,
  pages: &u32,
}
```

Again, when we create an object of this struct, we need to make sure that the
references inside the object point to data that can live as long as the struct
itself. The only way the compiler can guarantee this is by assigning a lifetime
parameter. **Note:** Each reference can have its own lifetime parameter. For
simplicity, let's assume both references point to data with the same lifetime.


```rust
struct BookView<'a> {
  price: &'a u32,
  pages: &'a u32,
}
```

What we are telling the compiler is that whenever this struct is used, it must
ensure the data it points to is valid.

```rust
fn main() {
    let price = 100;
    let pages = 1000;
    let bv = BookView {
        price: &price,
        pages: &pages,
    };
}
```

`bv` is valid in the as the data its fields point to are in the same scope.

```rust
fn create_book_view(price: &u32, pages: &u32) -> BookView {
    BookView { price, pages }
}
```

This does not compile because, as we discussed before, each input reference
parameter gets its own lifetime parameter, and the compiler assigns a new
lifetime parameter to the output as well.

```rust
fn create_book_view<'0, '1, '2>(price: &'0 u32, pages: &'1 u32) -> BookView<'2> {
    BookView { price, pages }
}
```

Now we are trying to create a `BookView` using parameters that have different
lifetimes, so the compiler cannot infer the struct's lifetime parameter. By now,
the fix should be obvious.


```rust
fn create_book_view<'a>(price: &'a u32, pages: &'a u32) -> BookView<'a> {
    BookView { price, pages }
}
```

We are telling the compiler that `BookView`’s lifetime parameter is the same as
the lifetime parameter of the inputs. In other words, the data referenced by the
struct’s fields can live as long as the input parameters.

> One thing to note here is that the output parameter is not a reference itself,
> unlike in our previous examples. However, the output parameter **does**
> require lifetime information to manage its fields. So, we are **not**
> returning `&BookView`.

> The lifetime parameter of the output is **only** inferred when there is
> exactly one input to the function. When the function has more than one
> parameter, even if the lifetimes of those parameters are explicitly specified,
> the lifetime of the output parameter must be explicitly specified as well.

Let's look at some more examples of this

```rust
fn create_book_view3(bv: BookView) -> BookView {
    BookView { price: bv.price, pages: bv.pages }
}
```

Since the function has only one parameter, we can elide the lifetime annotations
both on the input and the output. As mentioned before, the compiler will infer
them to be the same lifetime.

```rust

fn create_book_view3<'0>(bv: BookView<'0>) -> BookView<'0> {
    BookView { price: bv.price, pages: bv.pages }
}
```

**Case 5: Structures containing references and its implication on methods:**

```rust

impl<'a> BookView<'a> {
    // For methods, the output lifetime parameter is same as that of self. But
    // one thing to note is, &self itself will have a new lifetime parameter it
    // is not the same as `'a`. Think of below
    // fn clone_book_view<'0>(&'0 self) -> BookView<'0> {
    fn clone_book_view(&self) -> BookView {
        BookView {
            price: self.price,
            pages: self.pages,
        }
    }

    // For methods, the output lifetime parameter is same as that of self. But
    // one thing to note is, &self itself will have a new lifetime parameter it
    // is not the same as `'a`.
    //
    // Below do not work,
    // fn copy_book_view_update<'0, '1>(&'0 self, pages: &'1 u32) -> BookView<'0> {
    // fn copy_book_view_update(&self, pages: &u32) -> BookView {
    //     BookView {
    //         price: self.price,
    //         pages,                 <--- This is using '1 lifetime
    //     }
    // }
    // we have to explicitly specify that self and pages have same lifetime
    fn copy_book_view_update<'x>(&'x self, pages: &'x u32) -> BookView {
        BookView {
            price: self.price,
            pages,
        }
    }
}
```

In essence, below is the gist of how lifetime [elision
rules](https://doc.rust-lang.org/reference/lifetime-elision.html#lifetime-elision)
work:

* Every input reference parameter gets a unique lifetime annotation.
* If there is only one input reference parameter, then all output reference
  parameters get the same lifetime as that input.
* If the first parameter is `self`, then all output reference parameters get the
  lifetime of `self`.
