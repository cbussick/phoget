import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ComboBox } from "../../src/shared/ui/ComboBox/ComboBox";
import { Select } from "../../src/shared/ui/Select/Select";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider } from "../../src/shared/ui/Snackbar/Snackbar";
import { useSuggestions } from "../../src/features/lists/Suggestions";
import { SortableRows, SortableRow } from "../../src/features/lists/SortableRows";

const client = new QueryClient();
function Lists() {
  const [managing, setManaging] = useState(true);
  const suggestions = useSuggestions("11111111-1111-4111-8111-111111111111", [], managing);
  const [rows, setRows] = useState([{id: "a", name: "A"}, {id: "b", name: "B"}]);
  return <>
    <button type="button" onClick={() => setManaging(!managing)}>Toggle managing</button>
    <button type="button" disabled={suggestions.busy} onClick={() => suggestions.forget("Coffee")}>Forget coffee</button>
    <output id="undo-state">{suggestions.undo ? "undo available" : "no undo"}</output>
    <button type="button" onClick={() => setRows([{id: "c", name: "C"}, {id: "b", name: "B"}, {id: "a", name: "A"}])}>Server update</button>
    <SortableRows rows={rows} className="lifecycle-rows" getLabel={(row) => row.name}
      save={async () => { const response = await fetch("/lifecycle-save", {method: "POST"}); if (!response.ok) { throw new Error("Save failed"); } }}
      renderRow={(row) => <SortableRow key={row.id} id={row.id} label={row.name}><span>{row.name}</span></SortableRow>} />
  </>;
}

function Controls() {
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState("");
  return <>
    <button type="button" id="disabled" onClick={() => setDisabled(!disabled)}>Toggle disabled</button>
    <button type="button" id="error" onClick={() => setError(error ? undefined : "Invalid")}>Toggle error</button>
    <ComboBox label="Item" value={value} onValueChange={setValue} options={["Bananas", "Coffee"]} disabled={disabled} error={error} />
    <Select label="Role" options={[{value: "user", label: "User"}, {value: "admin", label: "Admin"}]} disabled={disabled} />
  </>;
}
const root = document.getElementById("root");
if (!root) { throw new Error("Missing lifecycle fixture root"); }
createRoot(root).render(<QueryClientProvider client={client}><SnackbarProvider><Controls /><Lists /></SnackbarProvider></QueryClientProvider>);
