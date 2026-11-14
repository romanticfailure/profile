import './style.css';

/* ---------- Content (edit here) ---------- */
const DISCORD_USERNAME = '189id';
const SITE_TITLE = document.title;

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
  timeZoneName: 'short'
});

function buildTerminalLines() {
  return [
    '> initializing personal profile...',
    '',
    'name        - ???',
    'age         - ???',
    'username    - romanticfailure',
    'birthday    - 17 jan',
    'located     - Germany',
    `local time  - ${timeFormat.format(new Date())}`,
    '',
    '> profile successfully loaded.'
  ];
}

/* ---------- Elements ---------- */
const $ = selector => document.querySelector(selector);
const entryScreen = $('#entryScreen');
const siteShell = $('#siteShell');
const terminal = $('#terminal');
const terminalOutput = $('#terminalOutput');
const volumeButton = $('#volumeButton');
const volumePopover = $('#volumePopover');
const volumeSlider = $('#volumeSlider');
const volumeValue = $('#volumeValue');
const copyDiscord = $('#copyDiscord');
const toast = $('#toast');
const audio = $('#profileAudio');
const playButton = $('#playButton');
const playGlyph = $('#playGlyph');
const progressRange = $('#progressRange');
const timeCurrent = $('#timeCurrent');
const timeDuration = $('#timeDuration');
const equalizer = $('#equalizer');
const starCanvas = $('#stars');
const cursorGlow = $('#cursorGlow');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let entered = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ---------- Toast ---------- */
let toastTimer;
let toastHideTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  window.clearTimeout(toastHideTimer);
  toast.textContent = message;
  toast.classList.add('toast--visible');
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('toast--visible');
    toastHideTimer = window.setTimeout(() => { toast.textContent = ''; }, 350);
  }, 1700);
}

/* ---------- Stars (entry sky that stays behind the page) ---------- */
const sctx = starCanvas.getContext('2d');
const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
const glow = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const meteors = [];
let stars = [];
let sw = 0;
let sh = 0;
let dpr = 1;
let nextMeteorAt = 4000;
let energy = 0;
let clock = 0;
let lastFrame = 0;

function resizeStars() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  sw = window.innerWidth;
  sh = window.innerHeight;
  starCanvas.width = Math.round(sw * dpr);
  starCanvas.height = Math.round(sh * dpr);
  const count = Math.max(60, Math.round((sw * sh) / 9000));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * sw,
    y: Math.random() * sh,
    z: Math.random() * 0.85 + 0.15,
    phase: Math.random() * Math.PI * 2
  }));
  if (reducedMotion) drawStars(0);
}

function spawnMeteor() {
  meteors.push({
    x: Math.random() * sw * 0.9,
    y: Math.random() * sh * 0.35,
    vx: 8 + Math.random() * 5,
    vy: 3 + Math.random() * 3,
    life: 1
  });
}

function meteorShower() {
  for (let i = 0; i < 14; i += 1) window.setTimeout(spawnMeteor, i * 220);
}

