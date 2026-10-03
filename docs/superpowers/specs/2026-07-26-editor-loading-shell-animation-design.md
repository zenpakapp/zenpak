# Editor Loading Shell Animation Design

## Goal

Replace the visually blank editor startup with an immediate, polished preview of the editor structure. The shell must never delay access to the real editor.

## Visual Direction

The loading state mirrors the working editor rather than presenting a centered spinner. It shows a restrained sidebar, a top toolbar, and several equipment-row placeholders. A subtle highlight travels across the placeholders to communicate activity without turning the operational interface into a decorative splash screen.

The existing localized loading message remains available to assistive technology. It does not need to remain visible long enough to read when initialization completes quickly.

## Behavior

- Render the shell immediately while session initialization is `loading`.
- Replace it immediately when initialization becomes `ready`; do not enforce a minimum display time.
- Keep the shell stable at desktop and mobile widths.
- Use CSS-only animation so loading does not add JavaScript work.
- Disable the traveling highlight when `prefers-reduced-motion: reduce` is active.

## Components

- `client/views/dashboard.vue`: provide semantic placeholder structure for the sidebar, toolbar, content heading, and equipment rows.
- `client/css/_dashboard.scss`: size and style the shell, animate placeholder highlights, handle responsive layout, and provide reduced-motion behavior.
- `test/e2e/editor-loading.spec.ts`: verify the shell structure is visible while `/signin` is delayed.

No new component or dependency is required.

## Accessibility

The shell retains `role="status"` and `aria-live="polite"`. Decorative placeholders are hidden from assistive technology, while the translated loading message remains available through visually hidden text. Animation is removed for users who prefer reduced motion.

## Testing

- Delay `/signin` and assert that the loading shell and its structural placeholders appear before the response is released.
- Run the focused Playwright test in Chromium and Firefox.
- Run the production build.
- Inspect desktop and mobile screenshots for coherent dimensions and absence of overlap.

## Acceptance Criteria

- A user sees an editor-shaped loading state instead of a blank page whenever loading lasts long enough to paint.
- The real editor is never delayed for animation visibility.
- The transition does not shift the broad sidebar/content layout.
- Reduced-motion users receive a static shell.
- The production CSP remains strict and the build remains free of runtime translation compilation.
