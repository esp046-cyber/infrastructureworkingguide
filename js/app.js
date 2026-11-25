/* SCADA Guide 2026: vanilla ES modules-style (IIFE-scoped) app. All URLs relative. */
'use strict';

const CONFIG = {
  // ---- EDIT BEFORE PUBLISHING ----
  // phone: shown in the Call dialog and dialled via a tel: link (any format; non-digits are stripped for dialling).
  // email: recipient of the Enquire form (mailto: link) and shown at the top of "Copy Enquiry to Clipboard".
  phone: '+971 0 000 0000',
  email: 'scada.support@example.com',
  swUrl: './sw.js',
  storage: { theme: 'scada-theme', checklist: 'scada-checklist-v1', queue: 'scada-enquiry-queue', installDismissed: 'scada-install-dismissed', welcome: 'scada-welcome-dismissed', sites: 'scada-sites-v2', overview: 'scada-overview-open' }
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const memStore = {};
const store = {
  warned: false,
  get(k, d) {
    if (Object.prototype.hasOwnProperty.call(memStore, k)) return memStore[k];
    try { const v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); } catch (e) { /* private mode or corrupt value: use the default */ }
    return d;
  },
  set(k, v) {
    memStore[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) {
      if (!this.warned) { this.warned = true; setTimeout(() => toast('Storage is unavailable or full. Changes last only until you close the app. Use Export Full Backup.'), 0); }
      return false;
    }
  }
};

/* ------------------------------------------------------------ data */
const PROJECTS = [
  { id: 'tunnel', cat: 'Tunnel', plain: 'Keeps the fans, lights and fire safety equipment of a road tunnel running automatically, with a backup ready if anything fails.', title: 'Tunnel automation: S7-400H hot standby', text: 'Redundant S7-400H pair, WinCC SCADA station and WinCC Flexible HMI over a dual fiber ring. Ventilation, lighting, fire detection and traffic control with bumpless failover.', tags: ['S7-400H', 'WinCC', 'MRP ring', 'PROFINET'] },
  { id: 'grid', cat: 'Power', plain: 'Lets an electrical substation protect itself and report to the control centre in a fraction of a second, keeping the lights on.', title: 'Smart grid substation: IEC 61850 / DNP3', text: 'Substation automation with IEC 61850 GOOSE for protection interlocking, MMS to the gateway and DNP3 to the control centre. HSR/PRP station bus for zero-recovery-time redundancy.', tags: ['IEC 61850', 'DNP3', 'GOOSE', 'HSR/PRP'] },
  { id: 'water', cat: 'Water', plain: 'Runs the pumps and filtration that make drinking water, so supply continues without constant manual attention.', title: 'Desalination and pumping: OPC-UA / Modbus TCP', text: 'Pump station and RO train control with Modbus TCP field devices aggregated to OPC UA servers. Redundant SCADA servers, VFD integration and historian trending.', tags: ['OPC UA', 'Modbus TCP', 'VFD', 'Historian'] },
  { id: 'uns', cat: 'Data', plain: 'Puts all plant data in one organised place, so managers and analytics tools see the same live picture.', title: 'AI-ready Unified Namespace: MQTT Sparkplug B', text: 'Edge gateways publish Sparkplug B births and data to a clustered broker, giving one semantic namespace for SCADA, MES and analytics models. Store-and-forward on edge for link loss.', tags: ['MQTT', 'Sparkplug B', 'UNS', 'Edge'] }
];

const STANDARDS = [
  { id: 'isa112', title: 'ANSI/ISA-112 SCADA lifecycle', badge: 'Lifecycle', plain: 'A roadmap for planning, building and maintaining a control system, so projects stay on track and nothing is forgotten.', body: [
    'ISA-112 defines a lifecycle for SCADA systems, from requirements through decommissioning, so owners and integrators work to one common process.',
    'Lifecycle stages to plan and document: requirements and philosophy, architecture and design, procurement, development, FAT, installation and SAT, operation, maintenance, and decommissioning.',
    'Artefacts to keep under change control: SCADA philosophy, network and security architecture, I/O and tag database, alarm philosophy, test protocols and as-built records.' ] },
  { id: 'iec62443', title: 'IEC 62443 zones and conduits', badge: 'Security', plain: 'Rules for protecting plant control systems from cyber attacks, so outsiders cannot interfere with critical infrastructure.', body: [
    'Group assets into zones with common security requirements, then connect zones only through conduits that carry controlled traffic (firewalls, DMZ, data diodes where justified).',
    'Set a target security level (SL-T) per zone and conduit from the risk assessment, then show the achieved level (SL-A) from the controls actually implemented.',
    'Typical zones: field/PLC cell, control network, SCADA servers, DMZ / historian, and enterprise. Keep remote access terminated in the DMZ with MFA.' ] },
  { id: 'redundancy', title: 'Redundancy topologies', badge: 'Availability', plain: 'Spare equipment and backup network paths that take over automatically, so one fault never means a shutdown.', body: [
    'Hot-standby servers: two SCADA servers with state synchronisation and a dedicated heartbeat. Clients reconnect to the surviving node; verify alarm and archive consistency after switchover.',
    'MRP (IEC 62439-2) fiber ring: a ring manager blocks one port and reconfigures on a break. Typical recovery is in the order of 200 ms (configurable profiles go lower); check this against your process tolerance.',
    'HSR/PRP (IEC 62439-3): frames travel both paths, so a single failure causes zero recovery time. Used for protection-grade substation buses.',
    'S7-400H: two CPUs in lockstep over sync modules, redundant I/O optional. Test every failure case in FAT: CPU, sync link, power, and I/O module.' ] },
  { id: 'isa182', title: 'ISA-18.2 alarm management KPIs', badge: 'Alarms', plain: 'Guidelines for keeping alarms few and useful, so operators notice real problems instead of drowning in false ones.', body: [
    'Steady-state alarm rate: fewer than 6 alarms per hour per operator.',
    'Flood threshold: fewer than 10 alarms in any 10-minute period.',
    'Priority distribution: 80% Low, 15% Medium, 5% High.',
    'Chattering and stale alarms: below 5% of the alarm population.',
    'Fix chattering and repeating alarms first; they usually make up most of the alarm load.' ] }
];

const SLS = [
  ['SL1', 'Casual or coincidental violation', 'Unintentional misuse, simple mistakes', 'Basic access control, patching, backups'],
  ['SL2', 'Intentional, simple means, low resources', 'Generic skills, low motivation', 'Role-based access, authenticated remote access, logging'],
  ['SL3', 'Intentional, sophisticated means, moderate resources', 'IACS-specific skills, moderate motivation', 'MFA, segmented zones, signed firmware, monitoring'],
  ['SL4', 'Intentional, sophisticated means, extended resources', 'IACS-specific skills, high motivation', 'Hardware-backed trust, strict conduits, continuous detection and response']
];

