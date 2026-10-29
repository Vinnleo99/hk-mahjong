# Tile classifier: training and evaluation

The app's AI tile reader is a small CNN (426k parameters, int8 weights, **≈430 KB**),
run by a dependency-free TypeScript runtime (`src/scan/model.ts`). It is lazy-loaded
from `public/model/tiles-v1.bin` the first time you scan, and precached by the
service worker so it works offline. `public/model/tiles-v1.onnx` is the same
network in ONNX (fp32) for anyone who wants to use it elsewhere.

## Data

* **Real photos:** [Camerash/mahjong-dataset](https://github.com/Camerash/mahjong-dataset)
  (MIT licence). 628 cropped single-tile photos across 42 classes (34 tiles plus 8 flowers and seasons), about 15 per class.
  **Caveat:** the authors collected the images from Google, eBay and Alibaba. The repo is MIT,
  but the original photographers' rights are not documented. We therefore ship **only the trained
  weights**, never the images, and do not commit the images to this repo.
* **Synthetic:** the app's own tile drawings (`src/tileSvg.ts`, MIT, part of this project), rendered to PNG and heavily augmented.

Split: a stratified 80/20 split per class (seed 0), giving 509 train and **119 held-out** real photos.
The held-out photos are never used for training or model selection; the final epoch is used as is.

## Reproduce

```bash
python -m venv venv && venv/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
venv/bin/pip install onnx pillow numpy
# put the dataset's data.csv + images/ in this folder, and the 42 rendered tiles in synth/<face>.png
venv/bin/python train.py           # ≈2 h on 8 CPU cores; writes m.pt, tiles.onnx, split.json
venv/bin/python export.py ../public/model/tiles-v1.bin
venv/bin/python fixture.py         # held-out copies + 30 composite row photos into data/ (git-ignored)
npm run dev  # then open http://localhost:5173/training/eval.html
```

## Measured accuracy (held-out real photos, 29 Oct 2026)

| Test | AI model | Template matcher (old) |
|---|---|---|
| 119 held-out single-tile photos, PyTorch, tight crop as in the dataset | **95.8 %** top-1, 98.3 % top-3 | n/a |
| Same 119 photos through the **app's full pipeline** (detect, crop, int8 TS runtime) | **85.7 %** top-1, 89.1 % top-3 | 25.2 % top-1, 37.0 % top-3 |
| 30 composite photos of 14 held-out tiles (1 or 2 rows, half tilted up to ±8°) | 89.3 % of tiles right; 11 of 30 hands fully right | 23.3 % of tiles |
| Tile count and row count found correctly on those 30 | 29 / 30 | 29 / 30 |

Honest limits: the held-out set is small (about 3 photos per class) and comes from the same scraped
source as the training data, mostly clean product shots. The composite rows are real tile photos
pasted on a synthetic cloth, **not** phone photos of a real table. Expect lower accuracy on your
phone at first. Calibration, the rule checks and correcting tiles in the review step all help.
