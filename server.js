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
const bcrypt = require("bcryptjs");


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
  4: "a",
  5: "a",
  6: ["a", "b", "c", "d", "e"],
  7: "a",
  8: "b",
  9: ["a", "b", "c", "d"],
  10: "a"



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
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Enter both a username and password" })
  };
  if (typeof username !== "string" || typeof password !== "string") {
  return res.status(400).json({ error: "username and password must be strings" })
  };
  const userResult = await pool.query(
  "SELECT id, password_hash FROM users WHERE username = $1",
  [username]
  );
  if (userResult.rows.length === 0) {
  return res.status(401).json({ error: " Couldnt find your Password or Username man" });
  };
  const passwordMatches = await bcrypt.compare(
  password,
  userResult.rows[0].password_hash
  );
  if (!passwordMatches) {
  return res.status(401).json({ error: "Couldnt find your Password or Username man" });
  };
  return res.json({ ok: true, userId: userResult.rows[0].id });
  
  
});
//Save Progress API endpoint i will do my progress saving here
app.post("/progress/save", async (req, res) => {
  const { userId, quizId, score, total } = req.body || {};
  if (!userId || !quizId || score === undefined || total === undefined) {
    return res.status(400).json({ error: "userId, quizId score and total are all needed" });
 }
  if (!Number.isInteger(userId) || typeof quizId !== "string" || !Number.isInteger(score) || !Number.isInteger(total)) {
    return res.status(400).json({ error: "UserId must be a interger QuizID must be a string Score and Total must be integers" });};
  if (score < 0 || total <= 0 || score > total) {
    return res.status(400).json({ error: "score must be between 0 and total, and total must be > 0" });};
  try{
    await pool.query(
  `INSERT INTO progress (user_id, quiz_id, score, total)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (user_id, quiz_id)
   DO UPDATE SET score = EXCLUDED.score, total = EXCLUDED.total, updated_at = NOW()`,
  [userId, quizId, score, total]
    );
  return res.json({ ok: true });
  }
  catch (err) {
    console.error("Tried saving Progress but it led to a save error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

app.get("/progress/load", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!Number.isInteger(userId)) {
  return res.status(400).json({ error: "That isnt a valid user id" });
  };
  try{
    const result = await pool.query(
    `SELECT quiz_id, score, total, updated_at
    FROM progress
    WHERE user_id = $1
    ORDER BY updated_at DESC`,
    [userId]
    );
    return res.json({ ok: true, progress: result.rows });
  }
  catch (err) {
    console.error("Tried loading Progress but it led to a load error:", err);
    return res.status(500).json({ error: "server error" });}
});


app.get("/user", async (req, res) => {
  const userId = Number(req.query.userId);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: "That isnt a valid user id" });
  }
  try{
    const results = await pool.query(`SELECT username, created_at FROM users WHERE id = $1`, [userId]);
    if (results.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
   return res.json({ ok: true, username: results.rows[0].username, createdAt: results.rows[0].created_at });
  }
  catch (err) {
    console.error("Tried fetching user data but it led to an error:", err);
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