import { NavLink, Outlet } from "react-router-dom";
import {
  Activity, CalendarCheck, ClipboardList, HeartPulse, LayoutDashboard,
  LockKeyhole, Menu, ShieldCheck, Sparkles, UserRound, X
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/screening", label: "Health screening", icon: ClipboardList },
  { to: "/timeline", label: "Health timeline", icon: Activity },
  { to: "/insights", label: "Health insights", icon: HeartPulse },
  { to: "/care", label: "Care navigation", icon: CalendarCheck },
];

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><HeartPulse size={20} strokeWidth={2.2} /></div>
          <div>
            <div className="brand-name">loc<span>.</span></div>
            <div className="brand-caption">MEN'S HEALTH, REIMAGINED</div>
          </div>
          <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        </div>

        <div className="sidebar-section-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Health screening" && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-mini">
            <div className="privacy-mini-icon"><LockKeyhole size={16}/></div>
            <div>
              <strong>Your health stays yours.</strong>
              <span>Local-first by design.</span>
            </div>
          </div>
          <NavLink to="/privacy" onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `nav-link privacy-link ${isActive ? "nav-link-active" : ""}`}>
            <ShieldCheck size={18} strokeWidth={1.8}/><span>Privacy & consent</span>
          </NavLink>
          <div className="profile-row">
            <div className="avatar"><UserRound size={17}/></div>
            <div className="profile-copy"><strong>Private profile</strong><span>Guest session</span></div>
            <Sparkles size={16} className="profile-sparkle"/>
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Personal health</strong></div>
          <div className="topbar-right">
            <span className="local-status"><span className="status-pulse"/> Local session</span>
            <div className="topbar-avatar"><UserRound size={16}/></div>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
        <footer className="app-footer">
          <span>LOC is a screening and care-navigation companion, not a diagnostic service.</span>
          <span>Built around your privacy <LockKeyhole size={12}/></span>
        </footer>
      </main>
    </div>
  );
}
