<style lang="scss">
@import "../css/_globals";

.lpNotifBell {
    align-items: center;
    color: $color-text-muted;
    cursor: pointer;
    display: flex;
    font-size: 18px;
    padding: 0 8px;
    position: relative;

    &:hover { color: $color-text; }
}

.lpNotifBadge {
    background: $color-accent;
    border-radius: 999px;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    min-width: 16px;
    padding: 2px 4px;
    position: absolute;
    right: 0;
    text-align: center;
    top: 0;
}

.lpNotifDropdown {
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    max-height: 360px;
    overflow-y: auto;
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 300px;
    z-index: $belowDialog;
}

.lpNotifHeader {
    align-items: center;
    border-bottom: 1px solid $color-border;
    display: flex;
    justify-content: space-between;
    padding: 10px 14px;

    span {
        color: $color-text;
        font-size: $fontSize-sm;
        font-weight: $fontWeight-bold;
    }

    button {
        background: none;
        border: none;
        color: $color-text-muted;
        cursor: pointer;
        font-size: $fontSize-sm;

        &:hover { color: $color-accent; }
    }
}

.lpNotifItem {
    border-bottom: 1px solid $color-border;
    padding: 10px 14px;

    &.unread {
        background: rgba(var(--color-accent-rgb), 0.06);
    }

    &:last-child { border-bottom: none; }
}

.lpNotifText {
    color: $color-text;
    font-size: $fontSize-sm;
    line-height: 1.4;
}

.lpNotifTime {
    color: $color-text-muted;
    font-size: 11px;
    margin-top: 2px;
}

.lpNotifEmpty {
    color: $color-text-muted;
    font-size: $fontSize-sm;
    padding: 20px;
    text-align: center;
}
</style>

<template>
    <div class="lpNotifBell" style="position:relative" @click="toggle">
        🔔
        <span v-if="unreadCount > 0" class="lpNotifBadge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>

        <div v-if="open" class="lpNotifDropdown" @click.stop>
            <div class="lpNotifHeader">
                <span>Notifications</span>
                <button v-if="unreadCount > 0" @click="markAllRead">Mark all read</button>
            </div>
            <p v-if="notifications.length === 0" class="lpNotifEmpty">No notifications yet.</p>
            <div
                v-for="n in notifications"
                :key="String(n._id)"
                class="lpNotifItem"
                :class="{ unread: !n.read }"
            >
                <div class="lpNotifText">{{ formatText(n) }}</div>
                <div class="lpNotifTime">{{ timeAgo(n.createdAt) }}</div>
            </div>
        </div>
    </div>
</template>

<script>
import { fetchJson } from '../utils/utils.js';

export default {
    name: 'Notifications',
    data() {
        return {
            open: false,
            notifications: [],
            unreadCount: 0,
            pollInterval: null,
        };
    },
    mounted() {
        this.load();
        this.pollInterval = setInterval(() => this.load(), 60000);
        document.addEventListener('click', this.onOutsideClick);
    },
    beforeUnmount() {
        clearInterval(this.pollInterval);
        document.removeEventListener('click', this.onOutsideClick);
    },
    methods: {
        async load() {
            try {
                const data = await fetchJson('/api/notifications');
                this.notifications = data.notifications || [];
                this.unreadCount = data.unreadCount || 0;
            } catch {
                // silent
            }
        },
        toggle() {
            this.open = !this.open;
        },
        onOutsideClick() {
            this.open = false;
        },
        async markAllRead() {
            try {
                await fetchJson('/api/notifications/read-all', { method: 'POST' });
                this.notifications = this.notifications.map(n => ({ ...n, read: true }));
                this.unreadCount = 0;
            } catch {
                // silent
            }
        },
        formatText(n) {
            if (n.type === 'follow') return `${n.actorUsername} started following you`;
            if (n.type === 'copy') return `${n.actorUsername} copied your list "${n.listName}"`;
            return '';
        },
        timeAgo(date) {
            const diff = Date.now() - new Date(date).getTime();
            const m = Math.floor(diff / 60000);
            if (m < 1) return 'just now';
            if (m < 60) return `${m}m ago`;
            const h = Math.floor(m / 60);
            if (h < 24) return `${h}h ago`;
            return `${Math.floor(h / 24)}d ago`;
        },
    },
};
</script>
