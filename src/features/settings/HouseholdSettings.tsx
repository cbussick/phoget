import { useSnackbar } from "../../shared/ui/Snackbar/Snackbar";
import { settingsInputSchema, type Settings } from "../../../shared/contracts";
import { useValidatedForm, textFieldProps } from "../../shared/forms/useValidatedForm";
import { TextField } from "../../shared/ui/TextField/TextField";
import { Button } from "../../shared/ui/Button/Button";
import { useErrorSnackbar } from "../../shared/ui/Snackbar/useErrorSnackbar";
import { saveSettings } from "./settingsApi";
import { useAction } from "../../shared/api/useAction";
import "./settings.css";
export function HouseholdSettings({ settings }: { settings: Settings }) {
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
