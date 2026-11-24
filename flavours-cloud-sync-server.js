/*
  FLAVOURS V2.0 - minimal single-business cloud sync API example
  Run behind HTTPS. Set FLAVOURS_SYNC_TOKEN to a long random secret.
  This example stores one business backup in flavours-cloud-backup.json.
  For multiple businesses/users, use a database and separate tenant IDs.
*/
"use strict";
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.FLAVOURS_SYNC_TOKEN;
const FILE = path.join(__dirname, "flavours-cloud-backup.json");
if (!TOKEN) throw new Error("Set FLAVOURS_SYNC_TOKEN before starting the server.");
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "https://your-app-domain.example");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (req.url.split("?")[0] !== "/api/sync") { res.writeHead(404); return res.end(JSON.stringify({error:"Not found"})); }
  if (req.headers.authorization !== `Bearer ${TOKEN}`) { res.writeHead(401); return res.end(JSON.stringify({error:"Unauthorised"})); }
  try {
    if (req.method === "POST") {
      let body = "";
      for await (const chunk of req) { body += chunk; if (body.length > 25 * 1024 * 1024) throw new Error("Backup too large (25 MB limit)"); }
      const backup = JSON.parse(body);
      if (!backup || !Array.isArray(backup.products) || !Array.isArray(backup.sales)) throw new Error("Invalid Flavours backup");
      await fs.writeFile(FILE, JSON.stringify(backup), { mode: 0o600 });
      res.writeHead(200); return res.end(JSON.stringify({ok:true, savedAt:new Date().toISOString()}));
    }
    if (req.method === "GET" && new URL(req.url, `http://${req.headers.host}`).searchParams.get("action") === "download") {
      const backup = await fs.readFile(FILE, "utf8");
      res.writeHead(200); return res.end(backup);
    }
    res.writeHead(405); return res.end(JSON.stringify({error:"Method not allowed"}));
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 400);
    return res.end(JSON.stringify({error:error.code === "ENOENT" ? "No cloud backup exists yet" : error.message}));
  }
});
server.listen(PORT, () => console.log(`Flavours sync API listening on port ${PORT}`));
