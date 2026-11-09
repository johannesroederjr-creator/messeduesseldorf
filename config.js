/* Konfiguration. Wird vor app.js geladen. */
window.CFG = {
  // Öffentliche Adresse der Abstimmungsseite für den QR-Code.
  // Leer = automatisch <aktuelle Domain>/vote.html
  // Beim lokalen Test (localhost) hier die LAN-/Deploy-URL eintragen,
  // z. B. 'https://messe-pitch.example.com/vote.html'. Alternativ: ?vote=<URL> an die Adresse hängen.
  voteUrl: '',
  // Optionales Admin-Passwort für Reset (muss zu ADMIN_KEY des Servers passen). Leer = kein Reset per Taste R.
  adminKey: ''
};
