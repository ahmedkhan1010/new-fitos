// ═══════════════════════════════════════════════════════════
//  FitOS — Shared Navigation Component
// ═══════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { href:'dashboard.html',        icon:SVG_ICONS.dashboard,  label:'Dashboard' },
  { href:'workouts.html',         icon:SVG_ICONS.dumbbell,   label:'Workouts'  },
  { href:'nutrition.html',        icon:SVG_ICONS.apple,      label:'Nutrition' },
  { href:'coach.html',            icon:SVG_ICONS.brain,      label:'Coach'     },
  { href:'progress.html',         icon:SVG_ICONS.chart,      label:'Progress'  },
  { href:'recovery.html',         icon:SVG_ICONS.heart,      label:'Recovery'  },
];

const SIDEBAR_EXTRA = [
  { href:'profile.html',  icon:SVG_ICONS.user,     label:'Profile'  },
  { href:'settings.html', icon:SVG_ICONS.settings, label:'Settings' },
];

function buildNav(activePage) {
  const page = activePage || window.location.pathname.split('/').pop();

  // ── Sidebar ──────────────────────────────────────────────
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-mark">F</div>
      <div class="logo-text">Fit<span>OS</span></div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-group">
        <div class="nav-group-label">Main</div>
        ${NAV_ITEMS.map(item => `
          <a href="${item.href}" class="nav-link ${page===item.href?'active':''}" data-nav-link>
            ${item.icon}
            <span>${item.label}</span>
          </a>`).join('')}
      </div>
      <div class="nav-group" style="margin-top:12px">
        <div class="nav-group-label">Account</div>
        ${SIDEBAR_EXTRA.map(item => `
          <a href="${item.href}" class="nav-link ${page===item.href?'active':''}" data-nav-link>
            ${item.icon}
            <span>${item.label}</span>
          </a>`).join('')}
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user">
        <div class="user-avatar" id="user-avatar-text">–</div>
        <div>
          <div class="user-name" id="sidebar-user-name">Loading…</div>
          <div class="user-role">FitOS Athlete</div>
        </div>
      </div>
    </div>`;

  // ── Bottom nav ────────────────────────────────────────────
  const bnav = document.createElement('nav');
  bnav.className = 'bottom-nav';
  bnav.innerHTML = `<div class="bottom-nav-inner">
    ${NAV_ITEMS.map(item => `
      <a href="${item.href}" class="bnav-item ${page===item.href?'active':''}">
        ${item.icon}
        <span>${item.label}</span>
      </a>`).join('')}
  </div>`;

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.id = 'sidebar-backdrop';

  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);
  document.body.appendChild(bnav);

  // ── Hamburger wiring ──────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const backdropEl = document.getElementById('sidebar-backdrop');
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    backdropEl?.classList.remove('show');
    document.body.classList.remove('nav-open');
  };
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = sidebar.classList.toggle('open');
      if (open) { backdropEl?.classList.add('show'); document.body.classList.add('nav-open'); }
      else closeSidebar();
    });
    backdropEl?.addEventListener('click', closeSidebar);
    document.addEventListener('click', e => {
      if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) closeSidebar();
    });
  }

  // ── Load user name ────────────────────────────────────────
  auth.onAuthStateChanged(async user => {
    if (!user) return;
    const nameEl  = document.getElementById('sidebar-user-name');
    const avatarEl = document.getElementById('user-avatar-text');
    try {
      const profile = await FS.getProfile(user.uid);
      const name = profile?.name || user.email?.split('@')[0] || 'Athlete';
      if (nameEl) nameEl.textContent = name;
      if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    } catch(e) {
      if (nameEl) nameEl.textContent = user.email?.split('@')[0] || 'Athlete';
    }
  });
}

// ── SVG Icon Library ───────────────────────────────────────
const SVG_ICONS = {
  dashboard: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  dumbbell:  `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14M18 5v14"/><rect x="2" y="8" width="4" height="8" rx="1"/><rect x="18" y="8" width="4" height="8" rx="1"/><line x1="6" y1="12" x2="18" y2="12"/></svg>`,
  apple:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 01-5 5H5a5 5 0 015-5zm0 0a5 5 0 005 5h2a5 5 0 00-5-5"/><path d="M7 7C4.25 9 3 12 3 15a9 9 0 0018 0c0-3-.25-6-2.5-8"/></svg>`,
  brain:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 017 4.5v0A2.5 2.5 0 014.5 7v0A2.5 2.5 0 012 9.5v5A2.5 2.5 0 004.5 17v0A2.5 2.5 0 007 19.5v0A2.5 2.5 0 009.5 22h5a2.5 2.5 0 002.5-2.5v0a2.5 2.5 0 002.5-2.5v0a2.5 2.5 0 002.5-2.5v-5a2.5 2.5 0 00-2.5-2.5v0A2.5 2.5 0 0017 4.5v0A2.5 2.5 0 0014.5 2z"/></svg>`,
  chart:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  heart:     `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  user:      `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  settings:  `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  plus:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  arrow_r:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  arrow_d:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  logout:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  trash:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  download:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  search:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  fire:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23a7 7 0 01-7-7c0-5 5-9.5 5-14 0 5 7 9.5 7 14a7 7 0 01-7 7z" opacity=".9"/><path d="M12 23a4 4 0 01-4-4c0-3 4-7 4-7s4 4 4 7a4 4 0 01-4 4z" fill="#ffcb41"/></svg>`,
  star:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};


document.addEventListener('click', e => {
  if (e.target.closest('[data-nav-link]')) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('show');
    document.body.classList.remove('nav-open');
  }
});
