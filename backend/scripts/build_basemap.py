"""Render the south-pole shaded-relief map used by the frontend's site picker.

Input: data/terrain/ldem_75s_240m.npz (LOLA, built by build_terrain.py).
Output: ../frontend/public/south-pole-map.png, 848 x 848 grayscale, polar stereographic,
centered on the pole, half-width HALF_EXTENT_M, image "up" = toward Earth (0° E).

Run from backend/:  uv run python -m scripts.build_basemap
"""

import struct
import zlib
from pathlib import Path

import numpy as np

from lunar.terrain import COARSE_MAP_PATH

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "south-pole-map.png"
CROP_PX = 2544  # 240 m pixels; 3x3 blocks -> 848 px at 720 m
HALF_EXTENT_M = CROP_PX / 2 * 240.0  # 305,280 m, about 80.0 S at the edges' midpoints


def hillshade(z: np.ndarray, spacing_m: float, azimuth_deg=315.0, altitude_deg=45.0, exaggeration=2.0):
    dzdy, dzdx = np.gradient(z * exaggeration, spacing_m)
    slope = np.arctan(np.hypot(dzdx, dzdy))
    aspect = np.arctan2(dzdy, -dzdx)
    az, alt = np.radians(360 - azimuth_deg + 90), np.radians(altitude_deg)
    shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    return np.clip(shade, 0, 1)


def write_png(path: Path, gray: np.ndarray) -> None:
    """Minimal 8-bit grayscale PNG writer (stdlib only)."""
    h, w = gray.shape
    raw = b"".join(b"\x00" + row.tobytes() for row in gray)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    header = struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def main() -> None:
    d = np.load(COARSE_MAP_PATH)
    dn, scale = d["dn"], float(d["scale_m"])
    first = int(dn.shape[0] / 2 - CROP_PX / 2)  # symmetric about the pole (center N/2 - 0.5)
    z = dn[first : first + CROP_PX, first : first + CROP_PX].astype(np.float32) * 0.5
    z = z.reshape(CROP_PX // 3, 3, CROP_PX // 3, 3).mean(axis=(1, 3))
    shade = hillshade(z, 3 * scale)
    elev = (z - z.min()) / (z.max() - z.min())
    gray = np.clip(20 + 200 * (0.8 * shade + 0.2 * elev), 0, 255).astype(np.uint8)
    write_png(OUT, gray)
    print(f"Saved {gray.shape} map to {OUT} ({OUT.stat().st_size / 1e3:.0f} kB), half extent {HALF_EXTENT_M:.0f} m")


if __name__ == "__main__":
    main()
