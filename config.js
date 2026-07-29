/* ==========================================================================
   跨裝置同步設定（選填）
   --------------------------------------------------------------------------
   留空時 App 一切正常，只是沒有跨裝置同步 —— 進度仍然存在這台裝置的
   localStorage 裡，也仍然可以用「匯出 / 匯入 JSON」搬家。

   要啟用同步：
     1. 到 https://supabase.com 開一個免費專案
     2. SQL Editor → 貼上 supabase-setup.sql 並執行
     3. Settings → API → 把 Project URL 和 anon / public key 填到下面

   ⚠️ 這裡只能放 anon / public key —— 它設計上就是要公開的，配合資料表的
      RLS（表本身完全鎖死，外界只能透過 pull / push 兩支函式存取）。
      千萬不要貼 service_role key，那把鑰匙會繞過所有權限。
   ========================================================================== */

const SUPABASE_URL = '';       // 例：https://abcdefghijklmnop.supabase.co
const SUPABASE_ANON_KEY = '';  // 例：eyJhbGciOiJIUzI1NiIsInR5cCI6...
