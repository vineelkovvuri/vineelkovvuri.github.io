---
title: "Signed/Unsigned Integer Arithmetic In C"
date: 2019-02-10T18:33:07-07:00
toc: true
tags: ['C']
---

# Introduction

This article is about understanding how integer conversions happen in C
language. The C standard defines the integer conversion rules agnostic to
any specific machine architecture. This also makes things more complicated
for programmers to understand.

First of all, Why do we need integer conversions at all? The answer is
simple, we need to have single type for any given expression. Let's say we
have an expression *<expr1><op><expr2>* when expr1 and expr2 are of
different types, we want the resulting expression from this to have one
single type.

The C99 specification defines below set of integer types as 'standard
integer types'. Interestingly, the sizes of these integer types are not
defined at all. It only defines the minimum supported size. For example, int
need not be 8 bytes long on x64 platforms. The only definition for int is,
it should have at least 16 bits and similarly long should have at least 32
bits, it need not be 8 bytes long. Depending on the platform, processor
architecture, ABI (Application Binary Interface) and the programming model,
the size of these basic types are determined. Windows x64 follows
LLP64(meaning only 'long long' and pointer size are 64 bit wide), So below
are the sizes of the standard types that we are sticking to in this article.

    Type                | Size
    --------------------+---------
    signed char         | 1 bytes
    unsigned char       | 1 bytes
    signed short        | 2 bytes
    unsigned short      | 2 bytes
    signed int          | 4 bytes
    unsigned int        | 4 bytes
    signed long         | 4 bytes
    unsigned long       | 4 bytes
    signed long long    | 8 bytes
    unsigned long long  | 8 bytes

Also, The specification leaves other aspects of C language definition
undefined and this leave room for optimizations for compilers. For example,
the result of signed arithmetic leading to overflow/underflow is not defined
because the specification predates to the machine architectures when 2's
complement representation for -ve numbers is not universal, even though
virtually every modern architecture now uses 2's complement representation
for -ve numbers. Hence the result of unsigned overflow/underflow is well
defined but not signed overflow/underflow!

# How signed-ness is represented in the hardware?

Processors do have the concept of signed/unsigned, but unlike in C language,
where this information is baked into the variable definition, processor
registers do not hold the type/signed/unsigned information. After all,
registers are just placeholders of data. But by contrast, the instructions
themselves do have the notion of signed/unsigned. That is why we have signed
'imul', unsigned 'mul', signed (JL/JG) vs unsigned(JB/JA) jump instructions.
This is an important distinction between programming languages and machine
code. It helps in understanding how high-level code gets translated to
underlying machine code. Instructions which produce/consume signed data
understand that -ve numbers should be in 2's complement form. So if a
register (8bit) has 11110110, it's up to the instruction to treat that data
as either -10 (signed) or 246 (unsigned). If an operation results in a -ve
result say -5 then destination register will be written 11111011(2's
complement representation of -5). 'add' and 'sub' instructions themselves
are not affected by signed and unsigned numbers because of modulo
arithmetic.

# How signed-ness is interpreted in assembly?

In one of the above paragraphs, we said, processor registers does not hold
any signed/unsigned type information with them and it's up to the
instructions to interpret the data as either signed or unsigned. But the
interesting thing about x86/x64 processors is, they provide a flag
register(EFLAGS) where some of the bits are called **Status Flags**. These
Status Flags represent the status of arithmetic operations the happened with
the previous instruction.

The most important flags of these for our discussion are
1.  Carry flag - Set if an arithmetic operation generates a carry or a
    borrow out of the most significant bit of the result; cleared otherwise.
    This flag indicates an overflow condition for unsigned-integer
    arithmetic.
2.  Sign flag - Set equal to the most significant bit of the result, which
    is the sign bit of a signed integer. (0 indicates a positive value and 1
    indicates a negative value.)
