const path = require("path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const APP_VERSION = String(process.env.APP_VERSION || "1").trim();
const startTime = Date.now();

/** Simulated startup: probe succeeds after this many ms */
const STARTUP_OK_AFTER_MS = Number(process.env.STARTUP_OK_AFTER_MS) || 10000;

app.disable("x-powered-by");

app.get("/api/version", (_req, res) => {
  res.json({ version: APP_VERSION, service: "k8s-demo-app" });
});

app.get("/api/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.get("/api/ready", (_req, res) => {
  if (Date.now() - startTime < STARTUP_OK_AFTER_MS) {
    return res.status(503).type("text/plain").send("not-ready");
  }
  res.status(200).type("text/plain").send("ready");
});

app.get("/api/startup", (_req, res) => {
  if (Date.now() - startTime < STARTUP_OK_AFTER_MS) {
    return res.status(503).type("text/plain").send("starting");
  }
  res.status(200).type("text/plain").send("started");
});

const publicDir = path.join(__dirname, "..", "frontend", "public");
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on :${PORT} APP_VERSION=${APP_VERSION}`);
});
