import { describe, it, expect } from 'vitest'
import { generateVertragIcs, collectTermine } from '../src/utils/ics'
import type { Vertrag, Sparplan, ZinsPosition } from '../src/types'

const vertrag: Vertrag = {
  id: 'v1',
  name: 'Netflix',
  anbieter: 'Netflix',
  kategorie: 'Abo',
  betrag: 12.99,
  zahlungsintervall: 'monatlich',
  naechsteAbbuchung: '2023-01-15',
  vertragsbeginn: '2023-01-15',
  vertragsende: '2099-01-15',
  automatischeVerlaengerung: true,
  verlaengerungsdauer: 12,
  kuendigungsfrist: 1,
  kuendigungsfristEinheit: 'Monate',
  status: 'aktiv',
}

const sparplan: Sparplan = {
  id: 'sp1',
  positionId: 'p1',
  betrag: 100,
  intervall: 'monatlich',
  ausfuehrungstag: 1,
  startDatum: '2024-01-01',
}

const zinsPos: ZinsPosition = {
  id: 'z1',
  kontoId: 'k1',
  name: 'Festgeld',
  anlageklasse: 'Festgeld',
  anlagebetrag: 5000,
  zinssatz: 3,
  zinsgutschrift: 'Ende',
  laufzeitEnde: '2099-12-31',
  startDatum: '2024-01-01',
  anbieter: 'Bank',
}

// ─── generateVertragIcs ───────────────────────────────────────────────────
describe('generateVertragIcs', () => {
  it('produces valid VCALENDAR structure', () => {
    const ics = generateVertragIcs(vertrag)
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
  })

  it('includes the contract name in SUMMARY', () => {
    const ics = generateVertragIcs(vertrag)
    expect(ics).toContain('Netflix')
  })

  it('includes RRULE for recurring debits', () => {
    const ics = generateVertragIcs(vertrag)
    expect(ics).toContain('RRULE:FREQ=MONTHLY')
  })

  it('includes VALARM reminders', () => {
    const ics = generateVertragIcs(vertrag)
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:-P14D')
    expect(ics).toContain('TRIGGER:-P3D')
    expect(ics).toContain('TRIGGER:PT0S')
  })

  it('uses CRLF line endings as per RFC 5545', () => {
    const ics = generateVertragIcs(vertrag)
    expect(ics).toContain('\r\n')
  })
})

// ─── collectTermine ────────────────────────────────────────────────────────
describe('collectTermine', () => {
  it('returns events sorted by date', () => {
    const events = collectTermine([vertrag], [sparplan], [], 365)
    const dates = events.map(e => e.datum.getTime())
    expect(dates).toEqual([...dates].sort((a, b) => a - b))
  })

  it('returns abbuchung events for active contracts', () => {
    const events = collectTermine([vertrag], [], [], 60)
    const abbuchungen = events.filter(e => e.typ === 'abbuchung')
    expect(abbuchungen.length).toBeGreaterThan(0)
  })

  it('returns sparplan events', () => {
    const events = collectTermine([], [sparplan], [], 60)
    const sparEvents = events.filter(e => e.typ === 'sparplan')
    expect(sparEvents.length).toBeGreaterThan(0)
  })

  it('returns faelligkeit event for Festgeld with far future end date', () => {
    const events = collectTermine([], [], [zinsPos], 36500) // 100 years
    const faelligkeiten = events.filter(e => e.typ === 'faelligkeit')
    expect(faelligkeiten.length).toBe(1)
    expect(faelligkeiten[0].titel).toContain('Festgeld')
  })

  it('excludes events outside horizon', () => {
    const events = collectTermine([vertrag], [], [], 1)
    // Monthly contract: unlikely to have abbuchung tomorrow unless startDatum is tomorrow
    // but the important thing is no events past the horizon
    const maxDate = new Date(Date.now() + 1 * 86_400_000)
    events.forEach(e => expect(e.datum.getTime()).toBeLessThanOrEqual(maxDate.getTime()))
  })

  it('excludes cancelled contracts', () => {
    const cancelled: Vertrag = { ...vertrag, status: 'gekündigt' }
    const events = collectTermine([cancelled], [], [], 365)
    expect(events.every(e => e.typ !== 'abbuchung')).toBe(true)
  })
})
