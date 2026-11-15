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
    poz: (q.poz || '').split(',').filter(Boolean).map(x => x.split('/').map(liczba)),
    data: q.data || '', min: (q.min || '').split(',').filter(x => x !== '').map(liczba),
    utr: liczba(q.utr), powt: (q.powt || '').split(',').filter(Boolean).map(x => x.split(':')).map(([k, v]) => [k, liczba(v)]),
    zapisano: new Date().toISOString()
  };
  fm.writeString(sciezka, JSON.stringify(d));
  await aktualizujSkrypt();
}

// Pobiera najnowszą wersję skryptu ze strony kursu (działa od następnego uruchomienia).
async function aktualizujSkrypt() {
  if (!config.runsInApp) return;
  try {
    const r = new Request('https://addamkubczak-png.github.io/podcast-b2/widget/PodcastB2.js');
    r.timeoutInterval = 8;
    const nowy = await r.loadString();
    const sciezkaSkryptu = module.filename;
    const fs = sciezkaSkryptu.includes('Mobile Documents') ? FileManager.iCloud() : FileManager.local();
    if (nowy.startsWith('// Podcast B2 — widget') && nowy.includes('Script.complete()') && nowy !== fs.readString(sciezkaSkryptu)) {
      fs.writeString(sciezkaSkryptu, nowy);
    }
  } catch (e) { /* bez internetu zostaje obecna wersja */ }
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
  if (rodzina === 'large') duzy(w, d);
  w.addSpacer();
  return w;
}

const POZIOMY = ['A1', 'A2', 'B1', 'B2'];
const KOLOR_POZ = [new Color('#7ea06a'), new Color('#93b37c'), new Color('#a6c78f'), new Color('#c9e0ad')];
const DNI_TYG = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

function naglowek(w, t, prawy) {
  const s = w.addStack(); s.centerAlignContent();
  tekst(s, t, 12, KOLOR.wyciszony, true);
  if (prawy) { s.addSpacer(); tekst(s, prawy, 12, KOLOR.wyciszony, false); }
}

function minutyDnia(d, dataIso) { // minuty z ostatniego zapisu; dni po zapisie = 0
  if (!d.data || !d.min || !d.min.length) return 0;
  const roznica = Math.round((new Date(d.data + 'T12:00:00') - new Date(dataIso + 'T12:00:00')) / 864e5);
  const i = d.min.length - 1 - roznica;
  return i >= 0 && i < d.min.length ? d.min[i] : 0;
}

function wykresTygodnia(d, w, h) {
  const c = new DrawContext();
  c.size = new Size(w, h); c.opaque = false; c.respectScreenScale = true;
  const dni = [];
  for (let i = 6; i >= 0; i--) { const dt = new Date(teraz.getFullYear(), teraz.getMonth(), teraz.getDate() - i); dni.push([iso(dt), dt.getDay()]); }
  const wart = dni.map(([k]) => minutyDnia(d, k));
  const maks = Math.max(30, ...wart);
  const kol = w / 7, sz = Math.min(22, kol * 0.55), dolny = 16, wys = h - dolny - 14;
  c.setFont(Font.mediumSystemFont(10)); c.setTextAlignedCenter();
  dni.forEach(([k, dzienTyg], i) => {
    const x = i * kol + (kol - sz) / 2, v = wart[i];
    const tor = new Path(); tor.addRoundedRect(new Rect(x, 14, sz, wys), 5, 5);
    c.addPath(tor); c.setFillColor(KOLOR.tor); c.fillPath();
    if (v > 0) {
      const hh = Math.max(6, wys * Math.min(1, v / maks));
      const p = new Path(); p.addRoundedRect(new Rect(x, 14 + wys - hh, sz, hh), 5, 5);
      c.addPath(p); c.setFillColor(KOLOR.akcent); c.fillPath();
      c.setTextColor(KOLOR.tekst); c.drawTextInRect(String(v), new Rect(i * kol, 14 + wys - hh - 14, kol, 13));
    }
    c.setTextColor(k === dzis ? KOLOR.akcent : KOLOR.wyciszony);
    c.drawTextInRect(DNI_TYG[dzienTyg], new Rect(i * kol, h - dolny + 2, kol, 14));
  });
  return c.getImage();
}

function duzy(w, d) {
  const szer = 300;
  w.addSpacer(8);
  if (d.poz && d.poz.length === 4) {
    naglowek(w, 'Według poziomu');
    w.addSpacer(5);
    d.poz.forEach(([m, n], i) => {
      const r = w.addStack(); r.centerAlignContent();
      const etyk = r.addStack(); etyk.size = new Size(26, 0); tekst(etyk, POZIOMY[i], 12, KOLOR.tekst, true);
      r.addSpacer(6);
      r.addImage(pasek(n ? m / n : 0, 196, 7, KOLOR_POZ[i], KOLOR.tor)).imageSize = new Size(196, 7);
      r.addSpacer(8);
      const licz = r.addStack(); licz.size = new Size(66, 0); licz.addSpacer();
      tekst(licz, m + '/' + n, 11, KOLOR.wyciszony, false);
      w.addSpacer(2);
    });
  }
  w.addSpacer(8);
  const tydz = [];
  for (let i = 6; i >= 0; i--) tydz.push(minutyDnia(d, iso(new Date(teraz.getFullYear(), teraz.getMonth(), teraz.getDate() - i))));
  naglowek(w, 'Ostatnie 7 dni', tydz.reduce((a, b) => a + b, 0) + ' min');
  w.addSpacer(4);
  w.addImage(wykresTygodnia(d, szer, 58)).imageSize = new Size(szer, 58);
  w.addSpacer(8);
  const dol = w.addStack(); dol.centerAlignContent();
  tekst(dol, 'Utrwalone: ' + (d.utr || 0), 12, KOLOR.tekst, false);
  dol.addSpacer();
  const doPowt = (d.powt || []).filter(([k]) => k <= dzis).reduce((a, [, v]) => a + v, 0);
  tekst(dol, doPowt ? 'Powtórki na dziś: ' + doPowt : 'Powtórki: na bieżąco ✓', 12, doPowt ? KOLOR.ogien : KOLOR.akcent, !!doPowt);
}

const rodzina = config.widgetFamily || 'medium';
const widget = zbuduj(rodzina);
if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(widget);
} else {
  // Uruchomione z aplikacji albo ręcznie: pokaż podgląd.
  await widget.presentLarge();
}
Script.complete();
