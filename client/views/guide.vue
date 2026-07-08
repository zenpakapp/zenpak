<template>
    <div class="lpGuide">
        <div class="lpGuideNav">
            <router-link :to="backTo" class="lpGuideBack">{{ backLabel }}</router-link>
            <router-link v-if="username" :to="`/u/${username}`" class="lpGuideViewProfile">{{ $t('guide.viewProfile') }}</router-link>
        </div>
        <h1 class="lpGuideTitle">{{ $t('guide.title') }}</h1>

        <!-- Section: Public Profile -->
        <section class="lpGuideSection">
            <h2 class="lpGuideSectionTitle">{{ $t('guide.publicProfile') }}</h2>
            <div class="lpGuideField">
                <label class="lpGuideLabel" for="guideBio">{{ $t('guide.bio') }}</label>
                <textarea id="guideBio" v-model="profile.bio" class="lpGuideTextarea" maxlength="500" rows="4" :placeholder="$t('guide.bioPlaceholder')" />
                <span class="lpGuideCharCount">{{ profile.bio.length }}/500</span>
            </div>
            <div class="lpGuideField">
                <label class="lpGuideLabel">{{ $t('guide.links') }}</label>
                <div v-for="(link, i) in profile.links" :key="i" class="lpGuideRow">
                    <input v-model="link.label" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.linksLabel')" maxlength="100" />
                    <input v-model="link.url" class="lpGuideInput" :placeholder="$t('guide.linksPlaceholder')" maxlength="500" />
                    <button class="lpGuideRemove" @click="profile.links.splice(i, 1)">{{ $t('guide.removeButton') }}</button>
                </div>
                <button v-if="profile.links.length < 5" class="lpGuideAdd" @click="profile.links.push({ label: '', url: '' })">{{ $t('guide.linksAddButton') }}</button>
            </div>
            <div class="lpGuideField">
                <label class="lpGuideLabel">{{ $t('guide.gearPhilosophy') }}</label>
                <div v-for="(item, i) in profile.gearPhilosophy" :key="i" class="lpGuideRow">
                    <input v-model="profile.gearPhilosophy[i]" class="lpGuideInput" :placeholder="$t('guide.gearPhilosophyPlaceholder')" maxlength="100" />
                    <button class="lpGuideRemove" @click="profile.gearPhilosophy.splice(i, 1)">{{ $t('guide.removeButton') }}</button>
                </div>
                <button v-if="profile.gearPhilosophy.length < 5" class="lpGuideAdd" @click="profile.gearPhilosophy.push('')">{{ $t('guide.addButton') }}</button>
            </div>
            <div class="lpGuideSaveRow">
                <button class="lpButton" :disabled="savingProfile" @click="saveProfile">
                    {{ savingProfile ? $t('guide.savingLabel') : $t('guide.saveChanges') }}
                </button>
                <span v-if="profileSaved" class="lpGuideSavedFeedback">{{ $t('guide.profileSaved') }}</span>
            </div>
        </section>

        <!-- Section: Affiliate Rules -->
        <section class="lpGuideSection">
            <h2 class="lpGuideSectionTitle">{{ $t('guide.affiliateRules') }}</h2>
            <p class="lpGuideHint">{{ $t('guide.affiliateRulesHint') }}</p>
            <div v-for="(rule, i) in affiliateRules" :key="i" class="lpGuideRuleRow">
                <select v-model="rule.type" class="lpGuideSelect">
                    <option value="brand">{{ $t('guide.ruleTypeBrand') }}</option>
                    <option value="shop">{{ $t('guide.ruleTypeShop') }}</option>
                    <option value="domain">{{ $t('guide.ruleTypeDomain') }}</option>
                </select>
                <input v-model="rule.match" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.ruleMatch')" maxlength="200" />
                <input v-model="rule.affiliateUrl" class="lpGuideInput" :placeholder="$t('guide.ruleAffiliateUrl')" maxlength="500" />
                <input v-model="rule.appendParam" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.ruleAppendParam')" maxlength="200" />
                <input v-model="rule.promoCode" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.rulePromoCode')" maxlength="100" />
                <input v-model="rule.promoLabel" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.rulePromoLabel')" maxlength="100" />
                <button class="lpGuideRemove" @click="removeRule(i)">{{ $t('guide.removeButton') }}</button>
            </div>
            <button class="lpGuideAdd" @click="addRule">{{ $t('guide.addRuleButton') }}</button>
            <div class="lpGuideField lpGuideFieldTop">
                <label class="lpGuideLabel" for="guideDisclosure">{{ $t('guide.affiliateDisclosure') }}</label>
                <textarea id="guideDisclosure" v-model="disclosure" class="lpGuideTextarea" maxlength="500" rows="2" :placeholder="$t('guide.affiliateDisclosurePlaceholder')" />
            </div>
            <div class="lpGuideSaveRow">
                <button class="lpButton" :disabled="savingRules" @click="saveAffiliateRules">
                    {{ savingRules ? $t('guide.savingLabel') : $t('guide.saveChanges') }}
                </button>
                <span v-if="rulesSaved" class="lpGuideSavedFeedback">{{ $t('guide.rulesSaved') }}</span>
            </div>
        </section>

        <!-- Section: Items -->
        <section class="lpGuideSection">
            <h2 class="lpGuideSectionTitle">{{ $t('guide.items') }}</h2>
            <p class="lpGuideHint">{{ $t('guide.itemsHint') }}</p>
            <div v-if="loadingItems" class="lpGuideLoading">{{ $t('guide.loadingItems') }}</div>
            <div v-else-if="itemGroups.length === 0" class="lpGuideEmpty">{{ $t('guide.noPublicLists') }}</div>
            <div v-else>
                <div v-for="group in itemGroups" :key="group.listId" class="lpGuideListGroup">
                    <h3 class="lpGuideListName">{{ group.listName }}</h3>
                    <div v-for="item in group.items" :key="item.itemId" class="lpGuideItemRow">
                        <span class="lpGuideItemName">{{ item.name }}</span>
                        <span v-if="item.appliedRule" class="lpGuideRuleBadge">{{ $t('guide.itemRuleBadge', { rule: item.appliedRule }) }}</span>
                        <input v-model="item.affiliateUrl" class="lpGuideInput" :placeholder="$t('guide.itemAffiliateUrlPlaceholder')" maxlength="500" />
                        <input v-model="item.promoCode" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.rulePromoCode')" maxlength="100" />
                        <input v-model="item.promoLabel" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.rulePromoLabel')" maxlength="100" />
                    </div>
                </div>
            </div>
            <div class="lpGuideSaveRow">
                <button class="lpButton" :disabled="savingItems || loadingItems" @click="saveItems">
                    {{ savingItems ? $t('guide.savingLabel') : $t('guide.saveChanges') }}
                </button>
                <span v-if="itemsSaved" class="lpGuideSavedFeedback">{{ $t('guide.itemsError') }}</span>
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
