const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 8000;

// === CONFIG ===
const API_URL = 'https://jakpotgwab.geightdors.net/glms/v1/notify/taixiu?platform_id=g8&gid=vgmn_101';
const POLL_INTERVAL = 5000;
const MAX_HISTORY = 100;

app.use(cors());

let cachedRaw = null;
let cachedParsed = null;
let lastPhien = null;
let historyParsed = [];

function getTaiXiu(d1, d2, d3) {
  const total = d1 + d2 + d3;
  return total <= 10 ? "Xỉu" : "Tài";
}

async function pollAPI() {
  try {
    const res = await fetch(API_URL, {
      headers: {
        "User-Agent": "Node-Proxy/1.0"
      },
      timeout: 10000
    });
    const data = await res.json();
    cachedRaw = data;

    if (data?.status === "OK" && Array.isArray(data?.data) && data.data.length > 0) {
      const game = data.data[0];
      const { sid, d1, d2, d3 } = game;

      if (sid !== lastPhien && d1 != null && d2 != null && d3 != null) {
        lastPhien = sid;
        const parsed = {
          Phien: sid,
          Xuc_xac_1: d1,
          Xuc_xac_2: d2,
          Xuc_xac_3: d3,
          Tong: d1 + d2 + d3,
          Ket_qua: getTaiXiu(d1, d2, d3),
          id: "@axobantool",
          updatedAt: new Date().toISOString()
        };

        cachedParsed = parsed;
        historyParsed.push(parsed);
        if (historyParsed.length > MAX_HISTORY) {
          historyParsed.shift();
        }

        console.log(`[${new Date().toLocaleString()}] ✅ New HIT session:`, parsed);
      }
    }
  } catch (err) {
    console.error(`[${new Date().toLocaleString()}] ❌ Poll error:`, err.message);
  }

  setTimeout(pollAPI, POLL_INTERVAL);
}

pollAPI(); // Start polling loop

// === ROUTES ===
app.get("/", (req, res) => {
  res.send(`
    <h1>HitClub Tài Xỉu API</h1>
    <ul>
        <li><a href="/api/hit">/api/hit</a> – JSON mới nhất</li>
        <li><a href="/hit-history">/hit-history</a> – Lịch sử</li>
        <li><a href="/game-data">/game-data</a> – Raw JSON</li>
        <li><a href="/health">/health</a> – Health check</li>
    </ul>
  `);
});

app.get("/api/hit", (req, res) => {
  if (cachedParsed) res.json(cachedParsed);
  else res.status(404).json({ error: "No data" });
});

app.get("/api/hitclub", (req, res) => {
  if (cachedParsed) res.json(cachedParsed);
  else res.status(404).json({ error: "No data" });
});

app.get("/hit-history", (req, res) => {
  res.json(historyParsed);
});

app.get("/game-data", (req, res) => {
  if (cachedRaw) res.json(cachedRaw);
  else res.status(404).json({ error: "No raw data" });
});

app.get("/health", (req, res) => {
  res.send("OK");
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`🟢 HTTP server running at http://localhost:${PORT}`);
});
