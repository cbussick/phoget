# Hosting options research

Research date: 2026-06-11

## Context

This is a small, stateful Express and PostgreSQL household app. The VPS already belongs to a Tailscale tailnet. The desired outcome is a stable HTTPS URL without buying a domain, if possible.

## Recommendation

### Best if every user can install Tailscale: Tailscale Serve

Use the existing VPS and expose the app with Tailscale Serve. Only devices authenticated into the tailnet can reach it, so the application is never public on the Internet. This is the safest and simplest private-household arrangement. It does not require a domain and does not require Cloudflare Access.

Tailscale Serve is an HTTPS reverse proxy to a local service. Its TLS certificate is managed by Tailscale, and `--bg` makes the configuration persist across reboots and Tailscale restarts.

Example once the app is running privately on port 3001:

```sh
tailscale serve --bg http://127.0.0.1:3001
```

Set the app's `APP_ORIGIN` to the HTTPS `*.ts.net` URL printed by Tailscale. Users must install and sign in to Tailscale; that is the tradeoff.

Source: [Tailscale Serve documentation](https://tailscale.com/kb/1242/tailscale-serve).

### Best no-domain option when the app must be reachable from any browser: Tailscale Funnel

Use the existing VPS and Tailscale Funnel. Funnel gives the VPS a stable public `https://<machine>.<tailnet>.ts.net` address, terminates HTTPS, forwards to the local app, and hides the VPS IP. It is available on all Tailscale plans, including the free Personal plan, which supports up to six users. It needs MagicDNS and HTTPS enabled, and a Funnel permission in the tailnet policy. The CLI walks an administrator through enabling it.

Example:

```sh
tailscale funnel --bg http://127.0.0.1:3001
```

Set `APP_ORIGIN` to the exact Funnel URL printed by the command.

Important caveats:

- Funnel is marked beta by Tailscale.
- It is public: anybody can reach the app's login page. The app's own login remains the gate.
- Tailscale applies non-configurable bandwidth limits.
- It only uses the tailnet's `*.ts.net` name and HTTPS ports 443, 8443, or 10000.

Sources: [Tailscale Funnel documentation](https://tailscale.com/kb/1223/funnel) and [Tailscale pricing](https://tailscale.com/pricing).

## Other options

### VPS + Cloudflare Tunnel (+ optional Access)

This is the best long-term public setup if buying a domain becomes acceptable. It gives a better public-facing edge and can add Cloudflare Access before traffic reaches the VPS. A normal named Cloudflare Tunnel needs a domain zone configured in Cloudflare. Cloudflare Quick Tunnels do not: they create a random `trycloudflare.com` address, but Cloudflare explicitly limits them to testing and development and does not guarantee uptime.

Sources: [Cloudflare named tunnel setup](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/create-local-tunnel/) and [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

### Hosted platforms with a provider subdomain

Platforms such as Vercel and Render provide provider-controlled URLs, so a purchased domain is not technically necessary. They are not the preferred fit for this project:

- Vercel would require adapting the conventional long-running Express application and moving PostgreSQL to a managed database. Its generated URLs are public by default.
- Render can run a Node web service and gives it an `onrender.com` name, but its free web services sleep after 15 minutes of idle time and its free PostgreSQL databases expire after 30 days. Render says not to use its free instances for production.

Sources: [Vercel generated URLs](https://vercel.com/docs/deployments/generated-urls) and [Render free-instance limits](https://render.com/docs/free).

## Decision guide

| Need                                                                                                | Approach                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Only known household devices; users can install Tailscale                                           | Tailscale Serve                                                           |
| Any browser can open it; no domain purchase                                                         | Tailscale Funnel                                                          |
| Stable public household service with a custom, provider-independent name and an extra identity gate | Buy a domain, then Cloudflare Tunnel + Access                             |
| Avoid VPS administration entirely                                                                   | Use a paid managed host and managed PostgreSQL; expect deployment changes |

## Practical next step

First decide whether every intended user can use Tailscale. If yes, use Serve. If no, test Funnel on the VPS with the existing app. Keep `HOST=127.0.0.1`, leave port 3001 closed to inbound Internet traffic, and set `APP_ORIGIN` to the exact `https://…ts.net` address before treating it as production.
