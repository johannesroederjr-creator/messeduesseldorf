# Messe-Content-Team – interaktive Pitch-Präsentation

Ersetzt die PowerPoint „Vorstellung Content Team Messe Düsseldorf“ durch eine interaktive Web-Präsentation.
Konzept: Die Präsentation ist ein **Hallenplan der Messe**. Jede Folie ist eine Station, die Kamera fliegt von Halle zu Halle.

## Bedienung
| Taste | Aktion |
|---|---|
| → / Leertaste / Klick / Wischen | Nächster Schritt bzw. nächste Szene |
| ← | Zurück |
| O | Szenenübersicht |
| F | Vollbild |
| V | Beispielstimmen (nur Demo-Modus, zum Proben) |
| R | Abstimmungen zurücksetzen |

Direktsprung: `…/#5` öffnet Szene 5.

## Variante A – Echtzeit-Abstimmung (empfohlen)
Braucht Node.js ≥ 18, keine weiteren Pakete.

    node server.js            # http://localhost:3000
    ADMIN_KEY=geheim node server.js   # optional: Reset/Umschalten schützen (dann in config.js adminKey setzen)

Deploy auf Render, Railway, Fly.io oder eigenem Server: Startbefehl `node server.js`, Port aus `PORT`.
Der QR-Code zeigt automatisch auf `<deine Domain>/vote.html`. Beim lokalen Test `?vote=https://…/vote.html` an die Adresse hängen
oder `voteUrl` in `config.js` setzen, sonst können Handys `localhost` nicht erreichen.

## Variante B – Nur statisch (Netlify, Vercel, GitHub Pages, Webspace)
Ordner einfach hochladen. Ohne Server läuft die Abstimmung im **Demo-Modus** (Stimmen nur im selben Browser, mit Taste V simulierbar).
Alles andere funktioniert vollständig, auch offline.

## Inhalte anpassen
- Texte und Szenen: `index.html` (jede `<section class="scene">`)
- Kamerapositionen: `data-cam="x,y,zoom,neigung,drehung"` pro Szene
- Abstimmungsfragen: `polls.js`
- Farben: `:root` in `styles.css`
- Medien: `media/` (Bilder WebP, Videos MP4, zusammen ca. 31 MB)

## Hinweise
- Zahlen im Kapitel „Wirkung“ stammen aus der Präsentation vom Juli 2022 (Beispielkunde Deli Genuss).
- Messetermine stammen von messe-duesseldorf.de (Stand November 2026).
- Aus Datenschutzgründen wurden die Screenshots mit Nutzer-Chats/Kommentaren aus der Originaldatei nicht übernommen.
- Video 2 wurde auf die ersten 2 Minuten gekürzt.
