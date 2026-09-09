import type { ReactNode } from "react";
import type { Member } from "../../shared/accounts";
import { Avatar } from "../shared/ui/Avatar/Avatar";
import type { Settings } from "../../shared/contracts";
import { Icon } from "../shared/ui/Icon/Icon";
import { Link } from "./navigation";

export function AppShell({
  children,
  path,
  settings,
  members = [],
}: {
  children: ReactNode;
  path: string;
  settings?: Settings;
  members?: Member[];
}) {
  const allLists = path === "/" || path === "/all-lists.html";
  const isSettings = path === "/settings";
  const links = (mobile: boolean) => (
    <>
      <Link
        href="/"
        className={allLists ? "active" : undefined}
        aria-current={allLists ? "page" : undefined}
      >
        <Icon name="lists" />
        {mobile ? <span>Listen</span> : "Alle Listen"}
      </Link>
      <Link
        href="/settings"
        className={isSettings ? "active" : undefined}
        aria-current={isSettings ? "page" : undefined}
      >
        <Icon name={mobile ? "mobileSettings" : "settings"} />
        {mobile ? <span>Einstellungen</span> : "Einstellungen"}
      </Link>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        {allLists ? "Zu den Listen springen" : "Zum Hauptinhalt springen"}
      </a>
      <div className="app-shell">
        <aside className="sidebar" aria-label="App-Navigation">
          <Link className="brand" href="/" aria-label="Gather-Startseite">
            <span className="brand-mark" aria-hidden="true">
              <Icon name="brand" />
            </span>
            <span>Gather</span>
          </Link>
          <nav className="nav-links" aria-label="Hauptnavigation">
            {links(false)}
          </nav>
          <div className="household">
            <div className="avatar-stack">
              {members.slice(0, 3).map((member, index) => (
                <Avatar key={member.id} name={member.name} tone={index % 2 ? "cool" : "warm"} />
              ))}
            </div>
            <div>
              <strong>{settings?.householdName ?? "Unser Haushalt"}</strong>
              <span>
                {members.length} {members.length === 1 ? "Person" : "Personen"}
              </span>
            </div>
          </div>
        </aside>
        <main
          id="main-content"
          className={"main-content" + (allLists ? " lists-page" : "")}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {links(true)}
      </nav>
    </>
  );
}
