---
title: "Rust: Type Conversion - From one type to other"
date: 2025-05-03 19:04:18
toc: true
tags: ["Rust"]
---

# Rust: Type Conversion - From one type to other

Type conversion is a fundamental operation in programming, allowing data to be
transformed from one representation to another. In Rust, this is often done
using **traits**, which provide a flexible and powerful way to define
conversions between types.

In this post, we'll explore how Rust handles type conversion, comparing it with
C#’s approach, and see how Rust’s trait-based system enables **method chaining,
uniform APIs, and better composability**.

---

## **1. The Basics: Converting Strings to Numbers**

A common conversion is parsing a string into a number. Let’s see how Rust and C# handle this differently.

### **C#’s Approach: Static `Parse()` Methods**

In C#, parsing is done via **static methods** on the target type:

```csharp
string input = "100";
int x = int.Parse(input);       // Convert to int
double y = double.Parse(input); // Convert to double
```

- **Pros**: Simple, straightforward.
- **Cons**:
  - Doesn’t support method chaining (e.g., `input.Trim().Parse()` isn’t possible).
  - Each type defines its own `Parse()` method, leading to inconsistency.

### **Rust’s Approach: The `FromStr` Trait**

In Rust, parsing is done via the **`FromStr` trait**, implemented on the **input type (`&str`)**:

```rust
let input = "100";
let x: u32 = input.parse().unwrap(); // Convert to u32
let y: f64 = input.parse().unwrap(); // Convert to f64
```

- **Pros**:
  - **Method chaining**: `input.trim().parse::<u32>()` works seamlessly.
  - **Uniform API**: All types use `.parse()`, no need to remember method names.
  - **Works with generics**: Functions can accept any `FromStr` type.

---

## **2. Extending Rust’s Approach: Custom Type Conversions**

Rust’s trait system allows us to define **custom conversions** between types. Let’s implement a `FromMyType` trait to convert between two structs.

### **Defining a Conversion Trait**

```rust
struct MyType {
    x: u32,
    y: u32,
}

// Trait for converting `MyType` into other types
trait FromMyType {
    fn from_mytype(mytype: &MyType) -> Self;
}

// Implementing the conversion for `MyType2`
struct MyType2 {
    point: String,
}

impl FromMyType for MyType2 {
    fn from_mytype(mytype: &MyType) -> Self {
        MyType2 {
            point: format!("({}, {})", mytype.x, mytype.y),
        }
    }
}
```

### **Adding a Helper Method for Chaining**

To make conversion more ergonomic, we can add a `.convert()` method to `MyType`:

```rust
impl MyType {
    fn convert<F>(&self) -> F
    where
        F: FromMyType,
    {
        F::from_mytype(self)
    }
}
```

### **Usage Example**

```rust
fn main() {
    let my_type = MyType { x: 10, y: 20 };
    let my_type2: MyType2 = my_type.convert(); // Converts to MyType2
    println!("Converted: {}", my_type2.point); // Output: "(10, 20)"
}
```

- **Key Benefit**:
  - Just like `.parse()`, `.convert()` works for **any type implementing `FromMyType`**.
  - Enables **method chaining** (e.g., `some_operation().convert()`).

---

## **3. Why Rust’s Approach is Powerful**

### **1. Method Chaining**

Rust’s design allows **fluent APIs**:

```rust
let num = " 123 ".trim().parse::<u32>().unwrap();
```

vs. C#’s nested calls:

```csharp
string input = " 123 ";
int num = int.Parse(input.Trim());
```

### **2. Uniform API**

- In Rust, **all conversions use `.parse()` or `.convert()`**.
- In C#, each type has its own method (`int.Parse`, `double.Parse`, `DateTime.Parse`).

### **3. Works with Generics**

Rust’s traits enable **generic functions** that work with any convertible type:

```rust
fn parse_anything<T: FromStr>(s: &str) -> Option<T> {
    s.parse().ok()
}
```

In C#, you’d need **reflection** or **overloads** for each type.

---

## **4. When to Use Which Approach?**

| **Rust’s Trait-Based Conversion** | **C#’s Static Method Approach**                    |
| --------------------------------- | -------------------------------------------------- |
| ✅ Better for method chaining     | ✅ Simpler for one-off conversions                 |
| ✅ Works with generics            | ❌ Requires separate methods per type              |
| ✅ Uniform API (`value.parse()`)  | ❌ Different methods (`int.Parse`, `double.Parse`) |
| ❌ Slightly more boilerplate      | ✅ More familiar to OOP developers                 |

---

## **Final Thoughts**

Rust’s trait-based type conversion might seem complex at first, but it enables:

- **Method chaining** (`.trim().parse()`).
- **Generic programming** (functions that work with any `FromStr` type).
- **Uniform APIs** (no need to remember different method names).

If you’re coming from C#, Rust’s approach may feel different, but it unlocks **more composable and flexible code**.

Above article is drafted by DeepSeek from my code/content below!

````rust
#![allow(unused)]
// Below example demonstrates converting one struct type to another using a
// trait. This is inspired by the parse() method on &str which is used to
// convert a string to a number.

struct MyType {
    x: u32,
    y: u32,
}

// This trait is what makes the conversion possible. It defines a method that
// takes a reference to MyType and returns an instance of the implementing type.
trait FromMyType {
    fn from_mytype(mytype: &MyType) -> Self;
}

impl MyType {
    // This method is used to convert MyType to another type that implements the
    // FromMyType trait. It takes a reference to self and returns an instance of
    // the implementing type.
    fn convert<F>(&self) -> F
    where
        F: FromMyType,
    {
        F::from_mytype(self)
    }
}

struct MyType2 {
    point: String,
}

impl FromMyType for MyType2 {
    fn from_mytype(mytype: &MyType) -> Self {
        MyType2 {
            point: format!("({}, {})", mytype.x, mytype.y),
        }
    }
}

fn main() {
    // Below example converts a string to a number using parse() method on &str
    let input = "100";
    // The interesting thing here is we use the parse() method on the input
    // type(&str) and the type system will automatically convert the string to
    // the type we want.
    let x: u32 = input.parse().unwrap(); // parse the string to u32
    let y: f64 = input.parse().unwrap(); // parse the string to f64

    let my_type = MyType { x: 10, y: 20 };
    let my_type2: MyType2 = my_type.convert(); // convert MyType to MyType2

    // In C#, the way we convert a string to a number is by calling parse()
    // method directly on the output type by passing the string as an argument.
    // ```C#
    // string input = "100";
    // int x = int.Parse(input); // parse the string to int
    // double y = double.Parse(input); // parse the string to double
    // ```
    // The benefit of this approach of simply defining the Parse() method on
    // each output type is simplicity and readability.
    //
    // In Rust, we use the parse() method on the input type(&str) and the type
    // system will automatically convert the string to the type we want. This
    // is also the reason why we need to explicitly specify the type we want to
    // convert to.
    //
    // Even though Rust way of doing the conversion seems a bit more complex
    // with traits and generics. It does offer few advantages over C#.
    //  1. Lets us do conversion using method chaining.
    //   ```rust
    //     let x: u32 = some_method_returning_string().parse();
    //   ```
    // vs
    //  ```C#
    //     string input = some_method_returning_string();
    //     int x = int.Parse(input);
    //  ```
    //  2. Because the parse() method is defined on the input type, we have
    //  uniform access via value.parse() for all types. No need for method name
    //  look up.
    //
}
````