const CHECKLIST = [
  { g: 'FAT: factory acceptance', items: ['Hardware inventory matches the BOM and serial numbers recorded', 'PLC program and SCADA project backed up with checksums', 'I/O loop check: every DI, DO, AI and AO simulated end to end', 'Redundancy test: CPU failover, sync link, and power loss', 'Alarm list and priorities verified against the alarm philosophy', 'Network ring break and recovery time measured and logged', 'Cause-and-effect matrix tested and signed off', 'FAT punch list agreed with the client'] },
  { g: 'SAT: site acceptance', items: ['Installation checked: cabinets, earthing, fiber terminations, labelling', 'Fiber OTDR / power-meter results recorded for each segment', 'Field loop checks completed with instrument technicians', 'SCADA server failover tested on site', 'Time synchronisation (NTP / PTP) verified across all nodes', 'Remote access and firewall rules tested and documented', 'Operators trained; handover documents delivered', 'Final backup taken and archived off the system'] }
];

const TAG_TYPES = { PMP: 'Pump', VLV: 'Valve', XMTR: 'Transmitter', PID: 'PID controller', MTR: 'Motor', FAN: 'Fan', LSH: 'Level switch high', ZSC: 'Position closed', FIT: 'Flow transmitter', LIT: 'Level transmitter', PIT: 'Pressure transmitter', TIT: 'Temperature transmitter' };

/* ------------------------------------------------------------ ui helpers */
let toastTimer;
function toast(msg, action) {
  const t = $('#toast');
  t.replaceChildren();
  const s = document.createElement('span');
  s.textContent = msg;
  t.append(s);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', () => { action.fn(); t.hidden = true; });
    t.append(b);
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  if (!action) toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

async function copyText(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg || 'Copied'); return true; }
  catch (e) {
    const ta = el('textarea', { readonly: '', style: 'position:fixed;opacity:0;font-size:16px' });
    ta.value = text; document.body.append(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
    ta.remove();
    toast(ok ? (msg || 'Copied') : 'Copy failed. Select the text and copy it manually.');
    return ok;
  }
}

function download(name, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v); });
  kids.forEach((k) => n.append(k));
  return n;
}

/* ------------------------------------------------------------ theme */
const Theme = {
  init() {
    ['#theme-btn', '#theme-btn-side'].forEach((s) => $(s).addEventListener('click', () => this.toggle()));
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!store.get(CONFIG.storage.theme, null)) this.apply(e.matches ? 'light' : 'dark');
    });
    this.apply(document.documentElement.dataset.theme || 'dark');
  },
  apply(t) {
    document.documentElement.dataset.theme = t;
    $$('meta[name="theme-color"]').forEach((m) => m.remove());
    document.head.append(el('meta', { name: 'theme-color', content: t === 'light' ? '#F8F9FA' : '#181A1F' }));
  },
  toggle() {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    store.set(CONFIG.storage.theme, next);
    try { localStorage.setItem(CONFIG.storage.theme, next); } catch (e) { /* ignore */ }
    this.apply(next);
  }
};

/* ------------------------------------------------------------ navigation */
const Nav = {
  views: ['showcase', 'standards', 'tools'],
  init() {
    $$('.nav-btn').forEach((b) => b.addEventListener('click', () => this.go(b.dataset.view, true)));
    window.addEventListener('hashchange', () => this.go(this.fromHash(), false));
    this.go(this.fromHash(), false);
  },
  fromHash() { const h = location.hash.replace('#', ''); return this.views.includes(h) ? h : 'showcase'; },
  go(v, push) {
    this.views.forEach((n) => { $('#view-' + n).hidden = n !== v; });
    $$('.nav-btn').forEach((b) => { if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (push && location.hash !== '#' + v) history.pushState(null, '', '#' + v);
    Terms.hide();
    document.body.dataset.view = v;
    $('#support-top').hidden = v === 'showcase';
    window.scrollTo({ top: 0 });
    document.title = { showcase: 'Project showcase', standards: 'Standards guide', tools: 'Field tools' }[v] + ' | SCADA Guide 2026';
  }
};

/* ------------------------------------------------------------ showcase */
const Showcase = {
  cat: 'All',
  init() {
    const cats = ['All', ...new Set(PROJECTS.map((p) => p.cat))];
    const box = $('#proj-filters');
    cats.forEach((c) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(c === 'All'), text: c });
      b.addEventListener('click', () => { this.cat = c; $$('button', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); this.render(); });
      box.append(b);
    });
    $('#proj-search').addEventListener('input', () => this.render());
    this.render();
  },
  render() {
    const q = $('#proj-search').value.trim().toLowerCase();
    const list = PROJECTS.filter((p) => (this.cat === 'All' || p.cat === this.cat) && (p.title + ' ' + p.plain + ' ' + p.text + ' ' + p.tags.join(' ')).toLowerCase().includes(q));
    const grid = $('#proj-grid');
    grid.replaceChildren(...list.map((p) => {
      const tags = el('ul', { class: 'chips' }, ...p.tags.map((t) => el('li', { class: 'tag', text: t })));
      return el('article', { class: 'proj' }, el('h3', { text: p.title }), el('p', { class: 'purpose', text: p.plain }), el('p', { text: p.text }), tags);
    }));
    $('#proj-empty').hidden = list.length > 0;
    Terms.scan(grid);
  }
};

/* ------------------------------------------------------------ standards */
const Standards = {
  init() {
    const box = $('#std-list');
    STANDARDS.forEach((s, i) => {
      const d = el('details', { class: 'std' });
      if (i === 0) d.open = true;
      d.append(el('summary', {}, el('span', { class: 'sum' }, el('strong', { text: s.title }), el('span', { class: 'purpose', text: s.plain })), el('span', { class: 'tag', text: s.badge })));
      const body = el('div', { class: 'body' });
      s.body.forEach((t) => body.append(el('p', { text: t })));
      d.append(body);
      box.append(d);
    });
    const tbl = $('#sl-table');
    const thead = el('thead', {}, el('tr', {}, ...['Level', 'Protects against', 'Attacker profile', 'Typical controls'].map((h) => el('th', { scope: 'col', text: h }))));
    const tbody = el('tbody', {}, ...SLS.map((r) => el('tr', {}, el('th', { scope: 'row', class: 'mono', text: r[0] }), ...r.slice(1).map((c) => el('td', { text: c })))));
    tbl.append(thead, tbody);
  }
};

