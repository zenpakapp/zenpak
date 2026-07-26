# Editor Loading Performance Design

## Goal

Remove the blank screen seen when an authenticated user opens the editor or returns to it, while preserving search, filters, editing, and drag-and-drop for large gear libraries.

Baseline measured with a temporary authenticated copy of the `fxbenard` library:

- Editor visible after 2.78 seconds
- Editor return after 343 milliseconds
- 413 library rows and 40 active-list rows rendered
- 5,177 DOM nodes
- Longest initial main-thread task: 790 milliseconds
- Longest editor-return task: 304 milliseconds

## Architecture

### Immediate application shell

Mount Vue before the asynchronous session initialization finishes. Routes that depend on the library render a stable loading shell until initialization resolves. Public routes remain usable without waiting for authentication.

The store owns an explicit initialization state so loading, success, and failure are distinguishable from an unauthenticated session.

### Prioritized editor rendering

When the editor opens, render the header and active list first. Defer the sidebar item library until the browser has completed the first editor render. The sidebar structure remains stable while its item area is preparing.

### Virtualized item library

Replace the full item loop with a fixed-row virtual window. The scroll container maintains the full logical height using top and bottom spacers, while Vue renders only visible rows plus a small overscan buffer.

Search, category filters, and tag filters continue to operate on the complete in-memory collection. There is no pagination and no change to the user's mental model. Scrolling updates the visible window.

Only rendered rows participate in drag-and-drop. This preserves dragging a visible item into any active-list category. Existing edit, remove, double-click, and item-link behaviors remain unchanged.

### Linear membership calculation

Build a `Set` of item IDs used by the active list once per relevant update. Membership checks for library rows become constant-time instead of repeatedly scanning the active-list IDs.

## Components

- `client/lighterpack.js`: mount the application before store initialization completes.
- `client/store/store.js`: expose explicit initialization state.
- `client/views/dashboard.vue`: render the loading shell and defer the sidebar item library.
- `client/components/sidebar.vue`: pass readiness to the item library without changing list navigation.
- `client/components/library-items.vue`: filter all items, calculate the virtual window, render spacers and visible rows, and rebind drag-and-drop after window changes.
- A small pure virtual-window utility: calculate start index, end index, and spacer heights from item count, row height, viewport height, scroll offset, and overscan.

## Data Flow

1. JavaScript loads and mounts Vue immediately.
2. The store enters `loading` and requests the authenticated library.
3. Public routes render normally; the editor route shows its loading shell.
4. The library is reconstructed and committed to the store.
5. The active list renders first.
6. The sidebar item library becomes ready on the next browser frame.
7. Filtering produces the complete logical result set.
8. Scroll position selects a small visible slice for DOM rendering.
9. Drag-and-drop binds only to the rendered slice and active categories.

## Error Handling

Authentication failures keep the existing redirect behavior. Other initialization failures replace the loading shell with the existing global error path and do not leave a permanently blank root element.

Virtualization falls back to an empty result for missing libraries and resets scroll position when filters reduce the result set below the current window.

## Testing

- Unit tests for virtual-window boundaries, overscan, empty collections, and end-of-list clamping.
- Unit tests for item membership using a `Set`.
- Existing unit tests and production build.
- Authenticated Playwright profiling with a temporary account copied from `fxbenard`, followed by automatic account deletion.
- Verify search, filters, visible-row editing, scrolling, and drag-and-drop.

## Acceptance Criteria

- A loading shell replaces the blank screen immediately.
- No pagination is introduced.
- The item library renders only the visible window plus overscan.
- All existing item actions work for visible rows.
- Initial DOM size is materially lower than the 5,177-node baseline.
- Initial editor visibility and editor-return timings improve in the same local profiling environment.
- No temporary profiling account remains after verification.
