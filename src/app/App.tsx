import { useEffect } from "react";
import { useHousehold } from "./useHousehold";
import { ListsPage } from "../features/lists/ListsPage";
import { ListPage } from "../features/lists/ListPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { Feedback } from "../shared/ui/Feedback";
import { Button } from "../shared/ui/Button";
import { AppShell } from "./AppShell";
import { Link, usePath } from "./navigation";

export function App() {
  const path = usePath();
  const state = useHousehold();
  const listId = path.startsWith("/lists/")
    ? path.slice("/lists/".length)
    : path === "/index.html"
      ? state.data?.lists[0]?.id
      : undefined;
  const list = state.data?.lists.find((value) => value.id === listId);
  const title = path === "/settings" ? "Settings" : (list?.name ?? "All lists");
  useEffect(() => {
    document.title = title + " | Phoget";
  }, [title]);
  useEffect(() => {
    document.getElementById("main-content")?.focus();
  }, [path]);
  return (
    <AppShell path={path} settings={state.data?.settings}>
      {!state.data ? (
        state.isPending ? (
          <div role="status" aria-busy="true">
            <h1>Phoget</h1>
            <p>Loading your lists…</p>
          </div>
        ) : (
          <>
            <h1>Cannot load your lists</h1>
            <Feedback error={state.error} />
            <Button className="new-list-button" onClick={() => void state.refetch()}>
              Try again
            </Button>
          </>
        )
      ) : path === "/" || path === "/all-lists.html" ? (
        <>
          <ListsPage lists={state.data.lists} />
          {state.isError ? (
            <Feedback error={new Error("Connection lost. Your lists may be out of date.")} />
          ) : null}
        </>
      ) : path === "/settings" ? (
        <SettingsPage settings={state.data.settings} />
      ) : list ? (
        <ListPage
          key={list.id}
          list={list}
          items={state.data.items.filter((item) => item.listId === list.id)}
          suggestions={state.data.settings.suggestions}
          syncError={state.isError}
        />
      ) : (
        <>
          <h1>List not found</h1>
          <p>This list may have been removed.</p>
          <Link href="/">Back to all lists</Link>
        </>
      )}
    </AppShell>
  );
}
