# Futár App prototípus

Egyszerű böngészős telefonos app demonstráció a futárszolgálat menedzsmentjéhez.

## Fő funkciók
- bejelentkezés (futár, fbence, vdorina felhasználók, mind `1234` jelszóval)
- szolgálat indítása (autó kiválasztása, km, kp)
- rendelés felvétele (kód, összeg, fizetési mód, cím, telefon)
- rendelés lista (Rendelések fül), telefonszám másolás, fizetés/borravaló, kiszállítás időmérő
- profil fül (össz km és össz borravaló a felhasználónál)
- fizetés rögzítése (készpénz címletekkel vagy bank/szép kártya megerősítéssel)
- napzárás (záró km, készpénz, profil km frissítése)

## Futtatás
1. Nyisd meg a `index.html` fájlt böngészőben vagy futtass lokális szervert:
   - `python -m http.server 8080`
   - vagy `npx serve .` (ha van Node.js)
2. Bejelentkezés: `futar` / `1234`
3. Használd a felületet a leírt folyamat szerint.

## Mobil távoli használat (nem ugyanazon a WiFi)
- Telepítsd a projektet publikus tárhelyre (pl. GitHub Pages, Netlify, Vercel).
- Így bármely eszközről elérhető a webcím, nem kell ugyanazon a lokális hálózaton lenned.
- A térképes GPS követéshez engedélyezni kell a helymeghatározást a mobil böngészőben.

## GPS és térképes nyomkövetés
- A felület „Térkép nyomkövetés” panelje most már Leaflet alapú.
- `GPS követés indítása` gomb kattintva elindul a `navigator.geolocation.watchPosition` és a mozgásvonal megjelenik a térképen.
- `GPS követés leállítása` leállítja a trackelést, a naplóba rögzíti a történést.

> Ez egy frontend demonstráció helyi adatokkal, backend tárolás, felhasználókezelés és ERP integráció későbbi lépésben.
