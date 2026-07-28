#!/usr/bin/env python3
"""把 index.html + styles.css + data.js + app.js 打包成單一 HTML 檔。

單一檔案方便 AirDrop 到手機、用 Safari 開啟後「加入主畫面」離線使用。

用法：
    python3 build.py
"""
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "東京日語衝刺.html"


def read(name: str) -> str:
    return (HERE / name).read_text(encoding="utf-8")


def main() -> None:
    html = read("index.html")
    replacements = [
        ('<link rel="stylesheet" href="styles.css">', "<style>\n" + read("styles.css") + "\n</style>"),
        ('<script src="data.js"></script>', "<script>\n" + read("data.js") + "\n</script>"),
        ('<script src="app.js"></script>', "<script>\n" + read("app.js") + "\n</script>"),
    ]
    for needle, block in replacements:
        if needle not in html:
            raise SystemExit(f"index.html 裡找不到要替換的標記：{needle}")
        html = html.replace(needle, block, 1)

    OUT.write_text(html, encoding="utf-8")
    print(f"✅ 已輸出單一檔案：{OUT.name}（{len(html.encode('utf-8')) / 1024:.0f} KB）")


if __name__ == "__main__":
    main()
