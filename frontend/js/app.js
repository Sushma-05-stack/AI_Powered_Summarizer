/* ============================================================
   SUMMAI — SHARED JAVASCRIPT UTILITIES
   ============================================================ */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://ai-powered-summarizer.onrender.com/api';

// ─── Auth Helpers ─────────────────────────────────────────────
const Auth = {
  getToken:  ()      => localStorage.getItem('summai_token'),
  getUser:   ()      => { try { return JSON.parse(localStorage.getItem('summai_user')); } catch { return null; } },
  setAuth:   (t, u)  => { localStorage.setItem('summai_token', t); localStorage.setItem('summai_user', JSON.stringify(u)); },
  clearAuth: ()      => { localStorage.removeItem('summai_token'); localStorage.removeItem('summai_user'); },
  isLoggedIn:()      => !!localStorage.getItem('summai_token'),
  requireAuth: ()    => { if (!Auth.isLoggedIn()) { window.location.href = '/login.html'; return false; } return true; },
  getApiKey: ()      => localStorage.getItem('summai_gemini_key') || '',
  setApiKey: (k)     => localStorage.setItem('summai_gemini_key', k),
};

// ─── API Client ───────────────────────────────────────────────
const Api = {
  async request(method, path, body = null, isFormData = false) {
    const headers = {};
    if (Auth.getToken()) headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
  get:    (path)         => Api.request('GET', path),
  post:   (path, body)   => Api.request('POST', path, body),
  put:    (path, body)   => Api.request('PUT', path, body),
  delete: (path)         => Api.request('DELETE', path),
  postForm:(path, fd)    => Api.request('POST', path, fd, true),

  // Auth
  login:    (email, pass)    => Api.post('/auth/login', { email, password: pass }),
  register: (name, email, p) => Api.post('/auth/register', { name, email, password: p }),
  getMe:    ()               => Api.get('/auth/me'),
  updateProfile: (data)      => Api.put('/auth/profile', data),

  // Summarize
  summarizeText:    (text, options) => Api.post('/summarize/text', { text, options }),
  summarizeURL:     (url, options)  => Api.post('/summarize/url',  { url,  options }),
  summarizeYoutube: (url, options)  => Api.post('/summarize/youtube', { url, options }),
  summarizePDF:     (fd)            => Api.postForm('/summarize/pdf', fd),
  summarizeFile:    (fd)            => Api.postForm('/summarize/file', fd),

  // History
  getHistory:     (params = {}) => Api.get(`/history?${new URLSearchParams(params)}`),
  getHistoryItem: (id)          => Api.get(`/history/${id}`),
  deleteHistory:  (id)          => Api.delete(`/history/${id}`),
  clearHistory:   ()            => Api.delete('/history'),

  // Analytics
  getAnalytics: () => Api.get('/analytics'),
  health:       () => Api.get('/health'),
};

// ─── Toast Notifications ──────────────────────────────────────
const Toast = {
  container: null,
  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    } else { this.container = document.getElementById('toast-container'); }
  },
  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success: (m, d) => Toast.show(m, 'success', d),
  error:   (m, d) => Toast.show(m, 'error', d),
  warning: (m, d) => Toast.show(m, 'warning', d),
  info:    (m, d) => Toast.show(m, 'info', d),
};

// ─── Loading State ────────────────────────────────────────────
const Loader = {
  overlay: null,
  show(message = 'Processing with AI...') {
    if (this.overlay) return;
    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';
    this.overlay.innerHTML = `
      <div class="spinner"></div>
      <div class="loading-text">${message}</div>
    `;
    document.body.appendChild(this.overlay);
  },
  hide() {
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
  },
  setMessage(msg) {
    const el = this.overlay?.querySelector('.loading-text');
    if (el) el.textContent = msg;
  }
};

// ─── Result Storage ───────────────────────────────────────────
const Results = {
  save:   (data) => sessionStorage.setItem('summai_result', JSON.stringify(data)),
  get:    ()     => { try { return JSON.parse(sessionStorage.getItem('summai_result')); } catch { return null; } },
  clear:  ()     => sessionStorage.removeItem('summai_result'),
};

// ─── Settings Storage ─────────────────────────────────────────
const Settings = {
  defaults: { defaultLength: 'medium', defaultFormat: 'paragraph', defaultTone: 'formal', language: 'English', theme: 'dark' },
  get:     ()      => { try { return { ...Settings.defaults, ...JSON.parse(localStorage.getItem('summai_settings') || '{}') }; } catch { return Settings.defaults; } },
  set:     (s)     => localStorage.setItem('summai_settings', JSON.stringify({ ...Settings.get(), ...s })),
  reset:   ()      => localStorage.removeItem('summai_settings'),
};

