const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_QUOTE_BASE = "https://query1.finance.yahoo.com/v7/finance/quote";
const YAHOO_SPARK_BASE = "https://query1.finance.yahoo.com/v7/finance/spark";
const YAHOO_COOKIE_URL = "https://fc.yahoo.com";
const YAHOO_CRUMB_URL = "https://query1.finance.yahoo.com/v1/test/getcrumb";
const USER_AGENT = "Mozilla/5.0 (compatible; UPS-Advisor-Workspace/1.0; +https://vercel.app)";
const QUOTE_TTL_MS = 45_000;
const HISTORY_TTL_MS = 15 * 60_000;
const RETURN_TTL_MS = 15 * 60_000;
const AUTH_TTL_MS = 30 * 60_000;
const GLOBAL_SORT_TTL_MS = 2 * 60_000;
const GLOBAL_SORT_BATCH_SIZE = 750;
const GLOBAL_SORT_CONCURRENCY = 8;
const MAX_CACHE_ENTRIES = 600;
const quoteCache = new Map();
const historyCache = new Map();
const returnCache = new Map();
const globalQuoteIndexCache = new Map();
const globalQuoteIndexPending = new Map();
let yahooAuth = null;
let yahooAuthPending = null;

function now() { return Date.now(); }
function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function signedPercent(value, digits = 2) {
  const number = finite(value);
  if (number === null) return null;
  return `${number >= 0 ? "+" : ""}${number.toFixed(digits)}%`;
}
function priceText(value, currency = "USD") {
  const number = finite(value);
  if (number === null) return null;
  if (currency === "USD") return `$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
function compactMoney(value, currency = "USD") {
  const number = finite(value);
  if (number === null) return null;
  const absolute = Math.abs(number);
  const sign = number < 0 ? "−" : "";
  const prefix = currency === "USD" ? "$" : `${currency} `;
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  const unit = units.find(([size]) => absolute >= size);
  if (!unit) return `${sign}${prefix}${Math.round(absolute).toLocaleString("en-US")}`;
  const scaled = absolute / unit[0];
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${sign}${prefix}${scaled.toFixed(digits).replace(/\.0+$|(?<=\.\d)0$/, "")}${unit[1]}`;
}
function multipleText(value) {
  const number = finite(value);
  return number === null ? null : `${number.toFixed(1)}×`;
}
function percentText(value) {
  const number = finite(value);
  return number === null ? null : `${number.toFixed(2)}%`;
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
function rowTimeText(seconds, timezone = "America/New_York") {
  if (!Number.isFinite(Number(seconds))) return "Live";
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone, timeZoneName: "short" }).format(new Date(Number(seconds) * 1000));
  } catch {
    return new Date(Number(seconds) * 1000).toISOString();
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
function symbolKey(symbol) { return String(symbol || "").trim().toUpperCase(); }

async function fetchWithTimeout(url, { fetchImpl = globalThis.fetch, timeoutMs = 4500, ...options } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Market data fetch is unavailable");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchChart(symbol, { range, interval, fetchImpl = globalThis.fetch, timeoutMs = 4500 } = {}) {
  const url = new URL(`${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}`);
  url.searchParams.set("range", range);
  url.searchParams.set("interval", interval);
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");
  const response = await fetchWithTimeout(url, {
    fetchImpl,
    timeoutMs,
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Yahoo Finance ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  if (!result || payload?.chart?.error) throw new Error(payload?.chart?.error?.description || "Yahoo Finance returned no chart data");
  return result;
}

async function fetchSpark(symbols, { range, interval, fetchImpl = globalThis.fetch, timeoutMs = 4500 } = {}) {
  const unique = [...new Set(symbols.map(symbolKey).filter(Boolean))];
  if (!unique.length) return new Map();
  const url = new URL(YAHOO_SPARK_BASE);
  url.searchParams.set("symbols", unique.join(","));
  url.searchParams.set("range", range);
  url.searchParams.set("interval", interval);
  url.searchParams.set("indicators", "close");
  url.searchParams.set("includeTimestamps", "true");
  url.searchParams.set("includePrePost", "false");
  const response = await fetchWithTimeout(url, {
    fetchImpl,
    timeoutMs,
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Yahoo Finance spark ${response.status}`);
  const payload = await response.json();
  if (payload?.spark?.error) throw new Error(payload.spark.error?.description || "Yahoo Finance returned no spark data");
  const results = Array.isArray(payload?.spark?.result) ? payload.spark.result : [];
  const rows = new Map();
  for (const item of results) {
    const symbol = symbolKey(item?.symbol);
    const chart = Array.isArray(item?.response) ? item.response[0] : null;
    if (symbol && chart) rows.set(symbol, chart);
  }
  return rows;
}

function responseCookieHeader(response) {
  const values = typeof response?.headers?.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response?.headers?.get?.("set-cookie")].filter(Boolean);
  return values.map((value) => String(value).split(";", 1)[0].trim()).filter(Boolean).join("; ");
}

async function yahooSession({ fetchImpl = globalThis.fetch, force = false } = {}) {
  const cacheable = fetchImpl === globalThis.fetch;
  if (!force && cacheable && yahooAuth && now() - yahooAuth.at < AUTH_TTL_MS) return yahooAuth;
  if (!force && cacheable && yahooAuthPending) return yahooAuthPending;
  const resolve = async () => {
    const cookieResponse = await fetchWithTimeout(YAHOO_COOKIE_URL, {
      fetchImpl,
      timeoutMs: 3500,
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
    });
    const cookie = responseCookieHeader(cookieResponse);
    if (!cookie) throw new Error("Yahoo Finance session cookie unavailable");
    const crumbResponse = await fetchWithTimeout(YAHOO_CRUMB_URL, {
      fetchImpl,
      timeoutMs: 3500,
      headers: { "User-Agent": USER_AGENT, Accept: "text/plain,*/*", Cookie: cookie },
    });
    if (!crumbResponse.ok) throw new Error(`Yahoo Finance crumb ${crumbResponse.status}`);
    const crumb = String(await crumbResponse.text()).trim();
    if (!crumb || /unauthorized|invalid/i.test(crumb)) throw new Error("Yahoo Finance crumb unavailable");
    const session = { cookie, crumb, at: now() };
    if (cacheable) yahooAuth = session;
    return session;
  };
  if (!cacheable) return resolve();
  yahooAuthPending = resolve().finally(() => { yahooAuthPending = null; });
  return yahooAuthPending;
}

async function fetchYahooQuoteRows(symbols, options = {}) {
  const unique = [...new Set(symbols.map(symbolKey).filter(Boolean))];
  if (!unique.length) return new Map();
  const attempt = async (forceAuth) => {
    const session = await yahooSession({ ...options, force: forceAuth });
    const url = new URL(YAHOO_QUOTE_BASE);
    url.searchParams.set("symbols", unique.join(","));
    url.searchParams.set("formatted", "false");
    url.searchParams.set("region", "US");
    url.searchParams.set("crumb", session.crumb);
    const response = await fetchWithTimeout(url, {
      fetchImpl: options.fetchImpl,
      timeoutMs: 4500,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT, Cookie: session.cookie },
    });
    if (!response.ok) {
      const error = new Error(`Yahoo Finance quote ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const payload = await response.json();
    const rows = Array.isArray(payload?.quoteResponse?.result) ? payload.quoteResponse.result : [];
    return new Map(rows.filter((row) => row?.symbol).map((row) => [symbolKey(row.symbol), row]));
  };
  try {
    return await attempt(false);
  } catch (error) {
    if (![401, 403].includes(error?.status)) throw error;
    if (options.fetchImpl === globalThis.fetch) yahooAuth = null;
    return attempt(true);
  }
}

const LIVE_GLOBAL_SORT_FIELDS = Object.freeze({
  Equities: new Set(["primary", "marketCap", "forwardPE", "dividendYield", "perf1"]),
  ETFs: new Set(["primary", "aum", "expenseRatio", "perf1"]),
});

export function isLiveGlobalSortField(category, field) {
  return Boolean(LIVE_GLOBAL_SORT_FIELDS[category]?.has(field));
}

function globalSortValue(row, category, field) {
  if (!row || !isLiveGlobalSortField(category, field)) return null;
  if (field === "primary") return finite(row.regularMarketPrice);
  if (field === "perf1") return finite(row.fiftyTwoWeekChangePercent);
  if (category === "Equities") {
    if (field === "marketCap") return finite(row.marketCap);
    if (field === "forwardPE") return finite(row.forwardPE);
    if (field === "dividendYield") return finite(row.dividendYield);
  }
  if (category === "ETFs") {
    if (field === "aum") return finite(row.netAssets);
    if (field === "expenseRatio") return finite(row.netExpenseRatio);
  }
  return null;
}

async function getGlobalQuoteIndex(items, category, options = {}) {
  const eligible = (items || []).filter((item) => item?.symbol);
  if (!eligible.length) return new Map();
  const fetchImpl = options.fetchImpl;
  const cacheable = !fetchImpl || fetchImpl === globalThis.fetch;
  const cacheKey = [category, eligible.length, eligible[0]?.id || "", eligible.at(-1)?.id || ""].join(":");
  const cachedEntry = cacheable ? globalQuoteIndexCache.get(cacheKey) : null;
  if (cachedEntry && now() - cachedEntry.at < GLOBAL_SORT_TTL_MS) return cachedEntry.value;
  if (cacheable && globalQuoteIndexPending.has(cacheKey)) return globalQuoteIndexPending.get(cacheKey);

  const load = async () => {
    const symbols = [...new Set(eligible.map((item) => symbolKey(item.symbol)).filter(Boolean))];
    const batches = [];
    for (let index = 0; index < symbols.length; index += GLOBAL_SORT_BATCH_SIZE) batches.push(symbols.slice(index, index + GLOBAL_SORT_BATCH_SIZE));
    const results = await mapWithConcurrency(batches, GLOBAL_SORT_CONCURRENCY, async (batch) => {
      try {
        return await fetchYahooQuoteRows(batch, options);
      } catch {
        return new Map();
      }
    });
    const rows = new Map();
    for (const result of results) for (const [symbol, row] of result || []) rows.set(symbol, row);
    if (cacheable && rows.size) globalQuoteIndexCache.set(cacheKey, { at: now(), value: rows });
    return rows;
  };

  if (!cacheable) return load();
  const pending = load().finally(() => globalQuoteIndexPending.delete(cacheKey));
  globalQuoteIndexPending.set(cacheKey, pending);
  return pending;
}

export async function getLiveGlobalSortValues(items, category, field, options = {}) {
  if (!isLiveGlobalSortField(category, field)) return null;
  const rows = await getGlobalQuoteIndex(items, category, options);
  if (!rows.size) return new Map();
  const values = new Map();
  for (const item of items || []) {
    const value = globalSortValue(rows.get(symbolKey(item?.symbol)), category, field);
    if (value !== null) values.set(item.id, value);
  }
  return values;
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
  const key = symbolKey(symbol);
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
  const key = symbolKey(symbol);
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

function adjustedPoints(chart) {
  const timestamps = Array.isArray(chart.timestamp) ? chart.timestamp : [];
  const adjusted = chart.indicators?.adjclose?.[0]?.adjclose;
  const closes = Array.isArray(adjusted) ? adjusted : chart.indicators?.quote?.[0]?.close || [];
  const points = [];
  for (let index = 0; index < Math.min(timestamps.length, closes.length); index += 1) {
    const value = finite(closes[index]);
    const time = finite(timestamps[index]);
    if (value !== null && value > 0 && time !== null) points.push({ time, value });
  }
  return points;
}

function weeklyBarSpan(points) {
  const day = 24 * 60 * 60;
  const gaps = [];
  for (let index = Math.max(1, points.length - 12); index < points.length; index += 1) {
    const gap = points[index].time - points[index - 1].time;
    if (gap >= 4 * day && gap <= 10 * day) gaps.push(gap);
  }
  if (gaps.length < 3) return 0;
  gaps.sort((left, right) => left - right);
  return gaps[Math.floor(gaps.length / 2)];
}

function annualizedReturn(points, years) {
  if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(years) || years <= 0) return null;
  const latest = points.at(-1);
  const cutoff = new Date(latest.time * 1000);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
  const cutoffSeconds = Math.floor(cutoff.getTime() / 1000);
  const barSpan = weeklyBarSpan(points);
  let start = null;
  for (const point of points) {
    if (point.time + barSpan <= cutoffSeconds) start = point;
    else break;
  }
  if (!start || start.value <= 0 || latest.value <= 0) return null;
  const ratio = latest.value / start.value;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

function currentReturnPoints(points, currentPrice, currentTime) {
  const price = finite(currentPrice);
  const time = finite(currentTime);
  if (!Array.isArray(points) || !points.length || price === null || price <= 0 || time === null) return points;
  const latest = points.at(-1);
  if (time > latest.time) return [...points, { time, value: price }];
  if (time === latest.time) return [...points.slice(0, -1), { time, value: price }];
  return points;
}

async function getReturnHistory(symbol, options = {}) {
  const key = symbolKey(symbol);
  if (!key) return null;
  const cachedValue = cached(returnCache, key, RETURN_TTL_MS);
  if (cachedValue) return cachedValue;
  try {
    const chart = await fetchChart(key, { range: "5y", interval: "1wk", timeoutMs: 3500, ...options });
    const points = adjustedPoints(chart);
    if (points.length < 2) return null;
    const meta = chart.meta || {};
    return store(returnCache, key, {
      points,
      currentPrice: finite(meta.regularMarketPrice),
      currentTime: finite(meta.regularMarketTime),
      provider: "Yahoo Finance",
    });
  } catch {
    return null;
  }
}

function getReturnMetrics(history, quoteRow = {}) {
  if (!history?.points?.length) return null;
  const currentPrice = finite(quoteRow.regularMarketPrice) ?? finite(history.currentPrice);
  const currentTime = finite(quoteRow.regularMarketTime) ?? finite(history.currentTime) ?? history.points.at(-1).time;
  const points = currentReturnPoints(history.points, currentPrice, currentTime);
  const perf1 = annualizedReturn(points, 1);
  const perf3 = annualizedReturn(points, 3);
  if (perf1 === null && perf3 === null) return null;
  return { perf1, perf3, provider: "Yahoo Finance" };
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
  if (!eligible.length) return new Map();
  const quotesBySymbol = new Map();
  const missing = [];
  for (const item of eligible) {
    const key = symbolKey(item.symbol);
    const value = cached(quoteCache, key, QUOTE_TTL_MS);
    if (value) quotesBySymbol.set(key, value);
    else missing.push(key);
  }
  const uniqueMissing = [...new Set(missing)];
  if (uniqueMissing.length) {
    try {
      const spark = await fetchSpark(uniqueMissing, { range: "1d", interval: "5m", ...options });
      for (const key of uniqueMissing) {
        const chart = spark.get(key);
        if (!chart) continue;
        const quote = quoteFromChart(key, chart);
        quotesBySymbol.set(key, store(quoteCache, key, quote));
      }
    } catch {
      const fallback = await mapWithConcurrency(uniqueMissing, 6, async (key) => ({ key, quote: await getLiveQuote(key, options) }));
      for (const row of fallback) if (row.quote) quotesBySymbol.set(row.key, row.quote);
    }
  }
  return new Map(eligible.map((item) => [item.id, quotesBySymbol.get(symbolKey(item.symbol))]).filter(([, quote]) => quote));
}

export async function getLiveMetrics(items, options = {}) {
  const eligible = items.filter((item) => item && ["Equities", "ETFs"].includes(item.category) && item.symbol);
  if (!eligible.length) return new Map();
  const [quoteRows, returnRows] = await Promise.all([
    fetchYahooQuoteRows(eligible.map((item) => item.symbol), options).catch(() => new Map()),
    mapWithConcurrency(eligible, 8, async (item) => ({ item, history: await getReturnHistory(item.symbol, options) })),
  ]);
  const historiesById = new Map(returnRows.filter((entry) => entry.history).map((entry) => [entry.item.id, entry.history]));
  const result = new Map();
  for (const item of eligible) {
    const row = quoteRows.get(symbolKey(item.symbol)) || {};
    const returns = getReturnMetrics(historiesById.get(item.id), row) || {};
    const metrics = {
      perf1: finite(returns.perf1),
      perf3: finite(returns.perf3),
      marketCap: item.category === "Equities" ? finite(row.marketCap) : null,
      forwardPE: item.category === "Equities" ? finite(row.forwardPE) : null,
      dividendYield: item.category === "Equities" ? finite(row.dividendYield) : null,
      netAssets: item.category === "ETFs" ? finite(row.netAssets) : null,
      expenseRatio: item.category === "ETFs" ? finite(row.netExpenseRatio) : null,
      currency: row.currency || "USD",
      provider: "Yahoo Finance",
    };
    if (Object.entries(metrics).some(([key, value]) => !["currency", "provider"].includes(key) && value !== null)) result.set(item.id, metrics);
  }
  return result;
}

export function applyQuoteToSnapshot(snapshot, quote) {
  if (!snapshot || !quote || quote.price === null) return snapshot;
  const change = signedPercent(quote.changePercent);
  const points = quote.points.map((point) => point.value);
  const tone = quote.changePercent === null ? "neutral" : quote.changePercent >= 0 ? "positive" : "negative";
  return {
    ...snapshot,
    live: { ...(snapshot.live || {}), primary: Number(quote.price) },
    primary: {
      ...snapshot.primary,
      label: "Market price",
      value: priceText(quote.price, quote.currency),
      change: change || snapshot.primary?.change,
      tone,
    },
    trend: snapshot.trend,
    intraday: points.length >= 2 ? { label: "Today", value: change || "—", points, tone } : snapshot.intraday || null,
    asOf: rowTimeText(quote.asOf, quote.timezone),
  };
}

export function applyMetricsToSnapshot(snapshot, metrics, category) {
  if (!snapshot || !metrics || !["Equities", "ETFs"].includes(category)) return snapshot;
  const additions = {};
  const live = {};
  if (metrics.perf1 !== null && metrics.perf1 !== undefined) {
    additions.perf1 = { label: "Annualized", value: signedPercent(metrics.perf1, 1) };
    live.perf1 = Number(metrics.perf1);
  }
  if (metrics.perf3 !== null && metrics.perf3 !== undefined) {
    additions.perf3 = { label: "Annualized", value: signedPercent(metrics.perf3, 1) };
    live.perf3 = Number(metrics.perf3);
  }
  if (category === "Equities") {
    const marketCap = compactMoney(metrics.marketCap, metrics.currency);
    const forwardPE = multipleText(metrics.forwardPE);
    const dividendYield = percentText(metrics.dividendYield);
    if (marketCap) { additions.marketCap = { label: "Market cap", value: marketCap }; live.marketCap = Number(metrics.marketCap); }
    if (forwardPE) { additions.forwardPE = { label: "Forward P/E", value: forwardPE }; live.forwardPE = Number(metrics.forwardPE); }
    if (dividendYield) { additions.dividendYield = { label: "Dividend yield", value: dividendYield }; live.dividendYield = Number(metrics.dividendYield); }
  }
  if (category === "ETFs") {
    const assets = compactMoney(metrics.netAssets, metrics.currency);
    const expenseRatio = percentText(metrics.expenseRatio);
    if (assets) { additions.aum = { label: "Fund assets", value: assets }; live.aum = Number(metrics.netAssets); }
    if (expenseRatio) { additions.expenseRatio = { label: "Expense ratio", value: expenseRatio }; live.expenseRatio = Number(metrics.expenseRatio); }
  }
  if (!Object.keys(additions).length) return snapshot;
  return { ...snapshot, metrics: { ...(snapshot.metrics || {}), ...additions }, live: { ...(snapshot.live || {}), ...live } };
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
