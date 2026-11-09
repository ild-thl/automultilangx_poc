import './style.css'
import { createWorker } from 'tesseract.js'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="topbar">
    <a class="wordmark" href="#" aria-label="Leser OCR Startseite"><span class="brand-mark">L</span> LESER <span class="wordmark-tag">/ OCR</span></a>
    <div class="privacy"><span class="privacy-dot" id="service-dot"></span><span id="service-status">Lokal auf deinem Rechner</span></div>
  </header>

  <main class="shell">
    <section class="intro">
      <p class="eyebrow">BILD ODER AUDIO <span></span> TEXT WEITER NUTZEN</p>
      <h1>Foto und Stimme. <em>Text.</em></h1>
      <p class="intro-copy">Erkenne Text in einem Foto oder wandle eine Audioaufnahme in ein Transkript um.</p>
    </section>

    <div class="mode-tabs" role="tablist" aria-label="Erkennungsart">
      <button class="mode-tab is-active" id="image-mode" type="button" role="tab" aria-selected="true">Foto zu Text</button>
      <button class="mode-tab" id="audio-mode" type="button" role="tab" aria-selected="false">Audio transkribieren</button>
    </div>

    <section class="workbench" aria-label="Erkennungs-Arbeitsbereich">
      <section class="pane source-pane" aria-labelledby="source-title">
        <div class="pane-heading">
          <div class="pane-title"><span class="step-number">01</span><h2 id="source-title">Bildquelle</h2></div>
          <button class="text-button" id="reset-button" type="button" disabled>Zurücksetzen</button>
        </div>

        <div id="image-controls">
          <input id="file-input" class="visually-hidden" type="file" accept="image/*">
          <label class="dropzone" id="dropzone" for="file-input" tabindex="0">
            <span class="upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v4A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
            <span class="drop-title">Bild hier ablegen</span>
            <span class="drop-subtitle">oder <span class="browse-link">Datei auswählen</span></span>
            <span class="file-hint">JPG, PNG, WEBP · max. 20 MB</span>
          </label>

          <div class="preview-card" id="preview-card" hidden>
            <img id="image-preview" alt="Vorschau des ausgewählten Bildes">
            <div class="preview-footer"><span id="file-name"></span><button id="change-image" class="text-button" type="button">Bild ändern</button></div>
          </div>

          <div class="settings-row">
            <label for="ocr-engine-select">OCR-Engine</label>
            <select id="ocr-engine-select">
              <option value="tesseract">Tesseract (Browser, lokal)</option>
              <option value="paddle" id="paddle-engine-option">PaddleOCR (Server, lokal)</option>
            </select>
          </div>
          <div class="settings-row">
            <label for="language-select">Erkennungssprache</label>
            <select id="language-select">
              <option value="auto" selected>✨ Automatisch erkennen</option>
              <option value="de+en">Deutsch + Englisch</option>
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
              <option value="ru">Russisch (Kyrillisch)</option>
              <option value="ar">Arabisch</option>
            </select>
          </div>
          <p class="language-hint">Bei „Automatisch erkennen“ wird die Sprache & Schrift im Dokument selbstständig erkannt.</p>
          <button class="primary-button" id="recognize-button" type="button" disabled><span aria-hidden="true">↗</span> Text erkennen</button>
          <p class="privacy-note" id="ocr-privacy-note">Tesseract: Das Foto bleibt im Browser. Sprachdaten werden bei Bedarf geladen.</p>
        </div>

        <div id="audio-controls" hidden>
          <div class="audio-record-box">
            <button class="record-mic-button" id="record-mic-button" type="button">
              <span class="mic-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" fill="currentColor"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <span class="mic-text-wrap">
                <span class="mic-primary-text">Sprachaufnahme starten</span>
                <span class="mic-secondary-text">Direkt ins Mikrofon sprechen (automatische Spracherkennung)</span>
              </span>
            </button>

            <div class="recording-active-bar" id="recording-active-bar" hidden>
              <div class="recording-badge">
                <span class="rec-pulse-dot"></span>
                <span class="rec-status-label">Aufnahme läuft</span>
                <span class="rec-timer-display" id="recording-timer">00:00</span>
              </div>
              <div class="sound-wave" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
              <div class="recording-btn-group">
                <button class="rec-finish-btn" id="record-stop-button" type="button">⏹ Aufnahme stoppen</button>
                <button class="rec-abort-btn" id="record-cancel-button" type="button">✕ Abbrechen</button>
              </div>
            </div>
          </div>

          <div class="audio-divider"><span>oder Audiodatei ablegen</span></div>

          <input id="audio-input" class="visually-hidden" type="file" accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac">
          <label class="dropzone" id="audio-dropzone" for="audio-input" tabindex="0">
            <span class="upload-icon audio-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13M9 18c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2Zm12-2c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2ZM9 8l12-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
            <span class="drop-title">Audiodatei hier ablegen</span>
            <span class="drop-subtitle">oder <span class="browse-link">Datei auswählen</span></span>
            <span class="file-hint">MP3, WAV, M4A, WEBM · max. 100 MB</span>
          </label>
          <div class="audio-preview" id="audio-preview" hidden>
            <audio id="audio-player" controls preload="metadata"></audio>
            <div class="preview-footer"><span id="audio-file-name"></span><span id="audio-duration" class="audio-duration" hidden></span><button id="change-audio" class="text-button" type="button">Audio ändern</button></div>
          </div>
          <div class="settings-row">
            <label for="model-select">Whisper-Modell</label>
            <select id="model-select">
              <optgroup label="Kompakt">
                <option value="tiny">tiny</option>
                <option value="tiny.en">tiny.en</option>
                <option value="base">base</option>
                <option value="base.en">base.en</option>
                <option value="small">small</option>
                <option value="small.en">small.en</option>
                <option value="medium">medium</option>
                <option value="medium.en">medium.en</option>
              </optgroup>
              <optgroup label="Groß">
                <option value="large-v1">large-v1</option>
                <option value="large-v2">large-v2</option>
                <option value="large-v3">large-v3</option>
                <option value="large">large</option>
                <option value="large-v3-turbo" selected>large-v3-turbo</option>
                <option value="turbo">turbo</option>
              </optgroup>
              <optgroup label="Distil">
                <option value="distil-small.en">distil-small.en</option>
                <option value="distil-medium.en">distil-medium.en</option>
                <option value="distil-large-v2">distil-large-v2</option>
                <option value="distil-large-v3">distil-large-v3</option>
                <option value="distil-large-v3.5">distil-large-v3.5</option>
              </optgroup>
            </select>
          </div>
          <div class="settings-row">
            <label for="audio-language">Gesprochene Sprache</label>
            <select id="audio-language">
              <option value="auto" selected>✨ Automatisch erkennen</option>
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
              <option value="ru">Russisch</option>
              <option value="ar">Arabisch</option>
              <option value="es">Spanisch</option>
              <option value="fr">Französisch</option>
              <option value="it">Italienisch</option>
              <option value="tr">Türkisch</option>
              <option value="uk">Ukrainisch</option>
              <option value="pl">Polnisch</option>
            </select>
          </div>
          <button class="primary-button" id="transcribe-button" type="button" disabled><span aria-hidden="true">↗</span> Audio transkribieren</button>
          <p class="privacy-note">Verarbeitung auf diesem Rechner mit faster-whisper. Erkennt automatisch über 90 Sprachen.</p>
        </div>
      </section>

      <section class="pane result-pane" aria-labelledby="result-title">
        <div class="pane-heading">
          <div class="pane-title"><span class="step-number">02</span><h2 id="result-title">Erkannter Text</h2></div>
          <div class="result-actions">
            <button class="icon-button" id="copy-button" type="button" title="Text kopieren" aria-label="Text kopieren" disabled>⧉</button>
            <button class="icon-button" id="download-button" type="button" title="Textdatei herunterladen" aria-label="Textdatei herunterladen" disabled>↓</button>
          </div>
        </div>

        <div class="progress-wrap" id="progress-wrap" hidden>
          <div class="progress-label"><span id="progress-status">Bereit zum Erkennen</span><span id="progress-percent">0%</span></div>
          <div class="progress-track"><div class="progress-bar" id="progress-bar"></div></div>
        </div>
        <textarea id="result-text" dir="auto" placeholder="Dein erkannter Text erscheint hier …" aria-label="Erkannter Text"></textarea>
        <div class="result-footer"><span id="result-status" role="status">Noch kein Text erkannt</span><span id="character-count">0 Zeichen</span></div>
        <div class="timing-metrics" id="timing-metrics" hidden>
          <span>Gesamtzeit <strong id="total-time"></strong></span>
          <span id="rtf-metric" title="Whisper-Laufzeit geteilt durch Audiodauer. Unter 1× bedeutet schneller als Echtzeit.">RTF <strong id="rtf-value"></strong></span>
        </div>
      </section>
    </section>

    <footer class="page-footer"><span>LESER / OCR</span><span>Deine Dateien bleiben auf deinem Gerät.</span></footer>
  </main>
