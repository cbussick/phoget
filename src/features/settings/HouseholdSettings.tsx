import { useQuery } from "@tanstack/react-query";
import { membersSchema } from "../../../shared/accounts";
import { request } from "../../shared/api/request";
import { Avatar } from "../../shared/ui/Avatar/Avatar";
import { Feedback } from "../../shared/ui/Feedback/Feedback";
import { useSnackbar } from "../../shared/ui/Snackbar/Snackbar";
import { settingsInputSchema, type Settings } from "../../../shared/contracts";
import { useValidatedForm, textFieldProps } from "../../shared/forms/useValidatedForm";
import { TextField } from "../../shared/ui/TextField/TextField";
import { Button } from "../../shared/ui/Button/Button";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import { saveSettings } from "./settingsApi";
import { useAction } from "../../shared/api/useAction";
import "./settings.css";
export function HouseholdSettings({
  settings,
  canManage,
}: {
  settings: Settings;
  canManage: boolean;
}) {
  const members = useQuery({
    queryKey: ["members"],
    queryFn: ({ signal }) => request("/members", membersSchema, { signal }),
  });
  return (
    <div className="household-settings">
      <section className="account-card household-overview" aria-label="Haushaltsübersicht">
        <h2>{settings.householdName}</h2>
        {members.data ? (
          <div className="household-summary">
            <div className="avatar-stack">
              {members.data.slice(0, 3).map((member, index) => (
                <Avatar key={member.id} name={member.name} tone={index % 2 ? "cool" : "warm"} />
              ))}
            </div>
            <p>
              {members.data.length} {members.data.length === 1 ? "Person" : "Personen"}
            </p>
          </div>
        ) : members.isPending ? (
          <p className="household-summary-status" role="status">
            Mitglieder werden geladen…
          </p>
        ) : null}
        {members.isError ? (
          <div>
            <Feedback error={members.error} />
            <Button variant="secondary" onClick={() => void members.refetch()}>
              Erneut versuchen
            </Button>
          </div>
        ) : null}
      </section>
      {canManage ? <HouseholdNameForm settings={settings} /> : null}
    </div>
  );
}

function HouseholdNameForm({ settings }: { settings: Settings }) {
  const notify = useSnackbar();
  const save = useAction(saveSettings);
  const { form, busy, error, submit } = useValidatedForm(
    { householdName: settings.householdName },
    settingsInputSchema,
    async (value) => {
      await save.mutateAsync(value);
      notify("Einstellungen gespeichert.");
    },
  );
  useErrorSnackbar(error);
  return (
    <form noValidate className="account-card settings-form" onSubmit={submit}>
      <h2>Haushalt</h2>
      <form.Field name="householdName">
        {(field) => (
          <TextField
            {...textFieldProps(field)}
            label="Name des Haushalts"
            required
            disabled={busy}
          />
        )}
      </form.Field>
      <div className="dialog-actions">
        <Button type="submit" loading={busy}>
          Änderungen speichern
        </Button>
      </div>
    </form>
  );
}
