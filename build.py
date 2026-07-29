#!/usr/bin/env python3
"""把整個 App 打包成單一 HTML 檔。

單一檔案方便 AirDrop 到手機、直接開就能用，不需要伺服器。
會剝掉 manifest 與 service worker 的引用 —— 那兩個在 file:// 底下沒有意義
（單檔本來就是離線的），留著只會在 console 噴錯。

用法：
    python3 build.py                # 不含音檔（約 100 KB）
    python3 build.py --with-audio   # 音檔以 base64 內嵌（約 2.5 MB，完全自足）
"""
import base64
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "東京日語衝刺.html"

INLINE = [
    ('<link rel="stylesheet" href="styles.css">', "styles.css", "style"),
    ('<script src="config.js"></script>', "config.js", "script"),
    ('<script src="data.js"></script>', "data.js", "script"),
    ('<script src="audio-index.js"></script>', "audio-index.js", "script"),
    ('<script src="audio.js"></script>', "audio.js", "script"),
    ('<script src="sync.js"></script>', "sync.js", "script"),
    ('<script src="app.js"></script>', "app.js", "script"),
]

# 單檔版用不到的區塊（成對的 HTML 註解標記）
STRIP_BLOCKS = ["PWA", "SW"]


def read(name: str) -> str:
    return (HERE / name).read_text(encoding="utf-8")


def audio_data_uris() -> str:
    """把 audio/ 底下的檔案轉成 base64 data URI，覆寫 audioSrc 的查表結果。"""
    index = json.loads(re.search(r"\{.*\}", read("audio-index.js"), re.S).group(0))
    names = {n for m in index.values() for n in m.values()}
    blobs = {}
    for name in sorted(names):
        raw = (HERE / "audio" / name).read_bytes()
        blobs[name] = "data:audio/mp4;base64," + base64.b64encode(raw).decode("ascii")
    return (
        "\n<script>\n"
        "/* 單檔版：音檔以 data URI 內嵌，audioSrc 直接回傳它們 */\n"
        "const AUDIO_BLOBS = " + json.dumps(blobs) + ";\n"
        "audioSrc = function (text, kind) {\n"
        "  if (!audioAvailable() || !text) return null;\n"
        "  const map = AUDIO_INDEX[kind === 'npc' ? 'npc' : 'main'];\n"
        "  const file = map && map[text];\n"
        "  return file ? AUDIO_BLOBS[file] || null : null;\n"
        "};\n"
        "downloadVoicePack = function () "
        "{ return Promise.resolve({ total: Object.keys(AUDIO_BLOBS).length, failed: 0 }); };\n"
        "voicePackCached = function () { return Promise.resolve(Object.keys(AUDIO_BLOBS).length); };\n"
        "</script>\n"
    )


def main() -> None:
    with_audio = "--with-audio" in sys.argv
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

    marker = "<!-- AUDIOBLOBS -->"
    if marker not in html:
        raise SystemExit("index.html 裡找不到 <!-- AUDIOBLOBS --> 標記")
    # 覆寫必須早於 app.js 的首次渲染，否則第一畫面會指向不存在的 audio/ 路徑
    html = html.replace(marker, audio_data_uris() if with_audio else "", 1)

    OUT.write_text(html, encoding="utf-8")
    size = len(html.encode("utf-8")) / 1024
    unit = f"{size / 1024:.1f} MB" if size > 1024 else f"{size:.0f} KB"
    extra = "（含內嵌音檔）" if with_audio else "（不含音檔，需要發音請加 --with-audio）"
    print(f"✅ 已輸出單一檔案：{OUT.name}，{unit} {extra}")


if __name__ == "__main__":
    main()
