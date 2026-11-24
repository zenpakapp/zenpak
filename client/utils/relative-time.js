export function formatRelativeTime(date, locale, translate) {
    const diff = Date.now() - Date.parse(date);
    if (!Number.isFinite(diff)) return '';

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return translate('misc.timeJustNow');
    if (minutes < 60) return translate('misc.timeMinutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return translate('misc.timeHoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return translate('misc.timeDaysAgo', { count: days });

    const formatter = new Intl.RelativeTimeFormat(locale, { style: 'short' });
    if (days < 30) return formatter.format(-Math.floor(days / 7), 'week');
    if (days < 365) return formatter.format(-Math.floor(days / 30), 'month');
    return formatter.format(-Math.floor(days / 365), 'year');
}
