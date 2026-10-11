// The tuning panel.
//
// It is laid out as PLANT / RIDER / ASSIST on purpose, and PLANT is locked
// behind a deliberate switch. That is the Blue Storm trap (§6) made structural:
// at every milestone you will be tempted to raise fidelity in the control
// response, which is exactly what made the sequel to the best-feeling water
// game ever made worse. Fidelity goes in the plant. Feel goes in the rider.

import { SCHEMA, PLANT_SOURCES, DEG, cloneDefaults, ASSIST_PRESETS } from './params.js';

const STORE = 'efoil.gate.presets.v1';

export class TuningPanel {
  constructor(root, params, onChange) {
    this.root = root;
    this.params = params;
    this.onChange = onChange;
    this.plantUnlocked = false;
    this.inputs = [];
    this._build();
  }

  _build() {
    const r = this.root;
    r.innerHTML = '';

    r.appendChild(this._header());

    this._section('PLANT', 'plant', SCHEMA.plant,
      'Honest physics. Sourced constants. Never touched for feel.');
    this._section('RIDER', 'rider', SCHEMA.rider,
      'Where feel lives. Damping ★ is the hidden skill stat.');
    this._section('ASSIST', 'assist', SCHEMA.assist,
      'Named cheats. Stamped into every run so runs stay comparable.');

    r.appendChild(this._footer());
    this.refresh();
  }

  _header() {
    const d = document.createElement('div');
    d.className = 'pnl-head';
    d.innerHTML = `<strong>TUNING</strong><span class="hint">T to hide</span>`;
    return d;
  }

  _section(title, group, rows, blurb) {
    const sec = document.createElement('section');
    sec.className = 'pnl-sec pnl-' + group;

    const h = document.createElement('h3');
    h.textContent = title;
    if (group === 'plant') {
      const lock = document.createElement('label');
      lock.className = 'lock';
      lock.innerHTML = `<input type="checkbox"> unlock`;
      const cb = lock.querySelector('input');
      cb.addEventListener('change', () => {
        this.plantUnlocked = cb.checked;
        sec.classList.toggle('unlocked', cb.checked);
        this.refresh();
      });
      h.appendChild(lock);
    }
    if (group === 'assist') {
      const sel = document.createElement('select');
      for (const k of Object.keys(ASSIST_PRESETS)) {
        const o = document.createElement('option');
        o.value = k; o.textContent = k;
        sel.appendChild(o);
      }
      sel.value = 'default';
      sel.addEventListener('change', () => this.applyAssistPreset(sel.value));
      this.assistSelect = sel;
      h.appendChild(sel);
    }
    sec.appendChild(h);

    const p = document.createElement('p');
    p.className = 'blurb';
    p.textContent = blurb;
    sec.appendChild(p);

    for (const row of rows) sec.appendChild(this._row(group, row));
    this.root.appendChild(sec);
  }

  _row(group, row) {
    const wrap = document.createElement('div');
    wrap.className = 'pnl-row';
    const lab = document.createElement('label');
    lab.textContent = row.label;
    if (PLANT_SOURCES[row.k]) lab.title = 'source: ' + PLANT_SOURCES[row.k];
    const val = document.createElement('span');
    val.className = 'val';
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.min = row.min; inp.max = row.max; inp.step = row.step;

    const read = () => {
      const raw = this.params[group][row.k];
      return row.deg ? raw / DEG : raw;
    };
    const show = (v) => {
      const dp = row.step >= 1 ? 0 : (row.step >= 0.1 ? 1 : (row.step >= 0.01 ? 2 : 4));
      val.textContent = v.toFixed(dp) + (row.unit ? ' ' + row.unit : '');
    };

    inp.value = read();
    show(read());
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      this.params[group][row.k] = row.deg ? v * DEG : v;
      show(v);
      this.onChange && this.onChange(group, row.k);
    });

    this.inputs.push({ group, row, inp, sync: () => { inp.value = read(); show(read()); } });
    wrap.append(lab, inp, val);
    return wrap;
  }

  _footer() {
    const d = document.createElement('div');
    d.className = 'pnl-foot';

    const mk = (label, fn, cls) => {
      const b = document.createElement('button');
      b.textContent = label; b.className = cls || '';
      b.addEventListener('click', fn);
      return b;
    };

    const name = document.createElement('input');
    name.type = 'text'; name.placeholder = 'preset name'; name.className = 'preset-name';

    const sel = document.createElement('select');
    sel.className = 'preset-list';
    this.presetSelect = sel;

    d.append(
      mk('defaults', () => this.applyAll(cloneDefaults())),
      mk('copy JSON', () => navigator.clipboard && navigator.clipboard.writeText(
        JSON.stringify(this.params, null, 2))),
      name,
      mk('save', () => { if (name.value.trim()) { this.savePreset(name.value.trim()); name.value = ''; } }),
      sel,
      mk('load', () => sel.value && this.loadPreset(sel.value)),
      mk('delete', () => sel.value && this.deletePreset(sel.value)),
    );
    this._refreshPresetList();
    return d;
  }

  applyAssistPreset(key) {
    Object.assign(this.params.assist, ASSIST_PRESETS[key]);
    this.refresh();
    this.onChange && this.onChange('assist', '*');
  }

  applyAll(obj) {
    for (const g of ['plant', 'rider', 'assist']) {
      if (obj[g]) Object.assign(this.params[g], obj[g]);
    }
    this.refresh();
    this.onChange && this.onChange('*', '*');
  }

  refresh() {
    for (const i of this.inputs) {
      i.sync();
      if (i.group === 'plant') i.inp.disabled = !this.plantUnlocked;
    }
  }

  _all() { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } }
  _write(o) { localStorage.setItem(STORE, JSON.stringify(o)); }
  _refreshPresetList() {
    const all = this._all();
    this.presetSelect.innerHTML = '';
    for (const k of Object.keys(all)) {
      const o = document.createElement('option');
      o.value = k; o.textContent = k;
      this.presetSelect.appendChild(o);
    }
  }
  savePreset(n) { const a = this._all(); a[n] = JSON.parse(JSON.stringify(this.params)); this._write(a); this._refreshPresetList(); this.presetSelect.value = n; }
  loadPreset(n) { const a = this._all(); if (a[n]) this.applyAll(a[n]); }
  deletePreset(n) { const a = this._all(); delete a[n]; this._write(a); this._refreshPresetList(); }
}
