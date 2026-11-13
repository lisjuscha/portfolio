# Portfolio

A private finance tracking Progressive Web App. All data stays on your device — no server, no accounts.

## Features

- **Anlagen** — Aktien, ETFs, VL, Zinssparen, Sparbrief, Festgeld, Sonstiges
- **Live-Kurse** — via Twelve Data API (kostenloser Account nötig für Aktien/ETFs)
- **Verträge** — Abos, Versicherungen, Mobilfunk, Energie mit Kündigungsfristen
- **Termine** — chronologische Timeline mit Kalender-Export (.ics)
- **Sparziele** — Fortschrittsbalken mit monatlicher Sparrate
- **Verschlüsseltes Backup** — AES-GCM 256-bit, PBKDF2
- **Offline-fähig** — PWA mit Service Worker, installierbar auf iPhone
- **Privat** — kein Tracking, keine Analytik, alle Daten lokal in IndexedDB

## iPhone-Installation

1. Portfolio in Safari öffnen
2. Teilen-Button (□↑) antippen
3. „Zum Home-Bildschirm" wählen
4. „Hinzufügen" bestätigen

## Kurse: Twelve Data API-Key

1. Kostenlosen Account auf [twelvedata.com](https://twelvedata.com) anlegen
2. API Key kopieren
3. In der App: Einstellungen → Kurse → API-Key eintragen

Free-Tier: 800 Abfragen/Tag, 8/Minute. Kurse werden max. alle 15 Minuten aktualisiert.

## Datenschutz & Disclaimer

Alle Daten verbleiben ausschließlich auf dem Gerät. Der API-Key wird nur lokal gespeichert und ist ausschließlich im verschlüsselten Backup enthalten.

Diese App dient rein privaten Zwecken und stellt keine Anlage-, Steuer- oder Rechtsberatung dar. Berechnungen (insbesondere Zinsen und Performance) sind Näherungen ohne Gewähr.

## Development

```bash
npm install
npm run icons    # PNG icons aus favicon.svg generieren
npm run dev      # Entwicklungsserver
npm test         # Vitest unit tests
npm run build    # Produktions-Build
```
