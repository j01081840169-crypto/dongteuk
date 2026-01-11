const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).send("관리자에게 문의하세요.");
  }

  const isValidUser = username === "admin" && password === "1234";
  if (!isValidUser) {
    return res.status(401).send("관리자에게 문의하세요.");
  }

  return res.redirect("/second.html");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

