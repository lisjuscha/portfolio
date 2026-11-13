import type { Vertrag, Sparplan, ZinsPosition, VLPosition } from '../types'
import {
  spaetesterKuendigungstermin,
  naechsterAusfuehrungstermin,
  naechsteAbbuchungAb,
} from './calc'
import { parseDate } from './format'

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').slice(0, 8)
}

function icsDateTime(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function vevent(uid: string, date: Date, summary: string, description: string, rrule?: string): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}@portfolio`,
    `DTSTAMP:${icsDateTime()}`,
    `DTSTART;VALUE=DATE:${icsDate(date)}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
  ]
  if (rrule) lines.push(`RRULE:${rrule}`)
  // Reminders: 14 days, 3 days, and on the day
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-P14D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Erinnerung: ${icsEscape(summary)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P3D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Erinnerung: ${icsEscape(summary)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:PT0S',
    'ACTION:DISPLAY',
    `DESCRIPTION:Heute: ${icsEscape(summary)}`,
    'END:VALARM',
    'END:VEVENT',
  )
  return lines.join('\r\n')
}

function rruleForIntervall(intervall: Vertrag['zahlungsintervall']): string {
  switch (intervall) {
    case 'monatlich': return 'FREQ=MONTHLY;INTERVAL=1'
    case 'vierteljährlich': return 'FREQ=MONTHLY;INTERVAL=3'
    case 'halbjährlich': return 'FREQ=MONTHLY;INTERVAL=6'
    case 'jährlich': return 'FREQ=YEARLY'
  }
}

function wrapCalendar(events: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Portfolio//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function generateVertragIcs(vertrag: Vertrag): string {
  const events: string[] = []

  // Cancellation deadline
  const deadline = spaetesterKuendigungstermin(vertrag)
  if (deadline) {
    events.push(vevent(
      `kuendigung-${vertrag.id}`,
      deadline,
      `Kündigung: ${vertrag.name}`,
      `Spätester Kündigungstermin für ${vertrag.name} (${vertrag.anbieter}). Vertragsende: ${vertrag.vertragsende ?? 'unbefristet'}.`,
    ))
  }

  // Recurring debit
  const abbuchung = naechsteAbbuchungAb(vertrag)
  events.push(vevent(
    `abbuchung-${vertrag.id}`,
    abbuchung,
    `Abbuchung: ${vertrag.name}`,
    `${vertrag.betrag.toFixed(2)} € – ${vertrag.name} (${vertrag.anbieter})`,
    rruleForIntervall(vertrag.zahlungsintervall),
  ))

  return wrapCalendar(events)
}

export interface TerminEvent {
  datum: Date
  titel: string
  beschreibung: string
  typ: 'kuendigung' | 'abbuchung' | 'sparplan' | 'faelligkeit' | 'vl-sperrfrist'
}

export function collectTermine(
  vertraege: Vertrag[],
  sparplaene: Sparplan[],
  positionen: (ZinsPosition | VLPosition)[],
  horizont = 365,
): TerminEvent[] {
  const events: TerminEvent[] = []
  const now = new Date()
  const bis = new Date(now.getTime() + horizont * 86_400_000)

  for (const v of vertraege.filter(v => v.status === 'aktiv')) {
    const deadline = spaetesterKuendigungstermin(v)
    if (deadline && deadline >= now && deadline <= bis) {
      events.push({
        datum: deadline,
        titel: `Kündigung: ${v.name}`,
        beschreibung: `${v.anbieter}`,
        typ: 'kuendigung',
      })
    }
    let abbuchung = naechsteAbbuchungAb(v)
    while (abbuchung <= bis) {
      if (abbuchung >= now) {
        events.push({
          datum: new Date(abbuchung),
          titel: `Abbuchung: ${v.name}`,
          beschreibung: `${v.betrag.toFixed(2)} € – ${v.anbieter}`,
          typ: 'abbuchung',
        })
      }
      abbuchung = naechsteAbbuchungAb(v, new Date(abbuchung.getTime() + 86_400_000))
    }
  }

  for (const sp of sparplaene) {
    let termin = naechsterAusfuehrungstermin(sp)
    while (termin <= bis) {
      if (termin >= now) {
        events.push({
          datum: new Date(termin),
          titel: `Sparplan-Ausführung`,
          beschreibung: `${sp.betrag.toFixed(2)} €`,
          typ: 'sparplan',
        })
      }
      termin = naechsterAusfuehrungstermin(sp, new Date(termin.getTime() + 86_400_000))
    }
  }

  for (const pos of positionen) {
    if (pos.anlageklasse === 'VL') {
      const d = parseDate(pos.sperrfristEnde)
      if (d >= now && d <= bis) {
        events.push({
          datum: d,
          titel: `VL-Sperrfrist endet: ${pos.name}`,
          beschreibung: pos.anbieter,
          typ: 'vl-sperrfrist',
        })
      }
    } else {
      const d = parseDate(pos.laufzeitEnde)
      if (d >= now && d <= bis) {
        events.push({
          datum: d,
          titel: `Fälligkeit: ${pos.name}`,
          beschreibung: `${pos.anlagebetrag.toFixed(2)} € – ${pos.anlageklasse}`,
          typ: 'faelligkeit',
        })
      }
    }
  }

  return events.sort((a, b) => a.datum.getTime() - b.datum.getTime())
}

export function generateAlleTermineIcs(vertraege: Vertrag[], sparplaene: Sparplan[], positionen: (ZinsPosition | VLPosition)[]): string {
  const events = collectTermine(vertraege, sparplaene, positionen, 730)
  const vevents = events.map(e =>
    vevent(`termin-${e.typ}-${e.datum.getTime()}`, e.datum, e.titel, e.beschreibung)
  )
  return wrapCalendar(vevents)
}
