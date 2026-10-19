// Interactive worksheet engine.
// Renders the worksheet described in the #ws-data JSON, saves entries in the
// browser (localStorage), gives feedback, and prints a report.
(function () {
  'use strict';

  var root = document.getElementById('ws-root');
  var dataEl = document.getElementById('ws-data');
  if (!root || !dataEl) return;

  var ws = JSON.parse(dataEl.textContent);
  var BASE = root.getAttribute('data-base') || '';
  var STORE_KEY = 'ti-worksheet:' + ws.id;
  var META = ws.meta || [{ id: 'name', label: 'Your name (optional)', placeholder: 'Shown on your report' }];
  var state = loadState();
  var questions = [];   // { q, num, el, inputs, marks, live } in page order
  var refs = {};        // value id -> { qid, index } for calculations
  var progressEl;

  // ---------- storage ----------

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && saved.answers) { saved.meta = saved.meta || {}; return saved; }
    } catch (e) { /* storage unavailable or corrupt */ }
    return { meta: {}, answers: {} };
  }

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function answerFor(id) {
    if (!state.answers[id]) state.answers[id] = { parts: [], text: '', done: false, submitted: false };
    return state.answers[id];
  }

  // ---------- DOM helpers ----------

  // Element builder. String children are author-supplied HTML from the data
  // file; user input must be wrapped with text() so it is never parsed as HTML.
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      if (k === 'class') el.className = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    [].concat(children == null ? [] : children).forEach(function (c) {
      if (c == null || c === false) return;
      if (typeof c === 'string' || typeof c === 'number') el.insertAdjacentHTML('beforeend', String(c));
      else el.appendChild(c);
    });
    return el;
  }

  function text(s) { return document.createTextNode(s == null ? '' : String(s)); }
  function stripTags(s) { return String(s).replace(/<[^>]+>/g, ''); }

  // ---------- numbers, expressions, grading ----------

  function parseNumber(s) {
    var m = String(s == null ? '' : s).replace(',', '.').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
    return m ? parseFloat(m[0]) : NaN;
  }

  function parseRatio(s) {
    var m = String(s).replace(/,/g, '.').match(/([\d.]+)\s*[:\/]\s*([\d.]+)/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    return parseNumber(s);
  }

  function isBlank(v) { return v == null || String(v).trim() === ''; }

  function fmt(x, digits) {
    var d = digits == null ? 2 : digits;
    return Number(x.toFixed(d)).toLocaleString(undefined, { maximumFractionDigits: d });
  }

  // Value behind {key}: "meta.<id>", "col.<row id>" (grid scope) or a part id.
  function lookup(key, scope) {
    if (key.slice(0, 5) === 'meta.') return state.meta[key.slice(5)];
    if (key.slice(0, 4) === 'col.') return scope ? scope[key.slice(4)] : undefined;
    var r = refs[key];
    if (!r) return undefined;
    var v = answerFor(r.qid).parts[r.index];
    if (r.part.values && v != null) return r.part.values[v];
    return v;
  }

  // Evaluates an author expression such as "{v1} / 0.5" with current values.
  // Returns null if any referenced value is missing or the result is not finite.
  function evalExpr(expr, scope) {
    if (typeof expr === 'number') return expr;
    var missing = false;
    var js = String(expr).replace(/\{([\w.]+)\}/g, function (_, k) {
      var raw = lookup(k, scope);
      var v = typeof raw === 'number' ? raw : parseNumber(raw);
      if (raw == null || isNaN(v)) missing = true;
      return '(' + v + ')';
    });
    if (missing) return null;
    try {
      var r = Function('abs', 'sqrt', '"use strict"; return (' + js + ');')(Math.abs, Math.sqrt);
      return isFinite(r) ? r : null;
    } catch (e) { return null; }
  }

  function meetsTarget(x, t) {
    if (t.abs) x = Math.abs(x);
    if (t.lt != null) { var lt = evalExpr(t.lt); if (lt != null && !(x < lt)) return false; }
    if (t.gt != null) { var gt = evalExpr(t.gt); if (gt != null && !(x > gt)) return false; }
    return true;
  }

  // true / false for graded parts, null when there is nothing to grade.
  function gradePart(p, v) {
    if (!isGraded(p) || isBlank(v)) return null;
    if (p.kind === 'choice') return String(v) === String(p.answer);
    if (p.kind === 'numeric') {
      var x = parseNumber(v);
      var tol = p.tolerance != null ? p.tolerance : Math.abs(p.answer) * 0.02;
      return !isNaN(x) && Math.abs(x - p.answer) <= tol + 1e-9;
    }
    var r = parseRatio(v), target = parseRatio(p.answer);
    var rel = p.tolerance != null ? p.tolerance : 0.03;
    return !isNaN(r) && Math.abs(r - target) <= Math.abs(target) * rel;
  }

  function isGraded(p) {
    return (p.kind === 'choice' && p.answer != null) || p.kind === 'numeric' || p.kind === 'ratio';
  }

  function expected(p) {
    return stripTags(p.display || (String(p.answer) + (p.unit ? ' ' + p.unit : '')));
  }

  // Questions with grading or a model answer are submitted; the rest are records.
  function isSubmittable(q) {
    return !q.task && (!!q.explanation || (q.parts || []).some(isGraded));
  }

  function logComplete(p, rows) {
    return (rows || []).some(function (row) {
      return p.columns.every(function (c, ci) { return !isBlank(row[ci]); });
    });
  }

  function gridComplete(p, data) {
    return p.rows.every(function (row) {
      if (row.type !== 'input') return true;
      return p.columns.every(function (col, c) {
        return (row.na || []).indexOf(c) >= 0 || !isBlank(((data || {})[row.id] || [])[c]);
      });
    });
  }

  function isComplete(rec) {
    var q = rec.q, st = answerFor(q.id);
    if (q.task) return !!st.done;
    if (isSubmittable(q)) return !!st.submitted;
    var partsDone = (q.parts || []).every(function (p, i) {
      if (p.kind === 'log') return logComplete(p, st.parts[i]);
      if (p.kind === 'grid') return gridComplete(p, st.parts[i]);
      return !isBlank(st.parts[i]);
    });
    return partsDone && (!q.text || !isBlank(st.text));
  }

  // ---------- rendering ----------

  function render() {
    root.innerHTML = '';
    questions = [];
    refs = {};
    ws.sections.forEach(function (sec) {
      sec.blocks.forEach(function (b) {
        if (b.type !== 'question') return;
        (b.parts || []).forEach(function (p, i) { if (p.id) refs[p.id] = { qid: b.id, index: i, part: p }; });
      });
    });

    root.appendChild(renderHeader());
    if (ws.toc) root.appendChild(renderToc());
    ws.sections.forEach(function (sec) {
      root.appendChild(h('h2', { class: 'ws-section', id: sectionId(sec) }, sec.heading));
      sec.blocks.forEach(function (b) { root.appendChild(renderBlock(b)); });
    });
    root.appendChild(renderFooter());
    questions.forEach(function (rec) { if (isSubmittable(rec.q) && answerFor(rec.q.id).submitted) showResult(rec); });
    refresh();
  }

  function sectionId(sec) {
    return sec.anchor || String(sec.heading).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function renderToc() {
    return h('nav', { class: 'ws-toc', 'aria-label': 'Worksheet sections' }, ws.sections.map(function (sec) {
      return h('a', { href: '#' + sectionId(sec) }, sec.heading);
    }));
  }

  function renderHeader() {
    var fields = META.map(function (m) {
      var input = h('input', {
        type: 'text', class: 'ws-input', id: 'ws-meta-' + m.id,
        inputmode: m.numeric ? 'decimal' : null,
        placeholder: m.placeholder || null,
        oninput: function (e) { state.meta[m.id] = e.target.value; saveState(); refresh(); }
      });
      input.value = state.meta[m.id] || '';
      return h('div', { class: 'ws-meta-field' }, [
        h('label', { for: 'ws-meta-' + m.id, class: 'ws-label' }, m.label),
        h('span', { class: 'ws-numeric ws-meta-input' }, [input, m.unit ? h('span', { class: 'ws-unit' }, m.unit) : null])
      ]);
    });
    return h('div', { class: 'ws-header' }, [
      h('div', { class: 'ws-meta' }, fields),
      h('p', { class: 'ws-hint' }, ws.hint ||
        'Your answers are saved in this browser only – nothing is sent anywhere. Use <b>Download report</b> at the bottom of the page to keep a copy.')
    ]);
  }

  function renderBlock(b) {
    if (b.type === 'params') return renderParams(b);
    if (b.type === 'step') return h('p', { class: 'ws-step' }, b.text);
    if (b.type === 'note') return h('p', { class: 'ws-note' }, b.text);
    if (b.type === 'image') return renderImage(b);
    if (b.type === 'question') return renderQuestion(b);
    return h('div');
  }

  function renderImage(b) {
    return h('figure', { class: 'ws-figure' }, [
      h('img', { src: BASE + '/' + b.src, alt: b.alt || '', style: b.width ? 'width:' + b.width + 'px' : null }),
      b.caption ? h('figcaption', {}, b.caption) : null
    ]);
  }

  function paramsTable(b) {
    var rows = [];
    b.groups.forEach(function (g) {
      var style = 'ws-' + (g.style || 'i1');
      rows.push(h('tr', { class: 'ws-ph ' + style }, h('th', { colspan: 2 }, g.name)));
      g.rows.forEach(function (r) {
        rows.push(h('tr', { class: 'ws-pr ' + style }, [h('td', {}, r[0]), h('td', {}, String(r[1]))]));
      });
    });
    return h('table', { class: 'ws-params' }, h('tbody', {}, rows));
  }

  function renderParams(b) {
    return h('div', { class: 'ws-params-wrap' }, [
      b.title ? h('p', { class: 'ws-params-title' }, b.title) : null,
      paramsTable(b)
    ]);
  }

  // Yes/No style option pills. onPick(value) is called when one is chosen.
  function renderChoice(name, options, value, onPick, rec) {
    return h('div', { class: 'ws-choice', role: 'radiogroup' }, options.map(function (opt) {
      var input = h('input', { type: 'radio', name: name, value: opt, onchange: function () { onPick(opt); } });
      input.checked = value === opt;
      if (rec) rec.inputs.push(input);
      return h('label', { class: 'ws-pill' }, [input, h('span', {}, text(opt))]);
    }));
  }

  function renderTextInput(value, onInput, opts, rec) {
    var input = h('input', {
      type: 'text', class: 'ws-input ws-input-short',
      inputmode: opts.numeric ? 'decimal' : null,
      placeholder: opts.placeholder || null,
      'aria-label': opts.label || null,
      oninput: function (e) { onInput(e.target.value); }
    });
    input.value = value || '';
    if (rec) rec.inputs.push(input);
    return h('span', { class: 'ws-numeric' }, [input, opts.unit ? h('span', { class: 'ws-unit' }, opts.unit) : null]);
  }

  function renderQuestion(q) {
    var st = answerFor(q.id);
    var rec = { q: q, num: questions.length + 1, inputs: [], marks: [], live: [] };
    questions.push(rec);

    function changed() { saveState(); clearMessage(rec); refresh(); }
    var body = [];

    (q.parts || []).forEach(function (p, i) {
      if (p.kind === 'log') { body.push(renderLog(rec, p, i, changed)); return; }
      if (p.kind === 'grid') { body.push(renderGrid(rec, p, i, changed)); return; }
      if (st.parts[i] === undefined && p.default != null) st.parts[i] = String(p.default);

      var control;
      if (p.kind === 'choice') {
        control = renderChoice('ws-' + q.id + '-' + i, p.options, st.parts[i],
          function (v) { st.parts[i] = v; changed(); }, rec);
      } else {
        control = renderTextInput(st.parts[i], function (v) { st.parts[i] = v; changed(); }, {
          numeric: p.kind !== 'ratio',
          placeholder: p.kind === 'ratio' ? 'e.g. 1:2' : null,
          unit: p.unit,
          label: p.label || stripTags(q.prompt)
        }, rec);
      }
      var mark = h('span', { class: 'ws-mark', 'aria-live': 'polite' });
      rec.marks.push(mark);
      body.push(h('div', { class: 'ws-part' }, [
        p.label ? h('span', { class: 'ws-part-label' }, p.label) : null, control, mark
      ]));
      if (p.info_text) body.push(h('p', { class: 'ws-part-hint' }, p.info_text));

      var live = h('div', { class: 'ws-live', 'aria-live': 'polite' });
      body.push(live);
      rec.live.push(function () { renderLive(live, p, st.parts[i]); });
    });

    if (q.text) {
      var area = h('textarea', {
        class: 'ws-input ws-textarea', rows: 3,
        oninput: function (e) { st.text = e.target.value; changed(); }
      });
      area.value = st.text || '';
      rec.inputs.push(area);
      body.push(h('label', { class: 'ws-text' }, [h('span', { class: 'ws-text-label' }, q.text), area]));
    }

    if (q.task) {
      var box = h('input', {
        type: 'checkbox',
        onchange: function (e) {
          st.done = e.target.checked;
          saveState();
          if (st.done && q.explanation) showResult(rec); else hideResult(rec);
          refresh();
        }
      });
      box.checked = !!st.done;
      body.push(h('label', { class: 'ws-task' }, [box, h('span', {}, q.task)]));
    }

    rec.msg = h('p', { class: 'ws-msg', 'aria-live': 'polite' });
    rec.feedback = h('div', { class: 'ws-feedback', hidden: true });

    if (isSubmittable(q)) {
      var graded = (q.parts || []).some(isGraded);
      rec.submitBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { submit(rec); } },
        graded ? 'Check answer' : 'Submit');
      rec.editBtn = h('button', { type: 'button', class: 'btn', hidden: true, onclick: function () { edit(rec); } },
        'Change my answer');
      body.push(h('div', { class: 'ws-actions' }, [rec.submitBtn, rec.editBtn, rec.msg]));
    }
    body.push(rec.feedback);

    rec.el = h('div', { class: 'ws-q' + (isSubmittable(q) ? '' : ' is-record'), id: 'ws-' + q.id }, [
      h('div', { class: 'ws-prompt' }, [h('span', { class: 'ws-num' }, 'Q' + rec.num), h('span', {}, q.prompt)])
    ].concat(body));
    if (q.task && st.done && q.explanation) showResult(rec);
    return rec.el;
  }

  // Live feedback under a part: derived values, calculation check, target, alerts.
  function liveItems(p, value) {
    var items = [];
    (p.info || []).forEach(function (inf) {
      var v = evalExpr(inf.expr);
      if (v != null) items.push({ cls: 'info', html: inf.label + ': <b>' + fmt(v, inf.digits) + (inf.unit ? ' ' + inf.unit : '') + '</b>' });
    });

    var mine = parseNumber(value);
    var subject = isNaN(mine) ? null : mine;
    (p.warnings || []).forEach(function (wn) {
      if (subject == null) return;
      var gt = wn.gt != null ? evalExpr(wn.gt) : null;
      var lt = wn.lt != null ? evalExpr(wn.lt) : null;
      if ((gt != null && subject > gt) || (lt != null && subject < lt)) items.push({ cls: 'danger', html: wn.message });
    });
    // Calculations only get feedback once the participant has entered their own result.
    if (p.kind === 'calc' && subject == null) return items;
    if (p.kind === 'calc' && p.expect != null) {
      var e = evalExpr(p.expect);
      if (e != null && subject != null) {
        var close = Math.abs(subject - e) <= Math.max(Math.abs(e) * (p.tolerance != null ? p.tolerance : 0.05), 1e-9);
        items.push(close
          ? { cls: 'ok', html: '✓ Matches ' + (p.expect_label || 'expected value') + ' = ' + fmt(e) + (p.unit ? ' ' + p.unit : '') }
          : { cls: 'warn', html: 'Check your calculation: ' + (p.expect_label || 'expected') + ' = ' + fmt(e) + (p.unit ? ' ' + p.unit : '') });
      }
      if (e != null) subject = e;
    }
    if (p.target && subject != null) {
      items.push(meetsTarget(subject, p.target)
        ? { cls: 'ok', html: '✓ Within target (' + p.target.label + ')' }
        : { cls: 'bad', html: '✗ Outside target (' + p.target.label + ')' });
    }
    if (p.alerts && value != null && p.alerts[value]) items.push({ cls: 'alert', html: p.alerts[value] });
    return items;
  }

  function renderLive(el, p, value) {
    el.innerHTML = '';
    liveItems(p, value).forEach(function (it) {
      el.appendChild(h('div', { class: 'ws-live-item is-' + it.cls }, it.html));
    });
  }

  // A table that grows one row at a time (e.g. a current step log).
  function renderLog(rec, p, i, changed) {
    var st = answerFor(rec.q.id);
    if (!Array.isArray(st.parts[i])) {
      st.parts[i] = (p.start || ['']).map(function (v) { return [v]; });
    }
    var rows = st.parts[i];
    var wrap = h('div', { class: 'ws-log' });
    var alertEl = h('div', { class: 'ws-live', 'aria-live': 'polite' });

    function draw() {
      wrap.innerHTML = '';
      var head = h('tr', {}, [h('th', {}, '#')].concat(p.columns.map(function (c) {
        return h('th', {}, c.label + (c.unit ? ' (' + c.unit + ')' : ''));
      })).concat([h('th', {}, '')]));

      var body = rows.map(function (row, ri) {
        var cells = p.columns.map(function (c, ci) {
          var control = c.kind === 'choice'
            ? renderChoice('ws-' + rec.q.id + '-' + i + '-' + ri, c.options, row[ci], function (v) { row[ci] = v; changed(); drawAlerts(); markRows(); })
            : renderTextInput(row[ci], function (v) { row[ci] = v; changed(); }, { numeric: true, label: c.label + ' step ' + (ri + 1) });
          return h('td', {}, control);
        });
        var remove = rows.length > 1
          ? h('button', { type: 'button', class: 'ws-icon-btn', 'aria-label': 'Remove step ' + (ri + 1),
              onclick: function () { rows.splice(ri, 1); changed(); draw(); } }, '×')
          : null;
        return h('tr', { 'data-row': ri }, [h('td', { class: 'ws-log-n' }, String(ri + 1))].concat(cells).concat([h('td', {}, remove)]));
      });

      addBtn = h('button', {
        type: 'button', class: 'btn',
        onclick: function () {
          var next = nextValue();
          if (next === false) return;
          rows.push([next == null ? '' : String(next)]);
          changed();
          draw();
        }
      }, p.add_label || 'Add row');
      addHint = h('span', { class: 'ws-hint-inline' });

      wrap.appendChild(h('div', { class: 'ws-log-scroll' }, h('table', { class: 'ws-log-table' }, [h('thead', {}, head), h('tbody', {}, body)])));
      wrap.appendChild(h('div', { class: 'ws-log-actions' }, [addBtn, addHint]));
      wrap.appendChild(alertEl);
      drawAlerts();
      markRows();
      updateAdd();
    }

    // Next first-column value: last + step, capped at max. Returns false once
    // the cap has been reached, or null when it can't be worked out.
    function nextValue() {
      var last = parseNumber(rows.length ? rows[rows.length - 1][0] : NaN);
      var step = p.step != null ? evalExpr(p.step) : null;
      var max = p.max != null ? evalExpr(p.max) : null;
      if (isNaN(last) || step == null) return null;
      if (max != null && last >= max - 1e-9) return false;
      var next = last + step;
      if (max != null && next > max) next = max;
      return Number(next.toFixed(3));
    }

    function updateAdd() {
      var next = nextValue();
      addBtn.disabled = next === false;
      addHint.textContent = next === false
        ? (p.max_reached || 'Maximum reached.')
        : (p.max != null && evalExpr(p.max) == null && p.max_missing ? p.max_missing : '');
    }

    var addBtn, addHint;
    rec.live.push(function () { if (addBtn) updateAdd(); });

    function alertColumn() {
      for (var ci = 0; ci < p.columns.length; ci++) if (p.columns[ci].alerts) return ci;
      return -1;
    }

    function markRows() {
      var ci = alertColumn();
      [].forEach.call(wrap.querySelectorAll('tbody tr'), function (tr) {
        var row = rows[+tr.getAttribute('data-row')];
        tr.classList.toggle('is-alert', ci >= 0 && row && !!p.columns[ci].alerts[row[ci]]);
      });
    }

    function drawAlerts() {
      alertEl.innerHTML = '';
      var ci = alertColumn();
      if (ci < 0 || !rows.length) return;
      var lastVal = rows[rows.length - 1][ci];
      var msg = p.columns[ci].alerts[lastVal];
      if (msg) alertEl.appendChild(h('div', { class: 'ws-live-item is-alert' }, msg));
    }

    draw();
    return wrap;
  }

  // ---------- measurement grids ----------

  function perColumn(v, c) { return Array.isArray(v) ? v[c] : v; }

  // Works each grid column out top to bottom; returns one { rowId: number|null } per column.
  function gridScopes(p, data) {
    return p.columns.map(function (col, c) {
      var scope = {};
      p.rows.forEach(function (row) {
        if (!row.id || (row.na || []).indexOf(c) >= 0) return;
        var v = null;
        if (row.type === 'calc') v = evalExpr(row.expr, scope);
        else if (row.type === 'fixed') v = evalExpr(perColumn(row.values, c), scope);
        else if (row.type === 'input') {
          var n = parseNumber(((data || {})[row.id] || [])[c]);
          v = isNaN(n) ? null : n;
        }
        scope[row.id] = v;
      });
      return scope;
    });
  }

  function gridRowLabel(row) {
    var t = row.target && !Array.isArray(row.target) ? row.target.label : null;
    return [h('span', {}, row.label), t ? h('span', { class: 'ws-grid-sub' }, t) : null];
  }

  // Text and status for a fixed/calc cell: { text, cls } (cls: ok | bad | '').
  function gridCell(row, value, c) {
    if (value == null) return { text: '—', cls: '' };
    var out = { text: fmt(value, row.digits), cls: '' };
    var t = row.target ? perColumn(row.target, c) : null;
    if (row.type === 'calc' && t) out.cls = meetsTarget(value, t) ? 'ok' : 'bad';
    return out;
  }

  function renderGrid(rec, p, i, changed) {
    var st = answerFor(rec.q.id);
    if (!st.parts[i] || typeof st.parts[i] !== 'object') st.parts[i] = {};
    var data = st.parts[i];
    var outputs = [];   // { row, c, el }

    var head = h('tr', {}, [h('th', { class: 'ws-grid-corner' }, '')].concat(p.columns.map(function (col) {
      return h('th', { class: 'ws-col-' + (col.style || 'i1') }, col.label);
    })));

    var body = p.rows.map(function (row) {
      if (row.type === 'heading') {
        return h('tr', { class: 'ws-grid-h' }, h('th', { colspan: p.columns.length + 1 }, row.label));
      }
      var cells = p.columns.map(function (col, c) {
        if ((row.na || []).indexOf(c) >= 0) return h('td', { class: 'ws-grid-na' }, '—');
        if (row.type === 'input') {
          var vals = data[row.id] = data[row.id] || [];
          if (vals[c] == null && row.default != null) vals[c] = String(perColumn(row.default, c));
          return h('td', {}, renderTextInput(vals[c], function (v) { vals[c] = v; changed(); },
            { numeric: true, label: stripTags(row.label) + ' – ' + stripTags(col.label) }, rec));
        }
        var td = h('td', { class: 'ws-grid-out' });
        if (row.type === 'calc' && Array.isArray(row.target)) td.setAttribute('data-target', row.target[c].label);
        outputs.push({ row: row, c: c, el: td });
        return td;
      });
      return h('tr', { class: 'ws-grid-' + row.type }, [h('th', { scope: 'row' }, gridRowLabel(row))].concat(cells));
    });

    rec.live.push(function () {
      var scopes = gridScopes(p, data);
      outputs.forEach(function (o) {
        var cell = gridCell(o.row, scopes[o.c][o.row.id], o.c);
        o.el.className = 'ws-grid-out' + (cell.cls ? ' is-' + cell.cls : '');
        o.el.innerHTML = '';
        o.el.appendChild(h('span', { class: 'ws-grid-val' }, [
          cell.cls === 'ok' ? '✓ ' : cell.cls === 'bad' ? '✗ ' : '', text(cell.text)
        ]));
        var tl = o.el.getAttribute('data-target');
        if (tl) o.el.appendChild(h('span', { class: 'ws-grid-sub' }, tl));
      });
    });

    return h('div', { class: 'ws-grid-scroll' },
      h('table', { class: 'ws-grid' }, [h('thead', {}, head), h('tbody', {}, body)]));
  }

  function reportGrid(p, data) {
    var scopes = gridScopes(p, data);
    var head = h('tr', {}, [h('th', {}, '')].concat(p.columns.map(function (col) {
      return h('th', { class: 'ws-col-' + (col.style || 'i1') }, col.label);
    })));
    var body = p.rows.map(function (row) {
      if (row.type === 'heading') return h('tr', { class: 'ws-grid-h' }, h('th', { colspan: p.columns.length + 1 }, row.label));
      return h('tr', {}, [h('th', {}, gridRowLabel(row))].concat(p.columns.map(function (col, c) {
        if ((row.na || []).indexOf(c) >= 0) return h('td', {}, '—');
        if (row.type === 'input') {
          var v = ((data || {})[row.id] || [])[c];
          return h('td', {}, text(isBlank(v) ? '—' : v));
        }
        var cell = gridCell(row, scopes[c][row.id], c);
        var t = row.type === 'calc' && Array.isArray(row.target) ? row.target[c].label : null;
        return h('td', { class: cell.cls ? 'ws-r-' + cell.cls : null }, [
          cell.cls === 'ok' ? '✓ ' : cell.cls === 'bad' ? '✗ ' : '', text(cell.text),
          t ? h('span', { class: 'ws-grid-sub' }, t) : null
        ]);
      })));
    });
    return h('table', { class: 'ws-r-grid' }, [h('thead', {}, head), h('tbody', {}, body)]);
  }

  function renderFooter() {
    progressEl = h('span', { class: 'ws-progress' });
    return h('div', { class: 'ws-footer' }, [
      progressEl,
      h('span', { class: 'ws-footer-actions' }, [
        h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { window.print(); } },
          ws.download_label || 'Download report (PDF)'),
        h('button', { type: 'button', class: 'btn', onclick: reset }, 'Reset')
      ])
    ]);
  }

  // ---------- interaction ----------

  function clearMessage(rec) { if (rec.msg) rec.msg.textContent = ''; }

  function refresh() {
    questions.forEach(function (rec) { rec.live.forEach(function (fn) { fn(); }); });
    updateProgress();
  }

  function submit(rec) {
    var st = answerFor(rec.q.id);
    var missing = (rec.q.parts || []).some(function (p, i) { return isBlank(st.parts[i]); }) ||
      (rec.q.text && isBlank(st.text));
    if (missing) {
      rec.msg.textContent = 'Please answer every part before submitting.';
      return;
    }
    st.submitted = true;
    saveState();
    showResult(rec);
    updateProgress();
  }

  function edit(rec) {
    answerFor(rec.q.id).submitted = false;
    saveState();
    hideResult(rec);
    updateProgress();
  }

  function showResult(rec) {
    var st = answerFor(rec.q.id);
    var results = [];
    if (!rec.q.task) {
      (rec.q.parts || []).forEach(function (p, i) {
        var ok = gradePart(p, st.parts[i]);
        results.push(ok);
        var mark = rec.marks[i];
        mark.className = 'ws-mark';
        mark.textContent = '';
        if (ok === true) { mark.classList.add('is-correct'); mark.textContent = '✓ Correct'; }
        else if (ok === false) { mark.classList.add('is-incorrect'); mark.textContent = '✗ Expected: ' + expected(p); }
      });
      rec.inputs.forEach(function (inp) { inp.disabled = true; });
    }

    var graded = results.filter(function (r) { return r !== null; });
    var nRight = graded.filter(Boolean).length;
    rec.el.classList.remove('is-correct', 'is-incorrect', 'is-partial', 'is-info');
    rec.el.classList.add('is-submitted',
      !graded.length ? 'is-info' : nRight === graded.length ? 'is-correct' : nRight === 0 ? 'is-incorrect' : 'is-partial');

    if (rec.submitBtn) rec.submitBtn.hidden = true;
    if (rec.editBtn) rec.editBtn.hidden = false;

    rec.feedback.innerHTML = '';
    if (rec.q.explanation) {
      rec.feedback.appendChild(h('div', { class: 'ws-model' }, [
        h('span', { class: 'ws-model-label' }, rec.q.task ? 'Expected settings' : 'Answer'),
        h('div', {}, rec.q.explanation)
      ]));
    }
    rec.feedback.hidden = false;
  }

  function hideResult(rec) {
    rec.el.classList.remove('is-submitted', 'is-correct', 'is-incorrect', 'is-partial', 'is-info');
    rec.marks.forEach(function (m) { m.className = 'ws-mark'; m.textContent = ''; });
    rec.inputs.forEach(function (inp) { inp.disabled = false; });
    if (rec.submitBtn) rec.submitBtn.hidden = false;
    if (rec.editBtn) rec.editBtn.hidden = true;
    rec.feedback.hidden = true;
  }

  function score() {
    var s = { answered: 0, total: 0, correct: 0, graded: 0 };
    questions.forEach(function (rec) {
      var st = answerFor(rec.q.id);
      if (!rec.q.optional) {
        s.total++;
        if (isComplete(rec)) s.answered++;
      }
      (rec.q.parts || []).forEach(function (p, i) {
        if (!isGraded(p)) return;
        s.graded++;
        if (st.submitted && gradePart(p, st.parts[i]) === true) s.correct++;
      });
    });
    return s;
  }

  function updateProgress() {
    if (!progressEl) return;
    var s = score();
    progressEl.textContent = (ws.completed_label || 'Answered') + ' ' + s.answered + ' / ' + s.total +
      (s.graded ? ' · Correct ' + s.correct + ' / ' + s.graded : '');
    questions.forEach(function (rec) {
      if (!isSubmittable(rec.q)) rec.el.classList.toggle('is-complete', isComplete(rec));
    });
  }

  function reset() {
    if (!window.confirm('Clear everything you have entered on this worksheet? This cannot be undone.')) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    state = { meta: {}, answers: {} };
    render();
    window.scrollTo(0, 0);
  }

  // ---------- printable report ----------

  function formatDate(d) {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function withUnit(v, unit) {
    if (isBlank(v)) return '—';
    return unit && !/[a-zΩ%]/i.test(v) ? v + ' ' + unit : String(v);
  }

  function buildReport() {
    var s = score();
    var now = new Date();
    var metaRows = META.map(function (m) {
      return h('tr', {}, [h('th', {}, m.label), h('td', {}, text(withUnit(state.meta[m.id], m.unit)))]);
    });
    metaRows.push(h('tr', {}, [h('th', {}, 'Date'), h('td', {}, text(formatDate(now)))]));
    metaRows.push(h('tr', {}, [h('th', {}, ws.completed_label || 'Questions answered'), h('td', {}, s.answered + ' / ' + s.total)]));
    if (s.graded) metaRows.push(h('tr', {}, [h('th', {}, 'Correct answers'), h('td', {}, s.correct + ' / ' + s.graded)]));

    var report = h('div', { id: 'ws-report' }, [
      h('h1', {}, ws.report_title || ws.title),
      h('table', { class: 'ws-r-meta' }, h('tbody', {}, metaRows))
    ]);

    var qi = 0;
    ws.sections.forEach(function (sec) {
      report.appendChild(h('h2', {}, sec.heading));
      sec.blocks.forEach(function (b) {
        if (b.type === 'params') report.appendChild(paramsTable(b));
        else if (b.type === 'step') report.appendChild(h('p', { class: 'ws-r-step' }, b.text));
        else if (b.type === 'question') report.appendChild(reportQuestion(questions[qi++]));
      });
    });

    report.appendChild(h('p', { class: 'ws-r-foot' },
      text('Generated from ' + location.hostname + location.pathname + ' on ' + formatDate(now) + '.')));
    return report;
  }

  function reportLine(key, valueNodes) {
    return h('div', { class: 'ws-r-line' }, [h('span', { class: 'ws-r-key' }, key)].concat(valueNodes));
  }

  function reportLog(p, rows) {
    var head = h('tr', {}, [h('th', {}, '#')].concat(p.columns.map(function (c) {
      return h('th', {}, c.label + (c.unit ? ' (' + c.unit + ')' : ''));
    })));
    var body = (rows || []).map(function (row, ri) {
      return h('tr', {}, [h('td', {}, String(ri + 1))].concat(p.columns.map(function (c, ci) {
        return h('td', {}, text(isBlank(row[ci]) ? '—' : row[ci]));
      })));
    });
    return h('table', { class: 'ws-r-log' }, [h('thead', {}, head), h('tbody', {}, body)]);
  }

  function reportQuestion(rec) {
    var q = rec.q, st = answerFor(q.id);
    var submittable = isSubmittable(q);
    var items = [];

    (q.parts || []).forEach(function (p, i) {
      var v = st.parts[i];
      if (p.kind === 'log') { items.push(reportLog(p, v)); return; }
      if (p.kind === 'grid') { items.push(reportGrid(p, v)); return; }
      var ok = submittable && st.submitted ? gradePart(p, v) : null;
      var nodes = [h('span', {}, [text(withUnit(v, p.kind === 'ratio' ? null : p.unit))])];
      if (ok === true) nodes.push(h('span', { class: 'ws-r-ok' }, '✓ Correct'));
      if (ok === false) nodes.push(h('span', { class: 'ws-r-bad' }, text('✗ Expected: ' + expected(p))));
      liveItems(p, v).forEach(function (it) {
        if (it.cls !== 'alert') nodes.push(h('span', { class: 'ws-r-' + it.cls }, it.html));
      });
      items.push(reportLine(p.label || (submittable ? 'Your answer' : 'Recorded'), nodes));
    });

    if (q.text) items.push(reportLine(q.text, [h('span', { class: 'ws-r-free' }, text(isBlank(st.text) ? '—' : st.text))]));
    if (q.task) items.push(reportLine('Status', [h('span', {}, st.done ? 'Done' : 'Not done')]));

    if (q.explanation && (st.submitted || (q.task && st.done))) {
      items.push(h('div', { class: 'ws-r-model' }, [
        h('span', { class: 'ws-r-key' }, q.task ? 'Expected settings' : 'Answer'), h('div', {}, q.explanation)
      ]));
    } else if (submittable && !st.submitted) {
      items.push(h('p', { class: 'ws-r-pending' }, 'Not submitted.'));
    }

    return h('div', { class: 'ws-r-q' }, [
      h('p', { class: 'ws-r-prompt' }, [h('b', {}, 'Q' + rec.num + '. '), h('span', {}, q.prompt)])
    ].concat(items));
  }

  // Build the report for any print (button or Ctrl+P) and name the PDF sensibly.
  var savedTitle = null;
  window.addEventListener('beforeprint', function () {
    var old = document.getElementById('ws-report');
    if (old) old.remove();
    document.body.appendChild(buildReport());
    savedTitle = document.title;
    var who = String(state.meta[ws.report_name_field || 'name'] || '').trim()
      .replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_');
    document.title = [ws.title.replace(/\s+/g, '_'), 'Report', who, new Date().toISOString().slice(0, 10)]
      .filter(Boolean).join('_');
  });
  window.addEventListener('afterprint', function () {
    var old = document.getElementById('ws-report');
    if (old) old.remove();
    if (savedTitle !== null) document.title = savedTitle;
  });

  render();

  // Sections are built by script, so jump to a #section link once they exist,
  // and again after images have loaded and shifted the layout.
  function jumpToHash() {
    if (!location.hash) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    // 'instant' overrides the theme's smooth scrolling, so the second jump isn't cut short.
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  jumpToHash();
  window.addEventListener('load', jumpToHash);
})();
