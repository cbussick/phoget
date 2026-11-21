import type { ReactNode } from "react";
import type { User } from "../../shared/accounts";
import { Avatar } from "../shared/ui/Avatar/Avatar";
import { Icon } from "../shared/ui/Icon/Icon";
import { Link } from "./navigation";
import { BrandLogo } from "./BrandLogo";
import { PageContainer } from "../shared/ui/PageContainer/PageContainer";

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
  const listDetail = path.startsWith("/lists/") || path === "/index.html";
  const isSettings = path === "/settings";
  const links = (mobile: boolean) => (
    <>
      <Link
        href="/"
        className={allLists || listDetail ? "active" : undefined}
        aria-current={allLists ? "page" : listDetail ? "location" : undefined}
      >
        <Icon name="listTodo" />
        {mobile ? <span>Listen</span> : "Listen"}
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
          <Link className="brand" href="/" aria-label="phoget-Startseite">
            <BrandLogo variant="wordmark" />
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
        <PageContainer
          overview={allLists || isSettings}
          className={allLists ? "lists-page" : undefined}
        >
          {children}
        </PageContainer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {links(true)}
      </nav>
    </>
  );
}