/* ------------------------------------------------------------ checklist */
const Checklist = {
  data: null,
  uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); },
  load() {
    let d = store.get(CONFIG.storage.sites, null);
    if (!d || typeof d !== 'object' || !d.sites || !d.sites[d.active]) {
      const old = store.get(CONFIG.storage.checklist, {});
      const id = this.uid();
      d = { active: id, sites: { [id]: { name: 'Site 1', engineer: '', state: old && typeof old === 'object' && !Array.isArray(old) ? old : {} } } };
    }
    this.data = d;
  },
  site() { return this.data.sites[this.data.active]; },
  save() { store.set(CONFIG.storage.sites, this.data); },
  ids() { return CHECKLIST.flatMap((g, gi) => g.items.map((t, i) => ({ id: `c${gi}-${i}`, group: g.g, text: t }))); },
  init() {
    this.load();
    const box = $('#cl-list');
    CHECKLIST.forEach((g, gi) => {
      const wrap = el('fieldset', { class: 'cl-group', style: 'border:0;margin:0 0 16px;padding:0' }, el('legend', { class: 'cl-legend', style: 'font-weight:700;padding:0;margin-bottom:8px', text: g.g }));
      g.items.forEach((t, i) => {
        const id = `c${gi}-${i}`;
        const cb = el('input', { type: 'checkbox', id, 'data-id': id });
        cb.addEventListener('change', () => { this.site().state[id] = cb.checked; this.save(); this.progress(); });
        wrap.append(el('label', { class: 'cl-item', for: id }, cb, el('span', { text: t })));
      });
      box.append(wrap);
    });
    $('#site-select').addEventListener('change', (e) => this.pick(e.target.value));
    $('#cl-engineer').addEventListener('input', (e) => { this.site().engineer = e.target.value.slice(0, 60); this.save(); });
    $('#site-del').addEventListener('click', () => this.removeSite());
    $('#cl-json').addEventListener('click', () => this.exportJSON());
    $('#cl-csv').addEventListener('click', () => this.exportCSV());
    $('#cl-print').addEventListener('click', () => this.print());
    $('#cl-reset').addEventListener('click', () => {
      if (!confirm(`Clear checklist progress for "${this.site().name}"?`)) return;
      this.site().state = {}; this.save(); this.refresh();
    });
    this.refresh();
  },
  refresh() {
    const sel = $('#site-select');
    sel.replaceChildren(...Object.entries(this.data.sites).map(([id, s]) => el('option', { value: id, text: s.name })), el('option', { value: '__add__', text: '+ Add Site' }));
    sel.value = this.data.active;
    $('#cl-engineer').value = this.site().engineer || '';
    $('#site-del').disabled = Object.keys(this.data.sites).length < 2;
    const st = this.site().state;
    $$('input[data-id]').forEach((c) => { c.checked = !!st[c.dataset.id]; });
    this.progress();
  },
  pick(v) {
    if (v === '__add__') {
      const name = (prompt('Site name, for example Dibba tunnel north') || '').trim().slice(0, 60);
      if (!name) { $('#site-select').value = this.data.active; return; }
      const id = this.uid();
      this.data.sites[id] = { name, engineer: this.site().engineer || '', state: {} };
      this.data.active = id;
    } else if (this.data.sites[v]) {
      this.data.active = v;
    }
    this.save(); this.refresh();
  },
  removeSite() {
    const keys = Object.keys(this.data.sites);
    if (keys.length < 2) return;
    if (!confirm(`Delete site "${this.site().name}" and its checklist progress? This cannot be undone.`)) return;
    delete this.data.sites[this.data.active];
    this.data.active = Object.keys(this.data.sites)[0];
    this.save(); this.refresh();
  },
  progress() {
    const all = this.ids(), st = this.site().state, done = all.filter((x) => st[x.id]).length;
    $('#cl-progress').textContent = `${done} / ${all.length}`;
    $('#cl-bar').style.width = (all.length ? (done / all.length) * 100 : 0) + '%';
  },
  rows() { const st = this.site().state; return this.ids().map((x) => ({ stage: x.group, item: x.text, done: !!st[x.id] })); },
  stamp() { return new Date().toISOString().slice(0, 10); },
  slug() { return this.site().name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'; },
  exportJSON() {
    const s = this.site();
    download(`fat-sat-${this.slug()}-${this.stamp()}.json`, 'application/json', JSON.stringify({ site: s.name, engineer: s.engineer, exported: new Date().toISOString(), items: this.rows() }, null, 2));
    toast('Checklist exported as JSON');
  },
  exportCSV() {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"', site = this.site().name;
    const csv = ['Site,Stage,Item,Done', ...this.rows().map((r) => [q(site), q(r.stage), q(r.item), r.done ? 'Yes' : 'No'].join(','))].join('\r\n');
    download(`fat-sat-${this.slug()}-${this.stamp()}.csv`, 'text/csv', csv);
    toast('Checklist exported as CSV');
  },
  report() {
    const s = this.site(), rows = this.rows(), done = rows.filter((r) => r.done).length;
    const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
    const box = $('#print-report');
    const meta = el('table', { class: 'rp-meta' }, el('tbody', {},
      el('tr', {}, el('th', { text: 'Site name' }), el('td', { text: s.name })),
      el('tr', {}, el('th', { text: 'Engineer name' }), el('td', { text: s.engineer || '' })),
      el('tr', {}, el('th', { text: 'Date' }), el('td', { text: this.stamp() })),
      el('tr', {}, el('th', { text: 'Progress' }), el('td', { text: `${done} / ${rows.length} items (${pct} %)` }))));
    box.replaceChildren(el('h1', { text: 'FAT / SAT Commissioning Report' }), meta);
    CHECKLIST.forEach((g) => {
      const body = el('tbody', {}, ...rows.filter((r) => r.stage === g.g).map((r) => el('tr', {}, el('td', { class: 'rp-box', text: r.done ? '[X]' : '[ ]' }), el('td', { text: r.item }))));
      box.append(el('h2', { text: g.g }), el('table', { class: 'rp-table' }, body));
    });
    box.append(el('div', { class: 'rp-sign' },
      el('div', { text: 'Engineer signature' + (s.engineer ? ': ' + s.engineer : '') }), el('div', { text: 'Date' }),
      el('div', { text: 'Client / witness name and signature' }), el('div', { text: 'Date' })));
  },
  print() {
    this.report();
    document.body.classList.add('report-mode');
    const done = () => document.body.classList.remove('report-mode');
    window.addEventListener('afterprint', done, { once: true });
    window.addEventListener('pointerdown', done, { once: true });
    setTimeout(() => window.print(), 60);
  }
};

