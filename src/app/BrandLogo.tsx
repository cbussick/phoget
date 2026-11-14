import "./brandLogo.css";

export function BrandLogo({ variant = "full" }: { variant?: "full" | "wordmark" }) {
  const wordmark = variant === "wordmark";
  return (
    <img
      className="brand-logo"
      src={
        wordmark
          ? "/branding/little-tangle/logo-wordmark.svg"
          : "/branding/little-tangle/logo-full.svg"
      }
      alt="phoget"
      width="765"
      height={wordmark ? 410 : 560}
    />
  );
}
