import { useSnackbar } from "../../shared/ui/Snackbar/Snackbar";
import { useQueryClient } from "@tanstack/react-query";
import { changePasswordSchema } from "../../../shared/accounts";
import { useValidatedForm, textFieldProps } from "../../shared/forms/useValidatedForm";
import { PasswordField } from "../../shared/ui/PasswordField/PasswordField";
import { Button } from "../../shared/ui/Button/Button";
import { Feedback } from "../../shared/ui/Feedback/Feedback";
import { accountApi } from "./accountApi";
import { sessionKey } from "./useSession";
export function PasswordForm({ required = false }: { required?: boolean }) {
  const notify = useSnackbar();
  const client = useQueryClient();
  const { form, busy, error, submit } = useValidatedForm(
    { currentPassword: "", password: "" },
    changePasswordSchema,
    async (value) => {
      const session = await accountApi.password(value);
      await client.cancelQueries({ queryKey: sessionKey });
      client.setQueryData(sessionKey, session);
      form.reset();
      notify("Passwort geändert.");
    },
  );
  return (
    <form noValidate className="account-card" onSubmit={submit}>
      <header className="section-heading">
        <div>
          <h2>{required ? "Wähle dein eigenes Passwort" : "Passwort ändern"}</h2>
          <p className="field-hint">
            {required
              ? "Ersetze dein vorläufiges Passwort, bevor du eure gemeinsamen Listen öffnest."
              : "Wenn du dein Passwort änderst, wirst du auf deinen anderen Geräten abgemeldet."}
          </p>
        </div>
      </header>
      <form.Field name="currentPassword">
        {(field) => (
          <PasswordField
            {...textFieldProps(field)}
            label={required ? "Vorläufiges Passwort" : "Aktuelles Passwort"}
            autoComplete="current-password"
            required
            disabled={busy}
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <PasswordField
            {...textFieldProps(field)}
            label="Neues Passwort"
            autoComplete="new-password"
            hint="Verwende mindestens 15 Zeichen. Mehrere Wörter eignen sich gut."
            required
            disabled={busy}
          />
        )}
      </form.Field>
      <Feedback error={error} />
      <div className="dialog-actions">
        <Button type="submit" loading={busy}>
          Passwort ändern
        </Button>
      </div>
    </form>
  );
}
