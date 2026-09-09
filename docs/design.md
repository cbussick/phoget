# Design notes

Design tokens live in `src/app/tokens.css`: palette, Nunito typography, spacing, radii, shadows, and layout dimensions. Feature styles reference these tokens. Literal breakpoints remain in media/container queries because CSS custom properties cannot be used there.

All pages compose shared dialogs, form fields, buttons, and feedback rather than maintaining alternate versions of the same controls.

Interaction requirements:

- Completing an item moves it into Done, and restoring it moves it back.
- Timestamps reflect saved data.
- Failed writes leave the form open with its input.
- Long titles wrap instead of forcing horizontal scrolling.
- Dialogs focus the first input, trap focus natively, and restore focus on close.
- Route changes focus the main landmark without a visible decorative border.
- The font is self-hosted instead of fetched from Google.
- Loading, empty, not-found, and connection-error states are explicit.

Browser tests cover application behavior, responsive layouts, and accessibility. Storybook provides component-level interaction and visual checks.

Implementation references: [native dialogs and focus](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), [TanStack polling](https://tanstack.com/query/latest/docs/framework/react/guides/polling), [Express async errors](https://expressjs.com/en/5x/guide/error-handling/), and [Drizzle transactions](https://orm.drizzle.team/docs/transactions).

The shared UI now lives in component folders with colocated stories. Button owns variant and interaction styling; layout-specific placement stays in features. PasswordField composes TextField and Button, and account tables compose Table, Badge, and Button. Storybook and the app import the same baseline, self-hosted font, and tokens.

The empty-list state is centered with a large icon. Done appears only when there are completed items. Household avatars use real accounts. Account settings and administrator management use the same shared components.

Authentication implementation references: [Node scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), and [session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Text fields and selects share hover border colors and a 2px inward focus/pressed emphasis. Checkboxes and radios retain a fixed 1px border when hovered, pressed, and selected, changing fill on press and reserving an outline for keyboard focus, following the reference checkbox pattern. Buttons progressively darken their fill on hover and press; secondary buttons also match their border to the hover text color. Keyboard focus remains visible. Danger buttons use a red fill with white text and progressively darker interaction fills. Disabled controls use a not-allowed cursor, never a loading cursor. Button defaults to `primary`; secondary, ghost, and danger intent is explicit at call sites. Loading buttons reuse the indeterminate Spinner, with a static indicator under reduced motion.

TextField, PasswordField, and Select share FieldLayout for labels, hint/error typography, spacing, and accessible descriptions. Password visibility is an action inside TextField's border. Select uses a top-layer listbox, a rotating chevron, and keyboard behavior based on the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/). It is implemented locally without importing the reference design system. Stories focus on component variants and meaningful states; product-specific button labels use the controls instead of separate stories.

ListIcon owns the list's colored icon background; ListRow composes it with the label, description and chevron. Its hover surface has balanced internal padding on both sides. The row darkens on press, and sidebar hover transitions respect reduced motion. Both components have focused Storybook stories.

Feedback composes Callout for accessible, tinted error messages. Login reserves a scrollable feedback area below account help, avoiding layout shift even for a longer server message. The routine shared-changes note was removed; connection failures remain visible.

All application forms use TanStack Form with the shared Zod input schemas. Native validation popups are disabled. Errors appear below the affected control, including server errors associated with a field. Hints and errors share one reserved line at every width. Field internals use a 4px gap; dialog/account-card children use 12px rather than 20px, removing compounded spacing without sacrificing the reserved error line. Longer hints/errors expand naturally rather than clipping or scrolling inside a fixed error area. Textareas have a fixed size with internal scrolling. Login updates the observed session query and keeps the controls disabled with a spinner until the response is applied.

The add-item control is a ComboBox that permits new text and searches per-list name history. Select and ComboBox share OptionList and anchored popup positioning. Renamed and removed items remain in that history; deleting a list removes its history. Existing item names are also included. The reference ComboBox informed the editable input, integrated trigger, popup, and keyboard behavior without importing its components.

The overview and item rows use the row-padding token. Item hover covers the full row, while completion stays on the checkbox. Done has a stronger label, a chevron and a dashed separator; open items have no trailing divider. Icon choice uses a separate ToggleButtonGroup with one selection and roving keyboard focus, following the [MUI toggle group pattern](https://mui.com/material-ui/react-toggle-button/). Form validation follows the [TanStack Form guide](https://tanstack.com/form/latest/docs/framework/react/guides/validation).

Forms validate only on submit, never on blur or while typing. Checkbox visuals and hit areas are both 32px, with no clickable padding. The list options icon uses filled SVG dots. Error-boundary and connection-error pages center their content horizontally and vertically.

Often Bought uses per-list, case-insensitive name history. Each unchecked-to-checked transition adds one to the stored completion count; repeated requests setting an already checked item to checked do not add another count. Counts survive renames/deletions under the name that was completed. The history response includes up to three names ranked by count, with alphabetical tie-breaking and names in unfinished items excluded. Names present only in Done remain eligible. The old household-wide manual suggestions were removed.

Quick-add actions preserve the combobox draft and do not focus or open it. Submitting with Enter inside the add-item combobox restores input focus after saving; activating the Add button by pointer or keyboard does not. Focus is not stolen from another control while a save is pending. Item dividers are separate straight `hr` elements inside list rows, independent of the rounded hover surface, with the first divider hidden.

## Success notifications and list actions

Settings/profile/password success messages use one shared, fixed Snackbar, following the sibling job-sheet app's dismissible notification pattern. The latest message replaces the previous one; it stays until dismissed and never takes focus on appearance. Success uses green, errors red, and information the app's blue, with distinct icons so meaning is not conveyed by color alone. Success/information announce politely; errors announce assertively. Existing validation/save errors remain inline rather than being duplicated in snackbars. Native manual popovers provide top-layer rendering with a fixed-position fallback. No timer or motion is needed. Validation and actionable failures remain inline. Settings section buttons use user, building, and multiple-user icons.

List deletion is labeled “Liste löschen” below the color controls and above the footer, with dividers above and below. A trash icon and separate confirmation distinguish it from Cancel; Cancel and Save are the final dialog actions. Shared UI symbols use copied Lucide SVG artwork rather than hand-drawn paths or runtime icon libraries; only Gather's brand mark remains custom. List symbols include ShoppingCart, Bubbles, MopSparkles, Building2, Lucide Lab's bowlChopsticks, and the user-supplied Tabler Needle Thread SVG for “Nähen” (replacing Spool). Existing icon IDs remain valid; the icon text column needs no migration.

## List activity

Overview rows and detail headings show relative German update times and the last editor's display name. One minute timer per page keeps the time current without a timer per row. List creation/edits and all item mutations set the authenticated actor, never a client-supplied author. Item changes and list activity updates share a transaction; the database supplies update timestamps. `lists.updatedById` is nullable for old rows and references users with `ON DELETE SET NULL`. Reads resolve current display names in the existing state query, without N+1 requests. Deleted users and legacy rows show time only; no historical author is fabricated or retained as a name snapshot. Run schema setup to add the nullable foreign key.

## List colors

The selected ListIcon also appears above the detail heading. Lists now store an opaque six-digit sRGB hex color, validated by the shared Zod schema and normalized to lowercase. New and existing rows default to the original `#8bcdf1`; schema setup adds the column without changing other list data. An update omitting color preserves the existing value.

ColorPicker composes the existing ToggleButtonGroup (six named preset swatches with a selection checkmark) and TextField (editable hex value with a swatch button opening an in-app spectrum popup). Presets are above custom entry. All labels and validation are German. Selection is keyboard accessible and not conveyed by color alone. Invalid text remains editable and blocks submit. Color swatch selection uses a neutral border and checkmark, with neutral hover and pressed fills rather than blue backgrounds. Icon-choice toggles retain their existing styling. Save persists through the existing mutation/query flow. Both ListIcon locations and the list's Add button use that saved color. All dialog buttons, including create/save, keep their standard semantic styles.

### Picker comparison (2026-09-08)

- **Chosen: [React Aria](https://react-aria.adobe.com/ColorPicker)** color-area and hue-slider primitives, lazily loaded only when opened. They provide localized keyboard/pointer interaction without adopting another visual theme. The popup uses Gather's native top-layer popover positioning and Nunito, with Escape closing only the picker and restoring trigger focus. HSB state preserves hue at zero saturation/brightness; persistence remains opaque hex. “Farbe” uses the larger item-input type size; preset and hex labels retain the smaller label size.
- [Mantine ColorPicker](https://mantine.dev/core/color-picker/) supports presets, hex values and keyboard-adjustable sliders; its slider labels must be supplied for screen readers. Good when already using Mantine, not a reason to bring a full design system into Gather.
- [react-colorful](https://github.com/omgovich/react-colorful) offers a small standalone spectrum picker and optional HexColorInput, without runtime dependencies. Its inline stylesheet injection and non-localized defaults require additional integration work here.
- [Native `input type="color"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/color) was the original choice, but its OS-owned popup cannot inherit Nunito. Replaced to meet the consistent typography requirement. No alpha or wide-gamut values are accepted.

Custom accent colors are scoped through CSS custom properties on individual components, not household/global tokens. `accentColor.ts` computes sRGB foreground contrast per normal/hover/pressed state using the [WCAG contrast formula](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), retaining the brand ink when it meets 4.5:1 and otherwise selecting white or black. Dark backgrounds lighten on interaction; light backgrounds darken. Default blue icons preserve their original blue glyph. Unit tests sample 4,096 RGB colors across all three states; browser tests cover presets, custom entry, failed saves, cancellation, persistence, sync and narrow dialogs.