3.  Overflow flag - Set if the integer result is too large a positive number
    or too small a negative number (excluding the sign-bit) to fit in the
    destination operand, cleared otherwise. This flag indicates an overflow
    condition for signed-integer (two's complement) arithmetic

Of the above three status flags, Carry flag is obvious but other two flags need
some explanation. Sign flag is set irrespective of whether you are treating the
numbers as positive or negative, All it cares is if the result's MSB is set or
not.

For example in below code, 'sub' can treat 0x81 as -127 or +129. So the
result can also be either interpreted as -128 or +128, But the processor
after executing 'sub' instruction indicates this possibility in Sign Flag.
So operations(JA/JB) who want to treat the result an unsigned will ignore
this sign flag whereas operations (like JG/JL) who treat it as signed will
take this sign flag into account.
```nasm
mov al, 0x81
sub al, 0x1 // This triggers sign flag
```
Overflow flag is a little different. First of all, the Overflow flag is not
set when an operation results in an overflow of the number that can be
represented in a register. Like for example, if we try to add 1 to 0xff does
not set this bit.
```nasm
mov al, 0xFF // 0b11111111
add al, 0x1  // This will not trigger Overflow flag
```
Overflow flag is mainly meant for indicating if there is a chance of result if
interpreted as signed will cross beyond what can be represented in the register.
For example, if we take a byte(al) it can contain value from 0b00000000(0) to
0b11111111(255) as unsigned or 0b10000000(-128) to 0b01111111(127) as signed
number. Now overflow flag is set when a result goes beyond 0b01111111 i.e., too
large a positive number and less than 0b10000000 i.e., too small a negative
number
```nasm
mov al, 0x7e // This is always positive
add al, 0x2  // This will trigger overflow flag
```
Let us see how overflow flag is used to determine the below conditional when
var1 and var2 are signed numbers.
```c
if (var1 < var2) {
    printf("var1 < var2");
}
```
The above code is translated to cmp followed by jl. cmp does var1-var2. And jl
says execute printf if SF != OF. Now lets see the combinations why SF needs to
be not equal to OF
```c
var1 = -125;
var2 = 10;
var1 - var2 => -135 => which cannot be represented in a byte meaning the
                        sign bit of the byte will not be set but the overflow
                        bit gets set. So SF=0 and OF=1

var1 = -120;
var2 = -100;
var1 - var2 => -20 => this can be represented in a byte and its -ve so SF = 1
                        but because it is still under the range of singed
                        numbers representable in a byte OF = 0
```
That is why jl is defined as SF != OF, When this is true it means var1 < var2
even if var1 and var2 are signed(meaning -ve numbers)

# Signed vs Unsigned integers in C

Signed numbers are the way -ve and +ve numbers are represented and unsigned
numbers are the way in which only +ve numbers are represented. If let's say
a data type has 1 byte of storage then the possible bit representation will
be from 0b00000000 (0) - 0b11111111(255). Now, these 255 valid slots can be
interpreted as all positive numbers or divide the range into two halves and
call one half of the slot as positive and other as negative numbers. There
are other alternate representations for -ve numbers but almost all systems
use 2's complement notation to represent -ve numbers. The take away here is
if we include -ve numbers in the available 255 slots then we will represent
from -128 to 127. According to 2's complement notation -128 is represented
as 0b10000000(0x80) whereas 127 is represented as 0b01111111 (0x7F).

# Integer Arithmetic Conversions in C

C language defines below set of rules to convert the arguments in an expression.

## Rank

Every integer type has an integer conversion rank defined as follows:

1.  No two signed integer types shall have the same rank, even if they have
    the same representation.
2.  The rank of a signed integer type shall be greater than the rank of any
    signed integer type with less precision.
3.  The rank of long long int shall be greater than the rank of long int,
    which shall be greater than the rank of int, which shall be greater than
    the rank of short int, which shall be greater than the rank of signed char.
4.  The rank of any unsigned integer type shall equal the rank of the
    corresponding signed integer type, if any.
5.  The rank of any standard integer type shall be greater than the rank of
    any extended integer type with the same width.
6.  The rank of char shall equal the rank of signed char and unsigned char.
7.  The rank of Bool shall be less than the rank of all other standard
    integer types.
8.  The rank of any enumerated type shall equal the rank of the compatible
    integer type (see 6.7.2.2).
9.  The rank of any extended signed integer type relative to another
    extended signed integer type with the same precision is
    implementation-defined, but still subject to the other rules for
    determining the integer conversion rank.
10. For all integer types T1, T2, and T3, if T1 has greater rank than T2 and
    T2 has greater rank than T3, then T1 has greater rank than T3. At a high
    level the gist of above rules is as follows

> Rank(signed char) == Rank(unsigned char) < Rank(signed short) == Rank(unsigned
> short) < Rank(signed int) == Rank(unsigned int) < Rank(signed long) ==
> Rank(unsigned long) < Rank(signed long long) == Rank(unsigned long long)

## Integer Promotions

The following may be used in an expression wherever an int or unsigned int may be
used:

*   An object or expression with an integer type whose integer conversion rank
    is less than or equal to the rank of int and unsigned int.
*   A bit-field of type Bool, int, signed int, or unsigned int.
*   1a) If an int can represent all values of the original type, the value is
    converted to an int;
*   1b) otherwise, it is converted to an unsigned int. These are called the
    integer promotions. All other types are unchanged by the integer
    promotions.

## Usual arithmetic conversions

*   2a) If both operands have the same type, then no further conversion is
    needed.
*   2b) Otherwise, if both operands have signed integer types or both have
    unsigned integer types, the operand with the type of lesser integer
    conversion rank is converted to the type of the operand with greater
    rank.
*   2c) Otherwise, if the operand that has unsigned integer type has rank
    greater or equal to the rank of the type of the other operand, then the
    operand with signed integer type is converted to the type of the operand
    with unsigned integer type.
*   2d) Otherwise, if the type of the operand with signed integer type can
    represent all of the values of the type of the operand with unsigned
    integer type, then the operand with unsigned integer type is converted
    to the type of the operand with a signed integer type.
*   2e) Otherwise, both operands are converted to the unsigned integer type
    corresponding to the type of the operand with signed integer type.

