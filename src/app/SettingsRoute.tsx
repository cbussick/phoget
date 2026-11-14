import type { Settings } from "../../shared/contracts";
import type { User } from "../../shared/accounts";
import { HouseholdSettings } from "../features/settings/HouseholdSettings";
import { MyAccount } from "../features/accounts/MyAccount";
import { UsersPage } from "../features/accounts/UsersPage";
import { Icon } from "../shared/ui/Icon/Icon";
import { Tabs, TabList, Tab, TabPanel } from "../shared/ui/Tabs/Tabs";
import "./settingsRoute.css";

export function SettingsRoute({ user, settings }: { user: User; settings: Settings }) {
  return (
    <>
      <header className="lists-header">
        <div>
          <h1>Einstellungen</h1>
          <p>Ein kleiner Bereich für dich und deinen Haushalt.</p>
        </div>
      </header>
      <Tabs key={user.role} defaultSelectedKey="account" className="settings-tabs">
        <TabList className="settings-nav" aria-label="Einstellungsbereiche">
          <Tab id="account">
            <Icon name="user" />
            Mein Konto
          </Tab>
          <Tab id="household">
            <Icon name="building" />
            Haushalt
          </Tab>
          {user.role === "admin" ? (
            <>
              <Tab id="users">
                <Icon name="users" />
                Benutzer
              </Tab>
            </>
          ) : null}
        </TabList>
        <TabPanel id="account">
          <MyAccount user={user} />
        </TabPanel>
        <TabPanel id="household">
          <HouseholdSettings settings={settings} canManage={user.role === "admin"} />
        </TabPanel>
        {user.role === "admin" ? (
          <>
            <TabPanel id="users">
              <UsersPage currentUser={user} />
            </TabPanel>
          </>
        ) : null}
      </Tabs>
    </>
  );
}
