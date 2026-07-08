<template>
    <section class="lpWelcomeProof">
        <div class="lpWelcomeProofHeader">
            <span class="lpWelcomeProofEyebrow">{{ $t('misc.productPreview') }}</span>
            <div class="lpWelcomeProofTabs">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    class="lpWelcomeProofTab"
                    :class="{ lpWelcomeProofTabActive: activeTab === tab.id }"
                    @click="activeTab = tab.id"
                >
                    {{ tab.label }}
                </button>
            </div>
        </div>

        <div class="lpWelcomeScreenshotFrame">
            <div class="lpWelcomeScreenshotChrome">
                <span class="lpWelcomeScreenshotDot" />
                <span class="lpWelcomeScreenshotDot" />
                <span class="lpWelcomeScreenshotDot" />
                <span class="lpWelcomeScreenshotLabel">{{ activeTabData.label }}</span>
            </div>
            <div class="lpWelcomeScreenshotBody">
                <img
                    id="lpWelcomeScreenshot"
                    :src="activeTabData.src"
                    :alt="activeTabData.label"
                >
            </div>
        </div>
    </section>
</template>

<script>
export default {
    name: 'WelcomeProof',
    data() {
        return {
            activeTab: 'gear',
        };
    },
    computed: {
        tabs() {
            return [
                { id: 'gear', label: this.$t('misc.proofTabGearLibrary'), src: '/images/screenshot-gear.png' },
                { id: 'list', label: this.$t('misc.proofTabPackList'), src: '/images/screenshot-list.png' },
                { id: 'community', label: this.$t('misc.proofTabCommunity'), src: '/images/screenshot-community.png' },
            ];
        },
        activeTabData() {
            return this.tabs.find(t => t.id === this.activeTab);
        },
    },
};
</script>