### Rule 2c interpretation

The gist of 2c is to make sense of expressions like z = a+b where a is
singed number and b is unsigned number. Now a 4 byte signed int is added to
8 byte unsigned long long, according to this rule, a 4 byte signed int will
become 8 byte unsigned long long. The important point to remember here is
conversion of signed int to unsigned long long. The way the compiler does
this is by sign extend 4 byte signed number so that its absolute value will
not change i.e.., -10 remain -10 whether it is a 4 byte or 8 byte. But
according to these rules the expression will have the type unsigned long
long so statements like below will result in unexpected behavior. Since the
var1+var2 is an unsigned expression the compiler will enforce it by using a
unsigned jump instruction called jae instead of jge instruction.

                    .----------------This bit will sign extend to all 1's
                    11111011            signed short a = -5
            1111111111111011            unsigned int a = -5
          + 0000000000001010            unsigned int b = 10
          = 0000000000000101            unsigned int
    Figure 1: signed number converted to unsigned numbers

Whenever a signed data type has to be converted to unsigned data type the
absolute value remains unchanged because sign extension will be done using
movsx instruction. So if a variable is type signed short with value -10,
when this variable is sign extended to unsigned int the value of even after
the conversion remains -10 when interpreted as singed int because the binary
represent for -10 for 2 byte storage and 4 byte storage yields the same.

godbolt's compiler explorer is very helpful in understanding how the compiler
translates expressions and apply the above rules. Clang AST view especially
helps in graphically looking at how these promotions/conversion happen
```c
signed int var1 = -100;
unsigned long long var2 = 10;
if (var1 + var2 < 0) {
    //resulting unsigned long long expression will never be lessthan 0
    printf("This will never get printed");
}
```
```nasm
$LN4:
    sub rsp, 56 ; 00000038H
    mov DWORD PTR var1$[rsp], -100          ; ffffffffffffff9cH
    mov QWORD PTR var2$[rsp], 10
    movsxd rax, DWORD PTR var1$[rsp]
    add rax, QWORD PTR var2$[rsp]
    test rax, rax
    jae SHORT $LN2@main                     //This is an unsigned jump
    lea rcx, OFFSET FLAT:$SG4416
    call printf
$LN2@main:
    xor eax, eax
    add rsp, 56 ; 00000038H
    ret 0
main ENDP
```
```console
Fragment of clang's AST for above program
|-BinaryOperator <line:7:9, col:23> 'bool' '<'
| |-BinaryOperator <col:9, col:16> 'unsigned long long' '+'
| | |-ImplicitCastExpr <col:9> 'unsigned long long' <IntegralCast>
| | | `-ImplicitCastExpr <col:9> 'int' <LValueToRValue>
| | | `-DeclRefExpr <col:9> 'int' lvalue Var 0x55ea65e030e0 'var1' 'int'
| | `-ImplicitCastExpr <col:16> 'unsigned long long' <LValueToRValue>
| | `-DeclRefExpr <col:16> 'unsigned long long' lvalue Var 0x55ea65e031b0,
        'var2' 'unsigned long long'
| `-ImplicitCastExpr <col:23> 'unsigned long long' <IntegralCast>
| `-IntegerLiteral <col:23> 'int' 0
```
These rules can only dictate what need to be done for each expression in a
statement one at a time. It cannot determine the type of the complete
statement at once, because of this, we might end up with unexpected results
if we are not careful enough about how the type is propagated. For example,
in var = exp1 + exp2*exp3 the rules can only tell how exp2*exp3 interact and
how that result interacts with exp1. exp2*exp3's new type may not gel well
with exp1 and might result in an unexpected result.

### Rule 2d interpretation

Rule 2d tries to make sense when you have two variables unsigned
number(smaller) and signed number in an expression and the singed storage
can hold the unsigned number entirely, then by this rule, the unsigned
number gets converted to signed number.

                    .----------------The value is not sign extended in case of
                    |                unsigned numbers because 1 here does not
                    |                mean anything special except some large +ve
                    V                value
                    00000101            unsigned short a = 5
            0000000011111011            signed int a = 5
          + 1111111111110110            signed int b = -10
          = 1111111111111011            signed int

    Figure 2: unsigned number converted to signed numbers

