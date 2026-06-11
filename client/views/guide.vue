<template>
    <div class="lpGuide">
        <h1 class="lpGuideTitle">Guide Settings</h1>

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
                <input v-model="rule.affiliateUrl" class="lpGuideInput" placeholder="Affiliate URL" maxlength="500" />
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

export default {
    name: 'GuideView',
    setup() {
        const guide = useGuide();
        guide.loadItems();
        return guide;
    },
};
</script>

<style lang="scss">
.lpGuide {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

.lpGuideTitle {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 2rem;
}

.lpGuideSection {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    background: var(--color-bg);
}

.lpGuideSectionTitle {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.lpGuideField {
    margin-bottom: 1rem;
}

.lpGuideFieldTop {
    margin-top: 1rem;
}

.lpGuideLabel {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.3rem;
    color: var(--color-text-muted);
}

.lpGuideTextarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-input-bg, var(--color-bg));
    color: var(--color-text);
    font-size: 0.9rem;
    resize: vertical;
    box-sizing: border-box;
}

.lpGuideCharCount {
    font-size: 0.75rem;
    color: var(--color-text-muted);
}

.lpGuideInput {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-input-bg, var(--color-bg));
    color: var(--color-text);
    font-size: 0.9rem;
    flex: 1;
    min-width: 0;
}

.lpGuideInputShort {
    flex: 0 0 140px;
}

.lpGuideSelect {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-input-bg, var(--color-bg));
    color: var(--color-text);
    font-size: 0.9rem;
    flex: 0 0 90px;
}

.lpGuideRow,
.lpGuideRuleRow,
.lpGuideItemRow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
}

.lpGuideItemName {
    font-size: 0.9rem;
    flex: 0 0 160px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.lpGuideRuleBadge {
    font-size: 0.75rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    background: var(--color-badge-bg, #e8f4e8);
    color: var(--color-badge-text, #2d6a2d);
    white-space: nowrap;
}

.lpGuideAdd {
    background: none;
    border: none;
    color: var(--color-link);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.3rem 0;
    margin-top: 0.25rem;

    &:hover {
        text-decoration: underline;
    }
}

.lpGuideRemove {
    background: none;
    border: none;
    color: var(--color-danger, #c00);
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.3rem 0;
    white-space: nowrap;

    &:hover {
        text-decoration: underline;
    }
}

.lpGuideSaveRow {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1.25rem;
}

.lpGuideSavedFeedback {
    font-size: 0.85rem;
    color: var(--color-success, #2d6a2d);
}

.lpGuideListGroup {
    margin-bottom: 1.5rem;
}

.lpGuideListName {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text-muted);
}

.lpGuideHint {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-bottom: 1rem;
}

.lpGuideLoading,
.lpGuideEmpty {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    padding: 1rem 0;
}

.lpGuideError {
    color: var(--color-danger, #c00);
    font-size: 0.9rem;
    margin-top: 1rem;
}
</style>
