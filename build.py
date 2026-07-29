#!/usr/bin/env python3
"""把整個 App 打包成單一 HTML 檔。

單一檔案方便 AirDrop 到手機、直接開就能用，不需要伺服器。
會剝掉 manifest 與 service worker 的引用 —— 那兩個在 file:// 底下沒有意義
（單檔本來就是離線的），留著只會在 console 噴錯。

用法：
    python3 build.py
"""
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "東京日語衝刺.html"

INLINE = [
    ('<link rel="stylesheet" href="styles.css">', "styles.css", "style"),
    ('<script src="config.js"></script>', "config.js", "script"),
    ('<script src="data.js"></script>', "data.js", "script"),
    ('<script src="sync.js"></script>', "sync.js", "script"),
    ('<script src="app.js"></script>', "app.js", "script"),
]

# 單檔版用不到的區塊（成對的 HTML 註解標記）
STRIP_BLOCKS = ["PWA", "SW"]


def read(name: str) -> str:
    return (HERE / name).read_text(encoding="utf-8")


def main() -> None:
    html = read("index.html")

    for marker in STRIP_BLOCKS:
        pattern = re.compile(
            rf"[ \t]*<!-- {marker}:start -->.*?<!-- {marker}:end -->\n?",
            re.DOTALL,
        )
        html, n = pattern.subn("", html)
        if n == 0:
            raise SystemExit(f"index.html 裡找不到 <!-- {marker}:start --> … <!-- {marker}:end --> 區塊")

    for needle, filename, tag in INLINE:
        if needle not in html:
            raise SystemExit(f"index.html 裡找不到要替換的標記：{needle}")
        html = html.replace(needle, f"<{tag}>\n{read(filename)}\n</{tag}>", 1)

    OUT.write_text(html, encoding="utf-8")
    print(f"✅ 已輸出單一檔案：{OUT.name}（{len(html.encode('utf-8')) / 1024:.0f} KB）")


if __name__ == "__main__":
    main()
