const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const USER_AGENT = "Mozilla/5.0 (compatible; UPS-Advisor-Workspace/1.0; +https://vercel.app)";
const QUOTE_TTL_MS = 45_000;
const HISTORY_TTL_MS = 15 * 60_000;
const MAX_CACHE_ENTRIES = 600;
const quoteCache = new Map();
const historyCache = new Map();

function now() { return Date.now(); }
function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function signedPercent(value) {
  const number = finite(value);
  if (number === null) return null;
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}
function priceText(value, currency = "USD") {
  const number = finite(value);
  if (number === null) return null;
  if (currency === "USD") return `$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
function isoDateFromEpoch(seconds) {
  if (!Number.isFinite(Number(seconds))) return null;
  return new Date(Number(seconds) * 1000).toISOString().slice(0, 10);
}
function asOfText(seconds, timezone = "America/New_York") {
  if (!Number.isFinite(Number(seconds))) return "Yahoo Finance market data";
  try {
    const stamp = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone, timeZoneName: "short" }).format(new Date(Number(seconds) * 1000));
    return `Yahoo Finance · ${stamp}`;
  } catch {
    return `Yahoo Finance · ${new Date(Number(seconds) * 1000).toISOString()}`;
  }
}
function prune(cache) {
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
}
function cached(cache, key, ttl) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (now() - entry.at > ttl) { cache.delete(key); return null; }
  return entry.value;
}
function store(cache, key, value) {
  cache.set(key, { at: now(), value });
  prune(cache);
  return value;
}

async function fetchChart(symbol, { range, interval, fetchImpl = globalThis.fetch, timeoutMs = 4500 } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Market data fetch is unavailable");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL(`${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}`);
    url.searchParams.set("range", range);
    url.searchParams.set("interval", interval);
    url.searchParams.set("includePrePost", "false");
    url.searchParams.set("events", "div,splits");
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Yahoo Finance ${response.status}`);
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    if (!result || payload?.chart?.error) throw new Error(payload?.chart?.error?.description || "Yahoo Finance returned no chart data");
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function quoteFromChart(symbol, chart) {
  const meta = chart.meta || {};
  const timestamps = Array.isArray(chart.timestamp) ? chart.timestamp : [];
  const closes = chart.indicators?.quote?.[0]?.close || [];
  const points = [];
  for (let index = 0; index < Math.min(timestamps.length, closes.length); index += 1) {
    const value = finite(closes[index]);
    if (value !== null) points.push({ time: Number(timestamps[index]), value });
  }
  const latestPoint = points.at(-1);
  const price = finite(meta.regularMarketPrice) ?? latestPoint?.value ?? null;
  const previousClose = finite(meta.regularMarketPreviousClose) ?? finite(meta.previousClose) ?? finite(meta.chartPreviousClose);
  const changePercent = price !== null && previousClose ? ((price - previousClose) / previousClose) * 100 : null;
  const asOf = finite(meta.regularMarketTime) ?? latestPoint?.time ?? null;
  return {
    symbol,
    price,
    previousClose,
    changePercent,
    currency: meta.currency || "USD",
    exchange: meta.fullExchangeName || meta.exchangeName || null,
    timezone: meta.exchangeTimezoneName || "America/New_York",
    asOf,
    points: points.slice(-30),
    provider: "Yahoo Finance",
  };
}

export async function getLiveQuote(symbol, options = {}) {
  const key = String(symbol || "").trim().toUpperCase();
  if (!key) return null;
  const cachedValue = cached(quoteCache, key, QUOTE_TTL_MS);
  if (cachedValue) return cachedValue;
  try {
    const chart = await fetchChart(key, { range: "1d", interval: "5m", ...options });
    return store(quoteCache, key, quoteFromChart(key, chart));
  } catch {
    return null;
  }
}

export async function getDailyHistory(symbol, options = {}) {
  const key = String(symbol || "").trim().toUpperCase();
  if (!key) return null;
  const cacheKey = `${key}:5y:1d`;
  const cachedValue = cached(historyCache, cacheKey, HISTORY_TTL_MS);
  if (cachedValue) return cachedValue;
  try {
    const chart = await fetchChart(key, { range: "5y", interval: "1d", timeoutMs: 6500, ...options });
    const timestamps = Array.isArray(chart.timestamp) ? chart.timestamp : [];
    const adjusted = chart.indicators?.adjclose?.[0]?.adjclose;
    const closes = Array.isArray(adjusted) ? adjusted : chart.indicators?.quote?.[0]?.close || [];
    const points = [];
    for (let index = 0; index < Math.min(timestamps.length, closes.length); index += 1) {
      const value = finite(closes[index]);
      const time = isoDateFromEpoch(timestamps[index]);
      if (value !== null && time) points.push({ time, value: Number(value.toFixed(4)) });
    }
    if (points.length < 2) return null;
    const result = {
      symbol: key,
      points,
      asOf: points.at(-1).time,
      frequency: "Yahoo Finance daily adjusted close",
      provider: "Yahoo Finance",
    };
    return store(historyCache, cacheKey, result);
  } catch {
    return null;
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function getLiveQuotes(items, options = {}) {
  const eligible = items.filter((item) => item && ["Equities", "ETFs"].includes(item.category) && item.symbol);
  const rows = await mapWithConcurrency(eligible, 6, async (item) => ({ item, quote: await getLiveQuote(item.symbol, options) }));
  return new Map(rows.filter((row) => row.quote).map((row) => [row.item.id, row.quote]));
}

export function applyQuoteToSnapshot(snapshot, quote) {
  if (!snapshot || !quote || quote.price === null) return snapshot;
  const change = signedPercent(quote.changePercent);
  const points = quote.points.map((point) => point.value);
  return {
    ...snapshot,
    primary: {
      ...snapshot.primary,
      label: "Market price",
      value: priceText(quote.price, quote.currency),
      change: change || snapshot.primary?.change,
      tone: quote.changePercent === null ? "neutral" : quote.changePercent >= 0 ? "positive" : "negative",
    },
    trend: {
      ...snapshot.trend,
      label: "Today",
      value: change || snapshot.trend?.value,
      points: points.length >= 2 ? points : snapshot.trend?.points,
      tone: quote.changePercent === null ? "neutral" : quote.changePercent >= 0 ? "positive" : "negative",
    },
    asOf: asOfText(quote.asOf, quote.timezone),
  };
}

export function applyQuoteToDetail(detail, quote) {
  if (!detail || !quote || quote.price === null || !["Equities", "ETFs"].includes(detail.category)) return detail;
  const change = signedPercent(quote.changePercent);
  const previousClose = priceText(quote.previousClose, quote.currency);
  return {
    ...detail,
    profile: {
      ...detail.profile,
      quote: {
        ...detail.profile?.quote,
        label: "Market price",
        value: priceText(quote.price, quote.currency),
        change: change || detail.profile?.quote?.change,
        changeTone: quote.changePercent === null ? "neutral" : quote.changePercent >= 0 ? "positive" : "negative",
        secondaryLabel: previousClose ? "Previous close" : detail.profile?.quote?.secondaryLabel,
        secondaryValue: previousClose || detail.profile?.quote?.secondaryValue,
        asOf: asOfText(quote.asOf, quote.timezone),
      },
    },
    controls: {
      ...detail.controls,
      data: {
        ...detail.controls?.data,
        label: "Current",
        detail: asOfText(quote.asOf, quote.timezone),
        source: `${detail.category === "ETFs" ? "Nasdaq Trader reference" : "SEC issuer reference"} + Yahoo Finance market data`,
      },
    },
  };
}