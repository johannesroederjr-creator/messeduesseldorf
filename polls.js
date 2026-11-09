/* Gemeinsame Abstimmungs-Definition (Browser + Node) */
(function (polls) {
  if (typeof module !== 'undefined' && module.exports) module.exports = polls;
  else window.POLLS = polls;
})([
  {
    id: 'p1',
    q: 'Was ist Ihnen bei Messe-Content am wichtigsten?',
    options: ['Tempo während der Messe', 'Ganzjährige Betreuung', 'Video & Social Clips', 'Mehrsprachigkeit DE/EN']
  },
  {
    id: 'p2',
    q: 'Welches Format soll bei Ihnen als Erstes live gehen?',
    options: ['Video-Interviews', 'Foto-Text-Testimonials', 'Hochformat-Clips', '360°-Videos']
  }
]);
