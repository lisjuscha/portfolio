export type KontoTyp = 'Depot' | 'Tagesgeld' | 'Festgeld' | 'Bausparen' | 'Sonstiges'

export interface Konto {
  id: string
  name: string
  typ: KontoTyp
}

export type Anlageklasse = 'Aktie' | 'ETF' | 'VL' | 'Zinssparen' | 'Sparbrief' | 'Festgeld' | 'Sonstiges'

export type Zahlungsintervall = 'monatlich' | 'vierteljährlich' | 'halbjährlich' | 'jährlich'
export type SparplanIntervall = 'monatlich' | 'vierteljährlich' | 'jährlich'
export type ZinsgutschriftArt = 'laufend' | 'jährlich' | 'Ende'

export type VertragKategorie =
  | 'Versicherung'
  | 'Internet/Mobilfunk'
  | 'Abo'
  | 'Fitness'
  | 'Strom/Energie'
  | 'Miete/Wohnen'
  | 'Sonstiges'

export type KuendigungsfristEinheit = 'Tage' | 'Wochen' | 'Monate'
export type VertragStatus = 'aktiv' | 'gekündigt'

interface PositionBase {
  id: string
  kontoId: string
  name: string
  notiz?: string
}

export interface AktieETFPosition extends PositionBase {
  anlageklasse: 'Aktie' | 'ETF'
  isin?: string
  ticker?: string
  stueckzahl: number
  einstandskurs: number
  waehrung: string
  aktuellerKurs?: number
  kursZeitstempel?: string
}

export interface ZinsPosition extends PositionBase {
  anlageklasse: 'Zinssparen' | 'Sparbrief' | 'Festgeld'
  anlagebetrag: number
  zinssatz: number
  startDatum: string
  laufzeitEnde: string
  zinsgutschrift: ZinsgutschriftArt
}

export interface VLPosition extends PositionBase {
  anlageklasse: 'VL'
  anbieter: string
  monatsBetrag: number
  laufzeit: number
  sperrfristEnde: string
  aktuellerStand: number
}

export interface SonstigesPosition extends PositionBase {
  anlageklasse: 'Sonstiges'
  aktuellWert: number
}

export type Position = AktieETFPosition | ZinsPosition | VLPosition | SonstigesPosition

export interface Sparplan {
  id: string
  positionId: string
  betrag: number
  intervall: SparplanIntervall
  ausfuehrungstag: number
  startDatum: string
  endDatum?: string
}

export interface Sparziel {
  id: string
  name: string
  zielbetrag: number
  zieldatum?: string
  verknuepfteIds: string[]
}

export interface Vertrag {
  id: string
  name: string
  anbieter: string
  kategorie: VertragKategorie
  betrag: number
  zahlungsintervall: Zahlungsintervall
  naechsteAbbuchung: string
  vertragsbeginn: string
  vertragsende?: string
  kuendigungsfrist: number
  kuendigungsfristEinheit: KuendigungsfristEinheit
  automatischeVerlaengerung: boolean
  verlaengerungsdauer?: number
  status: VertragStatus
}

export interface WertSnapshot {
  id: string
  datum: string
  gesamtwert: number
  wertNachAnlageklasse: Partial<Record<Anlageklasse, number>>
}

export interface Kauf {
  id: string
  positionId: string
  datum: string
  stueckzahl?: number
  betrag?: number
  kurs: number
}
