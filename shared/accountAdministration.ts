import type { User } from "./accounts.js";

export const accountAdministrationMessages = {
  lastAdmin:
    "Dein Haushalt benötigt mindestens einen Administrator. Ernenne einen anderen Benutzer zum Administrator, bevor du diese Rolle änderst oder dieses Konto löschst.",
  selfDelete:
    "Du kannst dein eigenes Konto nicht löschen. Bitte einen anderen Administrator darum.",
  selfReset:
    "Du kannst dein eigenes Passwort hier nicht zurücksetzen. Ändere es unter Mein Konto mit deinem aktuellen Passwort.",
};

export function accountAdministrationBlock(
  actorId: string,
  target: Pick<User, "id" | "role">,
  administratorCount: number,
  action: "delete" | "reset" | "edit",
  nextRole = target.role,
): string | null {
  if (
    target.role === "admin" &&
    administratorCount <= 1 &&
    (action === "delete" || (action === "edit" && nextRole !== "admin"))
  )
    return accountAdministrationMessages.lastAdmin;
  if (actorId === target.id && action === "delete") return accountAdministrationMessages.selfDelete;
  if (actorId === target.id && action === "reset") return accountAdministrationMessages.selfReset;
  return null;
}
