import { useEffect } from "react";
import { useHousehold } from "./useHousehold";
import { ListsPage } from "../features/lists/ListsPage";
import { ListPage } from "../features/lists/ListPage";
import { SettingsRoute } from "./SettingsRoute";
import { useSession } from "../features/accounts/useSession";
import { LoginPage } from "../features/accounts/LoginPage";
import { PasswordForm } from "../features/accounts/PasswordForm";
import { SignOutButton } from "../features/accounts/SignOutButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { membersSchema, type User } from "../../shared/accounts";
import { request } from "../shared/api/request";
import { Feedback } from "../shared/ui/Feedback/Feedback";
import { Button } from "../shared/ui/Button/Button";
import { AppShell } from "./AppShell";
import { Link, usePath } from "./navigation";

export function App() {
  const session = useSession();
  const client = useQueryClient();
  const user = session.data?.user;
  useEffect(() => {
    if (!user) client.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
  }, [user?.id, client]);
  if (session.isPending)
    return (
      <main className="error-page">
        <h1>Phoget</h1>
        <p role="status">Wird geladen…</p>
      </main>
    );
  if (session.isError && !session.data)
    return (
      <main className="error-page">
        <h1>Keine Verbindung möglich</h1>
        <Feedback error={session.error} />
        <Button variant="secondary" onClick={() => void session.refetch()}>
          Erneut versuchen
        </Button>
      </main>
    );
  if (!user) return <LoginPage />;
  if (user.mustChangePassword)
    return (
      <main className="auth-page">
        <h1>Welcome, {user.name}</h1>
        <PasswordForm required />
        <SignOutButton />
      </main>
    );
  return <HouseholdApp key={user.id} user={user} />;
}
function HouseholdApp({ user }: { user: User }) {
  const path = usePath();
  const state = useHousehold();
  const members = useQuery({
    queryKey: ["members"],
    queryFn: ({ signal }) => request("/members", membersSchema, { signal }),
    refetchInterval: 5000,
  });
  const listId = path.startsWith("/lists/")
    ? path.slice("/lists/".length)
    : path === "/index.html"
      ? state.data?.lists[0]?.id
      : undefined;
  const list = state.data?.lists.find((value) => value.id === listId);
  const title = path === "/settings" ? "Einstellungen" : (list?.name ?? "Alle Listen");
  useEffect(() => {
    document.title = title + " | Phoget";
  }, [title]);
  useEffect(() => {
    document.getElementById("main-content")?.focus();
  }, [path]);
  return (
    <AppShell path={path} settings={state.data?.settings} members={members.data}>
      {!state.data ? (
        state.isPending ? (
          <div role="status" aria-busy="true">
            <h1>Phoget</h1>
            <p>Deine Listen werden geladen…</p>
          </div>
        ) : (
          <>
            <h1>Deine Listen konnten nicht geladen werden</h1>
            <Feedback error={state.error} />
            <Button
              variant="primary"
              size="large"
              className="new-list-button"
              onClick={() => void state.refetch()}
            >
              Erneut versuchen
            </Button>
          </>
        )
      ) : path === "/" || path === "/all-lists.html" ? (
        <>
          <ListsPage lists={state.data.lists} />
          {state.isError ? (
            <Feedback
              error={
                new Error(
                  "Verbindung unterbrochen. Deine Listen sind möglicherweise nicht aktuell.",
                )
              }
            />
          ) : null}
        </>
      ) : path === "/settings" ? (
        <SettingsRoute settings={state.data.settings} user={user} />
      ) : list ? (
        <ListPage
          key={list.id}
          list={list}
          items={state.data.items.filter((item) => item.listId === list.id)}
          syncError={state.isError}
        />
      ) : (
        <>
          <h1>Liste nicht gefunden</h1>
          <p>Diese Liste wurde möglicherweise gelöscht.</p>
          <Link href="/">Zurück zu allen Listen</Link>
        </>
      )}
    </AppShell>
  );
}
