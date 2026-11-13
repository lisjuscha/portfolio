// Quote provider abstraction for browser-based stock/ETF price lookups.
// All API keys are stored in localStorage and never in source code.
// Only ticker symbols are sent to the provider — never quantities or amounts.

export interface QuoteResult {
  price: number
  currency: string
  timestamp: number
  symbol: string
}

export interface FxResult {
  rate: number
  from: string
  to: string
  timestamp: number
}

export interface SymbolSearchResult {
  symbol: string
  exchange: string
  name: string
}

export interface QuoteProvider {
  fetchQuote(symbol: string): Promise<QuoteResult>
  fetchFxRate(from: string, to: string): Promise<FxResult>
  searchSymbol(query: string): Promise<SymbolSearchResult[]>
}

// ─── Twelve Data ─────────────────────────────────────────────────────────────
// Free tier: 800 API credits/day, 8 requests/minute.
// German stocks: use prefix "ETR:" for XETRA (e.g. ETR:BMW).
// For ISIN lookup, use symbol_search endpoint.
// Docs: https://twelvedata.com/docs

const TWELVE_DATA_BASE = 'https://api.twelvedata.com'

class TwelveDataProvider implements QuoteProvider {
  private readonly apiKey: string
  constructor(apiKey: string) { this.apiKey = apiKey }

  async fetchQuote(symbol: string): Promise<QuoteResult> {
    const url = `${TWELVE_DATA_BASE}/price?symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { price?: string; code?: number; message?: string }
    if (data.code || !data.price) throw new Error(data.message ?? 'Kein Kurs verfügbar')
    return {
      price: parseFloat(data.price),
      currency: 'EUR', // Twelve Data price is in the exchange's native currency; caller handles FX
      timestamp: Date.now(),
      symbol,
    }
  }

  async fetchFxRate(from: string, to: string): Promise<FxResult> {
    if (from === to) return { rate: 1, from, to, timestamp: Date.now() }
    const url = `${TWELVE_DATA_BASE}/exchange_rate?symbol=${from}/${to}&apikey=${this.apiKey}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { rate?: number; code?: number; message?: string }
    if (data.code || !data.rate) throw new Error(data.message ?? 'Kein Wechselkurs verfügbar')
    return { rate: data.rate, from, to, timestamp: Date.now() }
  }

  async searchSymbol(query: string): Promise<SymbolSearchResult[]> {
    const url = `${TWELVE_DATA_BASE}/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${this.apiKey}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { data?: Array<{ symbol: string; exchange: string; instrument_name: string }> }
    return (data.data ?? []).slice(0, 8).map(r => ({
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.instrument_name,
    }))
  }
}

// ─── Cache layer ──────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

interface CachedQuote extends QuoteResult { cachedAt: number }
interface CachedFx extends FxResult { cachedAt: number }

const quoteCache = new Map<string, CachedQuote>()
const fxCache = new Map<string, CachedFx>()

export function getCachedQuote(symbol: string): QuoteResult | null {
  const c = quoteCache.get(symbol)
  if (!c || Date.now() - c.cachedAt > CACHE_TTL_MS) return null
  return c
}

export function setCachedQuote(q: QuoteResult): void {
  quoteCache.set(q.symbol, { ...q, cachedAt: Date.now() })
}

export function getCachedFx(from: string, to: string): FxResult | null {
  const c = fxCache.get(`${from}/${to}`)
  if (!c || Date.now() - c.cachedAt > CACHE_TTL_MS) return null
  return c
}

export function setCachedFx(r: FxResult): void {
  fxCache.set(`${r.from}/${r.to}`, { ...r, cachedAt: Date.now() })
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createProvider(): QuoteProvider | null {
  const key = localStorage.getItem('portfolioApiKey')
  if (!key) return null
  return new TwelveDataProvider(key)
}

export async function fetchQuoteWithCache(symbol: string): Promise<QuoteResult> {
  const cached = getCachedQuote(symbol)
  if (cached) return cached
  const provider = createProvider()
  if (!provider) throw new Error('Kein API-Key konfiguriert')
  const result = await provider.fetchQuote(symbol)
  setCachedQuote(result)
  return result
}

export async function fetchFxWithCache(from: string, to: string): Promise<number> {
  if (from === to) return 1
  const cached = getCachedFx(from, to)
  if (cached) return cached.rate
  const provider = createProvider()
  if (!provider) return 1 // Fallback: no conversion
  const result = await provider.fetchFxRate(from, to)
  setCachedFx(result)
  return result.rate
}
