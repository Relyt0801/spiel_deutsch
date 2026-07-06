# Das Spiel ohne Render hosten – einen Link für die Schüler

Das Spiel ist **Online-Multiplayer in Echtzeit**: Es muss *irgendwo* ein
Node-Server laufen (er ist die „einzige Quelle der Wahrheit"). Ein reiner
Link ganz ohne Server ist deshalb nicht möglich.

**Gute Nachricht:** Server und Spiel sind jetzt **ein einziger Dienst**. Der
Server liefert das Spiel selbst aus – es gibt also nur **einen Link**, den die
Schüler anklicken. Du musst nichts mehr getrennt deployen.

Lokal testen:

```bash
npm install
npm run serve      # baut alles und startet den Server
# Spiel läuft jetzt auf  http://localhost:3001
```

Es gibt zwei einfache Wege, daraus einen Link für die Schüler zu machen.

---

## Weg A – Auf deinem PC + Tunnel (kostenlos, kein Account)

Ideal für den Unterricht: Der Server läuft auf deinem Laptop, ein Tunnel macht
ihn über einen öffentlichen `https`-Link erreichbar.

```bash
# Terminal 1 – Spiel starten
npm run serve

# Terminal 2 – öffentlichen Link erzeugen
npm run tunnel
```

`npm run tunnel` nutzt **Cloudflare Quick Tunnel** (lädt beim ersten Mal kurz ein
kleines Tool über `npx`) und gibt eine Adresse wie
`https://zufall-woerter.trycloudflare.com` aus. **Diesen Link teilst du mit den
Schülern.** Solange dein Laptop an ist und beide Terminals laufen, können alle
spielen.

- Kein Konto, keine Anmeldung nötig.
- Der Link **ändert sich** bei jedem Neustart des Tunnels.
- Läuft nur, solange dein PC eingeschaltet ist.

> Alternative ohne Cloudflare: `npx localtunnel --port 3001`
> (zeigt evtl. eine kurze Zwischenseite).

---

## Weg B – Kostenloser Cloud-Dienst (fester Link)

Wenn der Link dauerhaft gleich bleiben soll (z. B. `https://remi-monopoly.fly.dev`),
deploye das mitgelieferte `Dockerfile` bei einem kostenlosen Anbieter. Es baut
Client + Server und startet alles als einen Dienst.

### Fly.io (empfohlen)
```bash
# einmalig: https://fly.io/docs/hands-on/install-flyctl/
fly launch --no-deploy     # erkennt das Dockerfile, App-Namen wählen
fly deploy
# Link: https://<app-name>.fly.dev
```

### Railway
- Neues Projekt → „Deploy from GitHub repo" → dieses Repo wählen.
- Railway erkennt das `Dockerfile` automatisch.
- Unter „Settings → Networking" eine öffentliche Domain erzeugen → das ist der Link.

### Koyeb
- „Create Service" → GitHub-Repo → Buildpack: **Dockerfile**.
- Port `3001` angeben → öffentliche URL ist der Link.

**Hinweise zur Cloud:**
- `NODE_ENV=production` ist im Dockerfile gesetzt – kein weiteres Setup nötig.
- Du musst **kein** `CLIENT_ORIGIN` / `VITE_SOCKET_URL` setzen (Single-Service =
  gleiche Herkunft). Setze `CLIENT_ORIGIN` nur, wenn du Client und Server bewusst
  getrennt betreibst.
- Kostenlose Dienste „schlafen" bei Inaktivität ein – der **erste** Aufruf kann
  ~30 Sekunden dauern, danach läuft es flüssig.

---

## Worauf läuft was? (Kurzüberblick)

| Variable | Standard | Wofür |
|---|---|---|
| `PORT` | `3001` | Port des Servers (Cloud setzt das oft selbst) |
| `CLIENT_ORIGIN` | *(alle erlaubt)* | Nur setzen, wenn Client getrennt vom Server läuft |
| `VITE_SOCKET_URL` | *(gleiche Herkunft)* | Nur für getrennten Client nötig (Build-Zeit) |
