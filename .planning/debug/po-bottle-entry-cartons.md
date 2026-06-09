# Debug: PO bottle entry → auto cartons

**Status:** resolved  
**Trigger:** PO creators found carton entry difficult; want bottle counts with auto carton math.

## Root cause

UX required manual carton counts; business thinks in bottles.

## Fix

- `/new-order` standard flow: `standard_bottles` grid mode
- `lib/poBottleEntry.ts`: validate `bottles % bottlesPerCarton === 0`, else error → custom carton
- Submit converts bottles → `boxes` + `bottlesPerBox` for API

## Examples (catalog)

| Product | bottles/carton | 30 bottles | 60 bottles | 70 bottles |
|---------|----------------|------------|------------|------------|
| Rhino 500ml | 30 | 1 carton | 2 cartons | Error → custom |
| Rhino 750ml | 10 | 3 cartons | 6 cartons | Error → custom |
