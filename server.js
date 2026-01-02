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