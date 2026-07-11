---
title: "Linux ZFS RAIDZ1 Pool Setup"
tags: ['LinuxSetup', 'ZFS']
---

## Identify the Disks

Use the model and serial numbers to match each block device to its persistent
`/dev/disk/by-id/` path:

```bash
lsblk -e7 -o NAME,SIZE,MODEL,SERIAL,FSTYPE,LABEL,MOUNTPOINTS
ls -l /dev/disk/by-id/
```

This confirms the three intended storage disks and shows exactly why persistent
IDs matter: after the hardware change, the Samsung moved from `sdc` to `sdd`.

```text
sda = Micron   16161254C0DF
sdc = Crucial  13420C0DE89F
sdd = Samsung  S151NYAF308945

sdb = Ubuntu system disk, do not use
```

## 1. Final Read-Only Checks

```bash
sudo wipefs -n /dev/disk/by-id/ata-MTFDDAK512MBF-1AN1ZABHA_16161254C0DF
sudo wipefs -n /dev/disk/by-id/ata-Crucial_CT512M550SSD1_13420C0DE89F
sudo wipefs -n /dev/disk/by-id/ata-SAMSUNG_MZ7TD512HAGM-000L1_S151NYAF308945

sudo zpool import
sudo zpool status -P
```

Check exact capacities:

```bash
lsblk -b -e7 -o NAME,SIZE,MODEL,SERIAL
```

Check health:

```bash
sudo smartctl -H -A /dev/disk/by-id/ata-MTFDDAK512MBF-1AN1ZABHA_16161254C0DF
sudo smartctl -H -A /dev/disk/by-id/ata-Crucial_CT512M550SSD1_13420C0DE89F
sudo smartctl -H -A /dev/disk/by-id/ata-SAMSUNG_MZ7TD512HAGM-000L1_S151NYAF308945
```

Proceed only if:

- The three disks contain no required data.
- SMART does not report failure or serious errors.
- `zpool import` does not reveal an old pool you need.
- The selected IDs do not resolve to `sdb`.

## 2. Preview the Pool Creation

The `-n` flag performs a dry run and does not create the pool:

```bash
sudo zpool create -n \
  -o ashift=12 \
  -o autotrim=on \
  -O compression=zstd \
  -O atime=off \
  -O xattr=sa \
  -O acltype=posixacl \
  -O mountpoint=none \
  tank raidz1 \
  /dev/disk/by-id/ata-MTFDDAK512MBF-1AN1ZABHA_16161254C0DF \
  /dev/disk/by-id/ata-Crucial_CT512M550SSD1_13420C0DE89F \
  /dev/disk/by-id/ata-SAMSUNG_MZ7TD512HAGM-000L1_S151NYAF308945
```

Confirm the preview contains exactly one `raidz1` VDEV with those three disks.

## 3. Create the Pool

This is the destructive step:

```bash
sudo zpool create \
  -o ashift=12 \
  -o autotrim=on \
  -O compression=zstd \
  -O atime=off \
  -O xattr=sa \
  -O acltype=posixacl \
  -O mountpoint=none \
  tank raidz1 \
  /dev/disk/by-id/ata-MTFDDAK512MBF-1AN1ZABHA_16161254C0DF \
  /dev/disk/by-id/ata-Crucial_CT512M550SSD1_13420C0DE89F \
  /dev/disk/by-id/ata-SAMSUNG_MZ7TD512HAGM-000L1_S151NYAF308945
```

Do not add `-f` if it refuses. Capture the error first; an existing signature may indicate old data.

## 4. Verify Immediately

```bash
sudo zpool status -P tank
sudo zpool list tank
sudo zpool get ashift,autotrim tank
```

Expected shape:

```text
tank
  raidz1-0
    Micron   ONLINE
    Crucial  ONLINE
    Samsung  ONLINE
```

ZFS may display automatically created `-part1` paths. That is normal when whole disks are supplied.

## 5. Create the Main Dataset

Start simply; more datasets can be added later:

```bash
sudo zfs create -o mountpoint=/srv/storage tank/storage
sudo chown vineel:vineel /srv/storage
sudo zfs list -r tank
df -h /srv/storage
```

Test it:

```bash
echo "ZFS test" > /srv/storage/test.txt
cat /srv/storage/test.txt
sudo zpool status tank
```

Your RAIDZ1 pool will tolerate failure of any one of these three SSDs, but it
will be vulnerable to a second failure while degraded or resilvering. Keep
irreplaceable data backed up outside `tank`.
