(function () {
    var EVENTS = [
        {
            year: 1971, name: "Intel 4004", cat: "intel",
            desc: "The world's first commercially available single-chip microprocessor. Designed by Federico Faggin, Ted Hoff, Stanley Mazor, and Masatoshi Shima for Busicom calculators.",
            specs: { "Bits": "4-bit", "Transistors": "2,300", "Clock": "740 kHz", "Process": "10 \u00b5m", "Pins": "16-pin DIP", "Chipset": "MCS-4 (4001 ROM, 4002 RAM, 4003 shift register)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Intel_C4004.jpg/280px-Intel_C4004.jpg"
        },
        {
            year: 1972, name: "Intel 8008", cat: "intel",
            desc: "Intel's first 8-bit microprocessor. Designed for Computer Terminal Corporation's Datapoint 2200 terminal. Used in the first personal computers: SCELBI and Micral N.",
            specs: { "Bits": "8-bit", "Transistors": "3,500", "Clock": "0.5\u20130.8 MHz", "Process": "10 \u00b5m", "Address": "16 KB", "Chipset": "MCS-8 (8008 CPU + support logic)", "SKUs": "8008, 8008-1 (0.8 MHz)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Intel_C8008-1.jpg/280px-Intel_C8008-1.jpg",
            diff: "vs 4004: 4-bit \u2192 8-bit data width; 14-bit address bus (16 KB vs 640 bytes); 48 instructions vs 46; 18-pin DIP vs 16-pin"
        },
        {
            year: 1974, name: "Intel 4040", cat: "intel",
            desc: "Enhanced successor to the 4004 in the MCS-40 family. Added interrupt support, extra registers, 14 new instructions, and an expanded stack. Backward-compatible with 4004 software.",
            specs: { "Bits": "4-bit", "Transistors": "3,000", "Clock": "740 kHz", "Process": "10 \u00b5m", "New": "Interrupts, 14 extra instructions", "Chipset": "MCS-40 (4008/4009 I/O, 4289 memory interface)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Intel_C4040.jpg/280px-Intel_C4040.jpg",
            diff: "vs 4004: Added interrupt support; 24 index registers vs 16; 14 new instructions (60 total); hardware halt; expanded 7-level stack vs 3-level; MCS-40 support chips"
        },
        {
            year: 1974, name: "Intel 8080", cat: "intel",
            desc: "The processor that launched the microcomputer revolution. Ran CP/M operating system and powered the Altair 8800. Its architecture is the ancestor of x86.",
            specs: { "Bits": "8-bit", "Transistors": "4,500\u20136,000", "Clock": "2 MHz", "Process": "6 \u00b5m", "Address": "64 KB", "Chipset": "MCS-80 (8224 clock, 8228 controller, 8251 USART, 8253 PIT, 8255 PPI, 8257 DMA, 8259 PIC)", "SKUs": "8080, 8080A, 8085 (5V single-supply successor)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Intel_C8080A.jpg/280px-Intel_C8080A.jpg",
            diff: "vs 8008: 4\u00d7 clock speed (2 MHz vs 0.5 MHz); 64 KB address space vs 16 KB; 40-pin DIP with separate address/data bus; 6 \u00b5m vs 10 \u00b5m process; stack moved to external RAM"
        },
        {
            year: 1975, name: "MOS 6502", cat: "other", company: "MOS Technology",
            desc: "Extremely low-cost ($25) 8-bit processor that democratized computing. Powered the Apple I, Apple II, Commodore 64, BBC Micro, Atari 2600, and NES.",
            specs: { "Bits": "8-bit", "Transistors": "3,510", "Clock": "1\u20133 MHz", "Process": "8 \u00b5m", "Cost": "$25", "SKUs": "6502, 6507 (Atari 2600), 6510 (C64), 65C02 (CMOS), 65C816 (16-bit, SNES)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/MOS_6502AD_4585_top.jpg/280px-MOS_6502AD_4585_top.jpg"
        },
        {
            year: 1976, name: "Intel 8048", cat: "intel",
            desc: "Intel's first microcontroller \u2014 a CPU, RAM, ROM, and I/O ports on a single chip. Used in the IBM PC keyboard controller and numerous embedded systems. Spawned the MCS-48 family.",
            specs: { "Bits": "8-bit", "ROM": "1\u20134 KB", "RAM": "64\u2013256 bytes", "Clock": "6\u201311 MHz", "I/O": "27 I/O lines", "SKUs": "8048, 8035 (ROM-less), 8748 (EPROM), 8049 (2 KB ROM), 8039" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Intel_P8048H.jpg/280px-Intel_P8048H.jpg"
        },
        {
            year: 1976, name: "Zilog Z80", cat: "other", company: "Zilog",
            desc: "Binary-compatible with the 8080 but with many improvements. Dominated the CP/M era. Used in Sinclair ZX Spectrum, TRS-80, and TI graphing calculators. Discontinued in 2024 after 48 years.",
            specs: { "Bits": "8-bit", "Transistors": "8,500", "Clock": "2.5\u201320 MHz", "Process": "4 \u00b5m", "Lifespan": "1976\u20132024", "SKUs": "Z80, Z80A (4 MHz), Z80B (6 MHz), Z80H (8 MHz), Z180, Z380 (32-bit), eZ80 (24-bit)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Z80-Z0840004PSC-HD.jpg/280px-Z80-Z0840004PSC-HD.jpg"
        },
        {
            year: 1978, name: "Intel 8086", cat: "intel",
            desc: "The chip that started the x86 architecture \u2014 still the foundation of most PCs today. Source-code compatible successor to the 8080. Used in early IBM PC clones.",
            specs: { "Bits": "16-bit", "Transistors": "29,000", "Clock": "5\u201310 MHz", "Process": "3 \u00b5m", "Address": "1 MB", "Chipset": "8288 bus controller + 8259 PIC + 8237 DMA + 8253 PIT", "SKUs": "8086 (16-bit bus), 8088 (8-bit bus, used in IBM PC)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Intel_C8086.jpg/280px-Intel_C8086.jpg",
            diff: "vs 8080: 8-bit \u2192 16-bit data; 1 MB address space vs 64 KB; 5\u201310 MHz vs 2 MHz; 29K transistors vs 6K; segment-based memory model; new x86 instruction set"
        },
        {
            year: 1978, name: "Intel 8087", cat: "intel",
            desc: "The first math coprocessor for the x86 family. Added hardware floating-point (80-bit extended precision) to the 8086/8088. Its instruction set became the basis for all x87 FPU instructions still used today.",
            specs: { "Type": "Math coprocessor", "Transistors": "45,000", "Clock": "5\u201310 MHz", "Process": "3 \u00b5m", "Precision": "80-bit extended", "SKUs": "8087, 80287, 80387 (for 286/386)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/KL_Intel_i8087.jpg/280px-KL_Intel_i8087.jpg"
        },
        {
            year: 1979, name: "Motorola 68000", cat: "other", company: "Motorola",
            desc: "Elegant 16/32-bit processor with clean architecture. Powered the original Apple Macintosh, Commodore Amiga, Atari ST, and Sega Genesis.",
            specs: { "Bits": "16/32-bit", "Transistors": "68,000", "Clock": "8\u201316.67 MHz", "Process": "3.5 \u00b5m", "Address": "16 MB", "SKUs": "68000, 68008 (8-bit bus), 68010, 68020 (full 32-bit), 68030, 68040, 68060" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/KL_Motorola_MC68000.jpg/280px-KL_Motorola_MC68000.jpg"
        },
        {
            year: 1980, name: "Intel 8051", cat: "intel",
            desc: "One of the most popular microcontroller families ever made. An 8-bit MCU with on-chip RAM, ROM, timers, serial port, and I/O. Still manufactured by dozens of vendors decades later and used in billions of embedded devices.",
            specs: { "Bits": "8-bit", "ROM": "4 KB", "RAM": "128 bytes", "Clock": "12 MHz", "I/O": "32 I/O lines, UART, timers", "SKUs": "8051, 8031 (ROM-less), 8751 (EPROM), 8052 (256B RAM, 3 timers), 80C51 (CMOS)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/KL_Intel_D8051AH.jpg/280px-KL_Intel_D8051AH.jpg",
            diff: "vs 8048: 4 KB ROM vs 1 KB; 128 bytes RAM vs 64; hardware UART; 2 timers/counters; Boolean processor (bit-addressable); interrupt system with 5 sources; Harvard architecture"
        },
        {
            year: 1982, name: "Intel 80286", cat: "intel",
            desc: "Introduced protected mode for multitasking. Used in the IBM PC/AT. Could address up to 16 MB of memory. First Intel processor with memory management.",
            specs: { "Bits": "16-bit", "Transistors": "134,000", "Clock": "6\u201325 MHz", "Process": "1.5 \u00b5m", "Address": "16 MB", "Chipset": "Intel 82284 / Intel 82288 (IBM PC/AT chipset)", "SKUs": "286-6, 286-8, 286-10, 286-12, 286-16, 286-20, 286-25" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/KL_Intel_i286.jpg/280px-KL_Intel_i286.jpg",
            diff: "vs 8086: Added protected mode for multitasking; 16 MB address space vs 1 MB; hardware memory management unit (MMU); 134K transistors vs 29K; up to 25 MHz vs 10 MHz"
        },
        {
            year: 1985, name: "Intel 80386", cat: "intel",
            desc: "First 32-bit x86 processor. Introduced virtual 8086 mode, paging, and a flat memory model. The architecture that modern x86 backward compatibility traces to.",
            specs: { "Bits": "32-bit", "Transistors": "275,000", "Clock": "12\u201340 MHz", "Process": "1.5\u20131 \u00b5m", "Address": "4 GB", "Chipset": "Intel 82350 EISA / 82350DT", "SKUs": "386DX (full 32-bit), 386SX (16-bit bus), 386SL (low-power laptop)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/KL_Intel_i386DX.jpg/280px-KL_Intel_i386DX.jpg",
            diff: "vs 80286: 16-bit \u2192 32-bit; 4 GB address space vs 16 MB; paging and virtual memory; virtual 8086 mode; flat memory model; 275K transistors vs 134K"
        },
        {
            year: 1985, name: "ARM1", cat: "arm", company: "Acorn / ARM",
            desc: "The first ARM (Acorn RISC Machine) processor. Designed by Sophie Wilson and Steve Furber at Acorn Computers. Remarkably simple and power-efficient \u2014 the start of the ARM empire.",
            specs: { "Bits": "32-bit", "Transistors": "25,000", "Clock": "8 MHz", "Process": "3 \u00b5m", "Power": "~0.1 W" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Acorn-ARM-Evaluation-System.jpg/280px-Acorn-ARM-Evaluation-System.jpg"
        },
        {
            year: 1989, name: "Intel 80486", cat: "intel",
            desc: "Integrated FPU and 8 KB L1 cache on-die for the first time. Five-stage pipeline doubled performance per clock vs. the 386. Reached 100 MHz in DX4 variant.",
            specs: { "Bits": "32-bit", "Transistors": "1.2 million", "Clock": "25\u2013100 MHz", "Process": "1\u20130.6 \u00b5m", "Cache": "8 KB L1", "Chipset": "Intel 420TX / 420ZX / 430FX (Triton)", "SKUs": "486DX (with FPU), 486SX (no FPU), 486DX2 (clock-doubled), 486DX4 (clock-tripled, 100 MHz), 486SL (low-power)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/KL_Intel_i486DX.jpg/280px-KL_Intel_i486DX.jpg",
            diff: "vs 80386: On-die FPU (was separate 387 chip); 8 KB L1 cache on-die; 5-stage pipeline (2\u00d7 IPC); 1.2M transistors vs 275K; up to 100 MHz vs 40 MHz"
        },
        {
            year: 1985, name: "Microchip PIC16", cat: "other", company: "Microchip Technology",
            desc: "The PIC (Peripheral Interface Controller) microcontroller family from Microchip Technology. Extremely popular for hobbyists and commercial products alike due to low cost, wide availability, and simple architecture.",
            specs: { "Bits": "8-bit", "ROM": "Up to 14 KB", "RAM": "Up to 368 bytes", "Clock": "Up to 20 MHz", "Arch": "Harvard, RISC" },
            img: ""
        },
        {
            year: 1991, name: "MIPS R4000", cat: "other", company: "MIPS Technologies",
            desc: "First 64-bit microprocessor. Used in SGI workstations and was a major RISC milestone. Featured superpipelining and a 64-bit architecture.",
            specs: { "Bits": "64-bit", "Transistors": "1.35 million", "Clock": "100 MHz", "Process": "0.8 \u00b5m", "First": "First 64-bit CPU" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/R4000_die.jpg/280px-R4000_die.jpg"
        },
        {
            year: 1993, name: "Intel Pentium", cat: "intel",
            desc: "Superscalar architecture with dual pipelines. The name 'Pentium' was adopted because numbers (586) couldn't be trademarked. Introduced the FDIV bug controversy.",
            specs: { "Bits": "32-bit", "Transistors": "3.1 million", "Clock": "60\u2013300 MHz", "Process": "0.8\u20130.35 \u00b5m", "Arch": "P5 superscalar", "Chipset": "Intel 430FX (Triton) / 430HX / 430VX / 430TX", "SKUs": "Pentium (P5/P54C), Pentium MMX (P55C), Pentium OverDrive" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/KL_Intel_Pentium_A80501.jpg/280px-KL_Intel_Pentium_A80501.jpg",
            diff: "vs 80486: Superscalar (2 pipelines, can execute 2 instructions/cycle); 64-bit data bus; separate code/data caches (8 KB each); branch prediction; 3.1M transistors vs 1.2M"
        },
        {
            year: 1995, name: "Intel Pentium Pro", cat: "intel",
            desc: "Revolutionary P6 microarchitecture with out-of-order execution, speculative execution, and integrated L2 cache. Foundation for all subsequent Intel designs until Core.",
            specs: { "Bits": "32-bit", "Transistors": "5.5 million", "Clock": "150\u2013200 MHz", "Process": "0.5\u20130.35 \u00b5m", "Arch": "P6 (OoO)", "Chipset": "Intel 440FX (Natoma)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/KL_Intel_Pentium_Pro.jpg/280px-KL_Intel_Pentium_Pro.jpg",
            diff: "vs Pentium: In-order \u2192 out-of-order execution; speculative execution & branch prediction; micro-ops architecture (CISC decoded to RISC); on-package L2 cache (256\u2013512 KB); 36-bit address bus"
        },
        {
            year: 1996, name: "ARM7TDMI", cat: "arm", company: "ARM",
            desc: "One of the most widely licensed processor cores in history. Used in early smartphones, iPods, Game Boy Advance, and countless embedded systems. Shipped billions of units.",
            specs: { "Bits": "32-bit", "Transistors": "~70,000", "Clock": "~80 MHz", "Power": "Very low", "Used in": "GBA, iPod, Nokia" },
            img: "",
            diff: "vs ARM1: 25K \u2192 70K transistors; added Thumb (16-bit compressed) instruction set; hardware multiply; on-chip debug (JTAG); much faster clocks (~80 MHz vs 8 MHz); von Neumann architecture"
        },
        {
            year: 1996, name: "Atmel AVR (ATmega)", cat: "other", company: "Atmel (now Microchip)",
            desc: "The AVR family of 8-bit RISC microcontrollers by Atmel (now Microchip). The ATmega328P became famous as the heart of the Arduino Uno, sparking the maker/hobbyist revolution.",
            specs: { "Bits": "8-bit", "Flash": "1\u2013256 KB", "RAM": "Up to 16 KB", "Clock": "Up to 20 MHz", "Arch": "Modified Harvard, RISC" },
            img: "",
            diff: "vs PIC16: Single-cycle execution (most instructions); larger RAM/Flash; GCC toolchain support; easier C programming; SRAM-based (no bank switching); became Arduino's MCU"
        },
        {
            year: 1997, name: "Intel Pentium II", cat: "intel",
            desc: "P6 architecture with MMX instructions. Introduced the Slot 1 cartridge form factor. Combined with the 440BX chipset, it became the standard for Windows 98 era PCs.",
            specs: { "Bits": "32-bit", "Transistors": "7.5 million", "Clock": "233\u2013450 MHz", "Process": "0.35\u20130.25 \u00b5m", "New": "MMX, Slot 1", "Chipset": "Intel 440BX (most popular) / 440LX / 440EX", "SKUs": "Pentium II (Klamath/Deschutes), Celeron (budget), Xeon (server)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Pentium_II.jpg/280px-Pentium_II.jpg",
            diff: "vs Pentium Pro: Added MMX (57 SIMD integer instructions); Slot 1 cartridge form factor; improved 16-bit code performance; higher clocks (up to 450 MHz vs 200 MHz); 0.25 \u00b5m process"
        },
        {
            year: 1999, name: "AMD Athlon", cat: "amd",
            desc: "AMD's breakthrough processor. First x86 chip to reach 1 GHz (March 2000). Competitive with and often faster than Intel's Pentium III. Used the EV6 bus from Alpha.",
            specs: { "Bits": "32-bit", "Transistors": "22 million", "Clock": "500 MHz\u20131.4 GHz", "Process": "250\u2013180 nm", "Arch": "K7", "Chipset": "AMD 750 / VIA KT133 / nForce", "SKUs": "Athlon (Slot A/Socket A), Athlon XP (Palomino/Thoroughbred/Barton), Duron (budget), Athlon MP (server)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/AMD_Athlon_Processor_Logo.svg/280px-AMD_Athlon_Processor_Logo.svg.png"
        },
        {
            year: 1999, name: "Intel Pentium III", cat: "intel",
            desc: "Added SSE (Streaming SIMD Extensions) for floating-point performance. Available in both Slot 1 and Socket 370. Popular in the Windows 2000/XP era.",
            specs: { "Bits": "32-bit", "Transistors": "9.5\u201328 million", "Clock": "450 MHz\u20131.4 GHz", "Process": "250\u2013130 nm", "New": "SSE", "Chipset": "Intel 440BX / 815 (Solano) / 820 (Camino)", "SKUs": "Pentium III (Katmai/Coppermine/Tualatin), Celeron (budget), Xeon (server), Pentium III-S (server)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/KL_Intel_Pentium_III_Coppermine.jpg/280px-KL_Intel_Pentium_III_Coppermine.jpg",
            diff: "vs Pentium II: Added SSE (70 new floating-point SIMD instructions); on-die L2 cache (Coppermine); up to 1.4 GHz vs 450 MHz; 130 nm process; processor serial number"
        },
        {
            year: 2000, name: "Intel Pentium 4", cat: "intel",
            desc: "NetBurst architecture prioritized high clock speeds. Reached 3.8 GHz but at the cost of high power consumption. Introduced Hyper-Threading and SSE2.",
            specs: { "Bits": "32-bit", "Transistors": "42\u2013169 million", "Clock": "1.3\u20133.8 GHz", "Process": "180\u201365 nm", "New": "HT, SSE2", "Chipset": "Intel 850 (Tehama) / 865 / 875 / 915 / 945 / 975X", "SKUs": "Pentium 4 (Willamette/Northwood/Prescott), Celeron D, Pentium 4 EE (Extreme Edition), Pentium D (dual-core), Xeon" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/KL_Intel_Pentium_4_Northwood.jpg/280px-KL_Intel_Pentium_4_Northwood.jpg",
            diff: "vs Pentium III: Entirely new NetBurst architecture (deep 20-stage pipeline); SSE2 (144 new instructions); Hyper-Threading; much higher clocks (3.8 GHz vs 1.4 GHz) but lower IPC; Rambus RDRAM then DDR"
        },
        {
            year: 2003, name: "AMD Athlon 64", cat: "amd",
            desc: "First x86 desktop processor with 64-bit extensions (AMD64/x86-64). This architecture was so successful that Intel had to adopt it, and it remains the standard today.",
            specs: { "Bits": "64-bit", "Transistors": "105.9 million", "Clock": "1.8\u20132.6 GHz", "Process": "130\u201390 nm", "First": "First x86-64 desktop", "Chipset": "nForce3 / VIA K8T800 / ATI Xpress 200", "SKUs": "Athlon 64, Athlon 64 FX (enthusiast), Opteron (server), Sempron (budget), Turion (mobile)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/AMD_Athlon_64_3200%2B.jpg/280px-AMD_Athlon_64_3200%2B.jpg",
            diff: "vs Athlon (K7): 32-bit \u2192 64-bit (AMD64/x86-64); integrated memory controller (was in chipset); HyperTransport bus; K8 architecture; NX bit; Cool'n'Quiet power management"
        },
        {
            year: 2005, name: "AMD Athlon 64 X2", cat: "amd",
            desc: "First native dual-core x86 desktop processor. Two full cores on a single die, marking the beginning of the multi-core era for consumer PCs.",
            specs: { "Bits": "64-bit", "Transistors": "233 million", "Clock": "2.0\u20132.6 GHz", "Process": "90 nm", "Cores": "2 (native)", "Chipset": "nForce4 / ATI CrossFire Xpress 3200" },
            img: "",
            diff: "vs Athlon 64: 1 core \u2192 2 native cores on single die; 233M vs 106M transistors; shared crossbar switch for inter-core communication; DDR2 support; 90 nm process"
        },
        {
            year: 2006, name: "Intel Core 2 Duo", cat: "intel",
            desc: "Abandoned the hot NetBurst architecture in favor of the efficient Core microarchitecture. Dramatic improvement in performance-per-watt. Restored Intel's performance leadership.",
            specs: { "Bits": "64-bit", "Transistors": "291 million", "Clock": "1.06\u20133.33 GHz", "Process": "65 nm", "Arch": "Core (Merom)", "Chipset": "Intel 965 (Broadwater) / P35 (Bearlake) / X38", "SKUs": "Core 2 Duo, Core 2 Quad, Core 2 Extreme, Celeron (budget), Pentium Dual-Core, Xeon 5100/5300" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Intel_Core2_Duo_E6300_die.jpg/280px-Intel_Core2_Duo_E6300_die.jpg",
            diff: "vs Pentium 4: Abandoned deep-pipeline NetBurst for efficient Core arch; much better perf/watt; native 64-bit; dual cores; 4 MB shared L2 cache; wide 4-issue execution; 65 nm vs 90\u201365 nm"
        },
        {
            year: 2008, name: "Intel Core i7 (Nehalem)", cat: "intel",
            desc: "Introduced integrated memory controller, QuickPath Interconnect (QPI), and Hyper-Threading. First Intel processor with on-die memory controller.",
            specs: { "Bits": "64-bit", "Transistors": "731 million", "Clock": "2.66\u20133.33 GHz", "Process": "45 nm", "Cores": "4 + HT", "Chipset": "Intel X58 (Tylersburg)", "SKUs": "Core i7-920/940/965, Core i5, Core i3, Xeon W/X (Bloomfield/Lynnfield/Clarkdale)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Intel_Core_i7-920_CPU.jpg/280px-Intel_Core_i7-920_CPU.jpg",
            diff: "vs Core 2 Duo: Integrated memory controller (was in chipset); QPI replaces FSB; Hyper-Threading returns; 4 cores standard; Turbo Boost; 45 nm vs 65 nm; 731M vs 291M transistors"
        },
        {
            year: 2004, name: "ARM Cortex-M3", cat: "arm", company: "ARM",
            desc: "The ARM Cortex-M series brought 32-bit ARM processing to the microcontroller world. The M3 became the basis for STM32 and many other popular MCU families, replacing 8-bit controllers in many applications.",
            specs: { "Bits": "32-bit", "Arch": "ARMv7-M (Thumb-2)", "Pipeline": "3-stage", "Features": "NVIC, SysTick, MPU", "Power": "Very low" },
            img: "",
            diff: "vs AVR/PIC: 8-bit \u2192 32-bit; Thumb-2 instruction set (compact + powerful); hardware divide; nested vectored interrupts (NVIC); standardized debug (SWD/JTAG); CMSIS ecosystem"
        },
        {
            year: 2007, name: "STM32", cat: "other", company: "STMicroelectronics",
            desc: "STMicroelectronics' ARM Cortex-M microcontroller family. Became the dominant 32-bit MCU platform for embedded development with a huge ecosystem (STM32CubeIDE, HAL libraries, Nucleo boards).",
            specs: { "Bits": "32-bit", "Cores": "Cortex-M0/M3/M4/M7", "Flash": "16 KB\u20132 MB", "Clock": "Up to 480 MHz", "I/O": "Rich peripherals" },
            img: "",
            diff: "vs Atmel AVR: 8-bit \u2192 32-bit ARM core; much faster (up to 480 MHz vs 20 MHz); DMA, USB, Ethernet, CAN built-in; FPU on M4/M7; enormous product range; industrial-grade"
        },
        {
            year: 2008, name: "ARM Cortex-A8", cat: "arm", company: "ARM",
            desc: "First ARM processor to reach 1 GHz. Powered the original iPhone 3GS and many early Android phones. The beginning of ARM's dominance in mobile computing.",
            specs: { "Bits": "32-bit", "Clock": "600 MHz\u20131 GHz", "Arch": "ARMv7-A", "Used in": "iPhone 3GS, TI OMAP3" },
            img: "",
            diff: "vs ARM7TDMI: Superscalar dual-issue pipeline (13-stage); NEON SIMD; 1 GHz vs ~80 MHz; ARMv7-A with Jazelle & TrustZone; Harvard architecture; much higher performance for smartphones"
        },
        {
            year: 2011, name: "Intel Sandy Bridge", cat: "intel",
            desc: "Integrated CPU and GPU on the same die. Introduced AVX instruction set and ring bus architecture. Massive IPC improvement. Considered one of Intel's best generations.",
            specs: { "Bits": "64-bit", "Transistors": "1.16 billion", "Clock": "2.3\u20133.5 GHz", "Process": "32 nm", "New": "AVX, iGPU", "Chipset": "Intel Z68 / P67 / H67 / H61 (Cougar Point)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Sandy_Bridge_arch.jpg/280px-Sandy_Bridge_arch.jpg",
            diff: "vs Nehalem: GPU integrated on-die; AVX (256-bit SIMD); ring bus interconnect; ~20% IPC gain; unified LLC shared with GPU; improved Turbo Boost 2.0; 32 nm vs 45 nm"
        },
        {
            year: 2013, name: "Apple A7", cat: "arm", company: "Apple",
            desc: "First 64-bit ARM mobile processor (ARMv8). Debuted in iPhone 5s and caught the industry by surprise. Apple's custom Cyclone cores showed ARM could be high-performance.",
            specs: { "Bits": "64-bit", "Transistors": "1 billion", "Clock": "1.3 GHz", "Process": "28 nm", "First": "First 64-bit mobile" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Apple_A7_chip.jpg/280px-Apple_A7_chip.jpg",
            diff: "vs Cortex-A8: 32-bit \u2192 64-bit (ARMv8); Apple custom Cyclone cores (not ARM reference); 1 billion transistors; desktop-class wide decode (6-wide); M7 motion coprocessor; Secure Enclave"
        },
        {
            year: 2014, name: "ESP8266", cat: "other", company: "Espressif Systems",
            desc: "Low-cost Wi-Fi microcontroller by Espressif Systems that revolutionized IoT development. Initially a cheap Wi-Fi-to-serial module, it became a standalone MCU platform. Followed by the ESP32 (2016) with dual-core, Bluetooth, and more.",
            specs: { "Bits": "32-bit", "Core": "Tensilica L106", "Clock": "80\u2013160 MHz", "Wi-Fi": "802.11 b/g/n", "Cost": "~$2" },
            img: "",
            diff: "vs STM32: Built-in Wi-Fi (no external module needed); ~$2 cost; TCP/IP stack on-chip; Arduino & MicroPython support; community-driven ecosystem; sparked the IoT maker movement"
        },
        {
            year: 2017, name: "AMD Ryzen (Zen)", cat: "amd",
            desc: "AMD's dramatic comeback. The Zen architecture closed the massive IPC gap with Intel and offered more cores at lower prices. Ryzen 7 1800X had 8 cores vs Intel's mainstream 4.",
            specs: { "Bits": "64-bit", "Transistors": "4.8 billion", "Clock": "3.0\u20133.6 GHz", "Process": "14 nm", "Cores": "Up to 8", "Chipset": "AMD X370 / B350 / A320 (AM4)", "SKUs": "Ryzen 3/5/7 (desktop), Threadripper (HEDT), EPYC (server)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/AMD_Ryzen_5_1600_Processor.jpg/280px-AMD_Ryzen_5_1600_Processor.jpg",
            diff: "vs Athlon 64 X2: Entirely new Zen architecture; ~52% IPC gain over Excavator; SMT (2 threads/core); up to 8 cores vs 2; CCX design (4-core complexes); 14 nm FinFET; AM4 platform; Precision Boost"
        },
        {
            year: 2019, name: "AMD Ryzen 3000 (Zen 2)", cat: "amd",
            desc: "First x86 processors on 7nm. Chiplet design with separate I/O die. Up to 16 cores for desktop. Took the performance crown from Intel for the first time in over a decade.",
            specs: { "Bits": "64-bit", "Clock": "3.6\u20134.7 GHz", "Process": "7 nm (TSMC)", "Cores": "Up to 16", "Arch": "Zen 2 chiplet", "Chipset": "AMD X570 / B550 (AM4)", "SKUs": "Ryzen 5 3600/3600X, Ryzen 7 3700X/3800X, Ryzen 9 3900X/3950X, Threadripper 3960X/3970X/3990X (64C)" },
            img: "",
            diff: "vs Ryzen (Zen 1): 14 nm \u2192 7 nm; chiplet design (CCD + IOD); ~15% IPC gain; doubled L3 cache (32 MB/CCD); up to 16 cores vs 8; PCIe 4.0; higher clocks (4.7 vs 3.6 GHz boost)"
        },
        {
            year: 2020, name: "Intel Tiger Lake (11th Gen)", cat: "intel",
            desc: "Intel's first processor with Willow Cove cores and integrated Xe LP graphics. Built on 10nm SuperFin process. Brought major GPU improvements with Intel Iris Xe, competitive with entry-level discrete GPUs for the first time.",
            specs: { "Bits": "64-bit", "Transistors": "Up to 2.3 billion", "Clock": "Up to 4.8 GHz", "Process": "10 nm SuperFin", "Cores": "Up to 4 (8T)", "New": "Xe GPU, TB4, PCIe 4.0", "Chipset": "Intel 500 series (Z590, B560, H570)" },
            img: "",
            diff: "vs Sandy Bridge: 10 nm SuperFin vs 32 nm; Willow Cove cores with ~20% IPC over Sunny Cove; Xe LP GPU (up to 96 EUs); Thunderbolt 4; PCIe 4.0; AI-accelerated DL Boost"
        },
        {
            year: 2020, name: "Apple M1", cat: "arm", company: "Apple",
            desc: "Apple's first custom ARM-based Mac processor. Shocked the industry with performance matching or exceeding Intel's laptop chips at a fraction of the power. Marked Apple's transition away from x86.",
            specs: { "Bits": "64-bit", "Transistors": "16 billion", "Clock": "3.2 GHz", "Process": "5 nm (TSMC)", "Cores": "8 (4P+4E)", "SKUs": "M1, M1 Pro (10-core), M1 Max (10-core, 32 GPU), M1 Ultra (20-core, 64 GPU)" },
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Apple_M1_chip_%28no_background%29.png/280px-Apple_M1_chip_%28no_background%29.png",
            diff: "vs Apple A7: Mobile \u2192 desktop/laptop SoC; 1B \u2192 16B transistors; 5 nm vs 28 nm; 8 cores (4P+4E) vs 2; unified memory architecture; 16-core Neural Engine; 7/8-core GPU on-die; Thunderbolt/USB4"
        },
        {
            year: 2021, name: "Intel Alder Lake (12th Gen)", cat: "intel",
            desc: "Intel's first hybrid architecture with Performance (P) and Efficiency (E) cores. Returned Intel to competitiveness with AMD. Introduced DDR5 and PCIe 5.0 support.",
            specs: { "Bits": "64-bit", "Clock": "Up to 5.2 GHz", "Process": "Intel 7 (10 nm)", "Cores": "Up to 16 (8P+8E)", "New": "Hybrid, DDR5", "Chipset": "Intel Z690 / B660 / H670 / H610 (LGA 1700)" },
            img: "",
            diff: "vs Tiger Lake: Hybrid big.LITTLE design (P+E cores); DDR5 & PCIe 5.0; Intel 7 (10 nm ESF) vs 10 nm SuperFin; Thread Director for OS scheduling; up to 16 cores vs 4; 5.2 GHz vs 4.8 GHz"
        },
        {
            year: 2022, name: "AMD Ryzen 7000 (Zen 4)", cat: "amd",
            desc: "First AMD desktop processors on 5nm with AM5 socket. Integrated RDNA 2 graphics in every chip. Support for DDR5 and PCIe 5.0.",
            specs: { "Bits": "64-bit", "Clock": "Up to 5.7 GHz", "Process": "5 nm (TSMC)", "Cores": "Up to 16", "New": "AM5, DDR5, iGPU", "Chipset": "AMD X670E / X670 / B650E / B650 (AM5)" },
            img: "",
            diff: "vs Ryzen 3000 (Zen 2): 7 nm \u2192 5 nm; ~13% IPC gain; DDR5 & PCIe 5.0; integrated RDNA 2 iGPU in every SKU; new AM5 (LGA) socket; AVX-512; up to 5.7 GHz boost"
        },
        {
            year: 2023, name: "Apple M3", cat: "arm", company: "Apple",
            desc: "First consumer processor built on 3nm process technology (TSMC N3B). Hardware-accelerated ray tracing in GPU. Dynamic caching for GPU memory.",
            specs: { "Bits": "64-bit", "Transistors": "25 billion", "Clock": "Up to 4.05 GHz", "Process": "3 nm (TSMC)", "New": "Ray tracing, 3nm", "SKUs": "M3, M3 Pro (12-core), M3 Max (16-core, 40 GPU), M3 Ultra (32-core, 80 GPU)" },
            img: "",
            diff: "vs Apple M1: 5 nm \u2192 3 nm; 16B \u2192 25B transistors; hardware ray tracing in GPU; dynamic caching for GPU memory; up to 4.05 GHz vs 3.2 GHz; faster Neural Engine; AV1 decode"
        },
        {
            year: 2024, name: "Intel Core Ultra (Meteor Lake)", cat: "intel",
            desc: "Intel's disaggregated tile architecture using Foveros 3D packaging. Features a dedicated NPU (Neural Processing Unit) for AI workloads. First Intel processor with chiplet design.",
            specs: { "Bits": "64-bit", "Process": "Intel 4 + TSMC N5/N6", "Cores": "Up to 16", "New": "NPU, Foveros 3D", "Arch": "Disaggregated tiles", "Chipset": "Integrated SoC (no separate PCH for mobile)" },
            img: "",
            diff: "vs Alder Lake: Disaggregated tile/chiplet design (Foveros 3D); dedicated NPU for AI; Intel 4 process; mixed foundry (Intel + TSMC); ARC GPU on-die replaces legacy iGPU; improved power efficiency"
        },
        {
            year: 2021, name: "RP2040", cat: "other", company: "Raspberry Pi",
            desc: "Raspberry Pi's first custom microcontroller. Dual-core ARM Cortex-M0+ at 133 MHz for just $1. Features programmable I/O (PIO) state machines \u2014 a unique feature for bit-banging custom protocols.",
            specs: { "Bits": "32-bit", "Cores": "2\u00d7 Cortex-M0+", "Clock": "133 MHz", "RAM": "264 KB", "Cost": "$1", "Special": "PIO state machines" },
            img: "",
            diff: "vs ESP8266: Dual-core vs single; unique PIO (programmable I/O) state machines; no built-in Wi-Fi (add-on via Pico W); $1 vs ~$2; USB host/device; 264 KB RAM; Raspberry Pi ecosystem"
        },
        {
            year: 2024, name: "Intel Core Ultra 200V (Lunar Lake)", cat: "intel",
            desc: "Ultra-efficient mobile processor with on-package LPDDR5X memory (a first for x86). Uses Lion Cove P-cores and Skymont E-cores. Features a significantly enhanced NPU (48 TOPS) for AI workloads. No Hyper-Threading — focuses on efficiency.",
            specs: { "Bits": "64-bit", "Process": "Intel 4 + TSMC N3B", "Cores": "Up to 8 (4P+4E)", "NPU": "48 TOPS", "New": "On-package memory, Lion Cove", "Chipset": "Fully integrated SoC" },
            img: "",
            diff: "vs Meteor Lake: On-package LPDDR5X (no DIMM slots); Lion Cove P-cores + Skymont E-cores; 48 TOPS NPU vs 10 TOPS; TSMC N3B tiles vs N5; no Hyper-Threading; much better battery life"
        },
        {
            year: 2024, name: "AMD Ryzen 9000 (Zen 5)", cat: "amd",
            desc: "Latest Zen 5 architecture with significant IPC improvements. Uses TSMC 4nm process for CCD and 6nm for IOD.",
            specs: { "Bits": "64-bit", "Clock": "Up to 5.7 GHz", "Process": "4 nm (TSMC)", "Cores": "Up to 16", "Arch": "Zen 5", "Chipset": "AMD X870E / X870 / B850 / B840 (AM5)" },
            img: "",
            diff: "vs Ryzen 7000 (Zen 4): ~16% average IPC gain; wider front-end (2\u00d7 dispatch); improved branch prediction; 4 nm vs 5 nm CCD; better power efficiency; dual-pipe FP/AI workloads"
        },
        {
            year: 2025, name: "Intel Panther Lake", cat: "intel",
            desc: "Intel's next-generation mobile processor expected to be the first built on Intel 18A process (1.8 nm class). Combines Intel's own 18A manufacturing with advanced packaging. Aims to reclaim process leadership.",
            specs: { "Bits": "64-bit", "Process": "Intel 18A (1.8 nm class)", "New": "Intel 18A process, next-gen NPU", "Arch": "Next-gen cores", "Chipset": "Integrated SoC" },
            img: "",
            diff: "vs Lunar Lake: Intel 18A (1.8 nm) vs Intel 4 + TSMC N3B; first processor on Intel's own leading-edge node; expected IPC and efficiency gains; likely desktop and mobile variants"
        }
    ];

    var YEAR_MIN = 1970;
    var YEAR_MAX = 2026;
    var DEFAULT_PX_PER_YEAR = 90;
    var PX_PER_YEAR = DEFAULT_PX_PER_YEAR;
    var MIN_PX = 30;
    var MAX_PX = 250;
    var TIMELINE_PADDING = 60;
    var timeline = document.getElementById('mptTimeline');
    var tooltip = document.getElementById('mptTooltip');
    var scrollWrapper = document.getElementById('mptScrollWrapper');
    var zoomSlider = document.getElementById('mptZoomSlider');
    var zoomLabel = document.getElementById('mptZoomLabel');
    var zoomInBtn = document.getElementById('mptZoomIn');
    var zoomOutBtn = document.getElementById('mptZoomOut');
    var zoomResetBtn = document.getElementById('mptZoomReset');

    function yearToX(year) {
        return TIMELINE_PADDING + (year - YEAR_MIN) * PX_PER_YEAR;
    }

    function updateTimelineWidth() {
        var totalWidth = (YEAR_MAX - YEAR_MIN) * PX_PER_YEAR + TIMELINE_PADDING * 2;
        timeline.style.minWidth = totalWidth + 'px';
    }

    function getYearLabelInterval() {
        if (PX_PER_YEAR >= 80) return 1;
        if (PX_PER_YEAR >= 55) return 2;
        if (PX_PER_YEAR >= 35) return 5;
        return 10;
    }

    function updateZoomUI() {
        var pct = Math.round((PX_PER_YEAR / DEFAULT_PX_PER_YEAR) * 100);
        zoomLabel.textContent = pct + '%';
        zoomSlider.value = PX_PER_YEAR;
        zoomInBtn.disabled = PX_PER_YEAR >= MAX_PX;
        zoomOutBtn.disabled = PX_PER_YEAR <= MIN_PX;
    }

    // Rebuild year markers and reposition events
    function rebuildTimeline() {
        updateTimelineWidth();
        // Update year markers
        var markers = timeline.querySelectorAll('.mpt-year-marker');
        var labels = timeline.querySelectorAll('.mpt-year-label');
        markers.forEach(function(m) { m.remove(); });
        labels.forEach(function(l) { l.remove(); });
        var labelInterval = getYearLabelInterval();
        for (var y = YEAR_MIN; y <= YEAR_MAX; y++) {
            var x = yearToX(y);
            var marker = document.createElement('div');
            marker.className = 'mpt-year-marker';
            marker.style.left = x + 'px';
            timeline.appendChild(marker);
            if (y % labelInterval === 0 || y === YEAR_MIN) {
                marker.style.height = '20px';
                marker.style.background = '#adb5bd';
                var label = document.createElement('div');
                label.className = 'mpt-year-label';
                label.style.left = x + 'px';
                label.textContent = y;
                timeline.appendChild(label);
            }
        }
        // Update event positions
        var eventEls = timeline.querySelectorAll('.mpt-event');
        eventEls.forEach(function(el) {
            var idx = parseInt(el.getAttribute('data-idx'), 10);
            var ev = EVENTS[idx];
            var hOffset = parseInt(el.getAttribute('data-hoffset') || '0', 10);
            el.style.left = (yearToX(ev.year) + hOffset) + 'px';
        });
        updateZoomUI();
    }

    function setZoom(newPx, centerScrollFraction) {
        if (typeof centerScrollFraction === 'undefined') {
            var sw = scrollWrapper;
            centerScrollFraction = sw.scrollWidth > 0 ? (sw.scrollLeft + sw.clientWidth / 2) / sw.scrollWidth : 0;
        }
        PX_PER_YEAR = Math.max(MIN_PX, Math.min(MAX_PX, Math.round(newPx)));
        rebuildTimeline();
        // Restore scroll so the same point stays centered
        var newScrollWidth = scrollWrapper.scrollWidth;
        scrollWrapper.scrollLeft = centerScrollFraction * newScrollWidth - scrollWrapper.clientWidth / 2;
    }

    updateTimelineWidth();

    // Draw initial year markers
    var initLabelInterval = getYearLabelInterval();
    for (var y = YEAR_MIN; y <= YEAR_MAX; y++) {
        var x = yearToX(y);
        var marker = document.createElement('div');
        marker.className = 'mpt-year-marker';
        marker.style.left = x + 'px';
        timeline.appendChild(marker);

        if (y % initLabelInterval === 0 || y === YEAR_MIN) {
            marker.style.height = '20px';
            marker.style.background = '#adb5bd';
            var label = document.createElement('div');
            label.className = 'mpt-year-label';
            label.style.left = x + 'px';
            label.textContent = y;
            timeline.appendChild(label);
        }
    }

    // Track occupied slots to alternate above/below
    var slotMap = {};

    // Slot classes: cycle through above, below, above-high, below-low
    var slotClasses = ['mpt-event-above', 'mpt-event-below', 'mpt-event-above-high', 'mpt-event-below-low'];
    var HORIZONTAL_OFFSET = 40; // px offset for same-year events

    EVENTS.forEach(function (ev, idx) {
        var x = yearToX(ev.year);

        // Decide position to avoid overlap
        var key = ev.year;
        if (!slotMap[key]) slotMap[key] = 0;
        var slotIdx = slotMap[key]++;
        var posClass = slotClasses[slotIdx % slotClasses.length];

        // Horizontal offset for 2nd+ event in same year
        var hOffset = 0;
        if (slotIdx > 0) {
            hOffset = Math.ceil(slotIdx / 2) * HORIZONTAL_OFFSET * (slotIdx % 2 === 0 ? 1 : -1);
        }

        var eventEl = document.createElement('div');
        eventEl.className = 'mpt-event ' + posClass;
        eventEl.style.left = (x + hOffset) + 'px';
        eventEl.setAttribute('data-cat', ev.cat);
        eventEl.setAttribute('data-idx', idx);
        eventEl.setAttribute('data-hoffset', hOffset);

        var dotWrapper = document.createElement('div');
        dotWrapper.className = 'mpt-dot-wrapper';

        var label = document.createElement('div');
        label.className = 'mpt-label';
        var chipsetHtml = '';
        if (ev.specs && ev.specs.Chipset) {
            var shortChipset = ev.specs.Chipset.split('/')[0].split('(')[0].trim();
            chipsetHtml = '<span class="mpt-chipset-tag">' + shortChipset + '</span>';
        }
        label.innerHTML = ev.name + chipsetHtml;

        var stem = document.createElement('div');
        stem.className = 'mpt-stem';

        var dot = document.createElement('div');
        dot.className = 'mpt-dot mpt-cat-' + ev.cat;

        dotWrapper.appendChild(label);
        dotWrapper.appendChild(stem);
        dotWrapper.appendChild(dot);
        eventEl.appendChild(dotWrapper);

        eventEl.addEventListener('mouseenter', function (e) {
            showTooltip(ev, e);
        });
        eventEl.addEventListener('mousemove', function (e) {
            positionTooltip(e);
        });
        eventEl.addEventListener('mouseleave', function () {
            hideTooltip();
        });

        timeline.appendChild(eventEl);
    });

    var CAT_COMPANY = { intel: "Intel", amd: "AMD", arm: "ARM / Apple", other: "" };

    function showTooltip(ev, e) {
        document.getElementById('mptTooltipTitle').textContent = ev.name;
        var company = ev.company || CAT_COMPANY[ev.cat] || '';
        document.getElementById('mptTooltipYear').textContent = ev.year + (company ? ' \u00b7 ' + company : '');
        document.getElementById('mptTooltipDesc').textContent = ev.desc;

        var img = document.getElementById('mptTooltipImg');
        if (ev.img) {
            img.src = ev.img;
            img.style.display = 'block';
            img.onerror = function () { img.style.display = 'none'; };
        } else {
            img.style.display = 'none';
        }

        var specsDl = document.getElementById('mptTooltipSpecs');
        specsDl.innerHTML = '';
        if (ev.specs) {
            var keys = Object.keys(ev.specs);
            for (var i = 0; i < keys.length; i++) {
                var dt = document.createElement('dt');
                dt.textContent = keys[i] + ':';
                var dd = document.createElement('dd');
                dd.textContent = ev.specs[keys[i]];
                specsDl.appendChild(dt);
                specsDl.appendChild(dd);
            }
        }

        // Diff vs predecessor
        var diffEl = document.getElementById('mptTooltipDiff');
        if (ev.diff) {
            diffEl.innerHTML = '<b>\u0394 vs predecessor</b><br>' + ev.diff;
            diffEl.style.display = 'block';
        } else {
            diffEl.style.display = 'none';
        }

        tooltip.classList.add('mpt-visible');
        positionTooltip(e);
    }

    function positionTooltip(e) {
        var tw = tooltip.offsetWidth;
        var th = tooltip.offsetHeight;
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        var left = e.clientX + 16;
        var top = e.clientY - th / 2;

        if (left + tw > vw - 10) left = e.clientX - tw - 16;
        if (top < 10) top = 10;
        if (top + th > vh - 10) top = vh - th - 10;

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    function hideTooltip() {
        tooltip.classList.remove('mpt-visible');
    }

    // Drag to scroll
    var isDragging = false;
    var startX, scrollLeft;

    scrollWrapper.addEventListener('mousedown', function (e) {
        if (e.target.closest('.mpt-event')) return;
        isDragging = true;
        startX = e.pageX - scrollWrapper.offsetLeft;
        scrollLeft = scrollWrapper.scrollLeft;
    });

    scrollWrapper.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        e.preventDefault();
        var x = e.pageX - scrollWrapper.offsetLeft;
        var walk = (x - startX) * 1.5;
        scrollWrapper.scrollLeft = scrollLeft - walk;
    });

    scrollWrapper.addEventListener('mouseup', function () { isDragging = false; });
    scrollWrapper.addEventListener('mouseleave', function () { isDragging = false; });

    // Scroll wheel: plain = horizontal scroll, Ctrl+wheel = zoom
    scrollWrapper.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            // Zoom
            e.preventDefault();
            var delta = e.deltaY > 0 ? -15 : 15;
            var rect = scrollWrapper.getBoundingClientRect();
            var mouseXInWrapper = e.clientX - rect.left + scrollWrapper.scrollLeft;
            var fraction = mouseXInWrapper / scrollWrapper.scrollWidth;
            setZoom(PX_PER_YEAR + delta, fraction);
        } else {
            // Horizontal scroll
            e.preventDefault();
            scrollWrapper.scrollLeft += (e.deltaY || e.deltaX);
        }
    }, { passive: false });

    // Zoom buttons
    zoomInBtn.addEventListener('click', function () { setZoom(PX_PER_YEAR + 20); });
    zoomOutBtn.addEventListener('click', function () { setZoom(PX_PER_YEAR - 20); });
    zoomResetBtn.addEventListener('click', function () { setZoom(DEFAULT_PX_PER_YEAR); });

    // Zoom slider
    zoomSlider.addEventListener('input', function () {
        setZoom(parseInt(zoomSlider.value, 10));
    });

    updateZoomUI();

    // Filter buttons
    var filterBtns = document.querySelectorAll('.mpt-filter-btn');
    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            filterBtns.forEach(function (b) { b.classList.remove('mpt-active'); });
            btn.classList.add('mpt-active');
            var filter = btn.getAttribute('data-filter');
            var events = timeline.querySelectorAll('.mpt-event');
            events.forEach(function (ev) {
                var cat = ev.getAttribute('data-cat');
                if (filter === 'all' || cat === filter) {
                    ev.style.display = '';
                } else {
                    ev.style.display = 'none';
                }
            });
        });
    });

})();
