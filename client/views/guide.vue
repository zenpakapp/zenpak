<template>
    <div class="lpGuide">
        <div class="lpGuideNav">
            <router-link :to="backTo" class="lpGuideBack">
                {{ $t(backLabelKey) }}
            </router-link>
            <router-link v-if="username" :to="`/u/${username}`" class="lpGuideViewProfile">
                {{ $t('guide.viewProfile') }}
            </router-link>
        </div>
        <h1 class="lpGuideTitle">
            {{ $t('guide.title') }}
        </h1>

        <section class="lpGuideSection">
            <profile-insights />
        </section>

        <!-- Section: Public Profile -->
        <section class="lpGuideSection">
            <h2 class="lpGuideSectionTitle">
                {{ $t('guide.publicProfile') }}
            </h2>
            <div class="lpGuideField">
                <label class="lpGuideLabel">{{ $t('guide.links') }}</label>
                <div v-for="(link, i) in profile.links" :key="i" class="lpGuideRow">
                    <input v-model="link.label" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.linksLabel')" maxlength="100">
                    <input v-model="link.url" class="lpGuideInput" :placeholder="$t('guide.linksPlaceholder')" maxlength="500">
                    <button class="lpGuideRemove" @click="profile.links.splice(i, 1)">
                        {{ $t('guide.removeButton') }}
                    </button>
                </div>
                <button v-if="profile.links.length < 5" class="lpGuideAdd" @click="profile.links.push({ label: '', url: '' })">
                    {{ $t('guide.linksAddButton') }}
                </button>
            </div>
            <div class="lpGuideField">
                <label class="lpGuideLabel">{{ $t('guide.gearPhilosophy') }}</label>
                <div v-for="(item, i) in profile.gearPhilosophy" :key="i" class="lpGuideRow">
                    <input v-model="profile.gearPhilosophy[i]" class="lpGuideInput" :placeholder="$t('guide.gearPhilosophyPlaceholder')" maxlength="100">
                    <button class="lpGuideRemove" @click="profile.gearPhilosophy.splice(i, 1)">
                        {{ $t('guide.removeButton') }}
                    </button>
                </div>
                <button v-if="profile.gearPhilosophy.length < 5" class="lpGuideAdd" @click="profile.gearPhilosophy.push('')">
                    {{ $t('guide.addButton') }}
                </button>
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
            <h2 class="lpGuideSectionTitle">
                {{ $t('guide.affiliateRules') }}
            </h2>
            <p class="lpGuideHint">
                {{ $t('guide.affiliateRulesHint') }}
            </p>
            <div v-for="(rule, i) in affiliateRules" :key="i" class="lpGuideRule">
                <div class="lpGuideRuleRow">
                    <label class="lpGuideRuleField">
                        <span class="lpGuideRuleFieldLabel">{{ $t('guide.ruleFieldType') }}</span>
                        <select v-model="rule.type" class="lpGuideSelect">
                            <option value="brand">
                                {{ $t('guide.ruleTypeBrand') }}
                            </option>
                            <option value="shop">
                                {{ $t('guide.ruleTypeShop') }}
                            </option>
                            <option value="domain">
                                {{ $t('guide.ruleTypeDomain') }}
                            </option>
                        </select>
                    </label>
                    <label class="lpGuideRuleField lpGuideRuleFieldWide">
                        <span class="lpGuideRuleFieldLabel">{{ $t(`guide.ruleFieldMatch.${rule.type}`) }}</span>
                        <input v-model="rule.match" class="lpGuideInput" :placeholder="$t(`guide.ruleMatchPlaceholder.${rule.type}`)" maxlength="200">
                    </label>
                    <label class="lpGuideRuleField">
                        <span class="lpGuideRuleFieldLabel">{{ $t('guide.ruleFieldCode') }}</span>
                        <input v-model="rule.promoCode" class="lpGuideInput" :placeholder="$t('guide.rulePromoCodePlaceholder')" maxlength="100">
                    </label>
                    <label class="lpGuideRuleField lpGuideRuleFieldWide">
                        <span class="lpGuideRuleFieldLabel">{{ $t('guide.ruleFieldLabel') }}</span>
                        <input v-model="rule.promoLabel" class="lpGuideInput" :placeholder="$t('guide.rulePromoLabelPlaceholder')" maxlength="100">
                    </label>
                    <button class="lpGuideRemove" @click="removeRule(i)">
                        {{ $t('guide.removeButton') }}
                    </button>
                </div>
                <p class="lpGuideRuleHelp">
                    {{ $t(`guide.ruleHelp.${rule.type}`) }}
                </p>
                <p v-if="hasDomainProblem(rule)" class="lpGuideRuleWarning" role="alert">
                    {{ $t('guide.ruleDomainWarning') }}
                </p>
            </div>
            <button class="lpGuideAdd lpGuideAddRule" @click="addRule">
                {{ $t('guide.addRuleButton') }}
            </button>
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
            <h2 class="lpGuideSectionTitle">
                {{ $t('guide.items') }}
            </h2>
            <p class="lpGuideHint">
                {{ $t('guide.itemsHint') }}
            </p>
            <div v-if="loadingItems" class="lpGuideLoading">
                {{ $t('guide.loadingItems') }}
            </div>
            <div v-else-if="itemRows.length === 0" class="lpGuideEmpty">
                {{ $t('guide.noPublicLists') }}
            </div>
            <div v-else>
                <div class="lpGuideItemTools">
                    <input v-model="itemQuery" type="search" class="lpGuideInput lpGuideItemSearch" :placeholder="$t('guide.itemSearchPlaceholder')" :aria-label="$t('guide.itemSearchPlaceholder')">
                    <select v-model="itemListId" class="lpGuideSelect" :aria-label="$t('guide.itemListFilter')">
                        <option value="">
                            {{ $t('guide.itemAllLists') }}
                        </option>
                        <option v-for="list in itemLists" :key="list.listId" :value="list.listId">
                            {{ list.listName }}
                        </option>
                    </select>
                    <select v-model="itemMode" class="lpGuideSelect" :aria-label="$t('guide.itemModeFilter')">
                        <option value="all">
                            {{ $t('guide.itemModeAll') }}
                        </option>
                        <option value="todo">
                            {{ $t('guide.itemModeTodo') }}
                        </option>
                        <option value="filled">
                            {{ $t('guide.itemModeFilled') }}
                        </option>
                        <option value="rule">
                            {{ $t('guide.itemModeRule') }}
                        </option>
                    </select>
                </div>
                <p class="lpGuideItemCount">
                    {{ $t('guide.itemCount', { shown: filteredRows.length, total: itemRows.length }) }}
                </p>
                <div v-if="filteredRows.length === 0" class="lpGuideEmpty">
                    {{ $t('guide.itemNoMatch') }}
                </div>
                <div v-for="row in visibleRows" :key="row.itemId" class="lpGuideItemRow">
                    <div class="lpGuideItemInfo">
                        <span class="lpGuideItemName" :title="row.name">{{ row.name }}</span>
                        <span class="lpGuideItemLists" :title="row.lists.map((list) => list.listName).join(', ')">{{ listsLabel(row) }}</span>
                        <span v-if="row.appliedRule" class="lpGuideRuleBadge">{{ $t('guide.itemRuleBadge', { rule: row.appliedRule }) }}</span>
                    </div>
                    <input v-model="row.affiliateUrl" class="lpGuideInput lpGuideInputGrow" :placeholder="$t('guide.itemAffiliateUrlPlaceholder')" maxlength="500">
                    <input v-model="row.promoCode" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.rulePromoCode')" maxlength="100">
                    <input v-model="row.promoLabel" class="lpGuideInput lpGuideInputShort" :placeholder="$t('guide.rulePromoLabel')" maxlength="100">
                </div>
                <button v-if="hiddenCount > 0" class="lpGuideAdd" @click="itemLimit += ITEM_PAGE">
                    {{ $t('guide.itemShowMore', { count: hiddenCount }) }}
                </button>
            </div>
            <div class="lpGuideSaveRow">
                <button class="lpButton" :disabled="savingItems || loadingItems" @click="saveItems">
                    {{ savingItems ? $t('guide.savingLabel') : $t('guide.saveChanges') }}
                </button>
                <span v-if="itemsSaved" class="lpGuideSavedFeedback">{{ $t('guide.itemsError') }}</span>
            </div>
        </section>

        <div v-if="error" class="lpGuideError">
            {{ error }}
        </div>
    </div>
