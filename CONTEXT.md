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

## Rules

- A Category always belongs to exactly one List. `Library.copyList` creates new Categories rather than sharing them.
- worn / consumable / qty live on the Placement, not the Item — the same Item can be worn on one List and packed (not worn) on another.
- An Item's Gear Tag, its Category on List A, and its Category on List B are three independent answers to "what category is this in" — none derives from or stays in sync with the others. An Item placed on multiple Lists is expected to sit in differently-named (or even differently-numbered but same-named) Categories on each; that's a consequence of Category being List-scoped, not of the Gear Tag.
- An Item has at most one Placement per Category. Enforced by every mutation that adds an Item to a Category (`addItemToCategory`, CSV import merge) checking for an existing Placement first — `Category.addItem` itself does not guard this, so any new caller must check.
