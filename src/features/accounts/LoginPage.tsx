import { useQueryClient } from "@tanstack/react-query";
import { loginSchema } from "../../../shared/accounts";
import { useValidatedForm, textFieldProps } from "../../shared/forms/useValidatedForm";
import { TextField } from "../../shared/ui/TextField/TextField";
import { PasswordField } from "../../shared/ui/PasswordField/PasswordField";
import { Button } from "../../shared/ui/Button/Button";
import { Feedback } from "../../shared/ui/Feedback/Feedback";
import { accountApi } from "./accountApi";
import { replaceSession } from "./replaceSession";
import "./accounts.css";

export function LoginPage() {
  const client = useQueryClient();
  const { form, busy, error, submit } = useValidatedForm(
    { username: "", password: "" },
    loginSchema,
    async (value) => {
      const session = await accountApi.login(value);
      await replaceSession(client, session);
    },
  );
  return (
    <main className="auth-page login-page">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <img src="/icon.svg" alt="" width="32" height="32" />
        </span>
        Don't Phoget
      </div>
      <header>
        <h1>Willkommen zu Hause</h1>
        <p>Eure gemeinsamen Listen, alle an einem Ort.</p>
      </header>
      <form noValidate className="account-card" onSubmit={submit} aria-busy={busy}>
        <form.Field name="username">
          {(field) => (
            <TextField
              {...textFieldProps(field)}
              label="Benutzername"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={busy}
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <PasswordField
              {...textFieldProps(field)}
              label="Passwort"
              autoComplete="current-password"
              required
              disabled={busy}
            />
          )}
        </form.Field>
        <Button type="submit" loading={busy} loadingLabel="Anmeldung läuft…">
          Anmelden
        </Button>
        <p className="field-hint">
          Need an account or forgot your password? Ask a household administrator.
        </p>
        <div className="login-feedback">
          <Feedback error={error} />
        </div>
      </form>
    </main>
  );
}
