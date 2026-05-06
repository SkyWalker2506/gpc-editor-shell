/* ===========================================================
 * Editor Shell — shared topbar + keyboard shortcuts
 * window.EditorShell.mount({ title, subtitle, page, actions })
 *
 * page: 'level' | 'courses' | 'ui' | 'assets' | 'library'
 * actions: { onSave, onPlay, onPublish, onExport, onImport,
 *            onReset, onUndo, onRedo }
 *
 * Existing per-editor button IDs (#btn-save, #btn-play-game,
 * #btn-publish, #btn-export, #btn-import, #btn-reset, #btn-undo,
 * #btn-redo) are auto-detected and clicked through when no
 * explicit callback is supplied — keeps legacy handlers wired.
 * ========================================================= */
(function () {
  'use strict';

  var DEFAULT_TABS = [
    { page: 'level',    label: 'Level',    icon: '🌱', href: './editor.html' },
    { page: 'courses',  label: 'Courses',  icon: '🌍', href: './course-editor.html' },
    { page: 'ui',       label: 'UI',       icon: '🔘', href: './ui-editor.html' },
    // 'assets' tab removed: asset-editor.html is now a redirect shim into the
    // Level Editor's "Asset Properties" panel (commits 80a13f3, 969f732).
    { page: 'library',  label: 'Library',  icon: '🎨', href: './assets-library.html' }
  ];

  // Action key → (label, legacy fallback button id, classes)
  var ACTION_DEFS = [
    { key: 'onUndo',    label: '↶ Undo',     legacy: 'btn-undo',         klass: 'es-btn es-icon' },
    { key: 'onRedo',    label: '↷ Redo',     legacy: 'btn-redo',         klass: 'es-btn es-icon' },
    { key: 'onImport',  label: 'Import',     legacy: 'btn-import',       klass: 'es-btn' },
    { key: 'onExport',  label: 'Export',     legacy: 'btn-export',       klass: 'es-btn' },
    { key: 'onReset',   label: 'Reset',      legacy: 'btn-reset',        klass: 'es-btn es-danger' },
    { key: 'onSave',    label: '💾 Save',    legacy: 'btn-save',         klass: 'es-btn es-success' },
    { key: 'onPublish', label: '▶ Publish',  legacy: 'btn-publish',      klass: 'es-btn es-primary' },
    { key: 'onPlay',    label: '▶ Play',     legacy: 'btn-play-game',    klass: 'es-btn es-primary' },
    { key: 'onPlayLive',label: '🎮 Live',    legacy: null,               klass: 'es-btn es-success', title: 'Open game with live edit sync (changes apply instantly)' }
  ];

  var state = {
    mounted: false,
    page: null,
    actions: {},
    dirty: false,
    extraShortcuts: [],
    helpOn: false,
    rootEl: null,
    dirtyEl: null,
    subtitleEl: null
  };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'style') n.style.cssText = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (children) for (var i = 0; i < children.length; i++) {
      if (children[i]) n.appendChild(children[i]);
    }
    return n;
  }

  /** Try the user-supplied callback first; fall back to clicking the legacy
   *  button (so existing handlers in editor.html etc. keep working). */
  function fireAction(actionKey, legacyId, ev) {
    var cb = state.actions[actionKey];
    if (typeof cb === 'function') {
      try { cb(ev); } catch (e) { console.error('[EditorShell]', actionKey, e); }
      return true;
    }
    if (legacyId) {
      var btn = document.getElementById(legacyId);
      if (btn && !btn.disabled) { btn.click(); return true; }
    }
    return false;
  }

  function buildTopbar(opts) {
    // `brand` may be a string (legacy: subtitle text) or an object
    // { logo, name, accent }. Object form takes precedence; loose props
    // (`opts.logo`) still work for backward compatibility.
    var brandObj = (opts.brand && typeof opts.brand === 'object') ? opts.brand : {};
    var brandText = (typeof opts.brand === 'string') ? opts.brand : (brandObj.name || 'Golf · Paper Craft');
    var logoText  = brandObj.logo || opts.logo || '⛳';
    if (brandObj.accent) {
      try { document.documentElement.style.setProperty('--es-accent', brandObj.accent); } catch (_) {}
    }
    var brand = el('div', { class: 'es-brand' }, [
      el('span', { class: 'es-logo', text: logoText }),
      el('div', { class: 'es-titles' }, [
        el('div', { class: 'es-title', text: opts.title || 'Editor' }),
        el('div', { class: 'es-subtitle', text: brandText })
      ])
    ]);

    var tabs = el('nav', { class: 'es-tabs', 'aria-label': 'Editor pages' });
    var TABS = (opts.tabs && opts.tabs.length) ? opts.tabs : DEFAULT_TABS;
    TABS.forEach(function (t) {
      var a = el('a', {
        class: 'es-tab' + (t.page === opts.page ? ' is-current' : ''),
        href: t.href,
        'data-page': t.page,
        'aria-current': (t.page === opts.page ? 'page' : 'false')
      });
      a.appendChild(el('span', { text: t.icon }));
      a.appendChild(el('span', { text: t.label }));
      tabs.appendChild(a);
    });

    var dirty = el('span', { class: 'es-dirty', id: 'es-dirty', title: 'Unsaved changes' }, [
      el('span', { class: 'es-dot' }),
      el('span', { text: 'Unsaved' })
    ]);
    state.dirtyEl = dirty;

    var actionsWrap = el('div', { class: 'es-actions' });
    ACTION_DEFS.forEach(function (def) {
      var hasCb = typeof opts.actions[def.key] === 'function';
      var hasLegacy = !!document.getElementById(def.legacy);
      if (!hasCb && !hasLegacy) return;
      // Render a *shell-side* button. Existing per-editor JS keeps wiring its
      // own #btn-save / #btn-play-game / ... directly — those legacy nodes
      // stay in DOM (visually hidden via .es-legacy-hidden) so their handlers
      // still attach. We forward clicks through to them when no explicit
      // callback is supplied.
      var legacyId = def.legacy;
      var battrs = { class: def.klass, type: 'button', 'data-shell-action': def.key };
      if (def.title) battrs.title = def.title;
      var b = el('button', battrs);
      b.textContent = def.label;
      b.addEventListener('click', function (ev) {
        if (typeof state.actions[def.key] === 'function') {
          fireAction(def.key, null, ev);
        } else {
          var orig = document.getElementById(legacyId);
          if (orig && orig !== b && !orig.disabled) orig.click();
        }
      });
      actionsWrap.appendChild(b);
    });

    var help = el('button', {
      class: 'es-btn es-icon', type: 'button', title: 'Keyboard shortcuts (?)'
    });
    help.textContent = '?';
    help.addEventListener('click', function () { toggleHelp(); });
    actionsWrap.appendChild(help);

    var bar = el('div', { class: 'es-topbar' }, [
      brand,
      tabs,
      dirty,
      el('div', { class: 'es-grow' }),
      actionsWrap
    ]);

    var subtitleRow = el('div', {
      class: 'es-subtitle-row' + (opts.subtitle ? ' is-on' : ''),
      id: 'es-subtitle-row'
    });
    if (opts.subtitle) subtitleRow.textContent = opts.subtitle;
    state.subtitleEl = subtitleRow;

    var frag = document.createDocumentFragment();
    frag.appendChild(bar);
    frag.appendChild(subtitleRow);
    return frag;
  }

  function ensureHelpOverlay() {
    var ov = document.getElementById('es-help-overlay');
    if (ov) return ov;
    ov = el('div', { class: 'es-help-overlay', id: 'es-help-overlay' });
    var card = el('div', { class: 'es-help-card' });
    card.innerHTML =
      '<h3>Keyboard Shortcuts</h3>' +
      '<div class="es-row"><span>Save</span><kbd>Ctrl/⌘ + S</kbd></div>' +
      '<div class="es-row"><span>Play / Preview</span><kbd>Ctrl/⌘ + P</kbd></div>' +
      '<div class="es-row"><span>Undo</span><kbd>Ctrl/⌘ + Z</kbd></div>' +
      '<div class="es-row"><span>Redo</span><kbd>Ctrl/⌘ + Shift + Z</kbd></div>' +
      '<div class="es-row"><span>Toggle this help</span><kbd>?</kbd></div>' +
      '<div class="es-row"><span>Close / cancel</span><kbd>Esc</kbd></div>' +
      '<div class="es-help-hint">Press <kbd>?</kbd> or click ? to dismiss</div>';
    ov.appendChild(card);
    ov.addEventListener('click', function (e) {
      if (e.target === ov) toggleHelp(false);
    });
    document.body.appendChild(ov);
    return ov;
  }

  function toggleHelp(force) {
    var ov = ensureHelpOverlay();
    var on = (force === true || force === false) ? force : !state.helpOn;
    state.helpOn = on;
    ov.classList.toggle('is-on', on);
  }

  function isTypingTarget(t) {
    if (!t) return false;
    var tag = (t.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (t.isContentEditable) return true;
    return false;
  }

  function onKeydown(e) {
    var meta = e.ctrlKey || e.metaKey;

    // ? toggles help — respect typing fields
    if (e.key === '?' && !isTypingTarget(e.target)) {
      e.preventDefault();
      toggleHelp();
      return;
    }
    if (e.key === 'Escape') {
      if (state.helpOn) { toggleHelp(false); e.preventDefault(); }
      window.dispatchEvent(new CustomEvent('editor-shell:escape'));
      return;
    }

    if (meta && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      fireAction('onSave', 'btn-save', e);
      return;
    }
    if (meta && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      fireAction('onPlay', 'btn-play-game', e);
      return;
    }
    if (meta && (e.key === 'z' || e.key === 'Z')) {
      if (e.shiftKey) {
        if (fireAction('onRedo', 'btn-redo', e)) e.preventDefault();
      } else {
        if (fireAction('onUndo', 'btn-undo', e)) e.preventDefault();
      }
      return;
    }

    // Extra shortcuts registered via bindShortcut()
    for (var i = 0; i < state.extraShortcuts.length; i++) {
      var s = state.extraShortcuts[i];
      if (matchCombo(s.combo, e)) {
        e.preventDefault();
        try { s.fn(e); } catch (err) { console.error('[EditorShell]', s.combo, err); }
        return;
      }
    }
  }

  function matchCombo(combo, e) {
    // combo like "Cmd+Shift+K", "Ctrl+/", "Alt+1"
    var parts = combo.toLowerCase().split('+').map(function (s) { return s.trim(); });
    var key = parts.pop();
    var needCtrl = false, needShift = false, needAlt = false;
    parts.forEach(function (p) {
      if (p === 'cmd' || p === 'meta' || p === 'ctrl' || p === 'control') needCtrl = true;
      else if (p === 'shift') needShift = true;
      else if (p === 'alt' || p === 'option') needAlt = true;
    });
    var meta = e.ctrlKey || e.metaKey;
    if (needCtrl !== meta) return false;
    if (needShift !== e.shiftKey) return false;
    if (needAlt !== e.altKey) return false;
    return (e.key || '').toLowerCase() === key;
  }

  // ---------- Toast ----------
  function ensureToastHost() {
    var host = document.getElementById('es-toast-host');
    if (host) return host;
    host = el('div', { class: 'es-toast-host', id: 'es-toast-host' });
    document.body.appendChild(host);
    return host;
  }

  function showToast(msg, type, opts) {
    var host = ensureToastHost();
    var t = el('div', { class: 'es-toast es-toast-' + (type || 'info') });
    t.textContent = String(msg || '');
    host.appendChild(t);
    // force reflow so transition runs
    /* eslint-disable no-unused-expressions */ t.offsetHeight; /* eslint-enable */
    t.classList.add('is-on');
    var dur = (opts && opts.duration) || (type === 'error' ? 2600 : 1500);
    setTimeout(function () {
      t.classList.remove('is-on');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
    }, dur);
  }

  // ---------- beforeunload guard ----------
  // Only fire when we're on an actual editor page AND there are unsaved
  // changes. Previously the listener was global and could leak across SPAs
  // / cached sessions, prompting "Leave site?" on the game page itself.
  function _isEditorPage() {
    try {
      var p = String(location.pathname || '').toLowerCase();
      return /(ui-editor|course-editor|level-editor|asset-editor|editor)\.html$/.test(p);
    } catch (_) { return false; }
  }
  function onBeforeUnload(e) {
    if (!state.dirty) return;
    if (!_isEditorPage()) return;
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Leave anyway?';
    return e.returnValue;
  }

  // ---------- public API ----------
  var EditorShell = {
    mount: function (opts) {
      opts = opts || {};
      opts.actions = opts.actions || {};
      var host = document.getElementById('editor-shell-topbar');
      if (!host) {
        // No host element — graceful no-op so legacy pages aren't broken.
        console.warn('[EditorShell] #editor-shell-topbar not found; skipping mount.');
        return;
      }
      state.page = opts.page || null;
      state.actions = opts.actions;
      host.innerHTML = '';
      host.appendChild(buildTopbar(opts));
      state.rootEl = host;

      // Hide any legacy topbars/headers that the page still ships with so
      // the shell becomes the only visible chrome — their button DOM nodes
      // remain available for legacy handlers + click-passthrough.
      var legacyBars = document.querySelectorAll(
        '#topbar, header#topbar, .topbar, header.topbar'
      );
      legacyBars.forEach(function (n) {
        if (n === host || host.contains(n)) return;
        n.classList.add('es-legacy-hidden');
      });

      if (!state.mounted) {
        window.addEventListener('keydown', onKeydown);
        window.addEventListener('beforeunload', onBeforeUnload);
        state.mounted = true;
      }
      ensureHelpOverlay();
      ensureToastHost();
      return EditorShell;
    },
    markDirty: function () {
      state.dirty = true;
      if (state.dirtyEl) state.dirtyEl.classList.add('is-on');
    },
    markClean: function () {
      state.dirty = false;
      if (state.dirtyEl) state.dirtyEl.classList.remove('is-on');
    },
    toast: function (msg, type, opts) { showToast(msg, type, opts); },
    isDirty: function () { return !!state.dirty; },
    bindShortcut: function (combo, fn) {
      if (typeof combo !== 'string' || typeof fn !== 'function') return;
      state.extraShortcuts.push({ combo: combo, fn: fn });
    },
    setSubtitle: function (text) {
      if (!state.subtitleEl) return;
      state.subtitleEl.textContent = text || '';
      state.subtitleEl.classList.toggle('is-on', !!text);
    },
    toggleHelp: toggleHelp
  };

  window.EditorShell = EditorShell;
})();
