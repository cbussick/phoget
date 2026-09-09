import { Component, type ReactNode } from "react";
import { Button } from "../shared/ui/Button";
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="main-content">
          <h1>Something went wrong</h1>
          <p>Your saved lists are safe. Reload to try again.</p>
          <Button className="new-list-button" onClick={() => location.reload()}>
            Reload Phoget
          </Button>
        </main>
      );
    return this.props.children;
  }
}
