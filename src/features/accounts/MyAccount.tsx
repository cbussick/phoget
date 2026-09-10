import { useSnackbar } from "../../shared/ui/Snackbar/Snackbar";
import { useQueryClient } from "@tanstack/react-query";
import { profileSchema, type User } from "../../../shared/accounts";
import { useValidatedForm, textFieldProps } from "../../shared/forms/useValidatedForm";
import { TextField } from "../../shared/ui/TextField/TextField";
import { Button } from "../../shared/ui/Button/Button";
import { Feedback } from "../../shared/ui/Feedback/Feedback";
import { accountApi } from "./accountApi";
import { sessionKey } from "./useSession";
import { PasswordForm } from "./PasswordForm";
import { SignOutButton } from "./SignOutButton";
export function MyAccount({ user }: { user: User }) {
  const notify = useSnackbar();
  const client = useQueryClient();
  const { form, busy, error, submit } = useValidatedForm(
    { name: user.name },
    profileSchema,
    async (value) => {
      const updated = await accountApi.profile(value);
      await client.cancelQueries({ queryKey: sessionKey });
      client.setQueryData(sessionKey, { user: updated });
      await client.invalidateQueries({ queryKey: ["members"] });
      notify("Name gespeichert.");
    },
  );
  return (
    <div className="settings-stack">
      <form noValidate className="account-card" onSubmit={submit}>
        <header className="section-heading">
          <div>
            <h2>Mein Profil</h2>
            <p className="field-hint">
              Signed in as {user.username}. An administrator can change your username.
            </p>
          </div>
        </header>
        <form.Field name="name">
          {(field) => (
            <TextField
              {...textFieldProps(field)}
              label="Dein Name"
              autoComplete="name"
              required
              disabled={busy}
            />
          )}
        </form.Field>
        <Feedback error={error} />
        <div className="dialog-actions">
          <Button type="submit" loading={busy}>
            Namen speichern
          </Button>
        </div>
      </form>
      <PasswordForm />
      <section className="account-card">
        <header className="section-heading">
          <div>
            <h2>Sitzung</h2>
            <p className="field-hint">Melde dich auf diesem Gerät von Don't Phoget ab.</p>
          </div>
          <SignOutButton />
        </header>
      </section>
    </div>
  );
}
