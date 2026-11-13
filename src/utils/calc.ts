import type {
  Sparplan,
  Vertrag,
  ZinsPosition,
  Zahlungsintervall,
  SparplanIntervall,
  KuendigungsfristEinheit,
  Position,
  AktieETFPosition,
  Sparziel,
  Konto,
  WertSnapshot,
  Anlageklasse,
} from '../types'
import { addMonths, parseDate, subtractDays, today } from './format'

// ─── Interval helpers ────────────────────────────────────────────────────────

export function intervallZuMonatsbetrag(betrag: number, intervall: Zahlungsintervall): number {
  switch (intervall) {
    case 'monatlich': return betrag
    case 'vierteljährlich': return betrag / 3
    case 'halbjährlich': return betrag / 6
    case 'jährlich': return betrag / 12
  }
}

export function intervallInMonate(intervall: Zahlungsintervall | SparplanIntervall): number {
  switch (intervall) {
    case 'monatlich': return 1
    case 'vierteljährlich': return 3
    case 'halbjährlich': return 6
    case 'jährlich': return 12
  }
}

// ─── Next execution date ──────────────────────────────────────────────────────

/**
 * Returns the next execution date for a savings plan on or after `von`.
 * Clamps to month-end if the target day exceeds the month's length.
 */
export function naechsterAusfuehrungstermin(plan: Sparplan, von: Date = today()): Date {
  const start = parseDate(plan.startDatum)
  let candidate = new Date(start)

  // Advance until candidate >= von
  while (candidate < von) {
    candidate = addMonths(candidate, intervallInMonate(plan.intervall))
  }

  // Clamp day to month-end if plan day > days in month
  const year = candidate.getFullYear()
  const month = candidate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const targetDay = Math.min(plan.ausfuehrungstag, daysInMonth)
  candidate.setDate(targetDay)

  // If setting the day pushed us before `von`, advance one more interval
  if (candidate < von) {
    candidate = addMonths(candidate, intervallInMonate(plan.intervall))
    const y2 = candidate.getFullYear()
    const m2 = candidate.getMonth()
    const dim2 = new Date(y2, m2 + 1, 0).getDate()
    candidate.setDate(Math.min(plan.ausfuehrungstag, dim2))
  }

  return candidate
}

/**
 * Returns the next debit date for a contract on or after `von`.
 */
export function naechsteAbbuchungAb(vertrag: Vertrag, von: Date = today()): Date {
  let d = parseDate(vertrag.naechsteAbbuchung)
  const step = intervallInMonate(vertrag.zahlungsintervall)
  while (d < von) {
    d = addMonths(d, step)
  }
  return d
}

// ─── Cancellation deadline ───────────────────────────────────────────────────

function subtractFrist(date: Date, frist: number, einheit: KuendigungsfristEinheit): Date {
  switch (einheit) {
    case 'Tage': return subtractDays(date, frist)
    case 'Wochen': return subtractDays(date, frist * 7)
    case 'Monate': return addMonths(date, -frist)
  }
}

/**
 * Returns the latest cancellation deadline for a contract.
 * For auto-renewal contracts this is the deadline before the next renewal.
 * Returns null if the contract is already cancelled or has no end date.
 */
export function spaetesterKuendigungstermin(vertrag: Vertrag): Date | null {
  if (vertrag.status === 'gekündigt' || !vertrag.vertragsende) return null

  const now = today()
  let ende = parseDate(vertrag.vertragsende)

  if (vertrag.automatischeVerlaengerung && vertrag.verlaengerungsdauer) {
    // Roll end date into the future
    while (ende <= now) {
      ende = addMonths(ende, vertrag.verlaengerungsdauer)
    }
    const deadline = subtractFrist(ende, vertrag.kuendigungsfrist, vertrag.kuendigungsfristEinheit)
    // If deadline already passed, we're in the current period; find next renewal
    if (deadline < now) {
      ende = addMonths(ende, vertrag.verlaengerungsdauer)
      return subtractFrist(ende, vertrag.kuendigungsfrist, vertrag.kuendigungsfristEinheit)
    }
    return deadline
  }

  return subtractFrist(ende, vertrag.kuendigungsfrist, vertrag.kuendigungsfristEinheit)
}

// ─── Interest calculations ────────────────────────────────────────────────────

/**
 * Expected interest earnings for a fixed-rate position up to `bis`.
 * Uses compound interest for 'laufend', annual for 'jährlich', simple for 'Ende'.
 */
export function erwarteterZinsertrag(pos: ZinsPosition, bis?: Date): number {
  const start = parseDate(pos.startDatum)
  const end = bis ? new Date(Math.min(bis.getTime(), parseDate(pos.laufzeitEnde).getTime())) : parseDate(pos.laufzeitEnde)
  const yearsElapsed = Math.max(0, (end.getTime() - start.getTime()) / (365.25 * 86_400_000))
  const r = pos.zinssatz / 100

  switch (pos.zinsgutschrift) {
    case 'laufend':
      // Continuous compounding approximation
      return pos.anlagebetrag * (Math.exp(r * yearsElapsed) - 1)
    case 'jährlich':
      // Annual compound
      return pos.anlagebetrag * (Math.pow(1 + r, yearsElapsed) - 1)
    case 'Ende':
      // Simple interest
      return pos.anlagebetrag * r * yearsElapsed
  }
}

