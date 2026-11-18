// Delays in milliseconds. Every setTimeout, setInterval and idle timeout in the client reads from here.
export const FEEDBACK_MS = 2000; // "saved" / "copied" notice, auto-close after success
export const BANNER_MS = 6000; // billing banners on the dashboard
export const DEBOUNCE_MS = 300; // search and filter inputs
export const BLUR_CLOSE_MS = 120; // let a click land before a suggestion list closes
export const HOVER_HIDE_MS = 50; // popover hide after the pointer leaves
export const STORE_POLL_MS = 50; // store waits for the library to be ready
export const IDLE_TIMEOUT_MS = 1000; // requestIdleCallback timeout for list and library work
export const SUMMARY_IDLE_MS = 1500; // list summary chart
export const DASHBOARD_IDLE_MS = 4000; // dashboard idle work
export const DASHBOARD_IDLE_FALLBACK_MS = 1500; // dashboard idle work without requestIdleCallback
export const KEYUP_SWALLOW_MS = 1000; // drop the stray keyup after a shortcut
export const STATUS_REFRESH_MS = 800; // publish status refresh after a change
export const NOTIFICATIONS_POLL_MS = 60000; // notification bell poll
