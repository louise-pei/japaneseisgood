#!/usr/bin/env python3
"""從 data.js 產生日語發音音檔（macOS 內建 say ＋ afconvert，不需要任何外部套件）。

為什麼是預先產生而不是瀏覽器即時合成：使用者主要從主畫面圖示開啟（iOS
standalone），而 iOS 在那個模式下的音訊／語音 API 長期不穩。預先產生的
音檔品質固定、離線可靠、每台裝置一致。

用法：
    python3 make_audio.py            # 只產生缺少的
    python3 make_audio.py --force    # 全部重產

輸出：
    audio/<hash>.m4a
    audio-index.js
"""
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
AUDIO_DIR = HERE / "audio"
INDEX_FILE = HERE / "audio-index.js"

# 波浪號是句型佔位符，say 本來就會忽略，但先拿掉比較乾淨
TILDE = "〜"

BITRATE = 24000  # 實測：短句約 10 KB、長句約 30 KB


def resolve_voices() -> tuple:
    """從 say -v '?' 動態解析日語語音。

    不能寫死名稱 —— 短名稱（如 Reed）會抓到英語版並產出無聲檔案，
    而完整名稱（如「Reed (日文（日本）)」）會隨系統語言變動。
    """
    out = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    ja = []
    for line in out.splitlines():
        m = re.match(r"^(.*?)\s+([a-z]{2}_[A-Z]{2})\s+#", line)
        if m and m.group(2) == "ja_JP":
            ja.append(m.group(1).strip())
    if not ja:
        raise SystemExit(
            "找不到任何日語語音。請到 系統設定 → 輔助使用 → 旁白 → 語音 下載日文語音。"
        )

    def pick(prefix, fallback):
        return next((v for v in ja if v.startswith(prefix)), fallback)

    main = pick("Kyoko", ja[0])          # 卡片與參考答案：Apple 標準日語女聲
    npc = pick("Reed", main)             # 店員／站務員：換一個聲音才像對話
    if npc == main:
        print("⚠️  找不到第二個日語語音，NPC 台詞會與參考答案同聲音")
    return main, npc


def parse_texts() -> dict:
    """解析 data.js，回傳 {voice: {顯示文字: 實際要唸的文字}}。

    鍵一律是 App 畫面上顯示的那串（卡片的 jp），這樣前端直接拿畫面上的
    文字就能查到音檔。值才是送進 say 的內容：
      phrase → jp（句子有上下文，TTS 斷詞比純假名準）
      vocab / kanji → kana（實測 一人、両替 這類單詞唸 jp 會誤讀）
    """
    src = (HERE / "data.js").read_text(encoding="utf-8")
    main, npc = {}, {}

    # --- RAW_CARDS：靠縮排追蹤目前的 scenario 與 type ---
    in_cards = False
    cur_type = None
    for line in src.splitlines():
        if line.startswith("const RAW_CARDS"):
            in_cards = True
            continue
        if in_cards and line.startswith("};"):
            in_cards = False
            continue
        if not in_cards:
            continue
        m = re.match(r"^    (\w+): \[", line)
        if m:
            cur_type = m.group(1)
            continue
        m = re.match(r"^      \['([^']*)', '([^']*)'", line)
        if m and cur_type:
            jp, kana = m.group(1), m.group(2)
            main[jp] = jp if cur_type == "phrase" else kana

    # --- 對話與「一日東京」 ---
    for m in re.finditer(r"answer:\s*\{\s*jp:\s*'([^']*)'", src):
        main[m.group(1)] = m.group(1)
    for m in re.finditer(r"npc:\s*\{\s*jp:\s*'([^']*)'", src):
        npc[m.group(1)] = m.group(1)

    def clean(d):
        out = {}
        for key, spoken in d.items():
            s = spoken.replace(TILDE, "").strip()
            if s:
                out[key] = s
        return out

    return {"main": clean(main), "npc": clean(npc)}


def audio_name(spoken: str, voice: str) -> str:
    return hashlib.sha1(f"{voice} {spoken}".encode("utf-8")).hexdigest()[:10] + ".m4a"


def synth(text: str, voice: str, dest: pathlib.Path) -> None:
    with tempfile.NamedTemporaryFile(suffix=".aiff", delete=True) as tmp:
        subprocess.run(["say", "-v", voice, "-o", tmp.name, text], check=True)
        subprocess.run(
            ["afconvert", "-f", "m4af", "-d", "aac",
             "-b", str(BITRATE), "-q", "127", "-s", "3", tmp.name, str(dest)],
            check=True, capture_output=True,
        )


def main() -> None:
    force = "--force" in sys.argv
    main_voice, npc_voice = resolve_voices()
    print(f"語音 —— 卡片／答案：{main_voice}    NPC：{npc_voice}")

    AUDIO_DIR.mkdir(exist_ok=True)
    texts = parse_texts()
    voices = {"main": main_voice, "npc": npc_voice}

    index = {"main": {}, "npc": {}}
    made = skipped = 0
    for kind, mapping in texts.items():
        for original, spoken in mapping.items():
            name = audio_name(spoken, kind)
            dest = AUDIO_DIR / name
            index[kind][original] = name
            if dest.exists() and not force:
                skipped += 1
                continue
            synth(spoken, voices[kind], dest)
            made += 1
            print(f"  ♪ {original}", flush=True)

    # 清掉內容改動後不再需要的舊檔
    keep = {n for m in index.values() for n in m.values()}
    removed = 0
    for f in AUDIO_DIR.glob("*.m4a"):
        if f.name not in keep:
            f.unlink()
            removed += 1

    INDEX_FILE.write_text(
        "/* 由 make_audio.py 自動產生，請勿手動編輯。\n"
        "   原文 → 音檔名。App 靠這份索引判斷哪些文字有音檔，\n"
        "   沒有的就不顯示喇叭按鈕，避免出現按了沒反應的按鈕。 */\n"
        "const AUDIO_INDEX = " + json.dumps(index, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )

    total = sum(f.stat().st_size for f in AUDIO_DIR.glob("*.m4a"))
    count = len(list(AUDIO_DIR.glob("*.m4a")))
    print(f"\n✅ 新產生 {made}、沿用 {skipped}、清除 {removed}")
    print(f"   audio/ 共 {count} 個檔案，{total / 1024 / 1024:.2f} MB")
    print(f"   audio-index.js 已更新")


if __name__ == "__main__":
    main()
