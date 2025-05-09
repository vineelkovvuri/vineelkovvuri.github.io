---
title: "Compiler Internals"
date: 2019-11-01T18:33:07-07:00
toc: true
tags: ['Compilers']
---

# Basics

```c
//a.c
int myadd() {
    int sum = 10;

    for (int i = 0; i < 100; i++)
        sum += i;

    return sum;
}

int myadd2() {
    int sum = 10;

    for (int i = 0; i < 100; i++)
        sum += i*i;

    return sum;
}

int main() {
    return myadd();
}
```
```shell
>cl /c a.c
>link /dump /symbols a.obj
008 00000000 SECT3  notype ()    External     | myadd
009 00000050 SECT3  notype ()    External     | myadd2
00A 000000A0 SECT3  notype ()    External     | main
```
The **link /dump** command dumps the symbols that are part of the obj file. The
compiler cannot optimize myadd2 because technically these unused functions can
be accessed by functions in other libs.

```shell
>link /dump /section:.text$mn a.obj
Dump of file a.obj
File Type: COFF OBJECT
SECTION HEADER #3
.text$mn name
       0 physical address
       0 virtual address
      5E size of raw data
     1BF file pointer to raw data (000001BF to 0000021C)
     21D file pointer to relocation table
       0 file pointer to line numbers
       1 number of relocations
       0 number of line numbers
60500020 flags
         Code
         16 byte align
         Execute Read
  Summary
          5E .text$mn
```

All 3 functions are groups inside the **.text$mn** section and hence **link
/dump /section:.text$mn** will have only one header.

# Elimination of unused static functions

```C
//a.c
int myadd() {
    int sum = 10;

    for (int i = 0; i < 100; i++)
        sum += i;

    return sum;
}

static int myadd2() {
    int sum = 10;

    for (int i = 0; i < 100; i++)
        sum += i*i;

    return sum;
}

int main() {
    return myadd();
}
```
```shell
>cl /c a.c
>link /dump /symbols a.obj
008 00000000 SECT3  notype ()    External     | myadd
009 00000050 SECT3  notype ()    External     | main
```
Since myadd2 is made static the compiler can for sure know it cannot be used by
other functions external to this .obj so it removed that function.

# COMDAT and /Gy switch

With /Gy switch the compiler now spits 3 more headers in .text$mn. This is also
called COMDAT and will be helpful for linker to eliminate dead code more easily.
The need for this section will come clear once we look at how linker optimizes
code. From the output it is clear that each function has got it own section
header with **COMDAT; sym=** line

```C
//a.c
int myadd() {
    int sum = 10;

    for (int i = 0; i < 100; i++)
        sum += i;

    return sum;
}

int myadd2() {
    int sum = 10;

    for (int i = 0; i < 100; i++)
        sum += i*i;

    return sum;
}

int main() {
    return myadd();
}
```
```shell
>cl /c /Gy a.c
>link /dump /section:.text$mn a.obj
Dump of file a.obj
File Type: COFF OBJECT
SECTION HEADER #3
.text$mn name
       0 physical address
       0 virtual address
       E size of raw data
     2AF file pointer to raw data (000002AF to 000002BC)
     2BD file pointer to relocation table
       0 file pointer to line numbers
       1 number of relocations
       0 number of line numbers
60501020 flags
         Code
         COMDAT; sym= main
         16 byte align
         Execute Read
SECTION HEADER #4
.text$mn name
       0 physical address
       0 virtual address
      3D size of raw data
     2C7 file pointer to raw data (000002C7 to 00000303)
       0 file pointer to relocation table
       0 file pointer to line numbers
       0 number of relocations
       0 number of line numbers
60501020 flags
         Code
         COMDAT; sym= myadd
         16 byte align
         Execute Read
SECTION HEADER #5
.text$mn name
       0 physical address
       0 virtual address
      41 size of raw data
     304 file pointer to raw data (00000304 to 00000344)
       0 file pointer to relocation table
       0 file pointer to line numbers
       0 number of relocations
       0 number of line numbers
60501020 flags
         Code
         COMDAT; sym= myadd2
         16 byte align
         Execute Read
  Summary
          8C .text$mn
```

# Elimination of unused functions by the linker

The complete elimination of unused functions in a program can only be done by
linker because it is the only component which can see through all the
intermediatory files like .objs. But interestingly linker only works on sections
not on functions themselfs. Because of this if a .obj contain one used and one
unused function inside .text section, the linker will not eliminate the unused
function. Hence in the below example we still see all the functions

```C
//a.c
int myadd() {
    int sum = 10;

    for (int i = 0; i < 100; i++)
        sum += i;

    return sum;
}
//unused function
int myadd2() {
    int sum = 10;

    for (int i = 0; i < 100; i++)
        sum += i*i;

    return sum;
}

//b.c
int sub() {
    int diff = 10;

    for (int i = 0; i < 100; i++)
        diff -= i;

    return diff;
}

//main.c
int main() {
    return myadd();
}
```
```shell
>cl /c a.c b.c main.c
This will produce a.obj, b.obj, main.obj files.
- myadd/myadd2 in .text$mn section of a.obj
- sub in .text$mn section of b.obj
- main in .text$mn section of main.obj

>link a.obj b.obj main.obj /nodefaultlib /entry:main /map /opt:ref
```

Since the linker works at multiple objs collectively it has the opportunity to
remove any unused functions(/opt:ref) when they are not referenced. So we should
expect myadd2 and sub to be removed from final executable and we get this info
by using /map. This will produce a .map file. But unfortunately when you look at
the .map file for the above case we still see myadd2 and sub.

```shell
0001:00000000       myadd                      0000000140001000 f   a.obj
0001:00000050       myadd2                     0000000140001050 f   a.obj
0001:000000a0       sub                        00000001400010a0 f   b.obj
0001:000000e0       main                       00000001400010e0 f   main.obj
```
The reason for this is linker like I said before works at section level not
function level. To help linker in this case, we need to compile the objs with
/Gy flag which as we saw before will produce the functions in their own COMDAT
sections.

This is exactly where **/Gy** and COMDAT feature come in handy. When compiled
with /Gy like we saw before, each function will be part of a different section
and hence linker can eliminate unused functions

```shell
>cl /c /Gy a.c b.c main.c
>link a.obj b.obj main.obj /nodefaultlib /entry:main /map /opt:ref
0001:00000000       myadd                      0000000140001000 f   a.obj
0001:00000040       main                       0000000140001040 f   main.obj
```
Now we can see the binary indeed optimized to not contain myadd2 and sub
functions


