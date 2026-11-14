import { BrandLogo } from "./BrandLogo";
import "./loadingScreen.css";

export function LoadingScreen({ message = "Wird geladen…" }: { message?: string }) {
  return (
    <main className="loading-screen">
      <div className="loading-brand">
        <h1 className="visually-hidden">Don't Phoget</h1>
        <div className="loading-mark" aria-hidden="true">
          <BrandLogo />
        </div>
        <p role="status">{message}</p>
        <div className="loading-track" aria-hidden="true">
          <span />
        </div>
      </div>
    </main>
  );
}
