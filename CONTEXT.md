# ZenPak — Packing Model

Domain vocabulary for the core packing model: the objects a user builds when planning gear for a trip.

## Language

**Library**:
The root object owning everything for one user: Items, Categories, Lists, plan/entitlements, public profile. Serialized as one JSON document.
_Avoid_: Account (that's auth/User, a different concept), Data.

**Item**:
The canonical gear record — name, weight, price, brand, links. Exists once per Library, independent of any List. Reused across Lists via Placement.
_Avoid_: Gear, Product.

**Placement**:
An Item placed into a Category, carrying its own quantity and contextual attributes: `qty`, `worn`, `consumable`, `star`. The same Item can have different Placements (different qty/worn/consumable) in different Lists — worn/consumable/qty describe how the gear is used *on this list*, not a property of the gear itself. Implemented as `categoryItems` entries on a Category.
_Avoid_: CategoryItem (implementation name, not domain language), Entry.

**Category**:
A named grouping of Placements (e.g. "Clothing", "Shelter") belonging to exactly one List. Never shared between Lists — copying a List always creates new Categories.
_Avoid_: Group, Section.

**List**:
A named pack list for one trip, composed of an ordered sequence of Categories.
_Avoid_: Pack, Trip (a List isn't the trip itself, just the gear plan for it).

**Gear Tag**:
A free-text label on an Item (stored as `item.category`) used only for search/filter/sort in the Gear Room, the cross-List library view of every Item in the Library. Set at creation or CSV import, editable independently afterward. Carries no relationship to any Category the Item is Placed in.
_Avoid_: Item Category, Category (reserved for the List-scoped grouping — using it here is the exact confusion this term exists to prevent).

**Total Weight**:
The sum of every Placement's weight × qty on a List, no exclusions. Also called skin-out weight.
_Avoid_: Pack Weight, Full Weight.

**Base Weight**:
Total Weight minus worn weight minus consumable weight — the standard ultralight-backpacking metric. `totalBaseWeight = totalWeight - (totalWornWeight + totalConsumableWeight)`. This is the number shown by default everywhere a List's weight is summarized (community cards, public profile, list summary).
_Avoid_: Pack Weight (a different, narrower metric — see below).

**Pack Weight**:
Total Weight minus worn weight only — what's actually carried in/on the pack, consumables included. `totalPackWeight = totalWeight - totalWornWeight`. Only surfaced today as a tooltip hint on the Base Weight row in `list-summary.vue`; no other UI shows it standalone.
_Avoid_: Base Weight (excludes consumables too — a different number).

**Optional Item**:
A Placement with `qty === 0`. Its weight is excluded from every total (weight × 0), but it still appears in the Item list. On the public List view it's shown with an explicit "Option" badge; in the private editor it's only a dimmed row (`lpQtyZero`) plus a hover tooltip explaining the meaning — there is no separate "optional" field, `qty === 0` *is* the signal.
_Avoid_: treating this as a distinct boolean field — it would decouple from `qty` and raise "optional=true, qty=3" as an undefined state. Keep `qty === 0` as the single source of truth.

## Rules

- A Category always belongs to exactly one List. `Library.copyList` creates new Categories rather than sharing them.
- worn / consumable / qty live on the Placement, not the Item — the same Item can be worn on one List and packed (not worn) on another.
- An Item's Gear Tag, its Category on List A, and its Category on List B are three independent answers to "what category is this in" — none derives from or stays in sync with the others. An Item placed on multiple Lists is expected to sit in differently-named (or even differently-numbered but same-named) Categories on each; that's a consequence of Category being List-scoped, not of the Gear Tag.
- An Item has at most one Placement per Category. Enforced by every mutation that adds an Item to a Category (`addItemToCategory`, CSV import merge) checking for an existing Placement first — `Category.addItem` itself does not guard this, so any new caller must check.
- Total Weight, Base Weight, and Pack Weight are each computed independently in two places: `client/models/list.js` (`List.calculateTotals`, the live client model) and `server/views.js` (`renderListTotals`, for server-rendered embed/print pages). Keep both formulas in sync by hand — there is no shared function.
- `Library.optionalFields` (worn / consumable / price / images) gates more than display — it gates whether worn/consumable weight is excluded from Base Weight at all (`Category.calculateSubtotal` only subtracts a Placement's weight when the matching `optionalFields` flag is on). This is intentional: worn = not in the pack, so Base Weight should drop it — and it correctly reverses if the user turns worn-tracking back on, since the Placement's own `worn` flag is never cleared by the toggle, only the field's visibility/participation in the calculation.
- Worn weight excludes at most **one unit's weight**, regardless of `qty` — `weight × (qty > 0 ? 1 : 0)`, never `weight × qty`. Rationale: you wear one instance of a thing at a time, even if `qty` says you're carrying spares. Consumable weight has no such cap — it excludes the full `weight × qty`, since every unit of a consumable (e.g. all 3 energy bars) leaves the pack as it's used. A Placement with `qty: 2, worn: true` on a 500g item contributes 1000g to Total Weight but only 500g to worn weight, leaving 500g in Base Weight.