function drawStars(t) {
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.clearRect(0, 0, sw, sh);

  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  const offsetX = (mouse.x - 0.5) * -26;
  const offsetY = (mouse.y - 0.5) * -26;

  for (const star of stars) {
    const x = (star.x + offsetX * star.z + sw) % sw;
    const y = (star.y + offsetY * star.z + sh) % sh;
    const twinkle = reducedMotion ? 0.8 : 0.62 + 0.38 * Math.sin(t * 0.0007 * (1 + star.z) + star.phase);
    sctx.globalAlpha = Math.min(1, (0.18 + 0.7 * star.z) * twinkle + energy * 0.1);
    sctx.fillStyle = '#fff';
    sctx.beginPath();
    sctx.arc(x, y, 0.5 + star.z * 0.9, 0, Math.PI * 2);
    sctx.fill();
  }

  for (let i = meteors.length - 1; i >= 0; i -= 1) {
    const m = meteors[i];
    m.x += m.vx;
    m.y += m.vy;
    m.life -= 0.014;
    if (m.life <= 0 || m.x > sw + 80 || m.y > sh + 80) {
      meteors.splice(i, 1);
      continue;
    }
    const tailX = m.x - m.vx * 9;
    const tailY = m.y - m.vy * 9;
    const gradient = sctx.createLinearGradient(m.x, m.y, tailX, tailY);
    gradient.addColorStop(0, `rgba(255,255,255,${0.9 * m.life})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.globalAlpha = 1;
    sctx.strokeStyle = gradient;
    sctx.lineWidth = 1.4;
    sctx.beginPath();
    sctx.moveTo(m.x, m.y);
    sctx.lineTo(tailX, tailY);
    sctx.stroke();
  }
  sctx.globalAlpha = 1;
}

window.addEventListener('resize', resizeStars);
window.addEventListener('pointermove', event => {
  mouse.tx = event.clientX / window.innerWidth;
  mouse.ty = event.clientY / window.innerHeight;
  glow.tx = event.clientX;
  glow.ty = event.clientY;
});

/* ---------- Audio analysis (equalizer + star energy) ---------- */
const BAR_COUNT = 28;
const bars = [];
const barLevels = new Array(BAR_COUNT).fill(0);
for (let i = 0; i < BAR_COUNT; i += 1) {
  const bar = document.createElement('i');
  equalizer.appendChild(bar);
  bars.push(bar);
}

let audioContext;
let analyser;
let spectrum;

function setupAnalyser() {
  if (analyser || reducedMotion) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    spectrum = new Uint8Array(analyser.frequencyBinCount);
  } catch {
    analyser = undefined;
  }
}

function frame(t) {
  let bass = 0;
  const live = analyser && !audio.paused;
  if (live) {
    analyser.getByteFrequencyData(spectrum);
    for (let i = 0; i < 6; i += 1) bass += spectrum[i];
    bass = Math.min(1, bass / 6 / 255);
  }
  energy += (bass - energy) * 0.12;

  for (let i = 0; i < BAR_COUNT; i += 1) {
    const bin = 1 + Math.floor(Math.pow(i / (BAR_COUNT - 1), 1.45) * 38);
    const target = live ? Math.pow(spectrum[bin] / 255, 2.2) : 0;
    barLevels[i] = Math.max(target, barLevels[i] * 0.88);
    bars[i].style.transform = `scaleY(${(0.1 + barLevels[i] * 0.9).toFixed(3)})`;
  }

  if (t > nextMeteorAt) {
    spawnMeteor();
    nextMeteorAt = t + 9000 + Math.random() * 9000;
  }
  // Accumulate the twinkle phase so a change in speed never makes stars jump.
  const dt = Math.min(50, lastFrame ? t - lastFrame : 16);
  lastFrame = t;
  clock += dt * (1 + energy * 2.5);
  drawStars(clock);

  if (finePointer && glow.tx !== undefined) {
    glow.x += (glow.tx - glow.x) * 0.1;
    glow.y += (glow.ty - glow.y) * 0.1;
    cursorGlow.style.transform = `translate(${glow.x.toFixed(1)}px, ${glow.y.toFixed(1)}px)`;
  }
  requestAnimationFrame(frame);
}

/* ---------- Terminal ---------- */
async function typeTerminal() {
  while (entered) {
    terminalOutput.textContent = '';
    const fullText = buildTerminalLines().join('\n');
    for (let i = 0; i < fullText.length; i += 1) {
      if (!entered) return;
      terminalOutput.textContent += fullText[i];
      await sleep(fullText[i] === '\n' ? 110 : 34);
    }

    await sleep(10000);
    if (!entered) return;

    terminal.classList.add('terminal--blink');
    await sleep(2400);
    terminal.classList.remove('terminal--blink');
    terminalOutput.textContent = '';
    await sleep(700);
  }
}

/* ---------- Player ---------- */
function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function setPlaying(playing) {
  playGlyph.textContent = playing ? 'Ⅱ' : '▶';
  playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

async function playAudio() {
  setupAnalyser();
  try {
    if (audioContext && audioContext.state === 'suspended') await audioContext.resume();
    await audio.play();
    setPlaying(true);
    return true;
  } catch {
    return false;
  }
}

playButton.addEventListener('click', async () => {
  if (audio.paused) {
    if (!(await playAudio())) showToast('Unable to play audio');
  } else {
    audio.pause();
    setPlaying(false);
  }
});

function showDuration() { timeDuration.textContent = formatTime(audio.duration); }
audio.addEventListener('loadedmetadata', showDuration);
audio.addEventListener('durationchange', showDuration);
if (audio.readyState >= 1) showDuration();
audio.addEventListener('timeupdate', () => {
  timeCurrent.textContent = formatTime(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    progressRange.value = String((audio.currentTime / audio.duration) * 100);
  }
});
audio.addEventListener('play', () => setPlaying(true));
audio.addEventListener('pause', () => setPlaying(false));

progressRange.addEventListener('input', () => {
  if (Number.isFinite(audio.duration)) audio.currentTime = (Number(progressRange.value) / 100) * audio.duration;
});
$('#prevTrack').addEventListener('click', () => { audio.currentTime = 0; });
$('#nextTrack').addEventListener('click', () => {
  if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
});

/* ---------- Volume ---------- */
audio.volume = Number(volumeSlider.value) / 100;

function setVolumeOpen(open) {
  volumeButton.setAttribute('aria-expanded', String(open));
  volumePopover.classList.toggle('volume-popover--open', open);
  volumePopover.setAttribute('aria-hidden', String(!open));
}

volumeButton.addEventListener('click', () => {
  setVolumeOpen(volumeButton.getAttribute('aria-expanded') !== 'true');
});
volumeSlider.addEventListener('input', () => {
  volumeValue.textContent = `${volumeSlider.value}%`;
  audio.volume = Number(volumeSlider.value) / 100;
});
document.addEventListener('click', event => {
  if (!event.target.closest('.volume-wrap')) setVolumeOpen(false);
});

/* ---------- Entry ---------- */
function enterSite() {
  if (entered) return;
  entered = true;
  entryScreen.classList.add('entry-screen--leaving');
  siteShell.classList.add('site-shell--visible');
  siteShell.setAttribute('aria-hidden', 'false');
  cursorGlow.classList.add('cursor-glow--on');
  playAudio().then(ok => { if (!ok) showToast('Press play to start music'); });
  window.setTimeout(() => {
    entryScreen.remove();
    typeTerminal();
  }, 1450);
}

entryScreen.addEventListener('click', enterSite);
entryScreen.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    enterSite();
  }
});

/* ---------- Copy Discord ---------- */
const copyLabel = copyDiscord.querySelector('span');
let copyLabelTimer;

function flashCopied(message) {
  showToast(message);
  copyLabel.textContent = message === 'Copied' ? 'Copied' : 'Copy username';
  window.clearTimeout(copyLabelTimer);
  copyLabelTimer = window.setTimeout(() => { copyLabel.textContent = 'Copy username'; }, 1600);
}

copyDiscord.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(DISCORD_USERNAME);
    flashCopied('Copied');
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = DISCORD_USERNAME;
    fallback.setAttribute('readonly', '');
    fallback.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    flashCopied(copied ? 'Copied' : 'Copy failed');
  }
});

/* ---------- Card spotlight ---------- */
document.querySelectorAll('.info-card').forEach(card => {
  const spot = document.createElement('span');
  spot.className = 'spot';
  spot.setAttribute('aria-hidden', 'true');
  card.prepend(spot);
  card.addEventListener('pointermove', event => {
    const rect = card.getBoundingClientRect();
    spot.style.setProperty('--x', `${event.clientX - rect.left}px`);
    spot.style.setProperty('--y', `${event.clientY - rect.top}px`);
  });
});

/* ---------- Keyboard: space = play/pause, M = mute, ↑↑↓↓←→←→BA = meteors ---------- */
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', event => {
  if (!entered || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();

  konamiIndex = key === KONAMI[konamiIndex] ? konamiIndex + 1 : (key === KONAMI[0] ? 1 : 0);
  if (konamiIndex === KONAMI.length) {
    konamiIndex = 0;
    meteorShower();
    showToast('You found it');
    return;
  }

  const typing = event.target.closest('input, textarea');
  if (key === 'escape') setVolumeOpen(false);
  if (typing) return;

  if (event.code === 'Space' && !event.target.closest('button, a, [role="button"]')) {
    event.preventDefault();
    playButton.click();
  } else if (key === 'm') {
    audio.muted = !audio.muted;
    showToast(audio.muted ? 'Muted' : 'Unmuted');
  }
});

/* ---------- Tab title ---------- */
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? 'still here, come back' : SITE_TITLE;
});

/* ---------- Scroll reveal ---------- */
const motionTargets = document.querySelectorAll('.section-heading, .hero, .player, .info-card, .footer');
if (!reducedMotion) {
  document.body.classList.add('motion-ready');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -45px 0px' });
  motionTargets.forEach(target => revealObserver.observe(target));
} else {
  motionTargets.forEach(target => target.classList.add('is-visible'));
}

/* ---------- Smooth in-page navigation (keeps the music playing) ---------- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    const target = document.querySelector(targetId);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  });
});

$('#year').textContent = new Date().getFullYear();

/* ---------- Start ---------- */
resizeStars();
if (!reducedMotion) requestAnimationFrame(frame);
