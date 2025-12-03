---
title: "Rust: Formatting Wrapper Types"
date: 2025-01-30 18:26:41
toc: true
tags: ['Rust']
---

# Rust: Formatting Wrapper Types

Today, I came across this blog post [You’re implementing fmt::Display
wrong](https://mina86.com/2024/fmt-display-impl/) where the author discusses the
caveats of implementing the Display trait for wrapper types. I didn’t fully
understand the explanation at first, but going back and forth with DeepSeek R1
helped me grasp it better.

```rust
use core::fmt;

struct FancyHour {
    hour: Hour,
}

struct Hour(u8);

impl fmt::Display for FancyHour {
    fn fmt(&self, fmtr: &mut fmt::Formatter) -> fmt::Result {
        // This {:02} is not used because self.hour uses its own {} formatting
        // operation instead.
        write!(fmtr, "{:02}", self.hour)
    }
}

impl fmt::Display for Hour {
    fn fmt(&self, fmtr: &mut fmt::Formatter) -> fmt::Result {
        // Apparently, because we are using write!(), any "{}" will start a new
        // formatting operation, which means we don't honor FancyHour's "{:02}"
        // write!(fmtr, "{}", self.0)

        // Correct way is to forward the printing
        self.0.fmt(fmtr)
    }
}

fn main() {
    let hour = Hour(2);
    let hour_of_day = FancyHour { hour };
    println!("{}", hour_of_day); // This not printing 02 instead prints 2
}
```

DeepSeek R1 has given the best explanation:

The issue lies in how formatting traits forward formatting parameters. Let's
break it down:

# Key Problem

The `{:02}` format specifier in `FancyHour`'s implementation *does* get
passed to `Hour`'s `Display` implementation. However, your `Hour`'s
`Display` implementation is *ignoring* these formatting parameters by using
`write!(fmtr, "{}", self.0)` instead of forwarding them.

# Detailed Explanation
1. **Formatting Flow**:
```rust
FancyHour::fmt (with {:02}) → Hour::fmt (with {:02} specifier)
```
The `{:02}` specifier *is* passed to `Hour`'s `fmt` method through the `Formatter`.

2. **The Mistake in `Hour::fmt`**:
```rust
write!(fmtr, "{}", self.0) // ❌ Creates NEW formatting operation
```
This starts a fresh formatting operation with `{}` (default formatting),
discarding the `:02` specifier.

3. **The Fix**:
```rust
self.0.fmt(fmtr) // ✅ Forwards existing formatting parameters
```
This forwards the *existing* `Formatter` with its `:02` specifier to the
`u8`'s implementation.

# Fixed Code
```rust
use core::fmt;

struct FancyHour {
    hour: Hour,
}

struct Hour(u8);

impl fmt::Display for FancyHour {
    fn fmt(&self, fmtr: &mut fmt::Formatter) -> fmt::Result {
        write!(fmtr, "{:02}", self.hour) // Passes :02 to Hour::fmt
    }
}

impl fmt::Display for Hour {
    fn fmt(&self, fmtr: &mut fmt::Formatter) -> fmt::Result {
        // Forward formatting parameters to the inner u8
        self.0.fmt(fmtr) // ✅ Uses the existing Formatter with :02
    }
}

fn main() {
    let hour = Hour(2);
    let hour_of_day = FancyHour { hour };
    println!("{}", hour_of_day); // Now prints "02"
}
```

# Why This Works
- `self.0.fmt(fmtr)` preserves the original `Formatter` with its `:02` specifier
- `u8`'s native `Display` implementation understands format specifiers like `:02`
- The `write!` macro in `Hour::fmt` was creating a _new_ formatting
operation, discarding the padding request

# Key Takeaway
When implementing formatting traits for wrapper types:
- Use `.fmt(fmtr)` to forward formatting parameters to inner values
- Avoid `write!(fmtr, "{}", ...)` for wrapper types unless you explicitly
want to reset formatting options

This preserves the formatting context (width, padding, alignment, etc.)
requested by the caller.

# Vineel: Q: how is write!(fmtr, "{}", self.0)  creating new formatting operation isn't the first argument fmtr the existing formatter with :02 ?

**DeepSeek R1:** You’re absolutely correct to question this—it’s a subtle
aspect of how Rust’s formatting machinery works. Let’s break it down:

# The Core Issue: Formatting Contexts
When you use `write!(fmtr, "{}", self.0)`, you’re **starting a new
formatting operation** with its own *format specifier* (`{}`), even though
you’re reusing the same `Formatter` (`fmtr`). This new operation overrides
any previous formatting parameters (like `:02`) because:

1. **`write!` parses the format string** (`"{}"` in this case) to determine
how to format the arguments.
2. **Each `write!` macro call resets the formatting context** for its
arguments, using the specifiers in its own format string.

# Why `{:02}` Doesn’t Propagate
In your code:
```rust
impl fmt::Display for FancyHour {
    fn fmt(&self, fmtr: &mut fmt::Formatter) -> fmt::Result {
        // Intends to pass `:02` to `self.hour`
        write!(fmtr, "{:02}", self.hour)
    }
}

impl fmt::Display for Hour {
    fn fmt(&self, fmtr: &mut fmt::Formatter) -> fmt::Result {
        // ❌ Starts a NEW formatting operation with `{}`, overriding `:02`
        write!(fmtr, "{}", self.0)
    }
}
```

- The `{:02}` in `FancyHour` is passed to `Hour::fmt` through the
`Formatter`.
- But `Hour::fmt` then starts a **new formatting operation** with `"{}"`,
which resets the specifier to default (ignoring `:02`).

# The Fix: Forward the Existing Formatter
Instead of starting a new formatting operation with `write!`, directly
delegate formatting to the inner `u8`’s `fmt` method:
```rust
impl fmt::Display for Hour {
    fn fmt(&self, fmtr: &mut fmt::Formatter) -> fmt::Result {
        // ✅ Forwards the EXISTING formatter (with `:02`) to `self.0`
        self.0.fmt(fmtr)
    }
}
```

This preserves the original formatting parameters (like `:02`) because it
doesn’t reset the context with a new format string.

# Analogy: A Chain of Commands
Imagine the `Formatter` is a memo being passed between people:
1. **`FancyHour` writes**: "Format this hour with 2 digits, padded with
zeros (`:02`)."
2. **`Hour` receives the memo** but then writes a **new memo**: "Format this
number with default settings (`{}`)."
3. **`u8` sees only the second memo** and ignores the original `:02`
request.

By using `self.0.fmt(fmtr)`, `Hour` simply forwards the original memo
(`:02`) to `u8`.

# Key Takeaway
- **`write!(fmtr, "{}", ...)`** creates a **new formatting operation** with
its own specifiers.
- **`.fmt(fmtr)`** forwards the **existing formatter** (including its
specifiers like `:02`).

This is why directly calling `self.0.fmt(fmtr)` works, while `write!` resets
the context. The distinction is subtle but critical for preserving
formatting parameters across nested types.
