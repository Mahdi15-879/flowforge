"use client";

type SidebarProps = {
  onLogout: () => void;
};

const links = [
  { href: "#overview", label: "Overview", icon: "◫" },
  { href: "#workflows", label: "Workflows", icon: "◇" },
  { href: "#steps", label: "Workflow Builder", icon: "⌘" },
  { href: "#executions", label: "Executions", icon: "◷" },
];

export function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-symbol">◆</div>
        <div>
          <div className="brand-name">FlowForge</div>
          <div className="brand-caption">AUTOMATION PLATFORM</div>
        </div>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map((link) => (
          <a href={link.href} key={link.href} className="sidebar-link">
            <span className="sidebar-icon" aria-hidden="true">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-version">
          <span className="version-dot" />
          FlowForge MVP · v0.1
        </div>
        <button type="button" className="sidebar-logout" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
