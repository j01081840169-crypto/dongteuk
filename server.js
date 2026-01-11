const express = require("express");
const path = require("path");
const helmet = require("helmet");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const cleanRoutes = {
  "/main": "/main.html",
  "/second": "/second.html",
  "/notice": "/notice.html",
  "/notice-view": "/notice-view.html",
  "/notice-create": "/notice-create.html",
  "/dispatch": "/dispatch.html",
  "/dispatch-create": "/dispatch-create.html",
  "/report": "/report.html",
  "/office-work": "/office-work.html",
  "/register-info": "/register-info.html",
  "/paystub": "/paystub.html",
  "/paystub-create": "/paystub-create.html",
  "/paystub-receipt": "/paystub-receipt.html",
  "/meal-claim": "/meal-claim.html",
  "/extra-claim": "/extra-claim.html",
  "/claim-lookup": "/claim-lookup.html",
  "/attendance-lookup": "/attendance-lookup.html",
  "/driver-performance": "/driver-performance.html",
  "/settings": "/settings.html"
};

const htmlToClean = Object.fromEntries(
  Object.entries(cleanRoutes).map(([clean, html]) => [html, clean])
);

const resolveHtmlPath = (reqPath) => cleanRoutes[reqPath] || reqPath;

const adminOnlyPages = new Set([
  "/register-info.html",
  "/notice-create.html",
  "/dispatch-create.html",
  "/paystub-create.html",
  "/office-work.html"
]);

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  if (req.path === "/logout") return next();
  const cleanPath = htmlToClean[req.path];
  if (cleanPath) {
    const suffix = req.originalUrl.slice(req.path.length);
    return res.redirect(302, `${cleanPath}${suffix}`);
  }
  const resolvedPath = resolveHtmlPath(req.path);
  const isHtml = resolvedPath === "/" || resolvedPath.endsWith(".html");
  if (!isHtml) return next();
  if (resolvedPath === "/" || resolvedPath === "/index.html") {
    if (req.session?.user) {
      return res.redirect("/second");
    }
    return res.redirect("/main");
  }
  if (resolvedPath === "/main.html") {
    if (req.session?.user) {
      return res.redirect("/second");
    }
    return next();
  }
  if (!req.session?.user) {
    return res.redirect("/main");
  }
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  if (adminOnlyPages.has(resolvedPath) && req.session.user.role !== "admin") {
    return res.redirect("/second?denied=1");
  }
  return next();
});

app.use(
  express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath).toLowerCase() === ".html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
      }
    }
  })
);

Object.entries(cleanRoutes).forEach(([clean, html]) => {
  app.get(clean, (req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.sendFile(path.join(__dirname, html));
  });
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false
});

const adminOnlyKeys = new Set([
  "dongteukDrivers",
  "dongteukVehicles",
  "dongteukClients",
  "dongteukNotices",
  "dongteukDispatchMeta",
  "dongteukOffByDate",
  "dongteukMiscByDate"
]);

app.post("/api/login", loginLimiter, async (req, res) => {
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
      .select("username, name, role, password, password_hash")
      .eq("username", username)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({ ok: false, message: "관리자에게 문의하세요." });
    }

    let isValid = false;
    if (data.password_hash) {
      isValid = await bcrypt.compare(password, data.password_hash);
    } else if (data.password) {
      isValid = password === data.password;
    }

    if (!isValid) {
      return res.status(401).json({ ok: false, message: "관리자에게 문의하세요." });
    }

    if (!data.password_hash) {
      const nextHash = await bcrypt.hash(password, 10);
      await supabase
        .from("users")
        .update({ password_hash: nextHash, password: null })
        .eq("username", username);
    }

    req.session.user = { username: data.username, name: data.name, role: data.role };
    return res.json({ ok: true, user: req.session.user });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "관리자에게 문의하세요." });
  }
});

app.get("/api/session", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ ok: false });
  }
  return res.json({ ok: true, user: req.session.user });
});

app.post("/api/password", async (req, res) => {
  const currentUser = req.session?.user;
  if (!currentUser) {
    return res.status(401).json({ ok: false, message: "로그인이 필요합니다." });
  }
  const { current, next } = req.body || {};
  if (!current || !next) {
    return res.status(400).json({ ok: false, message: "관리자에게 문의하세요." });
  }
  if (!supabase) {
    return res.status(500).json({ ok: false, message: "서버 설정이 완료되지 않았습니다." });
  }
  try {
    const { data, error } = await supabase
      .from("users")
      .select("username, password, password_hash")
      .eq("username", currentUser.username)
      .maybeSingle();
    if (error || !data) {
      return res.status(401).json({ ok: false, message: "관리자에게 문의하세요." });
    }
    let isValid = false;
    if (data.password_hash) {
      isValid = await bcrypt.compare(current, data.password_hash);
    } else if (data.password) {
      isValid = current === data.password;
    }
    if (!isValid) {
      return res.status(401).json({ ok: false, message: "현재 비밀번호가 올바르지 않습니다." });
    }
    const nextHash = await bcrypt.hash(next, 10);
    await supabase
      .from("users")
      .update({ password_hash: nextHash, password: null })
      .eq("username", currentUser.username);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "관리자에게 문의하세요." });
  }
});

app.get("/logout", (req, res) => {
  req.session?.destroy(() => {
    res.redirect("/main");
  });
});

app.get("/api/data", async (req, res) => {
  const currentUser = req.session?.user;
  if (!currentUser) {
    return res.status(401).json({ ok: false });
  }
  if (!supabase) {
    return res.status(500).json({ ok: false, message: "서버 설정이 완료되지 않았습니다." });
  }
  const rawKeys = String(req.query.keys || "").trim();
  if (!rawKeys) {
    return res.json({ ok: true, data: {} });
  }
  const keys = rawKeys.split(",").map((key) => key.trim()).filter(Boolean);
  try {
    const { data, error } = await supabase
      .from("app_data")
      .select("key, value")
      .in("key", keys);
    if (error) {
      return res.status(500).json({ ok: false, message: "관리자에게 문의하세요." });
    }
    const map = {};
    (data || []).forEach((row) => {
      map[row.key] = row.value;
    });
    return res.json({ ok: true, data: map });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "관리자에게 문의하세요." });
  }
});

app.put("/api/data/:key", async (req, res) => {
  const currentUser = req.session?.user;
  if (!currentUser) {
    return res.status(401).json({ ok: false });
  }
  if (!supabase) {
    return res.status(500).json({ ok: false, message: "서버 설정이 완료되지 않았습니다." });
  }
  const key = String(req.params.key || "").trim();
  const value = typeof req.body?.value === "string" ? req.body.value : "";
  if (!key) {
    return res.status(400).json({ ok: false, message: "관리자에게 문의하세요." });
  }
  if (adminOnlyKeys.has(key) && currentUser.role !== "admin") {
    return res.status(403).json({ ok: false, message: "권한이 없습니다." });
  }
  try {
    const { error } = await supabase
      .from("app_data")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      return res.status(500).json({ ok: false, message: "관리자에게 문의하세요." });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "관리자에게 문의하세요." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
