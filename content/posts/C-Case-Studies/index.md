---
title: "Libspng - C Language Case Study"
date: 2018-07-10T18:33:07-07:00
draft: false
toc: true
---

# Build System

It uses meson build system to build the library

# Data Structures

It is not using any fancy data structures instead it relies on plain array
of objects and uses the traditional realloc function to expand them.

# Miscellaneous

All variables are declared as when needed. This deviates from Linux source
code. In Linux kernel, declarations are done only in the beginning of a new
scope (either at the start of the function or start of a scope)

libspng:
```C
ret = calculate_subimages(sub, &scanline_width, &ctx->ihdr, channels);
if(ret) return ret;

unsigned char *scanline_orig = NULL, *scanline = NULL, *prev_scanline = NULL;

scanline_orig = spng__malloc(ctx, scanline_width);
prev_scanline = spng__malloc(ctx, scanline_width);

if(scanline_orig == NULL || prev_scanline == NULL)
{
    ret = SPNG_EMEM;
    goto decode_err;
}

/* Some of the error-handling goto's might leave scanline incremented,
   leading to a failed free(), this prevents that. */
scanline = scanline_orig;

int i;
for(i=0; i < 7; i++)
{
    /* Skip empty passes */
    if(sub[i].width != 0 && sub[i].height != 0)
    {
        scanline_width = sub[i].scanline_width;
        break;
    }
}

uint16_t *gamma_lut = NULL;
uint16_t gamma_lut8[256];

if(flags & SPNG_DECODE_USE_GAMA && ctx->stored_gama)
{
    float file_gamma = (float)ctx->gama / 100000.0f;
    float max;

    uint32_t i, lut_entries;

    if(fmt == SPNG_FMT_RGBA8)
```
Linux Kernel:
```C
static unsigned long isolate_freepages_block(struct compact_control *cc,
                unsigned long *start_pfn,
                unsigned long end_pfn,
                struct list_head *freelist,
                bool strict)
{
    int nr_scanned = 0, total_isolated = 0;
    struct page *cursor, *valid_page = NULL;
    unsigned long flags = 0;
    bool locked = false;
    unsigned long blockpfn = *start_pfn;
    unsigned int order;

    cursor = pfn_to_page(blockpfn);

    /* Isolate free pages. */
    for (; blockpfn < end_pfn; blockpfn++, cursor++) {
        int isolated;
        struct page *page = cursor;

        /*
         * Periodically drop the lock (if held) regardless of its
         * contention, to give chance to IRQs. Abort if fatal signal
         * pending or async compaction detects need_resched()
         */
        if (!(blockpfn % SWAP_CLUSTER_MAX)
            && compact_unlock_should_abort(&cc->zone->lock, flags,
                                &locked, cc))
            break;

        nr_scanned++;
        if (!pfn_valid_within(blockpfn))
            goto isolate_fail;

        if (!valid_page)
            valid_page = page;

        /*
         * For compound pages such as THP and hugetlbfs, we can save
         * potentially a lot of iterations if we skip them at once.
         * The check is racy, but we can consider only valid values
         * and the only danger is skipping too much.
         */
        if (PageCompound(page)) {
            const unsigned int order = compound_order(page);

            if (likely(order < MAX_ORDER)) {
                blockpfn += (1UL << order) - 1;
                cursor += (1UL << order) - 1;
            }
            goto isolate_fail;
        }
```
Libspng also has multiple exits using the return statement every where in
the function. Even in linux kernel, we use multiple return statements but
primarily it is used initially to return from function when invalid
parameters are given as shown below

Libspng
```C
static uint16_t sample_to_target(uint16_t sample, uint8_t bit_depth, uint8_t sbits, uint8_t target)
{
    uint16_t sample_bits;
    int8_t shift_amount;

    if(bit_depth == sbits)
    {
        if(target == sbits) return sample; /* no scaling */
    }/* bit_depth > sbits */
    else sample = sample >> (bit_depth - sbits); /* shift significant bits to bottom */

    /* downscale */
    if(target < sbits) return sample >> (sbits - target);

    /* upscale using left bit replication */
    shift_amount = target - sbits;
    sample_bits = sample;
    sample = 0;

    while(shift_amount >= 0)
    {
        sample = sample | (sample_bits << shift_amount);
        shift_amount -= sbits;
    }

    int8_t partial = shift_amount + (int8_t)sbits;

    if(partial != 0) sample = sample | (sample_bits >> abs(shift_amount));

    return sample;
}
```
Linux Kernel
```C
static enum compact_result compact_zone(struct zone *zone, struct compact_control *cc)
{
    enum compact_result ret;
    unsigned long start_pfn = zone->zone_start_pfn;
    unsigned long end_pfn = zone_end_pfn(zone);
    const bool sync = cc->mode != MIGRATE_ASYNC;

    cc->migratetype = gfpflags_to_migratetype(cc->gfp_mask);
    ret = compaction_suitable(zone, cc->order, cc->alloc_flags,
                            cc->classzone_idx);
    /* Compaction is likely to fail */
    if (ret == COMPACT_SUCCESS || ret == COMPACT_SKIPPED)
        return ret;
    ...
    ...
            /* All pages were either migrated or will be released */
            cc->nr_migratepages = 0;
            if (err) {
                putback_movable_pages(&cc->migratepages);
                /*
                 * migrate_pages() may return -ENOMEM when scanners meet
                 * and we want compact_finished() to detect it
                 */
                if (err == -ENOMEM && !compact_scanners_met(cc)) {
                    ret = COMPACT_CONTENDED;
                    goto out;
                }
            ....
            }

    ....
        }

    out:
        /*
         * Release free pages and update where the free scanner should restart,
         * so we don't leave any returned pages behind in the next attempt.
         */
        if (cc->nr_freepages > 0) {
            unsigned long free_pfn = release_freepages(&cc->freepages);

            cc->nr_freepages = 0;
            VM_BUG_ON(free_pfn == 0);
```
