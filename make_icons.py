#!/usr/bin/env python3
"""產生 PWA / 加到主畫面用的 app icon（鳥居圖案）。

用純標準函式庫寫 PNG，不需要 Pillow —— 這台機器的 Homebrew 是壞的，
盡量不要引入任何需要安裝的相依。

用法：
    python3 make_icons.py
"""
import pathlib
import struct
import zlib

HERE = pathlib.Path(__file__).resolve().parent

BG = (0xFF, 0xF3, 0xE4)      # 奶油底
RED = (0xE0, 0x48, 0x33)     # 鳥居朱紅
DARK = (0xB8, 0x36, 0x24)    # 柱腳陰影


def write_png(path: pathlib.Path, size: int, pixels: list) -> None:
    raw = b"".join(b"\x00" + bytes(v for px in row for v in px) for row in pixels)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit truecolor
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def render(size: int) -> list:
    """畫一座鳥居。座標以 1.0 = size 的比例表示，方便任意尺寸輸出。

    圖案刻意收在中央 ~72% 的範圍內，這樣 Android 的 maskable 圓角裁切
    不會把柱子切掉。
    """
    grid = [[BG for _ in range(size)] for _ in range(size)]

    def box(x0, y0, x1, y1, color):
        for y in range(max(0, int(y0 * size)), min(size, int(y1 * size))):
            row = grid[y]
            for x in range(max(0, int(x0 * size)), min(size, int(x1 * size))):
                row[x] = color

    # 笠木（最上面那根，兩端出挑）
    box(0.14, 0.22, 0.86, 0.30, RED)
    # 島木（笠木底下較短的一根）
    box(0.20, 0.30, 0.80, 0.35, DARK)
    # 貫（第二根橫樑）
    box(0.24, 0.46, 0.76, 0.53, RED)
    # 兩根柱子
    box(0.28, 0.30, 0.375, 0.82, RED)
    box(0.625, 0.30, 0.72, 0.82, RED)
    # 柱腳
    box(0.255, 0.78, 0.40, 0.82, DARK)
    box(0.60, 0.78, 0.745, 0.82, DARK)
    return grid


def main() -> None:
    for size in (192, 512):
        out = HERE / f"icon-{size}.png"
        write_png(out, size, render(size))
        print(f"✅ {out.name}（{out.stat().st_size / 1024:.1f} KB）")


if __name__ == "__main__":
    main()