/* ------------------------------------------------------------ tag generator */
const Tags = {
  init() {
    const sel = $('#tg-type');
    Object.entries(TAG_TYPES).forEach(([k, v]) => sel.append(el('option', { value: k, text: `${k}: ${v}` })));
    $('#tag-form').addEventListener('input', () => this.render());
    $('#tag-form').addEventListener('submit', (e) => e.preventDefault());
    $('#tg-copy').addEventListener('click', () => this.copy());
    this.render();
  },
  clean(v) { return v.toUpperCase().replace(/[^A-Z0-9_]/g, ''); },
  list() {
    const site = this.clean($('#tg-site').value) || 'SITE', area = this.clean($('#tg-area').value) || 'AREA';
    const type = $('#tg-type').value, suf = this.clean($('#tg-suffix').value);
    const start = Math.max(1, parseInt($('#tg-num').value, 10) || 1);
    const count = Math.min(50, Math.max(1, parseInt($('#tg-count').value, 10) || 1));
    return Array.from({ length: count }, (_, i) => [site, area, type + String(start + i).padStart(3, '0')].join('-') + (suf ? '_' + suf : ''));
  },
  render() { this.cur = this.list(); $('#tg-out').textContent = this.cur.join('\n'); },
  copy() { $('#tg-msg').textContent = ''; copyText(this.cur.join('\n'), 'Tags copied'); }
};

/* ------------------------------------------------------------ bandwidth */
const Bandwidth = {
  init() { $('#bw-form').addEventListener('input', () => this.render()); $('#bw-form').addEventListener('submit', (e) => e.preventDefault()); this.render(); },
  num(id, d) { const v = parseFloat($(id).value); return Number.isFinite(v) && v > 0 ? v : d; },
  render() {
    const tags = this.num('#bw-tags', 1), bytes = this.num('#bw-bytes', 1), intv = this.num('#bw-int', 1), ovh = this.num('#bw-ovh', 1);
    const link = this.num('#bw-link', 100), maxU = this.num('#bw-max', 30);
    const bps = (tags * bytes * ovh * 8) / intv, mbps = bps / 1e6, util = (mbps / link) * 100;
    const maxTags = Math.floor(((link * 1e6 * (maxU / 100)) * intv) / (bytes * ovh * 8));
    const rows = [
      ['Payload load', (bps / 1000).toFixed(1) + ' kbit/s', ''],
      ['Link utilisation', util.toFixed(2) + ' %', util <= maxU ? 'good' : 'bad'],
      ['Tags at max utilisation', maxTags.toLocaleString(), ''],
      ['Verdict', util <= maxU ? 'Within budget' : 'Over budget: slow polling or segment', util <= maxU ? 'good' : 'bad']
    ];
    $('#bw-out').replaceChildren(...rows.map(([k, v, c]) => el('div', { class: c }, el('dt', { text: k }), el('dd', { text: v }))));
  }
};

/* ------------------------------------------------------------ S7-400H topology */
const TOPO = {
  cpu0: { title: 'S7-400H CPU 0 (rack 0)', role: 'Starts as primary (master). Runs the program in lockstep with CPU 1 and drives the process outputs.',
    failover: 'If CPU 0 stops or fails, CPU 1 continues from synchronised memory without interrupting the process (bumpless). Check the switchover time in the H-system manual for your CPU and configuration.',
    protocol: 'Redundancy (sync) modules and fibre-optic cables between the CPUs; PROFINET or PROFIBUS DP to I/O; Industrial Ethernet with S7 communication to WinCC.' },
  cpu1: { title: 'S7-400H CPU 1 (rack 1)', role: 'Starts as standby. Receives all updates from the primary over the sync link and keeps an identical state.',
    failover: 'Takes over as master when the primary fails. After a failed CPU is repaired and restarted, it links up, updates from the running CPU and rejoins as standby.',
    protocol: 'Same sync link and I/O connections as CPU 0. Only the master (MSTR LED) controls the outputs.' },
  ring: { title: 'Redundant fibre-optic ring', role: 'Industrial Ethernet backbone linking the CPUs, SCADA servers and switches in the tunnel portals and cabinets.',
    failover: 'MRP (IEC 62439-2): the ring manager blocks one port in normal operation and opens it when a link breaks. Recovery is typically within 200 ms depending on profile. Pull a fibre during FAT to prove it.',
    protocol: 'Fibre-optic Ethernet with MRP. One ring manager, all other switches are clients.' },
  srv1: { title: 'WinCC SCADA server A', role: 'One of a redundant WinCC server pair serving operator clients with synoptics, alarms, trends and archives.',
    failover: 'The partner server takes over if this one fails and clients switch automatically. Alarms and archives are synchronised after the failed server returns.',
    protocol: 'S7 communication to the CPUs, a dedicated link between the servers to monitor each other, optional OPC UA for third-party systems.' },
  srv2: { title: 'WinCC SCADA server B', role: 'The second server of the redundant WinCC pair, active in parallel with server A.',
    failover: 'Operator clients keep working on the surviving server. Check alarm and archive consistency after every switchover test.',
    protocol: 'Same as server A: S7 communication to the CPUs and a server-to-server redundancy link.' },
  rio: { title: 'Field RIO (remote I/O)', role: 'Collects field signals such as 4–20 mA, digital inputs and outputs from fans, lighting, sensors and fire detection.',
    failover: 'Redundant interface modules connect the remote I/O to both CPUs, so losing one path or one CPU keeps the I/O online.',
    protocol: 'PROFIBUS DP or PROFINET depending on the design, for example ET 200M with redundant IM 153-2 interface modules.' }
};
const TOPO_STATES = [
  ['Normal: CPU 0 is master (MSTR), CPU 1 is standby, redundancy is intact.', 'PRIMARY', 'STANDBY'],
  ['CPU 0 failed (STOP, REDF): CPU 1 took over as master with a bumpless switchover of < 50 ms (typical figure; confirm by measuring it in FAT).', 'STOP / REDF', 'PRIMARY (single)'],
  ['CPU 0 restored: it resynced as standby. CPU 1 stays master (MSTR). Redundancy is back.', 'STANDBY', 'PRIMARY']
];
const TOPO_BTN = ['Simulate CPU 0 failure', 'Restore CPU 0 (resync as standby)', 'Reset diagram'];
const Topology = {
  state: 0, sel: 'cpu0',
  init() {
    $$('.tp-node').forEach((n) => {
      const k = n.dataset.node;
      n.addEventListener('click', () => this.select(k));
      n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.select(k); } });
    });
    $('#topo-fail').addEventListener('click', () => { this.state = (this.state + 1) % 3; this.apply(); });
    this.apply();
  },
  select(k) { this.sel = k; this.apply(); },
  apply() {
    const st = TOPO_STATES[this.state];
    $('#tp-s0').textContent = st[1];
    $('#tp-s1').textContent = st[2];
    $('#tp-cpu0').classList.toggle('tp-fault', this.state === 1);
    $('#tp-m0').classList.toggle('off', this.state !== 0);
    $('#tp-m1').classList.toggle('off', this.state === 0);
    $('#tp-sw').classList.toggle('off', this.state !== 1);
    $$('.tp-node').forEach((n) => n.classList.toggle('sel', n.dataset.node === this.sel));
    const btn = $('#topo-fail');
    btn.textContent = TOPO_BTN[this.state];
    btn.setAttribute('aria-pressed', String(this.state === 1));
    const d = TOPO[this.sel];
    const rows = [['Role', d.role], ['Failover', d.failover], ['Protocol', d.protocol], ['Simulated state', st[0]]];
    const dl = el('dl', {});
    rows.forEach(([k, v]) => { dl.append(el('dt', { text: k }), el('dd', { text: v })); });
    $('#topo-detail').replaceChildren(el('h3', { text: d.title }), dl);
  }
};

