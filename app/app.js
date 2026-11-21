const STORAGE_KEY = 'leonida-waypoint:v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const SOURCES = {
  list: { name: 'Exophase · PS5 trophy register', url: 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/' },
  trophy: { name: 'PowerPyx · GTA VI trophy guide & roadmap', url: 'https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/' },
  completion: { name: 'PowerPyx · 100% completion checklist', url: 'https://www.powerpyx.com/gta-6-100-completion-checklist-guide/' },
  meditation: { name: 'PowerPyx · meditation spot locations', url: 'https://www.powerpyx.com/gta-6-all-meditation-spot-locations/' },
  missables: { name: 'Output Lag · missables & Chapter 1 window', url: 'https://outputlag.com/guides/gta-6-missables/' },
  shooting: { name: 'PowerPyx · Shooting Range gold medals', url: 'https://www.powerpyx.com/gta-6-all-shooting-range-gold-medal-challenges/' },
  stunts: { name: 'PowerPyx · stunt-jump locations', url: 'https://www.powerpyx.com/gta-6-all-stunt-jump-locations/' },
  activities: { name: 'Output Lag · GTA VI activities', url: 'https://outputlag.com/guides/gta-6-activities-minigames/' },
  missions: { name: 'Output Lag · mission walkthrough index', url: 'https://outputlag.com/guides/gta-6-walkthrough-missions/' },
  strangers: { name: 'Output Lag · stranger strands', url: 'https://outputlag.com/guides/gta-6-side-missions-strangers-freaks/' },
  robberies: { name: 'Output Lag · robberies & heists', url: 'https://outputlag.com/guides/gta-6-how-to-rob-stores-heists/' },
  vehicles: { name: 'Output Lag · vehicles & WAiNK scanning', url: 'https://outputlag.com/guides/gta-6-cars-vehicles/' },
  '100guide': { name: 'Output Lag · trophy list and verified launch notes', url: 'https://outputlag.com/guides/gta-6-trophy-list/' },
};

const ROUTE = [
  { label: '01', title: 'Set out · Chapters 1–2', step: 'STORY FIRST', text: 'Follow the opening missions and keep a Chapter 1 save. Before Tourist Trap, accept Lucia’s balcony meditation and clear the two short errands flagged by the missable guide.', trophies: [2, 3, 4, 8, 10, 16, 20, 21, 28], risk: true },
  { label: '02', title: 'Open the city · Chapters 3–4', step: 'UNLOCK THE TOOLKIT', text: 'Advance the main story to unlock the broader activity set. Keep an eye out for partner requirements, robbery tools, and timed stranger strands as they appear.', trophies: [5, 6, 9, 11, 12, 13, 18, 19, 25, 33, 34, 39, 40, 41], risk: false },
  { label: '03', title: 'Close the story', step: 'KEEP A RECOVERY SAVE', text: 'Complete the final mission for its gold trophy. The cited guides report no mission replay, so make a separate manual save before the final mission if you want a rollback point.', trophies: [7], risk: false },
  { label: '04', title: 'Side roads & people', step: 'CHARACTER STRANDS', text: 'Finish the named stranger finales and build toward eight eligible strands. Check the in-game counter after each one; not every character strand necessarily counts toward the same trophy.', trophies: [22, 23, 24, 26, 27, 29], risk: false },
  { label: '05', title: 'Collections & pursuits', step: 'USE THE COUNTERS', text: 'Work through collectible sets, discoveries, stunts, races, range medals, locations, and challenge counters. Follow the per-trophy guide links for mapped routes and confirmed counts.', trophies: [14, 15, 17, 18, 19, 25, 28, 30, 31, 32, 35, 42, 43, 54, 55], risk: false },
  { label: '06', title: 'Clean up the ledger', step: 'REVIEW EVERY REQUIREMENT', text: 'Finish remaining robberies, purchases, partner feats, and any obscure description-led trophy. Several launch guides still list five hidden triggers as unconfirmed; use the named description as a clue, not a guaranteed solution.', trophies: [1, 33, 34, 36, 37, 38, 39, 40, 41, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53], risk: false },
];

let trophies = [];
let earned = new Set();
let counters = {};
let selectedId = 1;
let activeKind = 'all';
let toastTimer;
let previewMode = new URLSearchParams(location.search).has('preview');

