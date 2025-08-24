#!/usr/bin/env node
// -*- coding: utf-8 -*-

const http = require("http");
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const os = require("os");

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 8000; // ✅ Dành cho Render
const API_URL = "https://jakpotgwab.geightdors.net/glms/v1/notify/taixiu?platform_id=g8&gid=vgmn_101";
const POLL_INTERVAL = 5000;
const RETRY_DELAY = 5000;
const MAX_HISTORY = 100;

let cached_raw = null;
let cached_parsed = null;
let last_sid = null;
let history_parsed = [];

// === Helper: Tài / Xỉu ===
function getTaiXiu(d1, d2, d3) {
  const total = d1 + d2 + d3;
  return total <= 10 ? "Xỉu" : "Tài";
}

// === Polling API ===
async function pollAPI() {
  while (true) {
    try {
      const resp = await fetch(API_URL, {
        headers: { "User-Agent": "Node-Proxy/1.0" },
        timeout: 15000,
      });
      const data = await resp.json();
      cached_raw = data;

      if (data.status === "OK" && Array.isArray(data.data) && data.data.length > 0) {
        const game = data.data[0];
        const { sid, d1, d2, d3 } = game;

        if (sid !== last_sid && d1 != null && d2 != null && d3 != null) {
          last_sid = sid;
          const parsed = {
            Phien: sid,              // ✅ đổi từ sid thành Phien
            Xuc_xac_1: d1,
            Xuc_xac_2: d2,
            Xuc_xac_3: d3,
            Tong: d1 + d2 + d3,
            Ket_qua: getTaiXiu(d1, d2, d3),
            id: "axobantool",
            updatedAt: new Date().toISOString(),
          };
          cached_parsed = parsed;
          history_parsed.push(parsed);
          if (history_parsed.length > MAX_HISTORY) history_parsed.shift();
          console.log(`[${new Date().toISOString()}] ✅ New HIT session:`, parsed);
        }
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ Poll error:`, err.message);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}
pollAPI();

// === HTTP Server ===
const app = express();
app.use(cors());

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

app.get("/api/hit", (req, res) => res.json(cached_parsed || { error: "No data" }));
app.get("/api/hitclub", (req, res) => res.json(cached_parsed || { error: "No data" }));
app.get("/hit-history", (req, res) => res.json(history_parsed));
app.get("/game-data", (req, res) => res.json(cached_raw || { error: "No raw data" }));
app.get("/health", (req, res) => res.send("OK"));

// Start server
const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  const interfaces = os.networkInterfaces();
  let localIp = "127.0.0.1";
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) localIp = iface.address;
    }
  }
  console.log(`🟢 HTTP server running at http://${localIp}:${PORT}`);
});
