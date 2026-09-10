import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../shared/ui/Button/Button";
import { Feedback } from "../../shared/ui/Feedback/Feedback";
import { Icon } from "../../shared/ui/Icon/Icon";
import { accountApi } from "./accountApi";
import { replaceSession } from "./replaceSession";
export function SignOutButton() {
  const client = useQueryClient();
  const logout = useMutation({
    mutationFn: accountApi.logout,
    onSuccess: async () => {
      await replaceSession(client, { user: null });
    },
  });
  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => logout.mutate()}
        loading={logout.isPending}
        loadingLabel="Abmeldung läuft…"
      >
        <Icon name="logOut" />
        Abmelden
      </Button>
      <Feedback error={logout.error} />
    </div>
  );
}
