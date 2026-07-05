<template>
    <div class="lpGuide">
        <div class="lpGuideNav">
            <router-link :to="backTo" class="lpGuideBack">{{ backLabel }}</router-link>
            <router-link v-if="username" :to="`/u/${username}`" class="lpGuideViewProfile">View my profile →</router-link>
        </div>
        <h1 class="lpGuideTitle">Wayfarer Settings</h1>

        <!-- Section: Public Profile -->
        <section class="lpGuideSection">
            <h2 class="lpGuideSectionTitle">Public Profile</h2>
            <div class="lpGuideField">
                <label class="lpGuideLabel" for="guideBio">Bio</label>
                <textarea id="guideBio" v-model="profile.bio" class="lpGuideTextarea" maxlength="500" rows="4" placeholder="Tell the community about yourself..." />
                <span class="lpGuideCharCount">{{ profile.bio.length }}/500</span>
            </div>
            <div class="lpGuideField">
                <label class="lpGuideLabel">Links</label>
                <div v-for="(link, i) in profile.links" :key="i" class="lpGuideRow">
                    <input v-model="link.label" class="lpGuideInput lpGuideInputShort" placeholder="Label" maxlength="100" />
                    <input v-model="link.url" class="lpGuideInput" placeholder="https://..." maxlength="500" />
                    <button class="lpGuideRemove" @click="profile.links.splice(i, 1)">Remove</button>
                </div>
                <button v-if="profile.links.length < 5" class="lpGuideAdd" @click="profile.links.push({ label: '', url: '' })">+ Add link</button>
            </div>
            <div class="lpGuideField">
                <label class="lpGuideLabel">Gear Philosophy</label>
                <div v-for="(item, i) in profile.gearPhilosophy" :key="i" class="lpGuideRow">
                    <input v-model="profile.gearPhilosophy[i]" class="lpGuideInput" placeholder="e.g. Ultralight first" maxlength="100" />
                    <button class="lpGuideRemove" @click="profile.gearPhilosophy.splice(i, 1)">Remove</button>
                </div>
                <button v-if="profile.gearPhilosophy.length < 5" class="lpGuideAdd" @click="profile.gearPhilosophy.push('')">+ Add</button>
            </div>
            <div class="lpGuideSaveRow">
                <button class="lpButton" :disabled="savingProfile" @click="saveProfile">
                    {{ savingProfile ? 'Saving…' : 'Save changes' }}
                </button>
                <span v-if="profileSaved" class="lpGuideSavedFeedback">Profile saved ✓</span>
            </div>
        </section>

        <!-- Section: Affiliate Rules -->
        <section class="lpGuideSection">
            <h2 class="lpGuideSectionTitle">Affiliate Rules</h2>
            <p class="lpGuideHint">Rules apply automatically to all your public list items. An item-level override (below) takes priority.</p>
            <div v-for="(rule, i) in affiliateRules" :key="i" class="lpGuideRuleRow">
                <select v-model="rule.type" class="lpGuideSelect">
                    <option value="brand">Brand</option>
                    <option value="shop">Shop</option>
                    <option value="domain">Domain</option>
                </select>
                <input v-model="rule.match" class="lpGuideInput lpGuideInputShort" placeholder="e.g. Zpacks" maxlength="200" />
                <input v-model="rule.affiliateUrl" class="lpGuideInput" placeholder="Affiliate URL (replaces)" maxlength="500" />
                <input v-model="rule.appendParam" class="lpGuideInput lpGuideInputShort" placeholder="Append param (e.g. tag=xyz)" maxlength="200" />
                <input v-model="rule.promoCode" class="lpGuideInput lpGuideInputShort" placeholder="Code" maxlength="100" />
                <input v-model="rule.promoLabel" class="lpGuideInput lpGuideInputShort" placeholder="Label (e.g. 10% off)" maxlength="100" />
                <button class="lpGuideRemove" @click="removeRule(i)">Remove</button>
            </div>
            <button class="lpGuideAdd" @click="addRule">+ Add rule</button>
            <div class="lpGuideField lpGuideFieldTop">
                <label class="lpGuideLabel" for="guideDisclosure">Affiliate disclosure</label>
                <textarea id="guideDisclosure" v-model="disclosure" class="lpGuideTextarea" maxlength="500" rows="2" placeholder="e.g. Some links are affiliate links. Using them costs you nothing extra." />
            </div>
            <div class="lpGuideSaveRow">
                <button class="lpButton" :disabled="savingRules" @click="saveAffiliateRules">
                    {{ savingRules ? 'Saving…' : 'Save changes' }}
                </button>
                <span v-if="rulesSaved" class="lpGuideSavedFeedback">Rules saved ✓</span>
            </div>
        </section>

        <!-- Section: Items -->
        <section class="lpGuideSection">
            <h2 class="lpGuideSectionTitle">Items</h2>
            <p class="lpGuideHint">Override affiliate links and promo codes on individual items across your public lists.</p>
            <div v-if="loadingItems" class="lpGuideLoading">Loading items…</div>
            <div v-else-if="itemGroups.length === 0" class="lpGuideEmpty">No public lists yet.</div>
            <div v-else>
                <div v-for="group in itemGroups" :key="group.listId" class="lpGuideListGroup">
                    <h3 class="lpGuideListName">{{ group.listName }}</h3>
                    <div v-for="item in group.items" :key="item.itemId" class="lpGuideItemRow">
                        <span class="lpGuideItemName">{{ item.name }}</span>
                        <span v-if="item.appliedRule" class="lpGuideRuleBadge">Rule: {{ item.appliedRule }}</span>
                        <input v-model="item.affiliateUrl" class="lpGuideInput" placeholder="Affiliate URL override" maxlength="500" />
                        <input v-model="item.promoCode" class="lpGuideInput lpGuideInputShort" placeholder="Code" maxlength="100" />
                        <input v-model="item.promoLabel" class="lpGuideInput lpGuideInputShort" placeholder="Label" maxlength="100" />
                    </div>
                </div>
            </div>
            <div class="lpGuideSaveRow">
                <button class="lpButton" :disabled="savingItems || loadingItems" @click="saveItems">
                    {{ savingItems ? 'Saving…' : 'Save changes' }}
                </button>
                <span v-if="itemsSaved" class="lpGuideSavedFeedback">Items saved ✓</span>
            </div>
        </section>

        <div v-if="error" class="lpGuideError">{{ error }}</div>
    </div>
