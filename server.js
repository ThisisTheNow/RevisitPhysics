const express = require("express");
const cors = require("cors");

const ALLOWED_ORIGIN = "https://revisitphysicss.onrender.com";

const app = express();

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));



app.use(express.json());

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
app.listen(PORT, () => console.log("Server running on", PORT));