import type { ReactNode } from "react";
import type { User } from "../../shared/accounts";
import { Avatar } from "../shared/ui/Avatar/Avatar";
import { Icon } from "../shared/ui/Icon/Icon";
import { Link } from "./navigation";

export function AppShell({
  children,
  path,
  user,
}: {
  children: ReactNode;
  path: string;
  user: User;
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
        <Icon name="settings" />
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
          <Link className="brand" href="/" aria-label="Don't Phoget-Startseite">
            <span className="brand-mark" aria-hidden="true">
              <img src="/icon.svg" alt="" width="32" height="32" />
            </span>
            <span>Don't Phoget</span>
          </Link>
          <nav className="nav-links" aria-label="Hauptnavigation">
            {links(false)}
          </nav>
          <section className="sidebar-user" aria-label="Angemeldetes Konto">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <span>@{user.username}</span>
            </div>
          </section>
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
