import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersSchema, type User } from "../../../shared/accounts";
import { request } from "../../shared/api/request";
import { Button } from "../../shared/ui/Button/Button";
import { Badge } from "../../shared/ui/Badge/Badge";
import { Table } from "../../shared/ui/Table/Table";
import { Feedback } from "../../shared/ui/Feedback/Feedback";
import { Icon } from "../../shared/ui/Icon/Icon";
import { UserDialog, type UserAction } from "./UserDialog";
export function UsersPage({ currentUser }: { currentUser: User }) {
  const [action, setAction] = useState<UserAction | null>(null);
  const users = useQuery({
    queryKey: ["users"],
    queryFn: ({ signal }) => request("/users", usersSchema, { signal }),
    refetchInterval: 5000,
    retry: false,
  });
  return (
    <section className="account-card">
      <div className="section-heading">
        <div>
          <h2>Benutzer im Haushalt</h2>
          <p className="field-hint">Alle hier teilen dieselben Listen.</p>
        </div>
        <Button variant="primary" onClick={() => setAction({ kind: "create" })}>
          <Icon name="plus" />
          Benutzer anlegen
        </Button>
      </div>
      <Feedback error={users.error} />
      {users.isPending ? (
        <p role="status">Benutzer werden geladen…</p>
      ) : users.data ? (
        <Table
          caption="Benutzer im Haushalt"
          columns={["Name", "Benutzername", "Rolle", "Aktionen"]}
        >
          {users.data.map((user) => (
            <tr key={user.id}>
              <td>
                {user.name}
                {user.id === currentUser.id ? " (du)" : ""}
                {user.mustChangePassword ? (
                  <p className="field-hint">Passwortänderung erforderlich</p>
                ) : null}
              </td>
              <td>{user.username}</td>
              <td>
                <Badge tone={user.role === "admin" ? "accent" : "neutral"}>
                  {user.role === "admin" ? "Admin" : "Benutzer"}
                </Badge>
              </td>
              <td>
                <div className="user-actions">
                  <Button
                    variant="secondary"
                    size="compact"
                    aria-label={user.username + " bearbeiten"}
                    onClick={() => setAction({ kind: "edit", user })}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="secondary"
                    size="compact"
                    aria-label={"Passwort für " + user.username + " zurücksetzen"}
                    onClick={() => setAction({ kind: "reset", user })}
                  >
                    Passwort zurücksetzen
                  </Button>
                  <Button
                    size="compact"
                    variant="danger"
                    aria-label={user.username + " löschen"}
                    onClick={() => setAction({ kind: "delete", user })}
                  >
                    Löschen
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Button variant="secondary" onClick={() => void users.refetch()}>
          Erneut versuchen
        </Button>
      )}
      {action ? (
        <UserDialog
          action={action}
          currentUser={currentUser}
          administratorCount={users.data?.filter((user) => user.role === "admin").length ?? 0}
          onClose={() => setAction(null)}
        />
      ) : null}
    </section>
  );
}
