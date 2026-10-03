import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { itemHistorySchema, type Item } from "../../../shared/contracts";
import { sessionPollMs } from "../../app/pollingIntervals";
import { householdKey } from "../../shared/api/queryKeys";
import { request } from "../../shared/api/request";
import { useAction } from "../../shared/api/useAction";
import { Dialog } from "../../shared/ui/Dialog/Dialog";
import { TextField } from "../../shared/ui/TextField/TextField";
import { Button } from "../../shared/ui/Button/Button";
import { useSnackbar } from "../../shared/ui/Snackbar/Snackbar";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import { listApi } from "./listApi";

export function useSuggestions(listId: string, items: Item[], managing: boolean) {
  const notify = useSnackbar();
  const client = useQueryClient();
  const [confirmation, setConfirmation] = useState<{ name: string; completed: Item[] } | null>(
    null,
  );
  const [forgotten, setForgotten] = useState<{ name: string; completionCount: number } | null>(
    null,
  );
  useEffect(() => {
    if (!managing) setForgotten(null);
  }, [managing]);
  const history = useQuery({
    queryKey: [...householdKey, "history", listId],
    queryFn: ({ signal }) => request(`/lists/${listId}/history`, itemHistorySchema, { signal }),
    refetchInterval: sessionPollMs,
    retry: false,
  });
  const restore = useAction(async (remembered: { name: string; completionCount: number }) => {
    await listApi.restoreSuggestion(listId, remembered);
    setForgotten(null);
    notify("Vorschlag wiederhergestellt.");
  });
  const remove = useAction(async (input: { name: string; completedIds: string[] }) => {
    try {
      const result = await listApi.forgetItem(listId, input);
      setConfirmation(null);
      setForgotten(managing && !result.removedCompleted ? result.remembered : null);
      notify(
        result.removedCompleted ? "Eintrag und Vorschlag entfernt." : "Vorschlag entfernt.",
        "success",
        !managing && !result.removedCompleted && result.remembered
          ? {
              label: "Rückgängig",
              onClick: () => restore.mutate(result.remembered!),
            }
          : undefined,
      );
    } finally {
      // Refresh on conflicts too: another household member may have restored this item.
      await client.invalidateQueries({ queryKey: householdKey });
    }
  });
  useErrorSnackbar(remove.error ?? restore.error);
  const busy = remove.isPending || restore.isPending;
  const activeNames = new Set(
    items.filter((item) => !item.completed).map((item) => item.name.toLowerCase()),
  );
  // State and history poll separately; never offer removal of a known active item.
  const names = (history.data?.names ?? []).filter((name) => !activeNames.has(name.toLowerCase()));
  function forget(name: string) {
    if (busy || activeNames.has(name.toLowerCase())) return;
    const completed = items.filter(
      (item) => item.completed && item.name.toLowerCase() === name.toLowerCase(),
    );
    if (completed.length) setConfirmation({ name, completed });
    else remove.mutate({ name, completedIds: [] });
  }
  const confirmationDialog = confirmation ? (
    <Dialog
      title="Eintrag vergessen?"
      busy={busy}
      onClose={() => setConfirmation(null)}
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy)
          remove.mutate({
            name: confirmation.name,
            completedIds: confirmation.completed.map((item) => item.id),
          });
      }}
    >
      <p>
        „{confirmation.name}“ wird aus den Vorschlägen und aus „Erledigt“ entfernt. Dies gilt für
        alle, die diese Liste verwenden.
      </p>
      {confirmation.completed.some((item) => item.note || item.hasPhoto) ? (
        <p>Zugehörige Notizen und Fotos werden ebenfalls gelöscht.</p>
      ) : null}
      <div className="dialog-actions">
        <Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>
          Abbrechen
        </Button>
        <Button variant="danger" type="submit" loading={busy}>
          Eintrag vergessen
        </Button>
      </div>
    </Dialog>
  ) : null;
  const undo = forgotten
    ? { name: forgotten.name, onClick: () => restore.mutate(forgotten) }
    : null;
  return { history, names, busy, forget, confirmationDialog, undo };
}

export function SuggestionsDialog({
  names,
  busy,
  loading,
  error,
  onForget,
  onClose,
  undo,
}: {
  names: string[];
  busy: boolean;
  loading: boolean;
  error: boolean;
  onForget: (name: string) => void;
  onClose: () => void;
  undo: { name: string; onClick: () => void } | null;
}) {
  const [search, setSearch] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!busy && document.activeElement === document.body) input.current?.focus();
  }, [busy]);
  const matches = names.filter((name) =>
    name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <Dialog
      title="Vorschläge verwalten"
      busy={busy}
      onClose={onClose}
      onSubmit={(event) => event.preventDefault()}
    >
      <p>
        Vorschläge gelten für alle, die diese Liste verwenden. Offene Einträge werden hier nicht
        angezeigt.
      </p>
      <TextField
        label="Vorschläge suchen"
        inputRef={input}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {error ? (
        <p role="status">Vorschläge sind nicht verfügbar. Bitte versuche es erneut.</p>
      ) : loading ? (
        <p role="status">Vorschläge werden geladen…</p>
      ) : matches.length ? (
        <ul className="suggestion-manager">
          {matches.map((name) => (
            <li key={name}>
              <span>{name}</span>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={`Vorschlag vergessen: ${name}`}
                title="Eintrag vergessen"
                onClick={() => onForget(name)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status">
          {names.length ? "Keine passenden Vorschläge." : "Keine gespeicherten Vorschläge."}
        </p>
      )}
      {undo ? (
        <div className="suggestion-undo" role="status">
          <span>„{undo.name}“ vergessen.</span>
          <Button variant="secondary" disabled={busy} onClick={undo.onClick}>
            Rückgängig
          </Button>
        </div>
      ) : null}
      <div className="dialog-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Schließen
        </Button>
      </div>
    </Dialog>
  );
}