// ─── Format Helpers ───────────────────────────────────────────
const Format = {
  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`; return 'just now';
  },
  date(dateStr) { return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); },
  datetime(dateStr) { return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); },
  number(n) { if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return n.toString(); },
  typeIcon(type) { return { text: '📝', pdf: '📄', url: '🔗', youtube: '▶️', file: '📁' }[type] || '📋'; },
  typeLabel(type) { return { text: 'Text', pdf: 'PDF', url: 'Article', youtube: 'YouTube', file: 'File' }[type] || type; },
  sentimentEmoji(s) { return { positive: '😊', neutral: '😐', negative: '😔' }[s] || '😐'; },
};

// ─── DOM Helpers ──────────────────────────────────────────────
const DOM = {
  $:   (sel, ctx = document) => ctx.querySelector(sel),
  $$:  (sel, ctx = document) => [...ctx.querySelectorAll(sel)],
  show: (el) => { if (el) el.classList.remove('hidden'); },
  hide: (el) => { if (el) el.classList.add('hidden'); },
  toggle: (el, show) => { if (el) el.classList.toggle('hidden', !show); },
  on: (el, ev, fn) => { if (el) el.addEventListener(ev, fn); },
  val: (sel) => document.querySelector(sel)?.value?.trim() || '',
  setVal: (sel, v) => { const el = document.querySelector(sel); if (el) el.value = v; },
  setText: (sel, v) => { const el = document.querySelector(sel); if (el) el.textContent = v; },
  setHTML: (sel, v) => { const el = document.querySelector(sel); if (el) el.innerHTML = v; },
};

// ─── Copy to Clipboard ────────────────────────────────────────
async function copyToClipboard(text, btn = null) {
  try {
    await navigator.clipboard.writeText(text);
    Toast.success('Copied to clipboard!', 2000);
    if (btn) { const orig = btn.innerHTML; btn.innerHTML = '✅ Copied!'; btn.classList.add('copied'); setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000); }
  } catch { Toast.error('Could not copy. Please copy manually.'); }
}

// ─── Word/Char Counter ────────────────────────────────────────
function initCounter(textareaId, wordCountId, charCountId) {
  const ta = document.getElementById(textareaId);
  if (!ta) return;
  const update = () => {
    const text = ta.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    if (wordCountId) DOM.setText(`#${wordCountId}`, `${words} words`);
    if (charCountId) DOM.setText(`#${charCountId}`, `${text.length} chars`);
  };
  ta.addEventListener('input', update);
  update();
}

// ─── Sidebar Setup ────────────────────────────────────────────
function initSidebar(activePage = '') {
  const user = Auth.getUser();
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === activePage || a.getAttribute('data-page') === activePage);
  });

  if (user) {
    const nameEl = sidebar.querySelector('.user-name');
    const planEl = sidebar.querySelector('.user-plan');
    const imgEl  = sidebar.querySelector('.sidebar-user img');
    if (nameEl) nameEl.textContent = user.name || 'User';
    if (planEl) planEl.textContent = user.plan || 'free';
    if (imgEl)  imgEl.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=6c63ff&color=fff`;
  }

  const menuBtn = document.querySelector('.mobile-menu-btn');
  const overlay = document.querySelector('.sidebar-overlay');
  if (menuBtn) menuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay?.classList.toggle('show'); });
  if (overlay) overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
}

// ─── Particles Background ─────────────────────────────────────
function initParticles(containerId = 'particles') {
  const container = document.getElementById(containerId);
  if (!container) return;
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 200 + 50;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${Math.random()*20+10}s;animation-delay:${Math.random()*-20}s;opacity:${Math.random()*0.15};`;
    container.appendChild(p);
  }
}

// ─── Options Builder ──────────────────────────────────────────
function buildOptions() {
  const s = Settings.get();
  return {
    length:   document.getElementById('opt-length')?.value   || s.defaultLength,
    format:   document.getElementById('opt-format')?.value   || s.defaultFormat,
    tone:     document.getElementById('opt-tone')?.value     || s.defaultTone,
    language: document.getElementById('opt-language')?.value || s.language,
  };
}

