# Leser — OCR & Audio Transkription

Eine lokale Webanwendung zur Texterkennung aus Bildern (OCR) und zur Transkription von Sprachaufnahmen und Audiodateien. 

Alle Daten werden **vollständig lokal auf deinem Rechner** verarbeitet – es werden keine Daten an externe Cloud-Dienste gesendet.

---

## 🛠 Voraussetzungen

- **Node.js** (v18 oder neuer) & **npm**
- **Python** (3.10 oder neuer)

---

## 📦 Installation

### 1. Repository klonen & ins Verzeichnis wechseln
```bash
git clone https://github.com/ild-thl/automultilangx_poc.git
cd automultilangx_poc
```

### 2. Frontend-Abhängigkeiten installieren
```bash
npm install
```

### 3. Python Virtual Environment (.venv) einrichten & Pakete installieren
```bash
# Virtuelle Umgebung erstellen
python3 -m venv .venv

# Abhängigkeiten installieren
.venv/bin/pip install -r requirements.txt
```

---

## 🚀 Anwendung starten

Um die Anwendung vollständig zu nutzen, werden **zwei Terminals** benötigt:

### Terminal 1 — Backend API-Server (Port 8000)
Startet den FastAPI-Server für PaddleOCR und Whisper:
```bash
npm run dev:api
```

### Terminal 2 — Frontend (Port 5173)
Startet die Vite-Entwicklungsumgebung:
```bash
npm run dev
```

---

## 🌐 Im Browser öffnen

Nach dem Start beider Server öffne folgende Adresse im Browser:

👉 **[http://localhost:5173](http://localhost:5173)**

---

## ✨ Funktionen

- 📷 **Foto zu Text (OCR):**
  - **Tesseract.js:** Läuft direkt im Browser (kein Serveraufruf nötig).
  - **PaddleOCR:** Präzise Erkennung über die lokale Python-API.
  - Unterstützte Sprachen: Deutsch, Englisch, Russisch, Arabisch sowie automatische Spracherkennung.

- 🎙️ **Audio transkribieren:**
  - Direkte Sprachaufnahme über das Mikrofon oder Datei-Upload (MP3, WAV, M4A, WEBM etc.).
  - Lokale Transkription mit **faster-whisper** (`large-v3-turbo` Modell).
  - Erkennt automatisch über 90 Sprachen.

