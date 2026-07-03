<template>
    <section class="lpWelcomeProof">
        <div class="lpWelcomeProofHeader">
            <span class="lpWelcomeProofEyebrow">Product preview</span>
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
const TABS = [
    { id: 'gear', label: 'Gear library', src: '/images/screenshot-gear.png' },
    { id: 'list', label: 'Pack list', src: '/images/screenshot-list.png' },
    { id: 'community', label: 'Community', src: '/images/screenshot-community.png' },
];

export default {
    name: 'WelcomeProof',
    data() {
        return {
            activeTab: 'gear',
            tabs: TABS,
        };
    },
    computed: {
        activeTabData() {
            return this.tabs.find(t => t.id === this.activeTab);
        },
    },
};
</script>
