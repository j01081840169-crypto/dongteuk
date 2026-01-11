const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "관리자에게 문의하세요." });
  }

  if (!supabase) {
    return res.status(500).json({ ok: false, message: "서버 설정이 완료되지 않았습니다." });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("username, name, role")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({ ok: false, message: "관리자에게 문의하세요." });
    }

    return res.json({ ok: true, user: data });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "관리자에게 문의하세요." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
