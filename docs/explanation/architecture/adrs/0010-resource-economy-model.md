---
tags:
- adr
---
# ADR 10. Resource economy model

Date: 2026-05-27

## Status

Accepted

## Context

The game needs an economy that rewards map control, funds robot production, and creates
meaningful trade-offs between robot configurations. The economy must be simple enough
to understand quickly but rich enough to create strategic depth.

## Decision

### Resource types

Seven resource types, each produced by a specific factory subtype and consumed by a
specific robot module:

| Resource | Produced by | Consumed by |
|---|---|---|
| common | warbase | — (income only, not yet consumed by any module) |
| chassis | chassis factory | chassis module |
| electronics | electronics factory | electronics module |
| cannons | cannons factory | cannon weapon |
| missiles | missiles factory | missile weapon |
| phasers | phasers factory | phaser weapon |
| nuclear | nuclear factory | nuclear module |

Each resource type is tracked separately per owner (`OwnerResources` in
`game/resources.ts`). Resources are never converted between types — a surplus of
`cannons` cannot substitute for a shortage of `missiles`.

### Income

Income is credited once per in-game day (every `DAY_TICKS` game ticks, currently 40):

- **Warbase** owned → +`WARBASE_INCOME` common (currently 4)
- **Factory** owned → +`FACTORY_INCOME` of its specific resource type (currently 2)

Neutral structures produce nothing. Income accumulates indefinitely; there is no cap.

### Build costs

A robot is assembled from one chassis, one weapon, one electronics module, and an
optional nuclear module. Each module is paid from its dedicated resource pool at the
moment the build is confirmed in the construction yard:

| Module | Resource | Cost |
|---|---|---|
| Chassis: tracks | chassis | 1 |
| Chassis: antigrav | chassis | 2 |
| Chassis: bipod | chassis | 3 |
| Weapon: cannon | cannons | 1 |
| Weapon: missiles | missiles | 2 |
| Weapon: phasers | phasers | 3 |
| Electronics | electronics | 1 |
| Nuclear (optional) | nuclear | 2 |

Cheapest possible robot: tracks + cannon + electronics = 1 + 1 + 1 = **3 resources**
(chassis + cannons + electronics pools).

### Starting resources

Both owners start with the same amount of every resource type, but RED (AI) starts
with less than BLUE (player) to give the player a head-start advantage:

- **BLUE (player):** `INITIAL_RESOURCES` = 5 of each type
- **RED (AI):** `INITIAL_RESOURCES_RED` = 1 of each type

These values are reset to their starting amounts on every new game / game restart.

### Single source of truth

All numeric constants live in `game/config.ts` and are imported wherever needed.
No magic numbers appear in mechanic or build code.

## Consequences

- Adding a new robot module requires: a new `ResourceType` entry, a matching factory
  subtype, a cost constant in `config.ts`, and a cost entry in the `CHASSIS_COSTS` /
  `WEAPON_COSTS` maps in `build.ts`.
- The asymmetric starting resources mean RED can produce at most one cheap robot from
  its initial stock, while BLUE can produce several. This gap closes quickly once RED
  captures factories.
- `common` resource currently has no build sink. It accumulates from warbases but is
  not spent on anything. It is reserved for a future "repair" or "upgrade" mechanic.