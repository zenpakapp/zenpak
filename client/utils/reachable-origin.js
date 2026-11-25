// The address a link or a QR code should carry. On localhost it would point to an address another
// phone cannot open: then the address the server is configured with is used, when that one is
// reachable. Anywhere else the current address is already the right one.
export async function reachableOrigin(current = window.location.origin) {
    const isLocal = (host) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
    if (!isLocal(window.location.hostname)) return current;
    try {
        const res = await fetch('/api/public/origin');
        const { origin } = await res.json();
        if (origin && !isLocal(new URL(origin).hostname)) return origin.replace(/\/$/, '');
    } catch (err) {
        // Keep the current address.
    }
    return current;
}