</template>

<script>
import { useGuide } from '../composables/useGuide.js';
import { useBackNav } from '../composables/useBackNav.js';
import { hasFeature, FEATURES } from '../services/entitlements.js';
import { push } from '../services/navigation.js';
import promoLink from '../utils/promo-link';
import profileInsights from '../components/profile-insights.vue';

const { filterRows } = require('../utils/guide-items.js');

const ITEM_PAGE = 30;

export default {
    name: 'GuideView',
    components: { profileInsights },
    setup() {
        const guide = useGuide();
        const nav = useBackNav();
        return { ...guide, backTo: nav.backTo, backLabelKey: nav.backLabelKey };
    },
    data() {
        return {
            itemQuery: '', itemListId: '', itemMode: 'all', itemLimit: ITEM_PAGE, ITEM_PAGE,
        };
    },
    computed: {
        filteredRows() {
            return filterRows(this.itemRows, { query: this.itemQuery, listId: this.itemListId, mode: this.itemMode });
        },
        visibleRows() {
            return this.filteredRows.slice(0, this.itemLimit);
        },
        hiddenCount() {
            return Math.max(0, this.filteredRows.length - this.itemLimit);
        },
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
    methods: {
        listsLabel(row) {
            return row.lists.length === 1 ? row.lists[0].listName : this.$t('guide.itemInLists', { count: row.lists.length });
        },
        // A "domain" rule needs a web address, or it matches no item link. An empty value is
        // not flagged: the row is simply unfinished.
        hasDomainProblem(rule) {
            return rule.type === 'domain'
                && String(rule.match || '').trim() !== ''
                && !promoLink.ruleHostname(rule);
        },
    },
    watch: {
        itemQuery() { this.itemLimit = ITEM_PAGE; },
        itemListId() { this.itemLimit = ITEM_PAGE; },
        itemMode() { this.itemLimit = ITEM_PAGE; },
        isGuide(val) {
            if (val) {
                this.loadProfile();
                this.loadItems();
            }
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
