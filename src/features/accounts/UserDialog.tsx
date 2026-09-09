import { z } from "zod";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { accountAdministrationBlock } from "../../../shared/accountAdministration";
import {
  displayNameSchema,
  usernameSchema,
  roleSchema,
  passwordSchema,
  type User,
} from "../../../shared/accounts";
import { useValidatedForm, textFieldProps, fieldError } from "../../shared/forms/useValidatedForm";
import { Callout } from "../../shared/ui/Callout/Callout";
import { Dialog } from "../../shared/ui/Dialog/Dialog";
import { TextField } from "../../shared/ui/TextField/TextField";
import { PasswordField } from "../../shared/ui/PasswordField/PasswordField";
import { Select } from "../../shared/ui/Select/Select";
import { Button } from "../../shared/ui/Button/Button";
import { Feedback } from "../../shared/ui/Feedback/Feedback";
import { accountApi } from "./accountApi";

export type UserAction = { kind: "create" } | { kind: "edit" | "reset" | "delete"; user: User };
export function UserDialog({
  action,
  currentUser,
  administratorCount,
  onClose,
}: {
  action: UserAction;
  currentUser: User;
  administratorCount: number;
  onClose: () => void;
}) {
  const user = action.kind === "create" ? undefined : action.user;
  const editing = action.kind === "create" || action.kind === "edit";
  const changingPassword = action.kind === "create" || action.kind === "reset";
  const schema = z.object({
    name: editing ? displayNameSchema : z.string(),
    username: editing ? usernameSchema : z.string(),
    role: roleSchema,
    password: changingPassword ? passwordSchema : z.string(),
  });
  const client = useQueryClient();
  const { form, busy, error, submit } = useValidatedForm(
    {
      name: user?.name ?? "",
      username: user?.username ?? "",
      role: user?.role ?? "user",
      password: "",
    },
    schema,
    async ({ name, username, role, password }) => {
      if (
        action.kind !== "create" &&
        accountAdministrationBlock(
          currentUser.id,
          action.user,
          administratorCount,
          action.kind,
          role,
        )
      )
        return;
      switch (action.kind) {
        case "create":
          await accountApi.create({ name, username, role, password });
          break;
        case "edit":
          await accountApi.edit(action.user.id, { name, username, role });
          break;
        case "reset":
          await accountApi.resetPassword(action.user.id, { password });
          break;
        case "delete":
          await accountApi.remove(action.user.id);
          break;
      }
      await client.invalidateQueries();
      onClose();
    },
  );
  const selectedRole = useStore(form.store, (state) => state.values.role);
  const blocked =
    action.kind === "create"
      ? null
      : accountAdministrationBlock(
          currentUser.id,
          action.user,
          administratorCount,
          action.kind,
          selectedRole,
        );
  const title = {
    create: "Benutzer anlegen",
    edit: "Benutzer bearbeiten",
    reset: "Passwort zurücksetzen",
    delete: "Benutzer löschen?",
  }[action.kind];
  return (
    <Dialog
      title={title}
      eyebrow={user?.name}
      busy={busy}
      onClose={onClose}
      onSubmit={(event) => {
        if (blocked) event.preventDefault();
        else submit(event);
      }}
    >
      {blocked && action.kind !== "edit" ? null : action.kind === "delete" ? (
        <p>
          Das Konto von {user?.name} wird gelöscht und auf allen Geräten abgemeldet. Gemeinsame
          Listen und Einträge bleiben erhalten.
        </p>
      ) : (
        <>
          {editing ? (
            <>
              <form.Field name="name">
                {(field) => (
                  <TextField
                    {...textFieldProps(field)}
                    label="Name"
                    autoComplete="off"
                    required
                    disabled={busy}
                  />
                )}
              </form.Field>
              <form.Field name="username">
                {(field) => (
                  <TextField
                    {...textFieldProps(field)}
                    label="Benutzername"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    disabled={busy}
                  />
                )}
              </form.Field>
              <form.Field name="role">
                {(field) => (
                  <Select
                    label="Rolle"
                    value={field.state.value}
                    error={fieldError(field)}
                    disabled={busy}
                    onValueChange={(value) => field.handleChange(roleSchema.parse(value))}
                    options={[
                      { value: "user", label: "Benutzer" },
                      { value: "admin", label: "Administrator" },
                    ]}
                  />
                )}
              </form.Field>
            </>
          ) : null}
          {changingPassword ? (
            <form.Field name="password">
              {(field) => (
                <PasswordField
                  {...textFieldProps(field)}
                  label="Vorläufiges Passwort"
                  autoComplete="new-password"
                  required
                  disabled={busy}
                  hint="Teile das Passwort vertraulich mit. Bei der Anmeldung muss ein neues Passwort gewählt werden."
                />
              )}
            </form.Field>
          ) : (
            <p className="field-hint">
              Eine Rollenänderung meldet diesen Benutzer auf allen Geräten ab.
            </p>
          )}
        </>
      )}
      {blocked ? <Callout>{blocked}</Callout> : <Feedback error={error} />}
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Abbrechen
        </Button>
        <Button
          variant={action.kind === "delete" ? "danger" : "primary"}
          type="submit"
          loading={busy}
          disabled={Boolean(blocked)}
        >
          {action.kind === "delete"
            ? "Benutzer löschen"
            : action.kind === "edit"
              ? "Änderungen speichern"
              : title}
        </Button>
      </div>
    </Dialog>
  );
}
