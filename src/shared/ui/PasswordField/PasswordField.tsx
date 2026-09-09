import { useState, type InputHTMLAttributes } from "react";
import { TextField } from "../TextField/TextField";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import "./PasswordField.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "autoComplete"> & {
  label: string;
  hint?: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
};

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      endAdornment={
        <Button
          variant="ghost"
          size="icon"
          className="password-toggle"
          aria-label={props.label + (visible ? " verbergen" : " anzeigen")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible(!visible)}
          disabled={props.disabled}
        >
          <Icon name={visible ? "hidePassword" : "showPassword"} />
        </Button>
      }
    />
  );
}