</template>

<script>
import { useGuide } from '../composables/useGuide.js';
import { useBackNav } from '../composables/useBackNav.js';
import { hasFeature, FEATURES } from '../services/entitlements.js';
import { push } from '../services/navigation.js';

export default {
    name: 'GuideView',
    setup() {
        const guide = useGuide();
        const nav = useBackNav();
        return { ...guide, backTo: nav.backTo, backLabel: nav.backLabel };
    },
    computed: {
        isGuide() {
            const billing = this.$store && this.$store.state && this.$store.state.billing;
            if (billing && billing.plan === 'creator') return true;
            const lib = this.$store && this.$store.state && this.$store.state.library;
            return lib && lib.entitlements && lib.entitlements.plan === 'creator';
        },
        username() {
            return this.$store && this.$store.state && this.$store.state.loggedIn;
        },
    },
    created() {
        const billing = this.$store.state.billing;
        if (billing && billing.plan === 'creator') return;
        const lib = this.$store.state.library;
        const isGuide = lib && lib.entitlements && hasFeature(lib.entitlements, FEATURES.CREATOR_INSIGHTS);
        if (!isGuide) {
            push('/?upgradeGuide=1');
        }
    },
    watch: {
        isGuide(val) {
            if (val) {
                this.loadProfile();
                this.loadItems();
            }
        },
    },
    mounted() {
        if (this.isGuide) {
            this.loadProfile();
            this.loadItems();
        }
    },
};
</script>

<style lang="scss">
@import "../css/_guide";
</style>
