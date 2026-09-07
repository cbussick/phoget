import { useState } from "react";
import type { Settings } from "../../../shared/contracts";
import { Field } from "../../shared/ui/Field";
import { Button } from "../../shared/ui/Button";
import { Feedback } from "../../shared/ui/Feedback";
import { saveSettings } from "./settingsApi";
import { useAction } from "../../shared/api/useAction";
import "./settings.css";
export function SettingsPage({ settings }: { settings: Settings }) {
  const [householdName, setHouseholdName] = useState(settings.householdName);
  const [memberOne, setMemberOne] = useState(settings.memberOne);
  const [memberTwo, setMemberTwo] = useState(settings.memberTwo);
  const [suggestions, setSuggestions] = useState(settings.suggestions.join("\n"));
  const [saved, setSaved] = useState(false);
  const save = useAction(() =>
    saveSettings({
      householdName,
      memberOne,
      memberTwo,
      suggestions: suggestions
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    }),
  );
  return (
    <>
      <header className="lists-header">
        <div>
          <h1>Settings</h1>
          <p>A little space for the two of you.</p>
        </div>
      </header>
      <form
        className="list-card settings-form"
        onChange={() => setSaved(false)}
        onSubmit={(event) => {
          event.preventDefault();
          if (!save.isPending) save.mutate(undefined, { onSuccess: () => setSaved(true) });
        }}
      >
        <Field
          label="Household name"
          name="householdName"
          required
          maxLength={200}
          value={householdName}
          onChange={(event) => setHouseholdName(event.target.value)}
        />
        <Field
          label="First person"
          name="memberOne"
          required
          maxLength={80}
          value={memberOne}
          onChange={(event) => setMemberOne(event.target.value)}
        />
        <Field
          label="Second person"
          name="memberTwo"
          required
          maxLength={80}
          value={memberTwo}
          onChange={(event) => setMemberTwo(event.target.value)}
        />
        <Field
          label="Often bought (one per line, up to 10)"
          name="suggestions"
          multiline
          value={suggestions}
          onChange={(event) => setSuggestions(event.target.value)}
        />
        <Feedback error={save.error} />
        <div className="dialog-actions">
          <Button className="save-item" type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
        {saved ? <p role="status">Settings saved.</p> : null}
      </form>
    </>
  );
}
