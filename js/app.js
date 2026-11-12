// Sayfa davranışı: kaydırma → 3B sahne, tema geçişi, dil seçimi, görünürlük animasyonları.
import { createScene } from './scene.js';
import { EN } from './i18n.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sections = [...document.querySelectorAll('.sec')];
const navLinks = [...document.querySelectorAll('.nav-links a')];
const progNum = document.querySelector('.progress b');
const progLabel = document.querySelector('.progress span');
const progBar = document.querySelector('.progress .bar i');

/* ---------- dil ---------- */
const nodes = [...document.querySelectorAll('[data-i18n]')];
const TR = Object.fromEntries(nodes.map((n) => [n.dataset.i18n, n.innerHTML]));
const langBtn = document.querySelector('.lang');
let lang = 'tr';
function setLang(next) {
  lang = next;
  const dict = lang === 'en' ? EN : TR;
  nodes.forEach((n) => { const v = dict[n.dataset.i18n] ?? TR[n.dataset.i18n]; if (v != null) n.innerHTML = v; });
  document.documentElement.lang = lang;
  document.title = lang === 'en' ? 'İrfan Karabey — Computer Engineer' : 'İrfan Karabey — Bilgisayar Mühendisi';
  langBtn.innerHTML = lang === 'en' ? 'TR / <b>EN</b>' : '<b>TR</b> / EN';
  try { localStorage.setItem('lang', lang); } catch { /* özel pencere */ }
  measure();
  update();
}
langBtn.addEventListener('click', () => setLang(lang === 'tr' ? 'en' : 'tr'));

/* ---------- kaydırma ---------- */
let tops = [];
let scene3d = null;
let current = -1;

function measure() {
  tops = sections.map((s) => s.offsetTop);
}

function update() {
  const y = window.scrollY, vh = window.innerHeight;
  let i = 0;
  while (i < tops.length - 1 && y >= tops[i + 1]) i++;
  // bir sonraki bölüme son bir ekran boyu kala geçiş başlar; uzun bölümlerde nesne bekler
  const raw = i < tops.length - 1 ? clamp(1 - (tops[i + 1] - y) / vh) : 0;
  scene3d?.setScroll(i + raw);

  let active = 0;
  while (active < tops.length - 1 && y + vh * 0.5 >= tops[active + 1]) active++;
  if (active !== current) {
    current = active;
    const sec = sections[active];
    document.body.dataset.theme = sec.dataset.theme || 'light';
    scene3d?.setDark(sec.dataset.theme === 'dark');
    navLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + sec.id));
    progNum.textContent = String(active).padStart(2, '0');
    document.body.classList.toggle('at-end', active === sections.length - 1 || sec.id === 'projects');
  }
  progLabel.textContent = sections[current].dataset[lang === 'en' ? 'labelEn' : 'label'] || '';
  const max = document.documentElement.scrollHeight - vh;
  progBar.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;
}

window.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', () => { measure(); update(); });
window.addEventListener('load', () => { measure(); update(); });
new ResizeObserver(() => { measure(); update(); }).observe(document.querySelector('main'));

/* ---------- görünürlük animasyonları ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.18 });
document.querySelectorAll('.reveal, h1, h2').forEach((el) => io.observe(el));
// giriş bölümü gözlemciyi beklemeden görünsün
setTimeout(() => document.querySelectorAll('#hero .reveal, #hero h1').forEach((el) => el.classList.add('in')), 80);

/* ---------- proje vitrini: listeden seçilen proje 3B cihazın ekranında açılır ---------- */
const projectItems = [...document.querySelectorAll('.pitem')];
let projectIndex = 0;
function selectProject(i) {
  projectIndex = i;
  projectItems.forEach((el, k) => {
    el.classList.toggle('on', k === i);
    el.querySelector('.phead').setAttribute('aria-expanded', String(k === i));
  });
  scene3d?.showProject(i);
}
projectItems.forEach((el, i) => el.querySelector('.phead').addEventListener('click', () => selectProject(i)));

/* ---------- CV indir: sayfayı yazdırma görünümüyle PDF'e döker ---------- */
document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });

/* ---------- başlat ---------- */
measure();
let saved = null;
try { saved = localStorage.getItem('lang'); } catch { /* yok say */ }
setLang(saved === 'en' ? 'en' : 'tr');

createScene(document.getElementById('scene'))
  .then((s) => { scene3d = s; current = -1; update(); s.showProject(projectIndex); })
  .catch((err) => { console.error('3B sahne başlatılamadı:', err); document.getElementById('scene').style.display = 'none'; });
