"""Build the bundled 240 m south-polar elevation map from LOLA LDEM_75S_120M.

Input (git-ignored): raw-data/LDEM_75S_120M.IMG from
https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/
Output: data/terrain/ldem_75s_240m.npz (2x2 block mean, int16 DN at 0.5 m).

Run from backend/:  uv run python scripts/build_terrain.py
"""

from pathlib import Path

import numpy as np

BACKEND = Path(__file__).resolve().parents[1]
RAW = BACKEND.parent / "raw-data" / "LDEM_75S_120M.IMG"
OUT = BACKEND / "data" / "terrain" / "ldem_75s_240m.npz"


def main() -> None:
    n = int(round((RAW.stat().st_size / 2) ** 0.5))
    dn = np.fromfile(RAW, dtype="<i2").reshape(n, n).astype(np.float32)
    # Pixel centers of the 2x2 blocks land exactly on the coarse grid (both centered at N/2 - 0.5).
    coarse = dn.reshape(n // 2, 2, n // 2, 2).mean(axis=(1, 3))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(OUT, dn=np.round(coarse).astype(np.int16), scale_m=240.0)
    print(f"Saved {coarse.shape} map to {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
