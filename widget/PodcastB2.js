// Podcast B2 — widget postępu dla aplikacji Scriptable (iOS).
// Nazwij skrypt w Scriptable dokładnie: PodcastB2
// Dane przychodzą z aplikacji Podcast B2 (przycisk „Zaktualizuj widget” na ekranie Postęp)
// i są zapisywane w telefonie. Widget działa w rozmiarze małym, średnim i na ekranie blokady.

const PLIK = 'podcast-b2.json';
const KOLOR = {
  tlo: new Color('#1d231a'), tlo2: new Color('#252d21'), tor: new Color('#323c2d'),
  akcent: new Color('#bed6a0'), tekst: new Color('#eef1e8'), wyciszony: new Color('#a3ad9b'), ogien: new Color('#e0b25c')
};

const fm = FileManager.local();
const sciezka = fm.joinPath(fm.documentsDirectory(), PLIK);
const q = args.queryParameters || {};
let d = null;
try { if (fm.fileExists(sciezka)) d = JSON.parse(fm.readString(sciezka)); } catch (e) { d = null; }

const liczba = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
if (q.procent !== undefined) {
  d = {
    procent: liczba(q.procent), hasla: liczba(q.hasla), razem: liczba(q.razem),
    seria: liczba(q.seria), dzien: q.dzien || '', ukonczone: liczba(q.ukonczone),
    wszystkie: liczba(q.wszystkie), godziny: liczba(q.godziny), nastepny: q.nastepny || '',
    zapisano: new Date().toISOString()
  };
  fm.writeString(sciezka, JSON.stringify(d));
}

function iso(dt) {
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}
const teraz = new Date();
const dzis = iso(teraz);
const wczoraj = iso(new Date(teraz.getFullYear(), teraz.getMonth(), teraz.getDate() - 1));
// Seria się liczy, jeśli ostatnio słuchałeś dziś albo wczoraj.
const seria = d && (d.dzien === dzis || d.dzien === wczoraj) ? d.seria : 0;
const dzisSluchane = d && d.dzien === dzis;
const dni = n => n === 1 ? 'dzień' : 'dni';
const odc = n => n === 1 ? 'odcinek' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'odcinki' : 'odcinków';
const procentTekst = p => (p < 10 ? p.toFixed(1) : Math.round(p).toString()).replace('.', ',') + '%';

function pasek(p, w, h, kolor, tor) {
  const c = new DrawContext();
  c.size = new Size(w, h); c.opaque = false; c.respectScreenScale = true;
  const r = h / 2;
  const t = new Path(); t.addRoundedRect(new Rect(0, 0, w, h), r, r);
  c.addPath(t); c.setFillColor(tor); c.fillPath();
  if (p > 0) {
    const f = new Path(); f.addRoundedRect(new Rect(0, 0, Math.max(h, w * Math.min(1, p)), h), r, r);
    c.addPath(f); c.setFillColor(kolor); c.fillPath();
  }
  return c.getImage();
}

function pierscien(p, rozmiar, grubosc, kolor, tor, napis) {
  const c = new DrawContext();
  c.size = new Size(rozmiar, rozmiar); c.opaque = false; c.respectScreenScale = true;
  const s = rozmiar / 2, r = s - grubosc / 2;
  c.setStrokeColor(tor); c.setLineWidth(grubosc);
  c.strokeEllipse(new Rect(grubosc / 2, grubosc / 2, 2 * r, 2 * r));
  const kroki = Math.max(2, Math.round(120 * Math.min(1, p)));
  if (p > 0) {
    const punkty = [];
    for (let i = 0; i <= kroki; i++) {
      const a = -Math.PI / 2 + 2 * Math.PI * Math.min(1, p) * i / kroki;
      punkty.push(new Point(s + r * Math.cos(a), s + r * Math.sin(a)));
    }
    const sc = new Path(); sc.addLines(punkty);
    c.addPath(sc); c.setStrokeColor(kolor); c.setLineWidth(grubosc); c.strokePath();
  }
  if (napis) {
    c.setFont(Font.boldRoundedSystemFont(rozmiar * 0.24)); c.setTextColor(kolor); c.setTextAlignedCenter();
    c.drawTextInRect(napis, new Rect(0, s - rozmiar * 0.15, rozmiar, rozmiar * 0.32));
  }
  return c.getImage();
}

function tekst(stos, t, rozmiar, kolor, gruby) {
  const x = stos.addText(t);
  x.font = gruby ? Font.boldRoundedSystemFont(rozmiar) : Font.mediumSystemFont(rozmiar);
  x.textColor = kolor; x.lineLimit = 1; x.minimumScaleFactor = 0.6;
  return x;
}

function tloWidgetu(w) {
  const g = new LinearGradient();
  g.colors = [KOLOR.tlo2, KOLOR.tlo]; g.locations = [0, 1];
  w.backgroundGradient = g;
}

