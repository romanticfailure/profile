import './style.css';

const entryScreen = document.querySelector('#entryScreen');
const siteShell = document.querySelector('#siteShell');
const terminalOutput = document.querySelector('#terminalOutput');
const volumeButton = document.querySelector('#volumeButton');
const volumePopover = document.querySelector('#volumePopover');
const volumeSlider = document.querySelector('#volumeSlider');
const volumeValue = document.querySelector('#volumeValue');
const copyDiscord = document.querySelector('#copyDiscord');
const toast = document.querySelector('#toast');

const terminalLines = [
  '> initializing personal profile...',
  '',
  'name        - ???',
  'age         - ???',
  'username    - romanticfailure',
  'birthday    - 17 jan',
  'located     - Germany',
  '',
  '> profile successfully loaded.'
];

let entered = false;
let typingTimer;
let toastTimer;
let toastHideTimer;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeTerminal() {
  while (entered) {
    terminalOutput.textContent = '';
    const fullText = terminalLines.join('\n');
    for (let i = 0; i < fullText.length; i += 1) {
      if (!entered) return;
      terminalOutput.textContent += fullText[i];
      await sleep(fullText[i] === '\n' ? 110 : 34);
    }

    await sleep(10000);
    if (!entered) return;

    const terminal = document.querySelector('#terminal');
    terminal.classList.add('terminal--blink');
    await sleep(2400);
    terminal.classList.remove('terminal--blink');
    terminalOutput.textContent = '';
    await sleep(700);
  }
}

function enterSite() {
  if (entered) return;
  entered = true;
  entryScreen.classList.add('entry-screen--leaving');
  siteShell.classList.add('site-shell--visible');
  const audio = document.querySelector('#profileAudio');
  if (audio) { audio.volume = Number(volumeSlider.value) / 100; audio.play().then(() => setPlaying(true)).catch(() => showToast('Press play to start music')); }
  siteShell.setAttribute('aria-hidden', 'false');
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

volumeButton.addEventListener('click', () => {
  const isOpen = volumeButton.getAttribute('aria-expanded') === 'true';
  volumeButton.setAttribute('aria-expanded', String(!isOpen));
  volumePopover.classList.toggle('volume-popover--open', !isOpen);
  volumePopover.setAttribute('aria-hidden', String(isOpen));
});

volumeSlider.addEventListener('input', () => {
  volumeValue.textContent = `${volumeSlider.value}%`;
  const audio = document.querySelector('#profileAudio');
  if (audio) audio.volume = Number(volumeSlider.value) / 100;
});

document.addEventListener('click', event => {
  if (!event.target.closest('.volume-wrap')) {
    volumeButton.setAttribute('aria-expanded', 'false');
    volumePopover.classList.remove('volume-popover--open');
    volumePopover.setAttribute('aria-hidden', 'true');
  }
});

function showToast(message) {
  window.clearTimeout(toastTimer);
  window.clearTimeout(toastHideTimer);
  toast.textContent = message;
  toast.classList.add('toast--visible');
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('toast--visible');
    toastHideTimer = window.setTimeout(() => {
      toast.textContent = '';
    }, 350);
  }, 1700);
}

copyDiscord.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('opensourceworker');
    showToast('Copied');
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = 'opensourceworker';
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    showToast(copied ? 'Copied' : 'Copy failed');
  }
});



// Reveal content with a slow, subtle rise as it enters the viewport.
const motionTargets = document.querySelectorAll(
  '.section-heading, .hero, .player, .info-card, .footer'
);
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

// Keep in-page navigation smooth without interrupting the music.
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = document.querySelector(targetId);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();


// Compact player: playback starts from the user's explicit entry click.
const audio = document.querySelector('#profileAudio');
const playButton = document.querySelector('#playButton');
const playGlyph = document.querySelector('#playGlyph');
const progressRange = document.querySelector('#progressRange');
const timeCurrent = document.querySelector('#timeCurrent');
const timeDuration = document.querySelector('#timeDuration');
const equalizer = document.querySelector('#equalizer');
function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00';
  const m = Math.floor(value / 60); const s = Math.floor(value % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function setPlaying(playing) {
  if (playGlyph) playGlyph.textContent = playing ? 'Ⅱ' : '▶';
  if (playButton) playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  equalizer?.classList.toggle('equalizer--active', playing);
}
playButton?.addEventListener('click', async () => {
  if (!audio) return;
  if (audio.paused) { try { await audio.play(); setPlaying(true); } catch { showToast('Unable to play audio'); } }
  else { audio.pause(); setPlaying(false); }
});
audio?.addEventListener('loadedmetadata', () => { timeDuration.textContent = formatTime(audio.duration); });
audio?.addEventListener('timeupdate', () => {
  timeCurrent.textContent = formatTime(audio.currentTime);
  if (Number.isFinite(audio.duration) && progressRange) progressRange.value = String((audio.currentTime / audio.duration) * 100);
});
audio?.addEventListener('play', () => setPlaying(true));
audio?.addEventListener('pause', () => setPlaying(false));
audio?.addEventListener('ended', () => setPlaying(false));
progressRange?.addEventListener('input', () => { if (audio && Number.isFinite(audio.duration)) audio.currentTime = (Number(progressRange.value) / 100) * audio.duration; });
document.querySelector('#prevTrack')?.addEventListener('click', () => { if (audio) audio.currentTime = 0; });
document.querySelector('#nextTrack')?.addEventListener('click', () => { if (audio) audio.currentTime = 0; });
