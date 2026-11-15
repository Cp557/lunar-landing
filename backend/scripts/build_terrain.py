"""Build the bundled south-polar elevation maps from LOLA LDEM_75S_120M.

Input (git-ignored): raw-data/LDEM_75S_120M.IMG from
https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/
Outputs (int16 DN at 0.5 m, both centered on the pole at N/2 - 0.5):
  data/terrain/ldem_75s_240m.npz   whole map, 2x2 block mean (far field, 75S-90S)
  data/terrain/ldem_845s_120m.npz  full-resolution crop to ~84.5S plus a 15 km margin (near field)

Run from backend/:  uv run python scripts/build_terrain.py
"""

from pathlib import Path

import numpy as np

BACKEND = Path(__file__).resolve().parents[1]
RAW = BACKEND.parent / "raw-data" / "LDEM_75S_120M.IMG"
TERRAIN = BACKEND / "data" / "terrain"
NEAR_CROP_PX = 3040  # 120 m pixels: half-width 182 km = 84.5S (167 km) + 15 km near field


def save(name: str, dn: np.ndarray, scale_m: float) -> None:
    out = TERRAIN / name
    np.savez_compressed(out, dn=np.round(dn).astype(np.int16), scale_m=scale_m)
    print(f"Saved {dn.shape} map to {out} ({out.stat().st_size / 1e6:.1f} MB)")


def main() -> None:
    n = int(round((RAW.stat().st_size / 2) ** 0.5))
    dn = np.fromfile(RAW, dtype="<i2").reshape(n, n)
    TERRAIN.mkdir(parents=True, exist_ok=True)
    # Pixel centers of the 2x2 blocks land exactly on the coarse grid (both centered at N/2 - 0.5).
    save("ldem_75s_240m.npz", dn.astype(np.float32).reshape(n // 2, 2, n // 2, 2).mean(axis=(1, 3)), 240.0)
    # An even-sized crop starting at N/2 - CROP/2 keeps the pole at the crop's own N/2 - 0.5.
    first = n // 2 - NEAR_CROP_PX // 2
    save("ldem_845s_120m.npz", dn[first : first + NEAR_CROP_PX, first : first + NEAR_CROP_PX], 120.0)


if __name__ == "__main__":
    main()