/* ------------------------------------------------------------ analog scaling */
const Analog = {
  last: 'ma',
  init() {
    ['ma', 'raw', 'pct', 'eu'].forEach((k) => $('#an-' + k).addEventListener('input', () => { this.last = k; this.calc(k); }));
    ['lrv', 'urv', 'unit'].forEach((k) => $('#an-' + k).addEventListener('input', () => this.calc(this.last === 'eu' ? 'pct' : this.last)));
    $('#an-form').addEventListener('submit', (e) => e.preventDefault());
    $('#an-copy').addEventListener('click', () => copyText(this.summary(), 'Scaling result copied'));
    this.calc('ma');
  },
  summary() {
    const g = (k) => $('#an-' + k).value, u = $('#an-unit').value.trim();
    return `${g('ma')} mA = ${g('raw')} counts = ${g('pct')} % = ${g('eu')}${u ? ' ' + u : ''} (LRV ${g('lrv')}, URV ${g('urv')})`;
  },
  status(cls, text) { const s = $('#an-status'); s.className = 'an-status ' + cls; s.textContent = text; },
  calc(src) {
    const lrv = parseFloat($('#an-lrv').value), urv = parseFloat($('#an-urv').value);
    const unit = $('#an-unit').value.trim();
    const v = parseFloat($('#an-' + src).value);
    if (!Number.isFinite(lrv) || !Number.isFinite(urv) || !Number.isFinite(v)) { this.status('warn', 'Enter numbers in LRV, URV and the field you are editing.'); return; }
    const span = urv - lrv;
    let ma;
    if (src === 'ma') ma = v;
    else if (src === 'raw') ma = 4 + (v / 27648) * 16;
    else if (src === 'pct') ma = 4 + (v / 100) * 16;
    else {
      if (span === 0) { this.status('warn', 'URV and LRV must be different to scale engineering units.'); return; }
      ma = 4 + ((v - lrv) / span) * 16;
    }
    const pct = ((ma - 4) / 16) * 100, raw = ((ma - 4) / 16) * 27648, eu = lrv + (pct / 100) * span;
    const out = { ma: String(+ma.toFixed(3)), raw: String(Math.round(raw)), pct: String(+pct.toFixed(2)), eu: String(+eu.toFixed(3)) };
    Object.keys(out).forEach((k) => { const f = $('#an-' + k); if (k !== src && f !== document.activeElement) f.value = out[k]; });
    const u = unit ? ' ' + unit : '';
    if (ma < 3.6) this.status('bad', `FAULT: ${out.ma} mA is below 3.6 mA. Wire break or dead transmitter.`);
    else if (ma < 4) this.status('warn', `Under-range: ${out.ma} mA is between 3.6 and 4 mA, below the LRV. Reading ${out.eu}${u}.`);
    else if (ma > 20.5) this.status('bad', `FAULT: ${out.ma} mA is above 20.5 mA. Overflow or transmitter fault.`);
    else if (ma > 20) this.status('warn', `Over-range: ${out.ma} mA is between 20 and 20.5 mA, above the URV. Reading ${out.eu}${u}.`);
    else this.status('ok', `In range: ${out.eu}${u} at ${out.pct} % (${out.raw} counts).`);
  }
};

/* ------------------------------------------------------------ OT lookup */
const LOOKUP = [
  ['Modbus', '01', 'Illegal function', 'The function code is not supported by the device or not allowed in its current state.'],
  ['Modbus', '02', 'Illegal data address', 'The register or coil address is outside what the device supports. Check 0-based versus 1-based addressing.'],
  ['Modbus', '03', 'Illegal data value', 'A value in the request is not allowed, for example a quantity that is too large or a write outside the permitted range.'],
  ['Modbus', '04', 'Server device failure', 'An unrecoverable error occurred in the device while it handled the request.'],
  ['Modbus', '05', 'Acknowledge', 'The request was accepted but needs a long time to finish. Poll again later for completion.'],
  ['Modbus', '06', 'Server device busy', 'The device is busy with a long command. Retry later.'],
  ['Modbus', '08', 'Memory parity error', 'Extended memory failed a parity check. Retry, then service the device if it repeats.'],
  ['Modbus', '0A', 'Gateway path unavailable', 'The gateway could not allocate a path to the target. Check gateway configuration and routing.'],
  ['Modbus', '0B', 'Gateway target failed to respond', 'No response from the device behind the gateway. Check wiring, address and power.'],
  ['S7-400H LED', 'RUN lit', 'CPU in RUN (green)', 'Normal operation. In an H system also check MSTR, REDF and the RACK LEDs to confirm the redundant state.'],
  ['S7-400H LED', 'STOP lit', 'CPU in STOP (yellow)', 'The program is not running. Read the diagnostic buffer for the cause before restarting.'],
  ['S7-400H LED', 'RUN flashing', 'Startup or update in progress', 'The CPU is starting or updating from its partner. Wait for steady RUN, then check the diagnostic buffer if it never settles.'],
  ['S7-400H LED', 'REDF', 'Redundancy error', 'Lit: the H system lost redundancy. Causes: partner CPU stopped or failed, sync module or fibre cable fault, or a rack or configuration mismatch. Flashing typically means link-up and update with the partner is in progress. Check IFM1F / IFM2F and the partner CPU first.'],
  ['S7-400H LED', 'MSTR', 'Master CPU', 'Lit: this CPU is the active master and controls the process outputs. Off: this is the standby CPU. Only one CPU of a healthy pair shows MSTR. LED colour can differ by variant, so check your CPU manual.'],
  ['S7-400H LED', 'RACK0 / RACK1', 'Rack identification', 'Shows whether this CPU is configured as rack 0 or rack 1 of the H system. The two CPUs must be on different racks.'],
  ['S7-400H LED', 'IFM1F / IFM2F', 'Synchronization submodule 1 / 2 fault', 'Lit: the fibre sync link on that submodule is broken, or the submodule has a hardware error. Check the connectors, the cable and its cleanliness, then the submodule.'],
  ['S7-400H LED', 'INTF', 'Internal fault (red)', 'Internal error such as a programming error, memory error or hardware error. Read the diagnostic buffer.'],
  ['S7-400H LED', 'EXTF', 'External fault (red)', 'Fault outside the CPU, for example a field I/O module, peripheral or bus error reported to the CPU. Read the diagnostic buffer.'],
  ['S7-400H LED', 'BUS1F / BUS2F', 'Bus fault, interface 1 / 2 (red)', 'Fault on the CPU bus interface, such as PROFIBUS DP. PROFINET variants add their own bus fault LED (for example BUS5F). Interface assignment varies by CPU variant. Check cabling, terminations, addresses and the remote station.']
].concat(SLS.map((r) => ['IEC 62443', r[0], r[1], `Attacker profile: ${r[2]}. Typical controls: ${r[3]}.`]));

