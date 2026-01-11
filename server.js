const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const ALLOWED_ORIGIN = "https://revisitphysicss.onrender.com";

const app = express();

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["POST", "GET"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));



app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  const t = await pool.query("SELECT NOW() as now");
  console.log("The database is connected WOW, at:", t.rows[0].now);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, quiz_id)
  );
`);
  console.log("the DaTaBaDe tables are ready");
}


const answers = {
  1: "a",
  2: "a",
  3: ["b", "c", "e", "f"],
  4: "a"
};


//authenticationnnnns
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Bruh you can't sign in with just username or password, Lockin" });
  }
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Your Username and pass has to be a string" });
  }
  const cleanUsername = username.trim();

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: "username must be at least 3 characters, no less dude" });
  }
  if (password.includes(" ")) {
    return res.status(400).json({ error: "password cannot contain spaces" });
  }
  if (password.length < 8) {
  return res.status(400).json({ error: "password must be at least 8 characters" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  try {
  await pool.query(
    "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
    [cleanUsername, passwordHash]
  );

  return res.json({ ok: true });
  } 
  catch (err) {
  if (err && err.code === "23505") {
    return res.status(409).json({ error: "username already exists" });
  }

  console.error("register error:", err);
  return res.status(500).json({ error: "server error" });
  }




});










app.post("/check", (req, res) => {
  const { question, answer } = req.body;
  const correct = answers[question];

  let isCorrect = false;

  if (Array.isArray(correct)) {
    isCorrect =
      Array.isArray(answer) &&
      answer.length === correct.length &&
      answer.every(a => correct.includes(a));
  } else {
    isCorrect = answer === correct;
  }

  res.json({ correct: isCorrect });
});

const PORT = process.env.PORT || 3000;
initDb()
  .then(() => {
    app.listen(PORT, () => console.log("Server running on", PORT));
  })
  .catch(err => {
    console.error("Database init(initialisation) failed:", err);
    process.exit(1);
  });