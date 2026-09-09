import { Component, type ReactNode } from "react";
import { Button } from "../shared/ui/Button/Button";
import "./errorPage.css";
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="error-page">
          <h1>Etwas ist schiefgelaufen</h1>
          <p>
            Deine gespeicherten Listen sind sicher. Lade die Seite neu, um es erneut zu versuchen.
          </p>
          <Button variant="primary" size="large" onClick={() => location.reload()}>
            Phoget neu laden
          </Button>
        </main>
      );
    return this.props.children;
  }
}