// ─── Position value ───────────────────────────────────────────────────────────

/**
 * Current market value of a position in EUR.
 * For Aktie/ETF, fxRate is EUR per position currency (e.g. for USD positions, fxRate = EUR/USD rate).
 */
export function positionCurrentValue(pos: Position, fxRates: Record<string, number> = {}): number {
  switch (pos.anlageklasse) {
    case 'Aktie':
    case 'ETF': {
      const p = pos as AktieETFPosition
      const kurs = p.aktuellerKurs ?? p.einstandskurs
      const rate = p.waehrung === 'EUR' ? 1 : (fxRates[p.waehrung] ?? 1)
      return p.stueckzahl * kurs * rate
    }
    case 'Zinssparen':
    case 'Sparbrief':
    case 'Festgeld': {
      const z = pos as ZinsPosition
      return z.anlagebetrag + erwarteterZinsertrag(z, today())
    }
    case 'VL':
      return pos.aktuellerStand
    case 'Sonstiges':
      return pos.aktuellWert
  }
}

// ─── Performance ─────────────────────────────────────────────────────────────

export interface PerformanceResult {
  absoluteEuro: number
  prozent: number
}

export function positionPerformance(pos: AktieETFPosition, fxRates: Record<string, number> = {}): PerformanceResult {
  const rate = pos.waehrung === 'EUR' ? 1 : (fxRates[pos.waehrung] ?? 1)
  const aktuell = positionCurrentValue(pos, fxRates)
  const einstand = pos.stueckzahl * pos.einstandskurs * rate
  const absoluteEuro = aktuell - einstand
  const prozent = einstand === 0 ? 0 : (absoluteEuro / einstand) * 100
  return { absoluteEuro, prozent }
}

// ─── Savings goals ───────────────────────────────────────────────────────────

export interface SparzielFortschritt {
  aktuell: number
  prozent: number
  fehlend: number
  monatlicheSparrate: number | null
}

export function sparzielFortschritt(
  ziel: Sparziel,
  positionen: Position[],
  konten: Konto[],
  fxRates: Record<string, number> = {},
): SparzielFortschritt {
  // Sum value of all linked positions and accounts
  const linkedPositionen = positionen.filter(p => ziel.verknuepfteIds.includes(p.id))
  const linkedKontenIds = konten.filter(k => ziel.verknuepfteIds.includes(k.id)).map(k => k.id)
  const linkedKontenPositionen = positionen.filter(p => linkedKontenIds.includes(p.kontoId))

  const allPos = [...new Map([...linkedPositionen, ...linkedKontenPositionen].map(p => [p.id, p])).values()]
  const aktuell = allPos.reduce((sum, p) => sum + positionCurrentValue(p, fxRates), 0)

  const fehlend = Math.max(0, ziel.zielbetrag - aktuell)
  const prozent = ziel.zielbetrag === 0 ? 0 : Math.min(100, (aktuell / ziel.zielbetrag) * 100)

  let monatlicheSparrate: number | null = null
  if (ziel.zieldatum && fehlend > 0) {
    const monate = Math.max(1, Math.round(
      (parseDate(ziel.zieldatum).getTime() - today().getTime()) / (30.4375 * 86_400_000)
    ))
    monatlicheSparrate = fehlend / monate
  }

  return { aktuell, prozent, fehlend, monatlicheSparrate }
}

// ─── Snapshot aggregation ─────────────────────────────────────────────────────

export type ZeitraumFilter = '1M' | '6M' | '1J' | 'Max'

export function filterSnapshots(snapshots: WertSnapshot[], zeitraum: ZeitraumFilter): WertSnapshot[] {
  if (zeitraum === 'Max' || snapshots.length === 0) return snapshots
  const now = today()
  const cutoff = new Date(now)
  switch (zeitraum) {
    case '1M': cutoff.setMonth(cutoff.getMonth() - 1); break
    case '6M': cutoff.setMonth(cutoff.getMonth() - 6); break
    case '1J': cutoff.setFullYear(cutoff.getFullYear() - 1); break
  }
  return snapshots.filter(s => parseDate(s.datum) >= cutoff)
}

export function gesamtwertNachAnlageklasse(
  positionen: Position[],
  fxRates: Record<string, number> = {},
): Partial<Record<Anlageklasse, number>> {
  const result: Partial<Record<Anlageklasse, number>> = {}
  for (const pos of positionen) {
    const key = pos.anlageklasse
    result[key] = (result[key] ?? 0) + positionCurrentValue(pos, fxRates)
  }
  return result
}
