# Batch A — Pixel Asset QA Report

## Quantitative results

| Test | Result | Evidence |
|---|---|---|
| Frame dimensions | PASS | 65 files each 32×48; atlas rectangles exact |
| Antialias / partial alpha | PASS | All production PNG alpha values 0 or 255 |
| Common foot anchor | PASS (coordinate) | JSON anchor (16,40) for 65 frames; poses require visual in-game review |
| Palette | PASS | 46 base colors + 5 effect colors, all non-mask non-preview pixels constrained |
| 4-direction identity | REVIEW | Hair, armor and weapon silhouette consistent by design; human eyeball review needed |
| Nearest-neighbor preview | PASS (technical) | Integer sprite rendering, no resampling blur |
| Dark/medium legibility | REVIEW | previews/visibility_dark_medium.png |
| Originality | REVIEW | New original project art, no copied existing-game assets; full resemblance check remains subjective |
| Filename regex | PASS | lowercase letters, numbers, underscore; English filenames |

## Counts

| Category | Requested | Produced | Note |
|---|---:|---:|---|
| Character frames | 65 | 65 | idle 8, walk 24, attack 20, hit 8, death 5 |
| Character atlas sheets | 5 | 5 | per animation |
| Recolor mask channels | 5 | 5 | 25 animation-specific sheets |
| Sword attack effect | 1 set | 1 set | 5 frames, 64x64 |
| Ground shadow | 1 | 1 | 32x16 |
| Shared palette | <=48 + <=16 | 46 + 5 | Character retains prior 22 colors |
| Upper dungeon example | 1 | 1 | room and character composite |
| Floor tile variants | prototype set | 8 | 32x32 |
| Wall/prop variants | prototype set | 7 | 32x48 |

## Limitations and design debt

- Combat slash and death poses are programmatic prototype animations; production polish is required before artistic final signoff.
- Some body recolor mask boundaries are inferred from color keys and must be inspected after introducing new hair styles/armor.
- Room is a PNG compositing sample, not 3D map geometry. Only the sprite / tile coordinate contract is provided.
- Full sprite construction does not yet support swapping job outfits or 100-person appearance generation. Later batches cover that.

## Approval gate

Batch B remains blocked until the user approves Batch A.