const Lookup = {
  cat: 'All',
  init() {
    const box = $('#lk-filters');
    ['All', 'Modbus', 'S7-400H LED', 'IEC 62443'].forEach((c) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(c === 'All'), text: c });
      b.addEventListener('click', () => { this.cat = c; $$('button', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); this.render(); });
      box.append(b);
    });
    $('#lk-search').addEventListener('input', () => this.render());
    this.render();
  },
  render() {
    const q = $('#lk-search').value.trim().toLowerCase();
    const list = LOOKUP.filter((r) => (this.cat === 'All' || r[0] === this.cat) && r.join(' ').toLowerCase().includes(q));
    $('#lk-list').replaceChildren(...list.map((r) => el('li', {},
      el('div', { class: 'hd' }, el('span', { class: 'k', text: r[1] }), el('span', { class: 'tag', text: r[0] })),
      el('strong', { text: r[2] }), el('p', { text: r[3] }))));
    $('#lk-empty').hidden = list.length > 0;
  }
};

/* ------------------------------------------------------------ welcome guide */
const Welcome = {
  init() {
    if (store.get(CONFIG.storage.welcome, false)) return;
    const box = $('#welcome');
    box.hidden = false;
    const done = () => { store.set(CONFIG.storage.welcome, true); box.hidden = true; };
    $('#wl-close').addEventListener('click', done);
    $('#wl-done').addEventListener('click', done);
  }
};

/* ------------------------------------------------------------ enquiry topics */
const TOPICS = {
  spec: { label: 'Tunnel Automation Spec', type: 'Spec sheet request', text: 'Hello, please send the specification sheet for the tunnel automation system (S7-400H PLC, WinCC SCADA, redundant fibre-optic ring).\nProject and location: \nRequired by: ' },
  arch: { label: 'S7-400H / WinCC Architecture', type: 'Project enquiry', text: 'Hello, I would like to discuss a redundant S7-400H and WinCC architecture.\nApproximate I/O count: \nRedundancy requirements: \nProject and location: ' },
  audit: { label: '2026 SCADA Audit', type: 'SCADA audit', text: 'Hello, I would like to request a 2026 SCADA audit covering architecture, IEC 62443 zones and conduits, and ISA-18.2 alarm management.\nSite and system: \nCurrent SCADA platform: ' },
  consult: { label: 'New Project Consultation', type: 'Project enquiry', text: 'Hello, I am planning a project and would like a friendly, non-technical conversation about how a monitoring and control system could help.\nWhat the project is (for example a tunnel, pump station or building): \nWhere it is: \nWhen I would like to start: \nAnything I am unsure or worried about: ' }
};

/* ------------------------------------------------------------ plain-English layer: overview + tappable terms */
const TERMS = {
  'PLC': ['PLC (Programmable Logic Controller)', 'A rugged industrial computer that runs equipment automatically, around the clock.'],
  'SCADA': ['SCADA (Supervisory Control and Data Acquisition)', 'Software that gathers live data from a whole site and shows it to operators on screens.'],
  'HMI': ['HMI (Human-Machine Interface)', 'A screen where a person sees what equipment is doing and can give it commands.'],
  'FAT / SAT': ['FAT / SAT (Factory and Site Acceptance Tests)', 'Checks that the system works before it leaves the factory (FAT) and again once it is installed on site (SAT).'],
  'Redundancy': ['Redundancy', 'Keeping a spare unit ready to take over automatically if the main one fails.']
};
const TERM_RE = /\b(PLCs?|SCADA|HMIs?|FAT ?\/ ?SAT|FAT|SAT|[Rr]edundan(?:cy|t))\b/g;
const Overview = {
  init() {
    const d = $('#overview');
    if (store.get(CONFIG.storage.overview, true) === false) d.open = false;
    d.addEventListener('toggle', () => store.set(CONFIG.storage.overview, d.open));
  }
};
const Terms = {
  sel: '.overview, .welcome, .panel, .purpose, .lead, .proj, details.std .body',
  skip: 'button,label,summary,a,option,textarea,select,svg,script,style,pre,dialog,input,h1,h2,h3,h4,.term-tip',
  active: null,
  key(m) {
    if (/^PLC/.test(m)) return 'PLC';
    if (/^SCADA/.test(m)) return 'SCADA';
    if (/^HMI/.test(m)) return 'HMI';
    if (/^(FAT|SAT)/.test(m)) return 'FAT / SAT';
    return 'Redundancy';
  },
  init() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.term-tip');
      if (b) { if (this.active === b && !$('#term-pop').hidden) this.hide(); else this.show(b); return; }
      if (!e.target.closest('#term-pop')) this.hide();
    });
    $('#term-pop-close').addEventListener('click', () => this.hide());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
    this.scan(document);
  },
  show(btn) {
    const t = TERMS[btn.dataset.term];
    if (!t) return;
    if (this.active) this.active.setAttribute('aria-expanded', 'false');
    this.active = btn;
    btn.setAttribute('aria-expanded', 'true');
    $('#term-pop-title').textContent = t[0];
    $('#term-pop-text').textContent = t[1];
    $('#term-pop').hidden = false;
  },
  hide() {
    $('#term-pop').hidden = true;
    if (this.active) this.active.setAttribute('aria-expanded', 'false');
    this.active = null;
  },
  scan(root) {
    const list = new Set(root.querySelectorAll ? root.querySelectorAll(this.sel) : []);
    if (root.matches && root.matches(this.sel)) list.add(root);
    list.forEach((c) => {
      const seen = new Set($$('.term-tip', c).map((b) => b.dataset.term));
      const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((n) => {
        const p = n.parentElement;
        if (!p || p.closest(this.skip)) return;
        const text = n.nodeValue, frag = document.createDocumentFragment();
        let last = 0, hit = false;
        for (const m of text.matchAll(TERM_RE)) {
          const k = this.key(m[0]);
          if (seen.has(k)) continue;
          seen.add(k); hit = true;
          frag.append(text.slice(last, m.index), el('button', { type: 'button', class: 'term-tip', 'data-term': k, 'aria-expanded': 'false', text: m[0] }));
          last = m.index + m[0].length;
        }
        if (!hit) return;
        frag.append(text.slice(last));
        n.replaceWith(frag);
      });
    });
  }
};

