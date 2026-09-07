import type { ReactNode } from "react";
import type { Settings } from "../../shared/contracts";
import { Icon } from "../shared/ui/Icon";
import { Link } from "./navigation";

export function AppShell({
  children,
  path,
  settings,
}: {
  children: ReactNode;
  path: string;
  settings?: Settings;
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
        {mobile ? <span>Lists</span> : "All lists"}
      </Link>
      <Link
        href="/settings"
        className={isSettings ? "active" : undefined}
        aria-current={isSettings ? "page" : undefined}
      >
        <Icon name={mobile ? "mobileSettings" : "settings"} />
        {mobile ? <span>Settings</span> : "Settings"}
      </Link>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to {allLists ? "lists" : "main content"}
      </a>
      <div className="app-shell">
        <aside className="sidebar" aria-label="App navigation">
          <Link className="brand" href="/" aria-label="Gather home">
            <span className="brand-mark" aria-hidden="true">
              <Icon name="brand" />
            </span>
            <span>Gather</span>
          </Link>
          <nav className="nav-links" aria-label="Main navigation">
            {links(false)}
          </nav>
          <div className="household">
            <div className="avatar-stack">
              <span className="avatar avatar-one" aria-hidden="true">
                {(settings?.memberOne ?? "M").slice(0, 1).toUpperCase()}
              </span>
              <span className="avatar avatar-two" aria-hidden="true">
                {(settings?.memberTwo ?? "J").slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div>
              <strong>{settings?.householdName ?? "Our household"}</strong>
              <span>2 people</span>
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
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links(true)}
      </nav>
    </>
  );
}
