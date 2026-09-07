# Prototype fidelity

The source of truth is the original `prototype/index.html`, `prototype/all-lists.html`, and `prototype/styles.css`. The original files are preserved byte-for-byte.

The palette, Nunito type, spacing scale, radii, shadows, sidebar width, content widths, control sizes, title scaling, and mobile navigation dimensions were extracted before implementing the React components. They live in `src/app/tokens.css`. Feature styles reference those tokens. Literal breakpoints remain in media/container queries because CSS custom properties cannot be used there.

The two prototype screens retain their structure, copy, icons, colors, and layout. New list, list details, deletion confirmation, and settings reuse the existing visual language. Shared native dialogs, form fields, buttons, and feedback prevent alternate versions of the same controls.

Intentional behavior changes:

- Completing an item moves it into Done, and restoring it moves it back.
- Timestamps reflect saved data.
- Placeholder navigation and buttons now work.
- Failed writes leave the form open with its input.
- Long titles wrap instead of forcing horizontal scrolling.
- Dialogs focus the first input, trap focus natively, and restore focus on close.
- Route changes focus the main landmark without a visible decorative border.
- The font is self-hosted instead of fetched from Google.
- Loading, empty, not-found, and connection-error states are explicit.

The browser tests compare the original and implemented screen geometry and computed typography/colors at 390px and 1440px in each engine. Both sides receive the same licensed Nunito font during comparison. Screenshots supplement these checks.

Implementation references: [native dialogs and focus](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), [TanStack polling](https://tanstack.com/query/latest/docs/framework/react/guides/polling), [Express async errors](https://expressjs.com/en/5x/guide/error-handling/), and [Drizzle transactions](https://orm.drizzle.team/docs/transactions).