/* ------------------------------------------------------------ backup and restore */
const Backup = {
  init() {
    $('#bk-export').addEventListener('click', () => this.exportAll());
    $('#bk-import').addEventListener('click', () => $('#bk-file').click());
    $('#bk-file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) this.importFile(f); e.target.value = ''; });
  },
  exportAll() {
    const data = { app: 'scada-guide-2026', version: 2, exported: new Date().toISOString(), checklist: Checklist.data, queue: store.get(CONFIG.storage.queue, []) };
    download(`scada-guide-backup-${Checklist.stamp()}.json`, 'application/json', JSON.stringify(data, null, 2));
    toast('Full backup exported');
  },
  read(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(file); }); },
  clean(obj) {
    if (!obj || obj.app !== 'scada-guide-2026' || !obj.checklist || typeof obj.checklist.sites !== 'object' || !obj.checklist.sites) throw new Error('this is not a SCADA Guide backup');
    const sites = {}, ids = {};
    Object.entries(obj.checklist.sites).slice(0, 50).forEach(([rawId, s]) => {
      if (!s || typeof s !== 'object') return;
      let id = String(rawId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
      if (!id || ['__proto__', 'constructor', 'prototype'].includes(id) || sites[id]) id = Checklist.uid();
      const state = {};
      if (s.state && typeof s.state === 'object') Object.keys(s.state).forEach((k) => { if (/^c\d+-\d+$/.test(k) && s.state[k] === true) state[k] = true; });
      sites[id] = { name: String(s.name || 'Site').slice(0, 60), engineer: String(s.engineer || '').slice(0, 60), state };
      ids[rawId] = id;
    });
    const keys = Object.keys(sites);
    if (!keys.length) throw new Error('the backup has no sites');
    const active = ids[obj.checklist.active] || keys[0];
    const queue = Array.isArray(obj.queue) ? obj.queue.slice(0, 50).filter((q) => q && typeof q === 'object' && q.name && q.email && q.message).map((q) => ({
      name: String(q.name).slice(0, 100), email: String(q.email).slice(0, 200), type: String(q.type || 'Project enquiry').slice(0, 60),
      subject: String(q.subject || q.type || 'Enquiry').slice(0, 120), message: String(q.message).slice(0, 4000), created: String(q.created || new Date().toISOString())
    })) : [];
    return { data: { active, sites }, queue };
  },
  async importFile(file) {
    try {
      const c = this.clean(JSON.parse(await this.read(file)));
      const n = Object.keys(c.data.sites).length;
      if (!confirm(`Restore ${n} site${n === 1 ? '' : 's'} and ${c.queue.length} queued enquir${c.queue.length === 1 ? 'y' : 'ies'}? This replaces the data on this device.`)) return;
      Checklist.data = c.data; Checklist.save(); Checklist.refresh();
      store.set(CONFIG.storage.queue, c.queue);
      toast('Backup restored');
      Enquiry.flush();
    } catch (e) { toast('Import failed: ' + (e && e.message ? e.message : 'invalid file')); }
  }
};

/* ------------------------------------------------------------ fibre loss budget */
const Fiber = {
  init() { $('#fb-form').addEventListener('input', () => this.render()); $('#fb-form').addEventListener('submit', (e) => e.preventDefault()); this.render(); },
  num(id, d) { const v = parseFloat($(id).value); return Number.isFinite(v) && v >= 0 ? v : d; },
  render() {
    const km = this.num('#fb-km', 0), att = this.num('#fb-wl', 0.35), con = Math.floor(this.num('#fb-con', 0)), spl = Math.floor(this.num('#fb-spl', 0));
    const cl = this.num('#fb-cl', 0.5), sl = this.num('#fb-sl', 0.1), bud = this.num('#fb-bud', 0), mar = this.num('#fb-mar', 0);
    const fib = km * att, cn = con * cl, sp = spl * sl, tot = fib + cn + sp, avail = bud - tot;
    let cls, verdict;
    if (avail >= mar) { cls = 'good'; verdict = 'PASS'; }
    else if (avail >= 0) { cls = 'warn'; verdict = 'MARGINAL: below safety margin'; }
    else { cls = 'bad'; verdict = 'FAIL: loss exceeds budget'; }
    const f = (n) => n.toFixed(2) + ' dB';
    const rows = [['Fibre loss', f(fib), ''], ['Connector loss', f(cn), ''], ['Splice loss', f(sp), ''], ['Total link loss', f(tot), ''],
      ['Remaining margin', f(avail), cls], ['Status', verdict, cls]];
    $('#fb-out').replaceChildren(...rows.map(([k, v, c]) => el('div', { class: c }, el('dt', { text: k }), el('dd', { text: v }))));
  }
};

/* ------------------------------------------------------------ modal state (hides sticky bars) */
const ModalState = {
  init() {
    if (typeof HTMLDialogElement === 'undefined') return;
    const sm = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = function () { document.body.classList.add('modal-open'); return sm.call(this); };
    $$('dialog').forEach((d) => d.addEventListener('close', () => { if (!$$('dialog[open]').length) document.body.classList.remove('modal-open'); }));
  }
};

/* ------------------------------------------------------------ keyboard-aware bars (iOS) */
const Keyboard = {
  field: 'input:not([type=checkbox]):not([type=radio]):not([type=button]),select,textarea',
  init() {
    document.addEventListener('focusin', (e) => { if (e.target.matches(this.field)) document.body.classList.add('kb-open'); });
    document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches(this.field)) document.body.classList.remove('kb-open'); }, 60));
  }
};

