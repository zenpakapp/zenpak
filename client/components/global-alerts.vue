<style lang="scss">
@import "../css/_globals";

.lpGlobalAlerts {
    background: $color-warning;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0 0 10px 10px;
    border-top: none;
    color: #1a1a1a;
    left: 50%;
    margin: 0;
    padding: 0;
    position: fixed;
    text-align: center;
    top: 0;
    transform: translateX(-50%);
    width: 50%;
    z-index: $aboveDialog;
}

.lpGlobalAlert {
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    display: flex;
    gap: $spacingSmall;
    justify-content: space-between;
    list-style-type: none;
    margin: 0;
    padding: $spacingMedium;

    &:last-child {
        border-bottom: none;
    }
}

.lpGlobalAlertMessage {
    flex: 1;
}

.lpGlobalAlertDismiss {
    background: transparent;
    border: 0;
    color: #1a1a1a;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    opacity: 0.6;
    padding: 0;

    &:hover { opacity: 1; }
}
</style>

<template>
    <ul v-if="alerts && alerts.length" class="lpGlobalAlerts">
        <li v-for="alert in alerts" :key="alert.id || alert.message" class="lpGlobalAlert">
            <span class="lpGlobalAlertMessage">{{ alert.message }}</span>
            <button class="lpGlobalAlertDismiss" type="button" aria-label="Dismiss alert" @click="dismiss(alert.id)">
                ×
            </button>
        </li>
    </ul>
</template>

<script>

export default {
    name: 'GlobalAlerts',
    computed: {
        alerts() {
            return this.$store.state.globalAlerts;
        },
    },
    methods: {
        dismiss(alertId) {
            this.$store.commit('removeGlobalAlert', alertId);
        },
    },
};
</script>