For example:
```c
unsigned int var1 = 100;
signed long long var2 = -10;
if (var1 + var2 < 0) { //resulting in signed long long expression
    printf("This gets printed if var1 + var2 is < 0");
}
```
```nasm
    sub rsp, 56 ; 00000038H
    mov DWORD PTR var1$[rsp], 100 ; 00000064H
    mov QWORD PTR var2$[rsp], -10
    mov eax, DWORD PTR var1$[rsp]
    add rax, QWORD PTR var2$[rsp]
    test rax, rax
    jge SHORT $LN2@main // This is a signed jump
    lea rcx, OFFSET FLAT:$SG4869
    call printf
$LN2@main:
    xor eax, eax
    add rsp, 56 ; 00000038H
    ret 0
main ENDP
```
```console
Fragment of clang's AST for above program
|-BinaryOperator <line:7:9, col:23> 'bool' '<'
| |-BinaryOperator <col:9, col:16> 'long long' '+'
| | |-ImplicitCastExpr <col:9> 'long long' <IntegralCast>
| | | `-ImplicitCastExpr <col:9> 'unsigned int' <LValueToRValue>
| | | `-DeclRefExpr <col:9> 'unsigned int' lvalue Var 0x56305e1200e0
        , 'var1' 'unsigned int'
| | `-ImplicitCastExpr <col:16> 'long long' <LValueToRValue>
| | `-DeclRefExpr <col:16> 'long long' lvalue Var 0x56305e1201a8 'var2'
        , 'long long'
| `-ImplicitCastExpr <col:23> 'long long' <IntegralCast>
| `-IntegerLiteral <col:23> 'int' 0
```
### Rule 2e interpretation

And finally, Rule 2e is applied only between unsigned int and signed long
because neither 2c,2d fits these type on LLP64 model. One interesting thing
we can observe is, the resultant type has unsignedness but the type is of
signed variable and also both operand types are converted unlike other
rules. For example:
```c
unsigned int var1 = 100; // this gets converted to unsigned long
signed long var2 = -10;  // this will also converted to unsigned long
if (var1 + var2 < 0) {   // resulting type is unsigned long
    printf("This will not be printed");
}
```
```nasm
    sub rsp, 56 ; 00000038H
    mov DWORD PTR var1$[rsp], 100 ; 00000064H
    mov DWORD PTR var2$[rsp], -10
    mov eax, DWORD PTR var2$[rsp]
    mov ecx, DWORD PTR var1$[rsp]
    add ecx, eax
    mov eax, ecx
    test eax, eax
    jae SHORT $LN2@main // This is an unsigned jump
    lea rcx, OFFSET FLAT:$SG4869
    call printf
$LN2@main:
    xor eax, eax
    add rsp, 56 ; 00000038H
    ret 0
main ENDP
```
```console
Fragment of clang's AST for above program
|-BinaryOperator <line:7:9, col:23> 'bool' '<'
| |-BinaryOperator <col:9, col:16> 'long' '+'
| | |-ImplicitCastExpr <col:9> 'long' <IntegralCast>
| | | `-ImplicitCastExpr <col:9> 'unsigned int' <LValueToRValue>
| | | `-DeclRefExpr <col:9> 'unsigned int' lvalue Var 0x564cedbd0100
        ,'var1' 'unsigned int'
| | `-ImplicitCastExpr <col:16> 'long' <LValueToRValue>
| | `-DeclRefExpr <col:16> 'long' lvalue Var 0x564cedbd01c8 'var2' 'long'
| `-ImplicitCastExpr <col:23> 'long' <IntegralCast>
| `-IntegerLiteral <col:23> 'int' 0
```

## Integer conversion matrix on LLP64 Programming Model

Below table summaries the rules applied for each expression combination
```console
+------------------------+---------------------+------------------------------------------------------------------------------------+
|                        |    Size(MSVC x64)   |  1       1        2       2        4       4        4      4        8      8       |
|LLP64 Programming Model +---------------------+------------------------------------------------------------------------------------+
|                        |    Rank             |  1       1        2       2        3       3        4      4        5      5       |
+---------------+--------+---------------------+------------------------------------------------------------------------------------+
|Size(MS VC x64)|Rank    |<type1> oper <type2> |  signed  unsigned signed  unsigned signed  unsigned signed unsigned signed unsigned|
|               |        |                     |  char    char     short   short    int     int      long   long     long   long    |
|               |        |                     |                                                                     long   long    |
+---------------+--------+---------------------+------------------------------------------------------------------------------------+
| 1             | 1      |signed char          |  1a      1a       1a      1a       1a      1b       2b     2c       2b     2c      |
| 1             | 1      |unsigned char        |          1a       1a      1a       1a      1b       2d     2b       2d     2b      |
| 2             | 2      |signed short         |                   1a      1a       1a      1b       2b     2c       2b     2c      |
| 2             | 2      |unsigned short       |                           1a       1a      1b       2d     2b       2d     2b      |
| 4             | 3      |signed int           |                                    2a      1b       2b     2c       2b     2c      |
| 4             | 3      |unsigned int         |                                            2a       2e     2b       2d     2b      |
| 4             | 4      |signed long          |                                                     2a     2c       2b     2c      |
| 4             | 4      |unsigned long        |                                                            2a       2d     2b      |
| 8             | 5      |signed long long     |                                                                     2a     2c      |
| 8             | 5      |unsigned long long   |                                                                            2a      |
+---------------+--------+---------------------+------------------------------------------------------------------------------------+
```
Figure 3: Rules applied for each combination of expression