function readSavedState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const ids = new Set(trophies.map((t) => t.id));
    earned = new Set((Array.isArray(value.earned) ? value.earned : []).filter((id) => ids.has(id)));
    counters = Object.fromEntries(Object.entries(value.counters || {}).filter(([id, amount]) => ids.has(Number(id)) && Number.isFinite(amount) && amount >= 0));
  } catch {
    earned = new Set();
    counters = {};
  }
}

function saveState() {
  if (previewMode) {
    $('#save-status').textContent = 'PREVIEW ONLY';
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, earned: [...earned], counters }));
    $('#save-status').textContent = 'SAVED';
  } catch {
    $('#save-status').textContent = 'STORAGE FULL';
    notify('Browser storage is unavailable. Export a backup to keep your progress.');
  }
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function safeText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function gradeMark(grade) {
  return ({ platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' })[grade] || 'B';
}

function updateProgress() {
  const total = trophies.length;
  const count = earned.size;
  $('#progress-label').textContent = `${count} / ${total}`;
  $('#progress-fill').style.width = `${total ? count / total * 100 : 0}%`;
  $('#list-progress').textContent = `${count} COMPLETE`;
  $('#grade-counts').replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const value = trophies.filter((t) => t.grade === grade && earned.has(t.id)).length;
    const totalAtGrade = trophies.filter((t) => t.grade === grade).length;
    const item = document.createElement('span');
    item.innerHTML = `<b>${gradeMark(grade)} ${value}/${totalAtGrade}</b> ${grade}`;
    $('#grade-counts').append(item);
  }
}

function isConcealed(trophy) {
  return $('#spoiler-toggle').checked && trophy.story && !earned.has(trophy.id);
}

function matchesCategory(trophy, category) {
  if (category === 'all') return true;
  if (category === 'story') return trophy.story;
  if (category === 'missable') return trophy.missable;
  if (category === 'misc') return ['misc', 'online'].includes(trophy.kind);
  return trophy.kind === category;
}

function getVisibleRows() {
  const query = $('#search').value.trim().toLocaleLowerCase();
  const grade = $('#grade-filter').value;
  const status = $('#status-filter').value;
  return trophies.filter((t) => {
    const concealed = isConcealed(t);
    if (!matchesCategory(t, activeKind)) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (status === 'earned' && !earned.has(t.id)) return false;
    if (status === 'open' && earned.has(t.id)) return false;
    if (query) {
      const searchable = concealed ? 'story trophy hidden spoiler' : `${t.name} ${t.description} ${t.kind} ${t.chapter || ''} ${t.guide}`;
      if (!searchable.toLocaleLowerCase().includes(query)) return false;
    }
    return true;
  });
}

function renderList() {
  const list = $('#trophy-list');
  list.replaceChildren();
  const rows = getVisibleRows();
  $('#result-count').textContent = `${rows.length} showing`;
  $('#no-results').hidden = rows.length > 0;
  if (!rows.some((t) => t.id === selectedId) && rows.length) selectedId = rows[0].id;
  for (const trophy of rows) {
    const concealed = isConcealed(trophy);
    const row = document.createElement('div');
    row.className = `trophy-row${selectedId === trophy.id ? ' is-selected' : ''}`;
    row.setAttribute('role', 'listitem');
    row.tabIndex = 0;
    row.setAttribute('aria-label', concealed ? 'Story trophy hidden until earned' : `${trophy.name}, ${trophy.grade}`);
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = earned.has(trophy.id);
    check.setAttribute('aria-label', concealed ? 'Mark hidden story trophy earned' : `Mark ${trophy.name} earned`);
    check.addEventListener('click', (event) => event.stopPropagation());
    check.addEventListener('change', () => setEarned(trophy.id, check.checked));
    const grade = safeText('span', `grade-token ${trophy.grade}`, gradeMark(trophy.grade));
    grade.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'row-copy';
    copy.append(safeText('span', `row-title${concealed ? ' spoiler-mask' : ''}`, concealed ? 'Story trophy · spoiler shield' : trophy.name));
    copy.append(safeText('span', 'row-desc', concealed ? 'Description hidden until earned or revealed' : trophy.description));
    const meta = document.createElement('span');
    meta.className = 'row-meta';
    meta.append(safeText('span', 'row-kind', trophy.chapter || trophy.kind));
    if (trophy.missable) meta.append(safeText('span', 'row-risk', 'Possible missable'));
    copy.append(meta);
    const gradeText = safeText('span', 'row-grade', trophy.grade);
    row.append(check, grade, copy, gradeText);
    const open = () => { selectedId = trophy.id; renderList(); renderDetail(); };
    row.addEventListener('click', (event) => { if (event.target !== check) open(); });
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    list.append(row);
  }
}

function makeSourceLink(sourceId) {
  const source = SOURCES[sourceId];
  if (!source) return null;
  const link = document.createElement('a');
  link.className = 'source-link';
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.append(document.createTextNode(source.name));
  link.append(safeText('span', '', '↗'));
  return link;
}

function renderDetail() {
  const panel = $('#detail-panel');
  panel.replaceChildren();
  if (!$('#no-results').hidden) {
    panel.append(safeText('h2', 'detail-title', 'No matching trophy'), safeText('p', 'guide-text', 'Clear a filter or try another search to open a guide.'));
    return;
  }
  const trophy = trophies.find((t) => t.id === selectedId) || trophies[0];
  if (!trophy) return;
  const concealed = isConcealed(trophy);
  const kicker = document.createElement('div');
  kicker.className = 'detail-kicker';
  kicker.append(safeText('span', `grade-token ${trophy.grade}`, gradeMark(trophy.grade)));
  kicker.append(document.createTextNode(`TROPHY ${String(trophy.id).padStart(2, '0')} OF 55 · ${trophy.kind.toUpperCase()}`));
  const titleLine = document.createElement('div');
  titleLine.className = 'detail-title-line';
  titleLine.append(safeText('h2', 'detail-title', concealed ? 'Story trophy hidden' : trophy.name));
  const earnedButton = safeText('button', `earned-button${earned.has(trophy.id) ? ' is-earned' : ''}`, earned.has(trophy.id) ? '✓ Earned' : '＋ Mark earned');
  earnedButton.type = 'button';
  earnedButton.setAttribute('aria-pressed', String(earned.has(trophy.id)));
  earnedButton.addEventListener('click', () => setEarned(trophy.id, !earned.has(trophy.id)));
  titleLine.append(earnedButton);
  panel.append(kicker, titleLine);
  const official = document.createElement('div');
  official.className = 'official-box';
  official.append(safeText('span', '', 'OFFICIAL DESCRIPTION · ' + trophy.grade.toUpperCase()));
  official.append(safeText('p', '', concealed ? 'Hidden until this story trophy is earned.' : trophy.description));
  panel.append(official);
  const tags = document.createElement('div');
  tags.className = 'detail-tags';
  tags.append(safeText('span', 'tag', concealed ? 'Spoiler protected' : trophy.chapter || trophy.kind));
  tags.append(safeText('span', 'tag grade', trophy.grade));
  if (trophy.missable) tags.append(safeText('span', 'tag warning', 'Possible missable · Ch. 1'));
  if (trophy.hidden) tags.append(safeText('span', 'tag', 'PSN-hidden'));
  panel.append(tags);
  panel.append(safeText('p', 'guide-label', concealed ? 'SPOILER SHIELD ACTIVE' : 'FIELD GUIDE · ORIGINAL NOTES'));
  panel.append(safeText('p', 'guide-text', concealed ? 'Earn this trophy or switch off “Hide story spoilers” to reveal the guide and source links.' : trophy.guide));
  if (!concealed && trophy.caveat) panel.append(safeText('p', 'guide-caution', trophy.caveat));
  if (!concealed && trophy.steps?.length) {
    const steps = document.createElement('ol');
    steps.className = 'guide-steps';
    for (const step of trophy.steps) {
      const item = document.createElement('li');
      item.textContent = step.text;
      const source = makeSourceLink(step.source);
      if (source) item.append(' ', source);
      steps.append(item);
    }
    panel.append(steps);
  }
  if (!concealed) {
    const sourceBlock = document.createElement('div');
    sourceBlock.className = 'guide-source-block';
    sourceBlock.append(safeText('div', 'guide-source-title', 'Sources for this trophy'));
    const links = document.createElement('div');
    links.className = 'source-links';
    for (const id of ['list', ...trophy.sources]) {
      const link = makeSourceLink(id);
      if (link) links.append(link);
    }
    sourceBlock.append(links);
    panel.append(sourceBlock);
  }
  if (!concealed && trophy.count) {
    const countControl = document.createElement('div');
    countControl.className = 'count-control';
    const countCopy = document.createElement('div');
    countCopy.className = 'count-copy';
    countCopy.append(safeText('span', '', 'YOUR COUNTER · SAVED LOCALLY'));
    countCopy.append(safeText('b', '', `${trophy.countLabel || 'Progress'} / ${trophy.count}`));
    const stepper = document.createElement('div');
    stepper.className = 'count-stepper';
    const down = safeText('button', '', '−'); down.type = 'button'; down.setAttribute('aria-label', 'Decrease counter');
    const value = safeText('output', '', String(counters[trophy.id] || 0));
    const up = safeText('button', '', '+'); up.type = 'button'; up.setAttribute('aria-label', 'Increase counter');
    down.addEventListener('click', () => setCounter(trophy.id, Math.max(0, (counters[trophy.id] || 0) - 1)));
    up.addEventListener('click', () => setCounter(trophy.id, Math.min(trophy.count, (counters[trophy.id] || 0) + 1)));
    stepper.append(down, value, up);
    countControl.append(countCopy, stepper);
    panel.append(countControl);
  }
}

function setEarned(id, value) {
  if (value) earned.add(id); else earned.delete(id);
  saveState();
  updateProgress();
  renderList();
  renderDetail();
}

function setCounter(id, value) {
  counters[id] = value;
  saveState();
  renderDetail();
}

function renderRoadmap() {
  const root = $('#roadmap-content');
  root.replaceChildren();
  for (const stage of ROUTE) {
    const card = document.createElement('article');
    card.className = `route-card${stage.risk ? ' at-risk' : ''}`;
    const header = document.createElement('div');
    header.className = 'route-card-head';
    header.append(safeText('span', 'route-num', `ROUTE ${stage.label}`));
    header.append(safeText('span', 'route-step', stage.step));
    card.append(header, safeText('h3', '', stage.title), safeText('p', '', stage.text));
    const makePill = (id) => {
      const trophy = trophies.find((item) => item.id === id);
      if (!trophy) return null;
      const concealed = isConcealed(trophy);
      const pill = safeText('button', `route-pill${concealed ? ' locked' : ''}`, concealed ? `Story ${String(id).padStart(2, '0')}` : trophy.name);
      pill.type = 'button';
      pill.addEventListener('click', () => { selectedId = id; switchPanel('tracker'); renderList(); renderDetail(); });
      return pill;
    };
    const pills = document.createElement('div');
    pills.className = 'route-items';
    for (const id of stage.trophies.slice(0, 4)) {
      const pill = makePill(id);
      if (pill) pills.append(pill);
    }
    card.append(pills);
    if (stage.trophies.length > 4) {
      const more = document.createElement('details');
      more.className = 'route-more';
      more.append(safeText('summary', '', `See ${stage.trophies.length - 4} more related trophies`));
      const remaining = document.createElement('div');
      remaining.className = 'route-items route-items-more';
      for (const id of stage.trophies.slice(4)) {
        const pill = makePill(id);
        if (pill) remaining.append(pill);
      }
      more.append(remaining);
      card.append(more);
    }
    root.append(card);
  }
}

function renderSources() {
  const root = $('#source-shelf');
  root.replaceChildren();
  Object.entries(SOURCES).forEach(([id, source], index) => {
    const card = document.createElement('article');
    card.className = 'source-card';
    card.append(safeText('span', 'source-index', String(index + 1).padStart(2, '0')));
    const copy = document.createElement('div');
    copy.append(safeText('h3', '', source.name));
    const uses = id === 'list' ? trophies.length : trophies.filter((t) => t.sources.includes(id)).length;
    copy.append(safeText('p', '', `Cited on ${uses} trophy ${uses === 1 ? 'guide' : 'guides'}.`));
    const link = makeSourceLink(id);
    if (link) copy.append(link);
    card.append(copy);
    root.append(card);
  });
}

function switchPanel(name) {
  for (const tab of $$('.nav-tab')) {
    const active = tab.dataset.panel === name;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const panel of $$('.panel')) {
    const active = panel.id === `panel-${name}`;
    panel.classList.toggle('is-visible', active);
    panel.hidden = !active;
  }
  if (name === 'roadmap') renderRoadmap();
}

function exportProgress() {
  const payload = JSON.stringify({ format: 'leonida-waypoint-progress/v1', game: 'Grand Theft Auto VI', earned: [...earned], counters }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-waypoint-progress.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Progress backup exported.');
}

async function importProgress(file) {
  try {
    const incoming = JSON.parse(await file.text());
    const ids = new Set(trophies.map((t) => t.id));
    const raw = Array.isArray(incoming) ? incoming : incoming.earned;
    if (!Array.isArray(raw)) throw new Error('The file needs an earned list.');
    const next = new Set(raw.map((value) => typeof value === 'number' ? value : trophies.find((t) => t.name === value)?.id).filter((id) => ids.has(id)));
    earned = next;
    if (incoming && typeof incoming === 'object' && !Array.isArray(incoming) && incoming.counters && typeof incoming.counters === 'object') {
      counters = Object.fromEntries(Object.entries(incoming.counters).filter(([id, value]) => ids.has(Number(id)) && Number.isFinite(value) && value >= 0).map(([id, value]) => [id, Math.floor(value)]));
    }
    saveState();
    updateProgress();
    renderList();
    renderDetail();
    notify(`Imported ${earned.size} earned marks.`);
  } catch (error) {
    notify(error.message || 'That file could not be read.');
  } finally {
    $('#import-file').value = '';
  }
}

function wireControls() {
  for (const chip of $$('.filter-chip')) {
    const category = chip.dataset.kind;
    const count = trophies.filter(trophy => matchesCategory(trophy, category)).length;
    chip.querySelector('span').textContent = category === 'missable' ? `${count}?` : String(count);
  }
  const refreshTracker = () => { renderList(); renderDetail(); };
  $('#search').addEventListener('input', refreshTracker);
  $('#grade-filter').addEventListener('change', refreshTracker);
  $('#status-filter').addEventListener('change', refreshTracker);
  $('#spoiler-toggle').addEventListener('change', () => { renderList(); renderDetail(); renderRoadmap(); });
  $('#kind-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (!button) return;
    activeKind = button.dataset.kind;
    $$('.filter-chip', $('#kind-filters')).forEach((chip) => chip.classList.toggle('is-active', chip === button));
    refreshTracker();
  });
  $$('.nav-tab').forEach((tab) => tab.addEventListener('click', () => switchPanel(tab.dataset.panel)));
  $('#export-button').addEventListener('click', exportProgress);
  $('#import-file').addEventListener('change', (event) => { if (event.target.files?.[0]) importProgress(event.target.files[0]); });
  $('#help-button').addEventListener('click', () => notify('Offline fan guide · references open only when you select a citation.'));
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search').focus(); }
    if (event.key === 'Escape' && document.activeElement === $('#search')) { $('#search').value = ''; refreshTracker(); $('#search').blur(); }
  });
  $('#risk-done').checked = localStorage.getItem('leonida-waypoint:risk') === 'done';
  $('#risk-done').addEventListener('change', (event) => {
    if (previewMode) return;
    localStorage.setItem('leonida-waypoint:risk', event.target.checked ? 'done' : '');
    notify(event.target.checked ? 'Missable watch saved.' : 'Missable watch cleared.');
  });
}

