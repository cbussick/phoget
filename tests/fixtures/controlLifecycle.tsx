import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ComboBox } from "../../src/shared/ui/ComboBox/ComboBox";
import { Select } from "../../src/shared/ui/Select/Select";

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
createRoot(root).render(<Controls />);
