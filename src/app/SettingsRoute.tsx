import { useState } from "react";
import type { Settings } from "../../shared/contracts";
import type { User } from "../../shared/accounts";
import { HouseholdSettings } from "../features/settings/HouseholdSettings";
import { MyAccount } from "../features/accounts/MyAccount";
import { UsersPage } from "../features/accounts/UsersPage";
import { SignOutButton } from "../features/accounts/SignOutButton";
import { Icon } from "../shared/ui/Icon/Icon";
import { Button } from "../shared/ui/Button/Button";
import "./settingsRoute.css";
export function SettingsRoute({ user, settings }: { user: User; settings: Settings }) {
  const [section, setSection] = useState<"account" | "household" | "users">("account");
  const active = user.role !== "admin" ? "account" : section;
  return (
    <>
      <header className="lists-header">
        <div>
          <h1>Einstellungen</h1>
          <p>Ein kleiner Bereich für dich und deinen Haushalt.</p>
        </div>
        <SignOutButton />
      </header>
      <nav className="settings-nav" aria-label="Einstellungsbereiche">
        <Button
          variant={active === "account" ? "primary" : "secondary"}
          aria-current={active === "account" ? "page" : undefined}
          onClick={() => setSection("account")}
        >
          <Icon name="user" />
          Mein Konto
        </Button>
        {user.role === "admin" ? (
          <>
            <Button
              variant={active === "household" ? "primary" : "secondary"}
              aria-current={active === "household" ? "page" : undefined}
              onClick={() => setSection("household")}
            >
              <Icon name="building" />
              Haushalt
            </Button>
            <Button
              variant={active === "users" ? "primary" : "secondary"}
              aria-current={active === "users" ? "page" : undefined}
              onClick={() => setSection("users")}
            >
              <Icon name="users" />
              Benutzer
            </Button>
          </>
        ) : null}
      </nav>
      {active === "account" ? (
        <MyAccount user={user} />
      ) : active === "household" ? (
        <HouseholdSettings settings={settings} />
      ) : (
        <UsersPage currentUser={user} />
      )}
    </>
  );
}