`

const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const dropzone = document.querySelector<HTMLLabelElement>('#dropzone')!
const previewCard = document.querySelector<HTMLDivElement>('#preview-card')!
const imagePreview = document.querySelector<HTMLImageElement>('#image-preview')!
const fileName = document.querySelector<HTMLSpanElement>('#file-name')!
const recognizeButton = document.querySelector<HTMLButtonElement>('#recognize-button')!
const resetButton = document.querySelector<HTMLButtonElement>('#reset-button')!
const ocrEngineSelect = document.querySelector<HTMLSelectElement>('#ocr-engine-select')!
const languageSelect = document.querySelector<HTMLSelectElement>('#language-select')!
const ocrPrivacyNote = document.querySelector<HTMLParagraphElement>('#ocr-privacy-note')!
const paddleEngineOption = document.querySelector<HTMLOptionElement>('#paddle-engine-option')!

const recordMicButton = document.querySelector<HTMLButtonElement>('#record-mic-button')!
const recordingActiveBar = document.querySelector<HTMLDivElement>('#recording-active-bar')!
const recordingTimer = document.querySelector<HTMLSpanElement>('#recording-timer')!
const recordStopButton = document.querySelector<HTMLButtonElement>('#record-stop-button')!
const recordCancelButton = document.querySelector<HTMLButtonElement>('#record-cancel-button')!

const TESSERACT_LANG: Record<string, string> = {
  auto: 'deu+eng+rus+ara',
  'de+en': 'deu+eng',
  de: 'deu',
  en: 'eng',
  ru: 'rus',
  ar: 'ara',
}

const LANGUAGE_NAMES: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  ar: 'Arabisch',
  ru: 'Russisch',
  es: 'Spanisch',
  fr: 'Französisch',
  it: 'Italienisch',
  tr: 'Türkisch',
  uk: 'Ukrainisch',
  pl: 'Polnisch',
  nl: 'Niederländisch',
  pt: 'Portugiesisch',
  zh: 'Chinesisch',
  ja: 'Japanisch',
  ko: 'Koreanisch',
  fa: 'Persisch',
  hi: 'Hindi',
  sv: 'Schwedisch',
  da: 'Dänisch',
  fi: 'Finnisch',
  no: 'Norwegisch',
  el: 'Griechisch',
  he: 'Hebräisch',
  cs: 'Tschechisch',
  ro: 'Rumänisch',
  hu: 'Ungarisch',
}

let paddleOcrAvailable = false
const resultText = document.querySelector<HTMLTextAreaElement>('#result-text')!
const resultStatus = document.querySelector<HTMLSpanElement>('#result-status')!
const characterCount = document.querySelector<HTMLSpanElement>('#character-count')!
const progressWrap = document.querySelector<HTMLDivElement>('#progress-wrap')!
const progressBar = document.querySelector<HTMLDivElement>('#progress-bar')!
const progressStatus = document.querySelector<HTMLSpanElement>('#progress-status')!
const progressPercent = document.querySelector<HTMLSpanElement>('#progress-percent')!
const copyButton = document.querySelector<HTMLButtonElement>('#copy-button')!
const downloadButton = document.querySelector<HTMLButtonElement>('#download-button')!
const imageModeButton = document.querySelector<HTMLButtonElement>('#image-mode')!
const audioModeButton = document.querySelector<HTMLButtonElement>('#audio-mode')!
const imageControls = document.querySelector<HTMLDivElement>('#image-controls')!
const audioControls = document.querySelector<HTMLDivElement>('#audio-controls')!
const sourceTitle = document.querySelector<HTMLHeadingElement>('#source-title')!
const audioInput = document.querySelector<HTMLInputElement>('#audio-input')!
const audioDropzone = document.querySelector<HTMLLabelElement>('#audio-dropzone')!
const audioPreview = document.querySelector<HTMLDivElement>('#audio-preview')!
const audioPlayer = document.querySelector<HTMLAudioElement>('#audio-player')!
const audioFileName = document.querySelector<HTMLSpanElement>('#audio-file-name')!
const audioDuration = document.querySelector<HTMLSpanElement>('#audio-duration')!
const modelSelect = document.querySelector<HTMLSelectElement>('#model-select')!
const audioLanguage = document.querySelector<HTMLSelectElement>('#audio-language')!
const transcribeButton = document.querySelector<HTMLButtonElement>('#transcribe-button')!
const serviceStatus = document.querySelector<HTMLSpanElement>('#service-status')!
const serviceDot = document.querySelector<HTMLSpanElement>('#service-dot')!
const timingMetrics = document.querySelector<HTMLDivElement>('#timing-metrics')!
const totalTime = document.querySelector<HTMLElement>('#total-time')!
const rtfMetric = document.querySelector<HTMLSpanElement>('#rtf-metric')!
const rtfValue = document.querySelector<HTMLElement>('#rtf-value')!
let selectedFile: File | null = null
let selectedAudio: File | null = null
let previewUrl: string | null = null
let audioUrl: string | null = null
let selectedMode: 'image' | 'audio' = 'image'
let isRecognizing = false

function setFile(file: File | undefined) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    resultStatus.textContent = 'Bitte wähle eine Bilddatei aus.'
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    resultStatus.textContent = 'Das Bild darf höchstens 20 MB groß sein.'
    return
  }

  if (previewUrl) URL.revokeObjectURL(previewUrl)
  selectedFile = file
  previewUrl = URL.createObjectURL(file)
  imagePreview.src = previewUrl
  fileName.textContent = file.name
  dropzone.hidden = true
  previewCard.hidden = false
  recognizeButton.disabled = false
  resetButton.disabled = false
  resultText.value = ''
  updateCharacterCount()
  resultStatus.textContent = 'Bild bereit zur Erkennung'
  copyButton.disabled = true
  downloadButton.disabled = true
  timingMetrics.hidden = true
}

function updateCharacterCount() {
  const count = resultText.value.length
  characterCount.textContent = `${count.toLocaleString('de-DE')} ${count === 1 ? 'Zeichen' : 'Zeichen'}`
}

function formatSeconds(seconds: number) {
  const fractionDigits = seconds < 1 ? 2 : 1
  return `${seconds.toLocaleString('de-DE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} s`
}

function formatAudioDuration(seconds: number) {
  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = String(totalSeconds % 60).padStart(2, '0')
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${remainingSeconds} Std.`
  }
  return `${minutes}:${remainingSeconds} min`
}

function showTimingMetrics(startedAt: number, inferenceSeconds?: number, audioSeconds?: number | null) {
  totalTime.textContent = formatSeconds((performance.now() - startedAt) / 1000)
  if (inferenceSeconds !== undefined && audioSeconds !== undefined && audioSeconds !== null && audioSeconds > 0) {
    rtfValue.textContent = `${(inferenceSeconds / audioSeconds).toLocaleString('de-DE', { maximumFractionDigits: 2 })}×`
    rtfMetric.hidden = false
  } else {
    rtfMetric.hidden = true
  }
  timingMetrics.hidden = false
}

function updateOcrPrivacyNote() {
  if (ocrEngineSelect.value === 'paddle') {
    ocrPrivacyNote.textContent =
      'PaddleOCR: Das Bild wird an den lokalen API-Server (Port 8000) gesendet. Verarbeitung bleibt auf deinem Rechner.'
  } else {
    ocrPrivacyNote.textContent = 'Tesseract: Das Foto bleibt im Browser. Sprachdaten werden bei Bedarf geladen.'
  }
}

function setPaddleOcrAvailability(available: boolean) {
  paddleOcrAvailable = available
  paddleEngineOption.disabled = !available
  if (!available && ocrEngineSelect.value === 'paddle') {
    ocrEngineSelect.value = 'tesseract'
    updateOcrPrivacyNote()
  }
}

function setMode(mode: 'image' | 'audio') {
  if (isRecognizing) return
  selectedMode = mode
  const isAudio = mode === 'audio'
  imageModeButton.classList.toggle('is-active', !isAudio)
  audioModeButton.classList.toggle('is-active', isAudio)
  imageModeButton.setAttribute('aria-selected', String(!isAudio))
  audioModeButton.setAttribute('aria-selected', String(isAudio))
  imageControls.hidden = isAudio
  audioControls.hidden = !isAudio
  sourceTitle.textContent = isAudio ? 'Audioquelle' : 'Bildquelle'
  resetButton.disabled = isAudio ? !selectedAudio : !selectedFile
  progressWrap.hidden = true
  timingMetrics.hidden = true
}

function setAudioFile(file: File | undefined) {
  if (!file) return
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|webm|ogg|flac|aac|mp4|mpeg|wma)$/i.test(file.name)) {
    resultStatus.textContent = 'Bitte wähle eine Audiodatei aus.'
    return
  }
  if (file.size > 100 * 1024 * 1024) {
    resultStatus.textContent = 'Die Audiodatei darf höchstens 100 MB groß sein.'
    return
  }
  if (audioUrl) URL.revokeObjectURL(audioUrl)
  selectedAudio = file
  audioUrl = URL.createObjectURL(file)
  audioPlayer.src = audioUrl
  audioPlayer.load()
  audioFileName.textContent = file.name
  audioDuration.hidden = true
  audioDropzone.hidden = true
  audioPreview.hidden = false
  transcribeButton.disabled = false
  resetButton.disabled = false
  resultText.value = ''
  updateCharacterCount()
  resultStatus.textContent = 'Audio bereit zur Transkription'
  copyButton.disabled = true
  downloadButton.disabled = true
  timingMetrics.hidden = true
}

function detectClientLanguage(text: string): { name: string; code: string } {
  if (!text || !text.trim()) return { name: 'Unbekannt', code: 'unknown' }

  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)) {
    return { name: 'Arabisch', code: 'ar' }
  }
  if (/[\u0400-\u04FF]/.test(text)) {
    return { name: 'Russisch', code: 'ru' }
  }
  const textLower = text.toLowerCase()
  if (/[äöüß]/.test(textLower)) {
    return { name: 'Deutsch', code: 'de' }
  }

  const deWords = new Set([
    'der', 'die', 'das', 'und', 'ist', 'in', 'für', 'mit', 'auf', 'nicht',
    'eine', 'einer', 'eines', 'einem', 'einen', 'dem', 'den', 'von', 'zu',
    'im', 'sie', 'es', 'an', 'er', 'hat', 'wir', 'ihr', 'oder', 'aber', 'auch'
  ])
  const enWords = new Set([
    'the', 'and', 'of', 'to', 'in', 'is', 'you', 'that', 'it', 'he', 'was',
    'for', 'on', 'are', 'as', 'with', 'his', 'they', 'at', 'be', 'this',
    'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what'
  ])

  const words = textLower.match(/\b[a-zäöüß]+\b/g) || []
  let deMatches = 0
  let enMatches = 0
  for (const w of words) {
    if (deWords.has(w)) deMatches++
    if (enWords.has(w)) enMatches++
  }

  if (deMatches > enMatches) return { name: 'Deutsch', code: 'de' }
  if (enMatches > deMatches) return { name: 'Englisch', code: 'en' }
  return { name: 'Deutsch / Englisch', code: 'de+en' }
}

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let audioChunks: Blob[] = []
let recordInterval: number | null = null
let recordSeconds = 0

function stopMediaTracks() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
}

function stopRecordingTimer() {
  if (recordInterval !== null) {
    window.clearInterval(recordInterval)
    recordInterval = null
  }
}

async function startRecording() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Mikrofonaufnahme wird von diesem Browser nicht unterstützt.')
      return
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = []
    recordSeconds = 0
    recordingTimer.textContent = '00:00'

    let mimeType = 'audio/webm'
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus'
    } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4'
    } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg'
    }

    mediaRecorder = new MediaRecorder(mediaStream, { mimeType })
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      stopRecordingTimer()
      stopMediaTracks()
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: mimeType })
        const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
        const audioFile = new File([audioBlob], `sprachaufnahme.${extension}`, { type: mimeType })
        setAudioFile(audioFile)
      }
      recordMicButton.hidden = false
      recordingActiveBar.hidden = true
    }

    mediaRecorder.start(250)
    recordMicButton.hidden = true
    recordingActiveBar.hidden = false

    recordInterval = window.setInterval(() => {
      recordSeconds++
      const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0')
      const secs = String(recordSeconds % 60).padStart(2, '0')
      recordingTimer.textContent = `${mins}:${secs}`
    }, 1000)
  } catch (error) {
    console.error('Mikrofon-Zugriff fehlgeschlagen:', error)
    alert('Zugriff auf das Mikrofon verweigert oder kein Mikrofon gefunden.')
    recordMicButton.hidden = false
    recordingActiveBar.hidden = true
    stopRecordingTimer()
    stopMediaTracks()
  }
}

function finishRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}

function cancelRecording() {
  audioChunks = []
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  stopRecordingTimer()
  stopMediaTracks()
  recordMicButton.hidden = false
  recordingActiveBar.hidden = true
}

function reset() {
  if (isRecognizing) return
  cancelRecording()
  selectedFile = null
  selectedAudio = null
  fileInput.value = ''
  audioInput.value = ''
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  if (audioUrl) URL.revokeObjectURL(audioUrl)
  previewUrl = null
  audioUrl = null
  imagePreview.removeAttribute('src')
  audioPlayer.removeAttribute('src')
  audioPlayer.load()
  audioDuration.hidden = true
  previewCard.hidden = true
  audioPreview.hidden = true
  dropzone.hidden = false
  audioDropzone.hidden = false
  recognizeButton.disabled = true
  transcribeButton.disabled = true
  resetButton.disabled = true
  resultText.value = ''
  progressWrap.hidden = true
  resultStatus.textContent = 'Noch kein Text erkannt'
  copyButton.disabled = true
  downloadButton.disabled = true
  timingMetrics.hidden = true
  updateCharacterCount()
}

fileInput.addEventListener('change', () => setFile(fileInput.files?.[0]))
audioInput.addEventListener('change', () => setAudioFile(audioInput.files?.[0]))
recordMicButton.addEventListener('click', startRecording)
recordStopButton.addEventListener('click', finishRecording)
recordCancelButton.addEventListener('click', cancelRecording)
document.querySelector<HTMLButtonElement>('#change-image')!.addEventListener('click', () => fileInput.click())
document.querySelector<HTMLButtonElement>('#change-audio')!.addEventListener('click', () => audioInput.click())
audioPlayer.addEventListener('loadedmetadata', () => {
  if (Number.isFinite(audioPlayer.duration)) {
    audioDuration.textContent = `Dauer ${formatAudioDuration(audioPlayer.duration)}`
    audioDuration.hidden = false
  }
})
resetButton.addEventListener('click', reset)
imageModeButton.addEventListener('click', () => setMode('image'))
audioModeButton.addEventListener('click', () => setMode('audio'))
ocrEngineSelect.addEventListener('change', updateOcrPrivacyNote)
resultText.addEventListener('input', updateCharacterCount)
updateOcrPrivacyNote()

dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    fileInput.click()
  }
})
for (const eventName of ['dragenter', 'dragover'] as const) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault()
    dropzone.classList.add('is-dragging')
  })
}
for (const eventName of ['dragleave', 'drop'] as const) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault()
    dropzone.classList.remove('is-dragging')
  })
}
dropzone.addEventListener('drop', (event) => setFile(event.dataTransfer?.files[0]))
audioDropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    audioInput.click()
  }
})
for (const eventName of ['dragenter', 'dragover'] as const) {
  audioDropzone.addEventListener(eventName, (event) => {
    event.preventDefault()
    audioDropzone.classList.add('is-dragging')
  })
}
for (const eventName of ['dragleave', 'drop'] as const) {
  audioDropzone.addEventListener(eventName, (event) => {
    event.preventDefault()
    audioDropzone.classList.remove('is-dragging')
  })
}
audioDropzone.addEventListener('drop', (event) => setAudioFile(event.dataTransfer?.files[0]))

fetch('/api/health')
  .then(async (response) => {
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('Audio-Dienst nicht erreichbar')
    }
    const health = await response.json() as { status?: string; paddleOcrAvailable?: boolean }
    if (health.status !== 'ready') throw new Error('Audio-Dienst nicht bereit')
    setPaddleOcrAvailability(Boolean(health.paddleOcrAvailable))
    serviceStatus.textContent = health.paddleOcrAvailable
      ? 'Audio- & PaddleOCR-Dienst bereit'
      : 'Audio-Dienst bereit (PaddleOCR fehlt)'
    serviceDot.classList.add('is-ready')
  })
  .catch(() => {
    setPaddleOcrAvailability(false)
    serviceStatus.textContent = 'API nicht gestartet (npm run dev:api)'
    serviceDot.classList.add('is-offline')
  })

async function recognizeWithTesseract(startedAt: number) {
  const isAuto = languageSelect.value === 'auto'
  const langToUse = isAuto ? 'deu+eng+rus+ara' : (TESSERACT_LANG[languageSelect.value] ?? 'deu')

  const worker = await createWorker(langToUse, 1, {
    logger: (message) => {
      const percent = Math.round((message.progress ?? 0) * 100)
      progressBar.style.width = `${percent}%`
      progressPercent.textContent = `${percent}%`
      if (message.status) {
        progressStatus.textContent =
          message.status === 'recognizing text'
            ? (isAuto ? 'Text & Sprache werden erkannt …' : 'Text wird erkannt …')
            : 'Sprachmodelle werden vorbereitet …'
      }
    },
  })
  try {
    const { data } = await worker.recognize(selectedFile!)
    resultText.value = data.text.trim()
    updateCharacterCount()
    if (resultText.value) {
      if (isAuto) {
        const detected = detectClientLanguage(resultText.value)
        resultStatus.textContent = `Erkennung abgeschlossen · Tesseract (${detected.name} erkannt)`
      } else {
        resultStatus.textContent = 'Erkennung abgeschlossen · Tesseract'
      }
    } else {
      resultStatus.textContent = 'Kein Text gefunden · Tesseract'
    }
    copyButton.disabled = !resultText.value
    downloadButton.disabled = !resultText.value
    showTimingMetrics(startedAt)
    progressBar.style.width = '100%'
    progressPercent.textContent = '100%'
    progressStatus.textContent = 'Fertig'
  } finally {
    await worker.terminate()
  }
}

async function recognizeWithPaddle(startedAt: number) {
  if (!paddleOcrAvailable) {
    throw new Error('PaddleOCR ist nicht verfügbar. Starte npm run dev:api und installiere die Python-Abhängigkeiten.')
  }
  const isAuto = languageSelect.value === 'auto'
  progressWrap.classList.add('is-indeterminate')
  progressStatus.textContent = isAuto
    ? 'PaddleOCR analysiert Sprache und erkennt Text …'
    : 'PaddleOCR lädt Modelle und erkennt Text …'
  progressPercent.textContent = ''

  const formData = new FormData()
  formData.append('file', selectedFile!)
  formData.append('language', languageSelect.value)

  const response = await fetch('/api/ocr', { method: 'POST', body: formData })
  const result = await response.json() as {
    text?: string
    detail?: string
    processingSeconds?: number
    detectedLanguage?: string
    confidence?: number
  }
  if (!response.ok) throw new Error(result.detail || 'PaddleOCR ist fehlgeschlagen.')

  resultText.value = result.text?.trim() ?? ''
  updateCharacterCount()
  if (resultText.value) {
    const langInfo = result.detectedLanguage ? ` (${result.detectedLanguage} erkannt)` : ''
    resultStatus.textContent = `Erkennung abgeschlossen · PaddleOCR${langInfo}`
  } else {
    resultStatus.textContent = 'Kein Text gefunden · PaddleOCR'
  }
  copyButton.disabled = !resultText.value
  downloadButton.disabled = !resultText.value
  showTimingMetrics(startedAt, result.processingSeconds, null)
  progressWrap.classList.remove('is-indeterminate')
  progressBar.style.width = '100%'
  progressPercent.textContent = '100%'
  progressStatus.textContent = 'Fertig'
}

recognizeButton.addEventListener('click', async () => {
  if (!selectedFile || isRecognizing) return
  const startedAt = performance.now()
  const engine = ocrEngineSelect.value
  isRecognizing = true
  recognizeButton.disabled = true
  resetButton.disabled = true
  languageSelect.disabled = true
  ocrEngineSelect.disabled = true
  progressWrap.hidden = false
  progressWrap.classList.remove('is-indeterminate')
  progressBar.style.width = '0%'
  progressStatus.textContent = engine === 'paddle' ? 'PaddleOCR wird vorbereitet …' : 'Sprachmodell wird geladen …'
  progressPercent.textContent = engine === 'paddle' ? '' : '0%'
  resultStatus.textContent = 'Erkennung läuft …'

  try {
    if (engine === 'paddle') {
      await recognizeWithPaddle(startedAt)
    } else {
      await recognizeWithTesseract(startedAt)
    }
  } catch (error) {
    console.error('OCR failed:', error)
    resultStatus.textContent = error instanceof Error ? error.message : 'Erkennung fehlgeschlagen. Bitte versuche es erneut.'
    progressStatus.textContent = 'Fehler bei der Erkennung'
    progressWrap.classList.remove('is-indeterminate')
  } finally {
    isRecognizing = false
    recognizeButton.disabled = !selectedFile
    resetButton.disabled = !selectedFile
    languageSelect.disabled = false
    ocrEngineSelect.disabled = false
  }
})

transcribeButton.addEventListener('click', async () => {
  if (!selectedAudio || isRecognizing) return
  const startedAt = performance.now()
  isRecognizing = true
  transcribeButton.disabled = true
  recognizeButton.disabled = true
  resetButton.disabled = true
  audioLanguage.disabled = true
  progressWrap.hidden = false
  progressWrap.classList.add('is-indeterminate')
  progressStatus.textContent = 'Modell wird geladen und Audio transkribiert …'
  progressPercent.textContent = ''
  resultStatus.textContent = 'Transkription läuft …'

  const formData = new FormData()
  formData.append('file', selectedAudio)
  formData.append('language', audioLanguage.value)
  formData.append('model', modelSelect.value)

  try {
    const response = await fetch('/api/transcribe', { method: 'POST', body: formData })
    const result = await response.json() as {
      text?: string
      language?: string
      languageProbability?: number
      detail?: string
      duration?: number
      processingSeconds?: number
      model?: string
    }
    if (!response.ok) throw new Error(result.detail || 'Die Transkription ist fehlgeschlagen.')
    resultText.value = result.text?.trim() ?? ''
    updateCharacterCount()

    const langKey = result.language?.toLowerCase() || ''
    const langLabel = LANGUAGE_NAMES[langKey] || result.language || 'Sprache'
    const probInfo = result.languageProbability != null
      ? ` (${Math.round(result.languageProbability * 100)}% Konfidenz)`
      : ''
    resultStatus.textContent = resultText.value
      ? `Transkription abgeschlossen · ${langLabel} erkannt${probInfo}`
      : 'Kein gesprochener Text erkannt'

    copyButton.disabled = !resultText.value
    downloadButton.disabled = !resultText.value
    showTimingMetrics(startedAt, result.processingSeconds, result.duration)
    progressWrap.classList.remove('is-indeterminate')
    progressBar.style.width = '100%'
    progressPercent.textContent = '100%'
    progressStatus.textContent = 'Fertig'
  } catch (error) {
    resultStatus.textContent = error instanceof Error ? error.message : 'Transkription fehlgeschlagen.'
    progressWrap.classList.remove('is-indeterminate')
    progressStatus.textContent = 'Fehler bei der Transkription'
  } finally {
    isRecognizing = false
    transcribeButton.disabled = !selectedAudio
    recognizeButton.disabled = !selectedFile
    resetButton.disabled = selectedMode === 'audio' ? !selectedAudio : !selectedFile
    audioLanguage.disabled = false
  }
})

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultText.value)
    resultStatus.textContent = 'Text in die Zwischenablage kopiert'
  } catch {
    resultStatus.textContent = 'Kopieren ist in diesem Browser nicht verfügbar'
  }
})

downloadButton.addEventListener('click', () => {
  const blob = new Blob([resultText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const sourceName = selectedMode === 'audio' ? selectedAudio?.name : selectedFile?.name
  link.download = `${sourceName?.replace(/\.[^.]+$/, '') || 'erkannter-text'}.txt`
  link.click()
  URL.revokeObjectURL(url)
})

updateCharacterCount()