async function start() {
  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error(`Trophy register unavailable (${response.status}).`);
    const documentData = await response.json();
    trophies = Array.isArray(documentData) ? documentData : documentData.trophies;
    if (!Array.isArray(trophies) || trophies.length !== 55) throw new Error('The register needs all 55 trophy records.');
    readSavedState();
    if (previewMode) earned = new Set([2, 3, 8, 10, 16, 20, 21, 33, 34, 35]);
    const requested = Number(new URLSearchParams(location.search).get('selected'));
    selectedId = trophies.some((t) => t.id === requested) ? requested : (trophies.find((t) => t.missable)?.id || 1);
    wireControls();
    updateProgress();
    renderList();
    renderDetail();
    renderSources();
    const section = new URLSearchParams(location.search).get('section');
    if (['tracker', 'roadmap', 'missables', 'sources'].includes(section)) switchPanel(section);
    if (previewMode) $('#save-status').textContent = 'PREVIEW ONLY';
    if (location.protocol === 'file:') notify('For reliable offline use, open this folder through a local static server.');
  } catch (error) {
    $('#trophy-list').replaceChildren(safeText('p', 'no-results', error.message));
    $('#detail-panel').replaceChildren(safeText('h2', 'detail-title', 'Could not load the trophy register'), safeText('p', 'guide-text', 'Serve the app folder as the site root, then reload. The app makes no external requests.'));
  }
}

start();
