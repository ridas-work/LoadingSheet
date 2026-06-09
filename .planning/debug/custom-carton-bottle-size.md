# Debug: Custom carton bottle size vs outer box

**Status:** resolved  
**Reported:** User wanted per-line bottle/container sizes (5L jar, 1L, …) inside custom carton product rows, not outer box packaging SKU.

## Expected

Authorized user adds custom carton → each product line can specify **bottle/container size** (5 litre jar, 1 litre, 500 ml, …) for products like Rhino, alongside bottle count.

## Actual (before fix)

Phase 28 added **Outer box size** at carton level (`customBoxCode`) for Haider packaging SKUs — wrong layer.

## Root cause

Requirement conflated **outer shipping box** (packaging inventory) with **filled bottle/jar format** per SKU line in `mixedContents`.

## Fix

- Per-row **Container** dropdown on `CustomCartonBuilder` (5L jar, 1L, 500ml, 250ml, 100ml, or “As in catalog”).
- Resolve sheet/API name e.g. `Rhino` + `5 litre jar` → `Rhino 5 litre jar`.
- Remove required outer box size from custom carton UI; `customBoxCode` optional (packaging fallback unchanged).