Below table summaries the resulting data type of the expression
```console
+------------------------+---------------------+--------------------------------------------------------------------------------------+
|                        |    Size(MSVC x64)   |  1       1        2       2        4       4        4        4        8      8       |
|LLP64 Programming Model +---------------------+--------------------------------------------------------------------------------------+
|                        |    Rank             |  1       1        2       2        3       3        4        4        5      5       |
+---------------+--------+---------------------+--------------------------------------------------------------------------------------+
|Size(MS VC x64)|Rank    |<type1> oper <type2> |  signed  unsigned signed  unsigned signed  unsigned signed   unsigned signed unsigned|
|               |        |                     |  char    char     short   short    int     int      long     long     long   long    |
|               |        |                     |                                                                       long   long    |
+---------------+--------+---------------------+--------------------------------------------------------------------------------------+
| 1             | 1      |signed char          |  signed  signed   signed  signed   signed  unsigned signed   unsigned signed unsigned|
|               |        |                     |  int     int      int     int      int     int      long     long     long   long    |
|               |        |                     |                                                                       long   long    |
| 1             | 1      |unsigned char        |          signed   signed  signed   signed  unsigned unsigned unsigned signed unsigned|
|               |        |                     |          int      int     int      int     int      long     long     long   long    |
|               |        |                     |                                                                       long   long    |
| 2             | 2      |signed short         |                   signed  signed   signed  unsigned signed   unsigned signed unsigned|
|               |        |                     |                   int     int      int     int      long     long     long   long    |
|               |        |                     |                                                                       long   long    |
| 2             | 2      |unsigned short       |                           signed   signed  unsigned signed   unsigned signed unsigned|
|               |        |                     |                           int      int     int      long     long     long   long    |
|               |        |                     |                                                                       long   long    |
| 4             | 3      |signed int           |                                    signed  unsigned signed   unsigned signed unsigned|
|               |        |                     |                                    int     int      long     long     long   long    |
|               |        |                     |                                                                       long   long    |
| 4             | 3      |unsigned int         |                                            unsigned unsigned unsigned signed unsigned|
|               |        |                     |                                            int      long*    long     long   long    |
|               |        |                     |                                                                       long   long    |
| 4             | 4      |signed long          |                                                     signed   unsigned signed unsigned|
|               |        |                     |                                                     long     long     long   long    |
|               |        |                     |                                                                       long   long    |
| 4             | 4      |unsigned long        |                                                              unsigned signed unsigned|
|               |        |                     |                                                              long     long   long    |
|               |        |                     |                                                                       long   long    |
| 8             | 5      |signed long long     |                                                                       signed unsigned|
|               |        |                     |                                                                       long   long    |
|               |        |                     |                                                                       long   long    |
| 8             | 5      |unsigned long long   |                                                                              unsigned|
|               |        |                     |                                                                              long    |
|               |        |                     |                                                                              long    |
+---------------+--------+---------------------+--------------------------------------------------------------------------------------+
```
Figure 4: Resulting type of the expression

# References