// ─── Render Result ────────────────────────────────────────────
function renderResult(result, containerId = 'result-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const sentimentClass = result.sentiment || 'neutral';
  const sentimentEmoji = Format.sentimentEmoji(sentimentClass);

  container.innerHTML = `
    <div class="result-box fade-in">
      <div class="result-header">
        <div>
          <div class="result-title">${result.title || 'Summary'}</div>
          <div class="result-meta">
            <span class="badge badge-primary">📖 ${result.readingTime || '1 min read'}</span>
            <span class="badge badge-accent">📝 ${result.wordCount || 0} words</span>
            <span class="sentiment ${sentimentClass}">${sentimentEmoji} ${result.sentiment || 'neutral'}</span>
            ${result.language ? `<span class="badge badge-primary">🌐 ${result.language}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="copy-btn" onclick="copyToClipboard(\`${(result.summary || '').replace(/`/g, '\\`')}\`, this)">📋 Copy</button>
          <button class="copy-btn" onclick="downloadSummary()">⬇️ Export</button>
        </div>
      </div>
      <div class="result-section-title">Summary</div>
      <div class="result-summary">${result.summary || 'No summary generated.'}</div>
      ${result.keyPoints?.length ? `
        <div class="result-section-title" style="margin-top:24px">Key Points</div>
        <ul class="key-points">
          ${result.keyPoints.map(p => `<li>${p}</li>`).join('')}
        </ul>` : ''}
      ${result.tags?.length ? `
        <div class="result-section-title" style="margin-top:24px">Topics & Tags</div>
        <div class="tags-container">
          ${result.tags.map(t => `<span class="badge badge-primary"># ${t}</span>`).join('')}
        </div>` : ''}
      ${result.sourceInfo ? `
        <div style="margin-top:24px;padding:16px;background:rgba(255,255,255,0.03);border-radius:var(--radius-md);font-size:0.82rem;color:var(--text-muted)">
          <strong>Source Info:</strong>
          ${result.sourceInfo.pages ? `📄 ${result.sourceInfo.pages} pages` : ''}
          ${result.sourceInfo.wordCount ? `· 📝 ${Format.number(result.sourceInfo.wordCount)} words` : ''}
          ${result.sourceInfo.url ? `· <a href="${result.sourceInfo.url}" target="_blank" style="color:var(--accent)">View Source ↗</a>` : ''}
          ${result.sourceInfo.filename ? `· 📎 ${result.sourceInfo.filename}` : ''}
        </div>` : ''}
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted)">
        <span>Generated by ${result.model || 'Gemini 2.5 Flash'}</span>
        <span>${result.generatedAt ? Format.datetime(result.generatedAt) : ''}</span>
      </div>
    </div>
  `;

  window._currentResult = result;
}

// ─── Download Summary ─────────────────────────────────────────
function downloadSummary() {
  const r = window._currentResult;
  if (!r) return;
  const content = [
    `# ${r.title || 'Summary'}`,
    `Generated: ${r.generatedAt ? new Date(r.generatedAt).toLocaleString() : 'N/A'}`,
    `Model: ${r.model || 'Gemini 2.5 Flash'}`,
    '', '## Summary', r.summary || '',
    '', '## Key Points',
    ...(r.keyPoints || []).map(p => `- ${p}`),
    '', '## Tags',
    (r.tags || []).join(', '),
    '', `Sentiment: ${r.sentiment} | Reading Time: ${r.readingTime} | Words: ${r.wordCount}`
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `summary-${Date.now()}.txt`;
  a.click();
  Toast.success('Summary exported!');
}

// ─── Options Panel HTML ───────────────────────────────────────
function optionsPanelHTML() {
  const s = Settings.get();
  return `
    <div class="card" style="margin-bottom:24px">
      <h4 style="margin-bottom:16px;font-size:0.9rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">⚙️ Summary Options</h4>
      <div class="grid-2" style="gap:16px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Length</label>
          <select class="form-select" id="opt-length">
            <option value="short"  ${s.defaultLength==='short' ?'selected':''}>Short (80-120 words)</option>
            <option value="medium" ${s.defaultLength==='medium'?'selected':''}>Medium (200-300 words)</option>
            <option value="long"   ${s.defaultLength==='long'  ?'selected':''}>Long (450-550 words)</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Format</label>
          <select class="form-select" id="opt-format">
            <option value="paragraph" ${s.defaultFormat==='paragraph'?'selected':''}>Paragraphs</option>
            <option value="bullets"   ${s.defaultFormat==='bullets'  ?'selected':''}>Bullet Points</option>
            <option value="executive" ${s.defaultFormat==='executive'?'selected':''}>Executive Brief</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Tone</label>
          <select class="form-select" id="opt-tone">
            <option value="formal"   ${s.defaultTone==='formal'  ?'selected':''}>Formal</option>
            <option value="casual"   ${s.defaultTone==='casual'  ?'selected':''}>Casual</option>
            <option value="academic" ${s.defaultTone==='academic'?'selected':''}>Academic</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Language</label>
          <select class="form-select" id="opt-language">
            <option value="English"  ${s.language==='English' ?'selected':''}>English</option>
            <option value="Spanish"  ${s.language==='Spanish' ?'selected':''}>Spanish</option>
            <option value="French"   ${s.language==='French'  ?'selected':''}>French</option>
            <option value="German"   ${s.language==='German'  ?'selected':''}>German</option>
            <option value="Hindi"    ${s.language==='Hindi'   ?'selected':''}>Hindi</option>
            <option value="Arabic"   ${s.language==='Arabic'  ?'selected':''}>Arabic</option>
            <option value="Chinese"  ${s.language==='Chinese' ?'selected':''}>Chinese</option>
            <option value="Japanese" ${s.language==='Japanese'?'selected':''}>Japanese</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

// ─── Init Toast on DOMContentLoaded ──────────────────────────
document.addEventListener('DOMContentLoaded', () => { Toast.init(); });