/* ------------------------------------------------------------ enquiry + call */
const Enquiry = {
  init() {
    const call = $('#call-dialog'), enq = $('#enq-dialog');
    $('#call-link').href = 'tel:' + CONFIG.phone.replace(/[^+\d]/g, '');
    $('#call-link').textContent = 'Call ' + CONFIG.phone;
    $('#call-btn').addEventListener('click', () => call.showModal());
    $('#support-top').addEventListener('click', () => call.showModal());
    $('#call-enquire').addEventListener('click', () => { call.close(); $('#enq-status').textContent = ''; enq.showModal(); });
    $('#enq-btn').addEventListener('click', () => { $('#enq-status').textContent = ''; enq.showModal(); });
    $('#enq-cancel').addEventListener('click', () => enq.close());
    $('#enq-copy').addEventListener('click', () => this.copy());
    $$('[data-topic]').forEach((b) => b.addEventListener('click', () => this.topic(b.dataset.topic)));
    $('#enq-form').addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
    window.addEventListener('online', () => this.flush());
    this.flush();
  },
  validate() {
    const name = $('#enq-name').value.trim(), email = $('#enq-email').value.trim(), msg = $('#enq-msg').value.trim();
    const e = { name: name.length < 2 ? 'Enter your name.' : '', email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : 'Enter a valid email address.', msg: msg.length < 10 ? 'Write at least 10 characters.' : '' };
    $('#err-name').textContent = e.name; $('#err-email').textContent = e.email; $('#err-msg').textContent = e.msg;
    const bad = e.name || e.email || e.msg;
    if (bad) { (e.name ? $('#enq-name') : e.email ? $('#enq-email') : $('#enq-msg')).focus(); return null; }
    return { name, email, type: $('#enq-type').value, subject: $('#enq-subject').value.trim() || $('#enq-type').value, message: msg, created: new Date().toISOString() };
  },
  tpl: '',
  topic(key) {
    const t = TOPICS[key], m = $('#enq-msg');
    $('#enq-subject').value = t.label;
    $('#enq-type').value = t.type;
    if (!m.value.trim() || m.value === this.tpl) m.value = t.text;
    else if (!m.value.includes(t.text)) m.value += '\n\n' + t.text;
    this.tpl = t.text;
    $$('[data-topic]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.topic === key)));
  },
  async copy() {
    const d = this.validate();
    if (!d) return;
    const text = `To: ${CONFIG.email}\nSubject: [SCADA Guide] ${d.subject}\n\nName: ${d.name}\nEmail: ${d.email}\nType: ${d.type}\n\n${d.message}`;
    const st = $('#enq-status');
    try {
      await navigator.clipboard.writeText(text);
      st.textContent = 'Enquiry copied. Paste it into any email or messaging app.';
    } catch (e) {
      const ta = el('textarea', { readonly: '', style: 'position:fixed;opacity:0' });
      ta.value = text; document.body.append(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
      ta.remove();
      st.textContent = ok ? 'Enquiry copied. Paste it into any email or messaging app.' : 'Copy failed. Select the message text and copy it manually.';
    }
  },
  mailto(d) {
    const body = `Name: ${d.name}\nEmail: ${d.email}\nType: ${d.type}\n\n${d.message}`;
    return `mailto:${CONFIG.email}?subject=${encodeURIComponent('[SCADA Guide] ' + d.subject)}&body=${encodeURIComponent(body)}`;
  },
  submit() {
    const d = this.validate();
    if (!d) return;
    if (navigator.onLine) {
      location.href = this.mailto(d);
      $('#enq-status').textContent = 'Opening your email app with the enquiry filled in.';
    } else {
      const q = store.get(CONFIG.storage.queue, []);
      q.push(d); store.set(CONFIG.storage.queue, q);
      $('#enq-status').textContent = 'You are offline. Enquiry saved and will be sent when you reconnect.';
      toast('Enquiry queued for when you are back online');
    }
    $('#enq-form').reset();
    this.tpl = '';
    $$('[data-topic]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  },
  flush() {
    const q = store.get(CONFIG.storage.queue, []);
    if (!q.length || !navigator.onLine) return;
    const d = q.shift();
    store.set(CONFIG.storage.queue, q);
    toast(`Queued enquiry from ${d.name} is ready to send`, { label: 'Send', fn: () => { location.href = this.mailto(d); setTimeout(() => this.flush(), 1500); } });
  }
};

/* ------------------------------------------------------------ PWA: SW, install, network */
const PWA = {
  deferred: null,
  init() {
    this.network();
    this.install();
    this.register();
  },
  network() {
    const upd = () => { $('#offline-badge').hidden = navigator.onLine; };
    window.addEventListener('online', () => { upd(); toast('Back online'); });
    window.addEventListener('offline', upd);
    upd();
  },
  isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  standalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  install() {
    const banner = $('#install-banner');
    const dismissed = store.get(CONFIG.storage.installDismissed, false);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); this.deferred = e;
      if (!dismissed && !this.standalone()) banner.hidden = false;
    });
    window.addEventListener('appinstalled', () => { banner.hidden = true; this.deferred = null; $('#install-top').hidden = true; $('#install-dialog').close(); toast('App installed'); });
    ['#install-top', '#install-btn', '#wl-install'].forEach((s) => $(s).addEventListener('click', () => this.open()));
    $('#install-dismiss').addEventListener('click', () => { banner.hidden = true; store.set(CONFIG.storage.installDismissed, true); });
    $('#install-close').addEventListener('click', () => $('#install-dialog').close());
    $('#install-go').addEventListener('click', async () => {
      if (!this.deferred) return;
      this.deferred.prompt();
      await this.deferred.userChoice;
      this.deferred = null; banner.hidden = true; $('#install-dialog').close();
    });
    if (this.standalone()) $('#install-top').hidden = true;
    if (this.isIOS && !this.standalone() && !dismissed) banner.hidden = false;
  },
  open() {
    const body = $('#install-body'), go = $('#install-go');
    const share = '<svg class="ico-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    body.replaceChildren(); go.hidden = true;
    if (this.standalone()) {
      body.append(el('p', { text: 'The guide is already installed on this device.' }));
    } else if (this.deferred) {
      body.append(el('p', { text: 'Install the guide to open it full screen and use it without signal.' }));
      go.hidden = false;
    } else if (this.isIOS) {
      body.innerHTML = '<p class="ios-visual">Tap Share ' + share + ' → Add to Home Screen</p><ol><li>Open this page in <strong>Safari</strong>.</li><li>Tap the Share button ' + share + ' in the toolbar.</li><li>Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li></ol>';
    } else {
      body.append(el('p', { text: 'Open your browser menu and choose Install app or Add to Home screen. If the option is missing, use Chrome or Edge and open the site from its https address.' }));
    }
    $('#install-dialog').showModal();
  },
  register() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register(CONFIG.swUrl, { scope: './' });
        const prompt = (w) => toast('A new version is available', { label: 'Update', fn: () => w.postMessage({ type: 'SKIP_WAITING' }) });
        if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) prompt(w); });
        });
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; location.reload(); });
      } catch (err) { console.warn('Service worker registration failed:', err); }
    });
  }
};

/* ------------------------------------------------------------ boot */
function boot() {
  Theme.init(); Showcase.init(); Standards.init(); Checklist.init(); Tags.init(); Bandwidth.init(); Fiber.init(); Backup.init(); ModalState.init(); Analog.init(); Lookup.init(); Topology.init(); Welcome.init(); Overview.init(); Enquiry.init(); PWA.init();
  $('#skeleton').remove();
  ['#shell', '#actionbar', '#bottomnav'].forEach((s) => { $(s).hidden = false; });
  Nav.init();
  Keyboard.init();
  Terms.init();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
