import fs from 'fs';
import path from 'path';

const credsPath = '/Users/RichardDucat_1/.config/simmer/credentials.json';
const apiBase = 'https://api.simmer.markets';

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
const apiKey = creds.api_key;

async function getJson(url) {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

(async () => {
  const [portfolio, trades, positions] = await Promise.all([
    getJson(`${apiBase}/api/sdk/portfolio`),
    getJson(`${apiBase}/api/sdk/trades?limit=5`),
    getJson(`${apiBase}/api/sdk/positions`)
  ]);

  const tradesArr = Array.isArray(trades) ? trades : (trades?.trades || trades?.data || []);

  const data = {
    balanceUsd: fmtUsd(portfolio?.balance_usd ?? portfolio?.balanceUsd),
    exposureUsd: fmtUsd(portfolio?.exposure_usd ?? portfolio?.exposureUsd),
    positionsCount: Array.isArray(positions) ? positions.length : (positions?.count ?? 0),
    totalPnlUsd: fmtUsd(portfolio?.total_pnl_usd ?? portfolio?.totalPnlUsd),
    lastTrades: tradesArr.slice(0,5).map(t => ({
      side: t.side || t.direction || 'TRADE',
      symbol: t.symbol || t.market || t.asset || 'UNKNOWN',
      price: t.price != null ? `$${Number(t.price).toFixed(4)}` : '--',
      size: t.size != null ? Number(t.size).toFixed(4) : '--'
    })),
    updatedAt: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET'
  };

  const outPath = path.resolve('docs/data.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log('Updated', outPath);
})();
