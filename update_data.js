import fs from "fs";
import path from "path";

const apiBase = "https://api.simmer.markets";
const defaultCredsPath = "/Users/RichardDucat_1/.config/simmer/credentials.json";
const credsPath = process.env.SIMMER_CREDENTIALS_PATH || defaultCredsPath;
const docsDir = path.resolve("docs");

function readApiKey() {
  if (process.env.SIMMER_API_KEY) {
    return process.env.SIMMER_API_KEY;
  }

  if (!fs.existsSync(credsPath)) {
    throw new Error(
      "Missing API key. Set SIMMER_API_KEY or SIMMER_CREDENTIALS_PATH to a credentials JSON file."
    );
  }

  const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
  if (!creds.api_key) {
    throw new Error(`No api_key found in ${credsPath}`);
  }
  return creds.api_key;
}

function fmtUsd(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "$0.00";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(numeric);
}

function pickArray(payload, keyNames) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (let i = 0; i < keyNames.length; i += 1) {
    const candidate = payload[keyNames[i]];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function safeFixed(value, digits) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "--";
}

function normalizeTrade(trade) {
  const action = trade?.action ? String(trade.action).toUpperCase() : "";
  const side = trade?.side ? String(trade.side).toUpperCase() : "";
  const sideText = `${action}${action && side ? " " : ""}${side}`.trim() || "TRADE";

  return {
    side: sideText,
    symbol:
      trade?.market_question || trade?.question || trade?.symbol || trade?.market || trade?.asset || "UNKNOWN",
    price:
      trade?.price_before != null ? `$${safeFixed(trade.price_before, 3)}` :
      trade?.price != null ? `$${safeFixed(trade.price, 3)}` :
      "--",
    size:
      trade?.shares != null ? safeFixed(trade.shares, 2) :
      trade?.size != null ? safeFixed(trade.size, 2) :
      "--"
  };
}

async function getJson(url, apiKey) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

async function main() {
  const apiKey = readApiKey();

  const [portfolio, tradesPayload, positionsPayload] = await Promise.all([
    getJson(`${apiBase}/api/sdk/portfolio`, apiKey),
    getJson(`${apiBase}/api/sdk/trades?limit=5`, apiKey),
    getJson(`${apiBase}/api/sdk/positions`, apiKey)
  ]);

  const trades = pickArray(tradesPayload, ["trades", "data"]);
  const positions = pickArray(positionsPayload, ["positions", "data"]);

  const balanceRaw = portfolio?.balance_usd ?? portfolio?.balanceUsd;
  const exposureRaw = portfolio?.exposure_usd ?? portfolio?.exposureUsd;
  const pnlRaw = portfolio?.total_pnl_usd ?? portfolio?.totalPnlUsd;

  const fallbackExposure = positionsPayload?.total_value ?? positionsPayload?.totalValue;
  const fallbackPnl = positionsPayload?.polymarket_pnl ?? positionsPayload?.sim_pnl ?? positionsPayload?.pnl;

  const resolvedExposure = Number(exposureRaw) ? exposureRaw : fallbackExposure;
  const resolvedPnl = Number(pnlRaw) ? pnlRaw : fallbackPnl;

  const data = {
    balanceUsd: fmtUsd(balanceRaw),
    exposureUsd: fmtUsd(resolvedExposure),
    positionsCount: positions.length || positionsPayload?.count || 0,
    totalPnlUsd: fmtUsd(resolvedPnl),
    lastTrades: trades.slice(0, 5).map(normalizeTrade),
    updatedAt: `${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET`
  };

  fs.writeFileSync(path.join(docsDir, "data.json"), `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(path.join(docsDir, "data.js"), `window.TICKER_DATA = ${JSON.stringify(data)};\n`);

  console.log("Updated docs/data.json and docs/data.js");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
