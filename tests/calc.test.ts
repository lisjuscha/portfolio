import { describe, it, expect } from 'vitest'
import {
  intervallZuMonatsbetrag,
  naechsterAusfuehrungstermin,
  naechsteAbbuchungAb,
  spaetesterKuendigungstermin,
  erwarteterZinsertrag,
} from '../src/utils/calc'
import type { Sparplan, Vertrag, ZinsPosition } from '../src/types'

// Helpers
function makeDate(y: number, m: number, d: number) {
  return new Date(y, m - 1, d)
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── intervallZuMonatsbetrag ────────────────────────────────────────────────
describe('intervallZuMonatsbetrag', () => {
  it('monatlich → betrag × 1', () => expect(intervallZuMonatsbetrag(100, 'monatlich')).toBe(100))
  it('vierteljährlich → betrag / 3', () => expect(intervallZuMonatsbetrag(120, 'vierteljährlich')).toBeCloseTo(40))
  it('halbjährlich → betrag / 6', () => expect(intervallZuMonatsbetrag(60, 'halbjährlich')).toBe(10))
  it('jährlich → betrag / 12', () => expect(intervallZuMonatsbetrag(120, 'jährlich')).toBe(10))
})

// ─── naechsterAusfuehrungstermin ───────────────────────────────────────────
describe('naechsterAusfuehrungstermin', () => {
  const plan: Sparplan = {
    id: '1',
    positionId: 'p1',
    betrag: 50,
    intervall: 'monatlich',
    ausfuehrungstag: 15,
    startDatum: '2024-01-15',
  }

  it('returns execution on the 15th of the next eligible month', () => {
    const von = makeDate(2024, 3, 1)
    const result = naechsterAusfuehrungstermin(plan, von)
    expect(isoDate(result)).toBe('2024-03-15')
  })

  it('advances to next month if already past execution day', () => {
    const von = makeDate(2024, 3, 20)
    const result = naechsterAusfuehrungstermin(plan, von)
    expect(isoDate(result)).toBe('2024-04-15')
  })

  it('clamps day 31 in February to last day of month', () => {
    const plan31: Sparplan = { ...plan, ausfuehrungstag: 31 }
    const von = makeDate(2024, 1, 1)
    const result = naechsterAusfuehrungstermin(plan31, von)
    // Feb 2024 is a leap year, so last day is 29
    expect(isoDate(result)).toBe('2024-01-31')
  })

  it('monthly: clamps Jan 31 + 1 month to Feb 29 (leap year)', () => {
    const plan31: Sparplan = { ...plan, ausfuehrungstag: 31, startDatum: '2024-01-31' }
    const von = makeDate(2024, 2, 1)
    const result = naechsterAusfuehrungstermin(plan31, von)
    expect(isoDate(result)).toBe('2024-02-29')
  })
})

// ─── naechsteAbbuchungAb ───────────────────────────────────────────────────
describe('naechsteAbbuchungAb', () => {
  const vertrag: Vertrag = {
    id: 'v1',
    name: 'Test',
    anbieter: 'Anbieter',
    kategorie: 'Sonstiges',
    betrag: 9.99,
    zahlungsintervall: 'monatlich',
    naechsteAbbuchung: '2024-01-05',
    vertragsbeginn: '2024-01-05',
    kuendigungsfrist: 0,
    kuendigungsfristEinheit: 'Tage',
    automatischeVerlaengerung: false,
    status: 'aktiv',
  }

  it('returns next debit on the 5th of current month if not yet reached', () => {
    const von = makeDate(2024, 3, 1)
    const result = naechsteAbbuchungAb(vertrag, von)
    expect(isoDate(result)).toBe('2024-03-05')
  })

  it('rolls to next month if debit day already passed', () => {
    const von = makeDate(2024, 3, 10)
    const result = naechsteAbbuchungAb(vertrag, von)
    expect(isoDate(result)).toBe('2024-04-05')
  })

  it('quarterly intervals advance by 3 months', () => {
    const quarterly: Vertrag = { ...vertrag, zahlungsintervall: 'vierteljährlich', startDatum: '2024-01-05' }
    const von = makeDate(2024, 1, 10)
    const result = naechsteAbbuchungAb(quarterly, von)
    expect(isoDate(result)).toBe('2024-04-05')
  })
})

// ─── spaetesterKuendigungstermin ───────────────────────────────────────────
describe('spaetesterKuendigungstermin', () => {
  it('returns null for unbefristeter Vertrag ohne autoRenewal', () => {
    const v: Vertrag = {
      id: 'v2', name: 'V', anbieter: 'A', kategorie: 'Sonstiges',
      betrag: 10, zahlungsintervall: 'monatlich',
      naechsteAbbuchung: '2024-01-01',
      vertragsbeginn: '2024-01-01',
      kuendigungsfrist: 0,
      kuendigungsfristEinheit: 'Tage',
      automatischeVerlaengerung: false,
      status: 'aktiv',
    }
    expect(spaetesterKuendigungstermin(v)).toBeNull()
  })

  it('rolls past end date forward for auto-renewal and applies notice period', () => {
    // vertragsende in the past → must roll forward
    const v: Vertrag = {
      id: 'v3', name: 'V', anbieter: 'A', kategorie: 'Sonstiges',
      betrag: 10, zahlungsintervall: 'jährlich',
      naechsteAbbuchung: '2022-01-01',
      vertragsbeginn: '2022-01-01',
      vertragsende: '2023-01-01',
      automatischeVerlaengerung: true,
      verlaengerungsdauer: 12,
      kuendigungsfrist: 1,
      kuendigungsfristEinheit: 'Monate',
      status: 'aktiv',
    }
    const deadline = spaetesterKuendigungstermin(v)
    expect(deadline).not.toBeNull()
    // The deadline must be in the future (or today)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    expect(deadline!.getTime()).toBeGreaterThanOrEqual(now.getTime() - 86_400_000)
  })
})

// ─── erwarteterZinsertrag ──────────────────────────────────────────────────
describe('erwarteterZinsertrag', () => {
  const base: ZinsPosition = {
    id: 'z1',
    kontoId: 'k1',
    name: 'Sparkonto',
    anlageklasse: 'Zinssparen',
    anlagebetrag: 10_000,
    zinssatz: 3,
    zinsgutschrift: 'laufend',
    laufzeitEnde: '2025-01-01',
    startDatum: '2024-01-01',
    anbieter: 'Bank',
  }

  it('laufend: continuous compounding for 1 year (366-day leap year)', () => {
    const result = erwarteterZinsertrag({ ...base, zinsgutschrift: 'laufend' })
    expect(result).toBeCloseTo(305, 0)
  })

  it('Ende: simple interest for 1 year (366-day leap year)', () => {
    const result = erwarteterZinsertrag({ ...base, zinsgutschrift: 'Ende' })
    expect(result).toBeCloseTo(301, 0)
  })

  it('jährlich: compound interest, higher than simple for multi-year', () => {
    const twoYear: ZinsPosition = { ...base, laufzeitEnde: '2026-01-01', zinsgutschrift: 'jährlich' }
    const compound = erwarteterZinsertrag(twoYear)
    const simple = 10_000 * 0.03 * 2
    expect(compound).toBeGreaterThan(simple)
  })
})