1. [INT02-C. Understand integer conversion rules](https://wiki.sei.cmu.edu/confluence/display/c/INT02-C.+Understand+integer+conversion+rules)
2. [C99 Standard](http://www.open-std.org/jtc1/sc22/wg14/www/docs/n1256.pdf)
3. [Should I use Signed or Unsigned Ints In C? (Part 1)](http://blog.robertelder.org/signed-or-unsigned/)
4. [Should I use Signed or Unsigned Ints In C? (Part 2)](http://blog.robertelder.org/signed-or-unsigned-part-2/)
5. [X86 Opcode and Instruction Reference](http://ref.nasm.net/coder-abc.html)
6. [Why is imul used for multiplying unsigned numbers?](https://stackoverflow.com/a/42589535/2407966)
7. [System V Application Binary Interface AMD64 Architecture Processor Supplement](https://cs61.seas.harvard.edu/site/2022/pdf/x86-64-abi-20210928.pdf)
8. [64-Bit Programming Models: Why LP64?](http://www.unix.org/version2/whatsnew/lp64_wp.html)
9. [Why did the Win64 team choose the LLP64 model?](https://blogs.msdn.microsoft.com/oldnewthing/20050131-00/?p=36563)
10. [Abstract Data Models](https://docs.microsoft.com/en-us/windows/desktop/winprog64/abstract-data-models)

# Binary representation

## unsigned numbers
```console
000|0x0 |00000000 # 064|0x40|01000000 # 128|0x80|10000000 # 192|0xc0|11000000
001|0x1 |00000001 # 065|0x41|01000001 # 129|0x81|10000001 # 193|0xc1|11000001
002|0x2 |00000010 # 066|0x42|01000010 # 130|0x82|10000010 # 194|0xc2|11000010
003|0x3 |00000011 # 067|0x43|01000011 # 131|0x83|10000011 # 195|0xc3|11000011
004|0x4 |00000100 # 068|0x44|01000100 # 132|0x84|10000100 # 196|0xc4|11000100
005|0x5 |00000101 # 069|0x45|01000101 # 133|0x85|10000101 # 197|0xc5|11000101
006|0x6 |00000110 # 070|0x46|01000110 # 134|0x86|10000110 # 198|0xc6|11000110
007|0x7 |00000111 # 071|0x47|01000111 # 135|0x87|10000111 # 199|0xc7|11000111
008|0x8 |00001000 # 072|0x48|01001000 # 136|0x88|10001000 # 200|0xc8|11001000
009|0x9 |00001001 # 073|0x49|01001001 # 137|0x89|10001001 # 201|0xc9|11001001
010|0xa |00001010 # 074|0x4a|01001010 # 138|0x8a|10001010 # 202|0xca|11001010
011|0xb |00001011 # 075|0x4b|01001011 # 139|0x8b|10001011 # 203|0xcb|11001011
012|0xc |00001100 # 076|0x4c|01001100 # 140|0x8c|10001100 # 204|0xcc|11001100
013|0xd |00001101 # 077|0x4d|01001101 # 141|0x8d|10001101 # 205|0xcd|11001101
014|0xe |00001110 # 078|0x4e|01001110 # 142|0x8e|10001110 # 206|0xce|11001110
015|0xf |00001111 # 079|0x4f|01001111 # 143|0x8f|10001111 # 207|0xcf|11001111
016|0x10|00010000 # 080|0x50|01010000 # 144|0x90|10010000 # 208|0xd0|11010000
017|0x11|00010001 # 081|0x51|01010001 # 145|0x91|10010001 # 209|0xd1|11010001
018|0x12|00010010 # 082|0x52|01010010 # 146|0x92|10010010 # 210|0xd2|11010010
019|0x13|00010011 # 083|0x53|01010011 # 147|0x93|10010011 # 211|0xd3|11010011
020|0x14|00010100 # 084|0x54|01010100 # 148|0x94|10010100 # 212|0xd4|11010100
021|0x15|00010101 # 085|0x55|01010101 # 149|0x95|10010101 # 213|0xd5|11010101
022|0x16|00010110 # 086|0x56|01010110 # 150|0x96|10010110 # 214|0xd6|11010110
023|0x17|00010111 # 087|0x57|01010111 # 151|0x97|10010111 # 215|0xd7|11010111
024|0x18|00011000 # 088|0x58|01011000 # 152|0x98|10011000 # 216|0xd8|11011000
025|0x19|00011001 # 089|0x59|01011001 # 153|0x99|10011001 # 217|0xd9|11011001
026|0x1a|00011010 # 090|0x5a|01011010 # 154|0x9a|10011010 # 218|0xda|11011010
027|0x1b|00011011 # 091|0x5b|01011011 # 155|0x9b|10011011 # 219|0xdb|11011011
028|0x1c|00011100 # 092|0x5c|01011100 # 156|0x9c|10011100 # 220|0xdc|11011100
029|0x1d|00011101 # 093|0x5d|01011101 # 157|0x9d|10011101 # 221|0xdd|11011101
030|0x1e|00011110 # 094|0x5e|01011110 # 158|0x9e|10011110 # 222|0xde|11011110
031|0x1f|00011111 # 095|0x5f|01011111 # 159|0x9f|10011111 # 223|0xdf|11011111
032|0x20|00100000 # 096|0x60|01100000 # 160|0xa0|10100000 # 224|0xe0|11100000
033|0x21|00100001 # 097|0x61|01100001 # 161|0xa1|10100001 # 225|0xe1|11100001
034|0x22|00100010 # 098|0x62|01100010 # 162|0xa2|10100010 # 226|0xe2|11100010
035|0x23|00100011 # 099|0x63|01100011 # 163|0xa3|10100011 # 227|0xe3|11100011
036|0x24|00100100 # 100|0x64|01100100 # 164|0xa4|10100100 # 228|0xe4|11100100
037|0x25|00100101 # 101|0x65|01100101 # 165|0xa5|10100101 # 229|0xe5|11100101
038|0x26|00100110 # 102|0x66|01100110 # 166|0xa6|10100110 # 230|0xe6|11100110
039|0x27|00100111 # 103|0x67|01100111 # 167|0xa7|10100111 # 231|0xe7|11100111
040|0x28|00101000 # 104|0x68|01101000 # 168|0xa8|10101000 # 232|0xe8|11101000
041|0x29|00101001 # 105|0x69|01101001 # 169|0xa9|10101001 # 233|0xe9|11101001
042|0x2a|00101010 # 106|0x6a|01101010 # 170|0xaa|10101010 # 234|0xea|11101010
043|0x2b|00101011 # 107|0x6b|01101011 # 171|0xab|10101011 # 235|0xeb|11101011
044|0x2c|00101100 # 108|0x6c|01101100 # 172|0xac|10101100 # 236|0xec|11101100
045|0x2d|00101101 # 109|0x6d|01101101 # 173|0xad|10101101 # 237|0xed|11101101
046|0x2e|00101110 # 110|0x6e|01101110 # 174|0xae|10101110 # 238|0xee|11101110
047|0x2f|00101111 # 111|0x6f|01101111 # 175|0xaf|10101111 # 239|0xef|11101111
048|0x30|00110000 # 112|0x70|01110000 # 176|0xb0|10110000 # 240|0xf0|11110000
049|0x31|00110001 # 113|0x71|01110001 # 177|0xb1|10110001 # 241|0xf1|11110001
050|0x32|00110010 # 114|0x72|01110010 # 178|0xb2|10110010 # 242|0xf2|11110010
051|0x33|00110011 # 115|0x73|01110011 # 179|0xb3|10110011 # 243|0xf3|11110011
052|0x34|00110100 # 116|0x74|01110100 # 180|0xb4|10110100 # 244|0xf4|11110100
053|0x35|00110101 # 117|0x75|01110101 # 181|0xb5|10110101 # 245|0xf5|11110101
054|0x36|00110110 # 118|0x76|01110110 # 182|0xb6|10110110 # 246|0xf6|11110110
055|0x37|00110111 # 119|0x77|01110111 # 183|0xb7|10110111 # 247|0xf7|11110111
056|0x38|00111000 # 120|0x78|01111000 # 184|0xb8|10111000 # 248|0xf8|11111000
057|0x39|00111001 # 121|0x79|01111001 # 185|0xb9|10111001 # 249|0xf9|11111001
058|0x3a|00111010 # 122|0x7a|01111010 # 186|0xba|10111010 # 250|0xfa|11111010
059|0x3b|00111011 # 123|0x7b|01111011 # 187|0xbb|10111011 # 251|0xfb|11111011
060|0x3c|00111100 # 124|0x7c|01111100 # 188|0xbc|10111100 # 252|0xfc|11111100
061|0x3d|00111101 # 125|0x7d|01111101 # 189|0xbd|10111101 # 253|0xfd|11111101
062|0x3e|00111110 # 126|0x7e|01111110 # 190|0xbe|10111110 # 254|0xfe|11111110
063|0x3f|00111111 # 127|0x7f|01111111 # 191|0xbf|10111111 # 255|0xff|11111111
```
## signed numbers
```console
-128|0x80|10000000 # -064|0xc0|11000000 # 0000|0x0 |00000000 # 0064|0x40|01000000
-127|0x81|10000001 # -063|0xc1|11000001 # 0001|0x1 |00000001 # 0065|0x41|01000001
-126|0x82|10000010 # -062|0xc2|11000010 # 0002|0x2 |00000010 # 0066|0x42|01000010
-125|0x83|10000011 # -061|0xc3|11000011 # 0003|0x3 |00000011 # 0067|0x43|01000011
-124|0x84|10000100 # -060|0xc4|11000100 # 0004|0x4 |00000100 # 0068|0x44|01000100
-123|0x85|10000101 # -059|0xc5|11000101 # 0005|0x5 |00000101 # 0069|0x45|01000101
-122|0x86|10000110 # -058|0xc6|11000110 # 0006|0x6 |00000110 # 0070|0x46|01000110
-121|0x87|10000111 # -057|0xc7|11000111 # 0007|0x7 |00000111 # 0071|0x47|01000111
-120|0x88|10001000 # -056|0xc8|11001000 # 0008|0x8 |00001000 # 0072|0x48|01001000
-119|0x89|10001001 # -055|0xc9|11001001 # 0009|0x9 |00001001 # 0073|0x49|01001001
-118|0x8a|10001010 # -054|0xca|11001010 # 0010|0xa |00001010 # 0074|0x4a|01001010
-117|0x8b|10001011 # -053|0xcb|11001011 # 0011|0xb |00001011 # 0075|0x4b|01001011
-116|0x8c|10001100 # -052|0xcc|11001100 # 0012|0xc |00001100 # 0076|0x4c|01001100
-115|0x8d|10001101 # -051|0xcd|11001101 # 0013|0xd |00001101 # 0077|0x4d|01001101
-114|0x8e|10001110 # -050|0xce|11001110 # 0014|0xe |00001110 # 0078|0x4e|01001110
-113|0x8f|10001111 # -049|0xcf|11001111 # 0015|0xf |00001111 # 0079|0x4f|01001111
-112|0x90|10010000 # -048|0xd0|11010000 # 0016|0x10|00010000 # 0080|0x50|01010000
-111|0x91|10010001 # -047|0xd1|11010001 # 0017|0x11|00010001 # 0081|0x51|01010001
-110|0x92|10010010 # -046|0xd2|11010010 # 0018|0x12|00010010 # 0082|0x52|01010010
-109|0x93|10010011 # -045|0xd3|11010011 # 0019|0x13|00010011 # 0083|0x53|01010011
-108|0x94|10010100 # -044|0xd4|11010100 # 0020|0x14|00010100 # 0084|0x54|01010100
-107|0x95|10010101 # -043|0xd5|11010101 # 0021|0x15|00010101 # 0085|0x55|01010101
-106|0x96|10010110 # -042|0xd6|11010110 # 0022|0x16|00010110 # 0086|0x56|01010110
-105|0x97|10010111 # -041|0xd7|11010111 # 0023|0x17|00010111 # 0087|0x57|01010111
-104|0x98|10011000 # -040|0xd8|11011000 # 0024|0x18|00011000 # 0088|0x58|01011000
-103|0x99|10011001 # -039|0xd9|11011001 # 0025|0x19|00011001 # 0089|0x59|01011001
-102|0x9a|10011010 # -038|0xda|11011010 # 0026|0x1a|00011010 # 0090|0x5a|01011010
-101|0x9b|10011011 # -037|0xdb|11011011 # 0027|0x1b|00011011 # 0091|0x5b|01011011
-100|0x9c|10011100 # -036|0xdc|11011100 # 0028|0x1c|00011100 # 0092|0x5c|01011100
-099|0x9d|10011101 # -035|0xdd|11011101 # 0029|0x1d|00011101 # 0093|0x5d|01011101
-098|0x9e|10011110 # -034|0xde|11011110 # 0030|0x1e|00011110 # 0094|0x5e|01011110
-097|0x9f|10011111 # -033|0xdf|11011111 # 0031|0x1f|00011111 # 0095|0x5f|01011111
-096|0xa0|10100000 # -032|0xe0|11100000 # 0032|0x20|00100000 # 0096|0x60|01100000
-095|0xa1|10100001 # -031|0xe1|11100001 # 0033|0x21|00100001 # 0097|0x61|01100001
-094|0xa2|10100010 # -030|0xe2|11100010 # 0034|0x22|00100010 # 0098|0x62|01100010
-093|0xa3|10100011 # -029|0xe3|11100011 # 0035|0x23|00100011 # 0099|0x63|01100011
-092|0xa4|10100100 # -028|0xe4|11100100 # 0036|0x24|00100100 # 0100|0x64|01100100
-091|0xa5|10100101 # -027|0xe5|11100101 # 0037|0x25|00100101 # 0101|0x65|01100101
-090|0xa6|10100110 # -026|0xe6|11100110 # 0038|0x26|00100110 # 0102|0x66|01100110
-089|0xa7|10100111 # -025|0xe7|11100111 # 0039|0x27|00100111 # 0103|0x67|01100111
-088|0xa8|10101000 # -024|0xe8|11101000 # 0040|0x28|00101000 # 0104|0x68|01101000
-087|0xa9|10101001 # -023|0xe9|11101001 # 0041|0x29|00101001 # 0105|0x69|01101001
-086|0xaa|10101010 # -022|0xea|11101010 # 0042|0x2a|00101010 # 0106|0x6a|01101010
-085|0xab|10101011 # -021|0xeb|11101011 # 0043|0x2b|00101011 # 0107|0x6b|01101011
-084|0xac|10101100 # -020|0xec|11101100 # 0044|0x2c|00101100 # 0108|0x6c|01101100
-083|0xad|10101101 # -019|0xed|11101101 # 0045|0x2d|00101101 # 0109|0x6d|01101101
-082|0xae|10101110 # -018|0xee|11101110 # 0046|0x2e|00101110 # 0110|0x6e|01101110
-081|0xaf|10101111 # -017|0xef|11101111 # 0047|0x2f|00101111 # 0111|0x6f|01101111
-080|0xb0|10110000 # -016|0xf0|11110000 # 0048|0x30|00110000 # 0112|0x70|01110000
-079|0xb1|10110001 # -015|0xf1|11110001 # 0049|0x31|00110001 # 0113|0x71|01110001
-078|0xb2|10110010 # -014|0xf2|11110010 # 0050|0x32|00110010 # 0114|0x72|01110010
-077|0xb3|10110011 # -013|0xf3|11110011 # 0051|0x33|00110011 # 0115|0x73|01110011
-076|0xb4|10110100 # -012|0xf4|11110100 # 0052|0x34|00110100 # 0116|0x74|01110100
-075|0xb5|10110101 # -011|0xf5|11110101 # 0053|0x35|00110101 # 0117|0x75|01110101
-074|0xb6|10110110 # -010|0xf6|11110110 # 0054|0x36|00110110 # 0118|0x76|01110110
-073|0xb7|10110111 # -009|0xf7|11110111 # 0055|0x37|00110111 # 0119|0x77|01110111
-072|0xb8|10111000 # -008|0xf8|11111000 # 0056|0x38|00111000 # 0120|0x78|01111000
-071|0xb9|10111001 # -007|0xf9|11111001 # 0057|0x39|00111001 # 0121|0x79|01111001
-070|0xba|10111010 # -006|0xfa|11111010 # 0058|0x3a|00111010 # 0122|0x7a|01111010
-069|0xbb|10111011 # -005|0xfb|11111011 # 0059|0x3b|00111011 # 0123|0x7b|01111011
-068|0xbc|10111100 # -004|0xfc|11111100 # 0060|0x3c|00111100 # 0124|0x7c|01111100
-067|0xbd|10111101 # -003|0xfd|11111101 # 0061|0x3d|00111101 # 0125|0x7d|01111101
-066|0xbe|10111110 # -002|0xfe|11111110 # 0062|0x3e|00111110 # 0126|0x7e|01111110
-065|0xbf|10111111 # -001|0xff|11111111 # 0063|0x3f|00111111 # 0127|0x7f|01111111
```