function brakDanych(w, rodzina) {
  if (rodzina.startsWith('accessory')) { tekst(w, 'B2: otwórz aplikację', 12, Color.white(), true); return; }
  tloWidgetu(w);
  tekst(w, 'Podcast B2', 15, KOLOR.akcent, true);
  w.addSpacer(6);
  const t = w.addText('Otwórz aplikację → Postęp → „Zaktualizuj widget”.');
  t.font = Font.systemFont(12); t.textColor = KOLOR.wyciszony;
}

function zbuduj(rodzina) {
  const w = new ListWidget();
  // Odśwież po północy, żeby seria i „dziś” się zgadzały.
  const polnoc = new Date(teraz.getFullYear(), teraz.getMonth(), teraz.getDate() + 1, 0, 5);
  w.refreshAfterDate = new Date(Math.min(polnoc.getTime(), teraz.getTime() + 60 * 60 * 1000));
  if (!d) { brakDanych(w, rodzina); return w; }
  const p = d.procent / 100;
  const zostalo = Math.max(0, d.wszystkie - d.ukonczone);

  if (rodzina === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true;
    const img = w.addImage(pierscien(p, 60, 6, Color.white(), new Color('#ffffff', 0.25), procentTekst(d.procent)));
    img.imageSize = new Size(56, 56); img.centerAlignImage();
    return w;
  }
  if (rodzina === 'accessoryRectangular') {
    const g = w.addStack(); g.centerAlignContent();
    tekst(g, 'B2 ' + procentTekst(d.procent), 14, Color.white(), true);
    g.addSpacer();
    tekst(g, (seria ? '🔥' : '') + seria, 13, Color.white(), true);
    w.addSpacer(4);
    w.addImage(pasek(p, 150, 8, Color.white(), new Color('#ffffff', 0.25))).imageSize = new Size(150, 8);
    w.addSpacer(3);
    tekst(w, dzisSluchane ? 'Dziś zaliczone ✓' : 'Zostało ' + zostalo + ' ' + odc(zostalo), 11, Color.white(), false);
    return w;
  }

  tloWidgetu(w);
  const maly = rodzina === 'small';
  w.setPadding(14, 14, 14, 14);
  const gora = w.addStack(); gora.centerAlignContent();
  tekst(gora, 'Podcast B2', maly ? 12 : 13, KOLOR.wyciszony, true);
  gora.addSpacer();
  tekst(gora, (seria ? '🔥 ' : '') + seria + ' ' + dni(seria), maly ? 12 : 13, seria ? KOLOR.ogien : KOLOR.wyciszony, true);
  w.addSpacer(maly ? 6 : 4);
  const srodek = w.addStack(); srodek.bottomAlignContent();
  tekst(srodek, procentTekst(d.procent), maly ? 34 : 36, KOLOR.tekst, true);
  if (!maly) {
    srodek.addSpacer(8);
    const opis = srodek.addStack(); opis.layoutVertically();
    tekst(opis, 'listy B2', 12, KOLOR.wyciszony, false);
    tekst(opis, d.hasla + ' z ' + d.razem + ' haseł', 12, KOLOR.wyciszony, false);
    opis.addSpacer(4);
  }
  w.addSpacer(maly ? 8 : 6);
  const szer = maly ? 130 : 300;
  w.addImage(pasek(p, szer, 10, KOLOR.akcent, KOLOR.tor)).imageSize = new Size(szer, 10);
  w.addSpacer(maly ? 8 : 8);
  if (maly) {
    tekst(w, 'Zostało ' + zostalo + ' ' + odc(zostalo), 12, KOLOR.tekst, false);
    tekst(w, dzisSluchane ? 'Dziś zaliczone ✓' : 'Dziś jeszcze nie słuchałeś', 11, dzisSluchane ? KOLOR.akcent : KOLOR.wyciszony, false);
  } else {
    const dol = w.addStack(); dol.centerAlignContent();
    tekst(dol, 'Zostało ' + zostalo + ' ' + odc(zostalo) + ' (ok. ' + String(d.godziny).replace('.', ',') + ' h)', 12, KOLOR.tekst, false);
    dol.addSpacer();
    tekst(dol, dzisSluchane ? 'Dziś ✓' : 'Dziś jeszcze nie', 12, dzisSluchane ? KOLOR.akcent : KOLOR.wyciszony, true);
    if (d.nastepny) { w.addSpacer(3); tekst(w, '▶ ' + d.nastepny, 12, KOLOR.wyciszony, false); }
  }
  w.addSpacer();
  return w;
}

const rodzina = config.widgetFamily || 'medium';
const widget = zbuduj(rodzina);
if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(widget);
} else {
  // Uruchomione z aplikacji albo ręcznie: pokaż podgląd.
  await widget.presentMedium();
}
Script.complete();
