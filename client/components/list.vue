<style lang="scss">
@import "../css/_list";
</style>

<template>
    <div class="lpListBody">
        <!-- Packing mode bar -->
        <div v-if="isPackingMode" class="lpPackingBar">
            <span class="lpPackingProgress">{{ $t('list.itemsPacked', { packed: packingProgress.packed, total: packingProgress.total }) }}</span>
            <div class="lpPackingProgressTrack">
                <div class="lpPackingProgressFill" :style="{ width: packingProgressPct + '%' }" />
            </div>
            <button class="lpPackBtn lpPackBtnExit" @click="exitPackingMode">{{ $t('list.exitPacking') }}</button>
        </div>

        <!-- Completion modal -->
        <div v-if="showCompletionModal" class="lpPackModal" @click.self="showCompletionModal = false">
            <div class="lpPackModalInner">
                <p class="lpPackModalPhrase">{{ completionPhrase }}</p>
                <p class="lpPackModalWeight">{{ $t('list.packTotal', { weight: packTotalWeight }) }}</p>
                <div class="lpPackModalActions">
                    <button class="lpPackModalBtn lpPackModalBtnReset" @click="resetPacking">{{ $t('list.reset') }}</button>
                    <button class="lpPackModalBtn lpPackModalBtnClose" @click="showCompletionModal = false">{{ $t('list.close') }}</button>
                </div>
            </div>
        </div>

        <div v-if="isListNew" id="getStarted">
            <h2>
                <zenpak-brand-asset class="lpGetStartedBrandIcon" variant="app" alt="" :decorative="true" />
                {{ $t('list.getStartedTitle') }}
            </h2>
            <p>{{ $t('list.getStartedIntro') }}</p>
            <ol>
                <li>{{ $t('list.getStartedStep1') }}</li>
                <li>{{ $t('list.getStartedStep2') }}</li>
                <li v-if="!isLocalSaving">{{ $t('list.getStartedStep3') }}</li>
            </ol>
            <p class="lpGetStartedCommunity">
                {{ $t('list.communityHint') }}
                <router-link to="/community" class="lpHref">{{ $t('list.communityHintCta') }}</router-link>
            </p>
        </div>
        <list-summary v-if="!isListNew" :list="list" />

        <div v-if="!isListNew && !isPackingMode" style="margin-bottom: 10px;">
            <button class="lpPackBtn" @click="enterPackingMode">🎒 {{ $t('list.packThis') }}</button>
        </div>

        <div v-if="showGuestHint && !isPackingMode" class="lpCommunityHint">
            <span>{{ $t('list.guestHint') }}</span>
            <router-link to="/register" class="lpCommunityHintCta">{{ $t('list.guestHintCta') }}</router-link>
            <button class="lpCommunityHintDismiss" @click="dismissGuestHint">✕</button>
        </div>

        <div v-if="showCommunityHint && !isPackingMode" class="lpCommunityHint">
            <span>{{ $t('list.communityHint') }}</span>
            <router-link to="/community" class="lpCommunityHintCta">{{ $t('list.communityHintCta') }}</router-link>
            <button class="lpCommunityHintDismiss" @click="dismissCommunityHint">✕</button>
        </div>

        <div style="clear: both;" />

        <div v-if="library.optionalFields['listDescription']" id="listDescriptionContainer">
            <h3>{{ $t('list.listDescription') }}</h3> <p>(<a href="https://guides.github.com/features/mastering-markdown/" target="_blank" class="lpHref">Markdown</a> {{ $t('list.markdownSupported') }})</p>
            <textarea id="listDescription" v-model="list.description" @input="updateListDescription" />
        </div>

        <TransitionGroup name="lp-list" tag="ul" ref="categories" class="lpCategories">
            <category
                v-for="category in categories"
                :key="category.id"
                :category="category"
                :is-packing-mode="isPackingMode"
                :packed-item-ids="packedItemIds"
                @toggle-pack="onTogglePack"
            />
        </TransitionGroup>

        <hr>

        <a v-if="!isPackingMode" class="lpAdd addCategory" @click="newCategory"><i class="lpSprite lpSpriteAdd" />{{ $t('list.addCategory') }}</a>
    </div>
</template>

<script>
import category from './category.vue';
import listSummary from './list-summary.vue';
import ZenpakBrandAsset from './zenpak-brand-asset.vue';
import { getElementIndex } from '../utils/utils';
import { createDragDrop, getDatasetInt, queryContainers } from '../services/drag-drop';
import { usePackingMode } from '../composables/usePackingMode.js';
import phrasesEn from '../data/packing-phrases.en.js';
import phrasesFr from '../data/packing-phrases.fr.js';
import weightUtils from '../utils/weight.js';

export default {
    name: 'List',
    components: {
        listSummary,
        category,
        ZenpakBrandAsset,
        categoryDragStartIndex: false,
        itemDragId: false,
    },
    setup() {
        const { isPackingMode, packedItemIds, activate, deactivate, toggleItem, reset } = usePackingMode();
        return { isPackingMode, packedItemIds, activate, deactivate, toggleItem, reset };
    },
    data() {
        return {
            onboardingCompleted: false,
            itemDrake: null,
            categoryDrake: null,
            showCompletionModal: false,
            completionPhrase: '',
            communityHintDismissed: !!localStorage.getItem('lpCommunityHintDismissed'),
            guestHintDismissed: !!localStorage.getItem('lpGuestHintDismissed'),
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        list() {
            return this.$store.getters.activeList;
        },
        categories() {
            return this.list.categoryIds.map(id => this.library.getCategoryById(id)).filter(Boolean);
        },
        isListNew() {
            return this.list.totalWeight === 0 && this.categories.every(c => c.categoryItems.length === 0);
        },
        isLocalSaving() {
            return this.$store.state.saveType === 'local';
        },
        isSignedIn() {
            return this.$store.state.loggedIn;
        },
        showCommunityHint() {
            return this.isSignedIn && !this.isListNew && !this.communityHintDismissed;
        },
        showGuestHint() {
            return this.isLocalSaving && !this.isListNew && !this.guestHintDismissed;
        },
        allItemIds() {
            return this.categories.flatMap(cat =>
                cat.categoryItems.map(ci => ci.itemId)
            );
        },
        packingProgress() {
            return {
                packed: this.packedItemIds ? this.packedItemIds.size : 0,
                total: this.allItemIds.length,
            };
        },
        packingProgressPct() {
            const { packed, total } = this.packingProgress;
            return total > 0 ? Math.round((packed / total) * 100) : 0;
        },
        packTotalWeight() {
            const unit = this.library.totalUnit || 'oz';
            const mg = this.list.totalWeight || 0;
            const val = weightUtils.MgToWeight(mg, unit);
            return `${val} ${unit}`;
        },
    },
    watch: {
        categories() {
            this.$nextTick(() => {
                this.handleItemReorder();
            });
        },
    },
    mounted() {
        this.handleCategoryReorder();
        this.handleItemReorder();
    },
    beforeUnmount() {
        if (this.itemDrake) {
            this.itemDrake.destroy();
            this.itemDrake = null;
        }
        if (this.categoryDrake) {
            this.categoryDrake.destroy();
            this.categoryDrake = null;
        }
    },
    methods: {
        newCategory() {
            this.$store.commit('newCategory', this.list);
        },
        dismissCommunityHint() {
            localStorage.setItem('lpCommunityHintDismissed', '1');
            this.communityHintDismissed = true;
        },
        dismissGuestHint() {
            localStorage.setItem('lpGuestHintDismissed', '1');
            this.guestHintDismissed = true;
        },
        updateListDescription() {
            this.$store.commit('updateListDescription', this.list);
        },
        enterPackingMode() {
            this.activate(this.list.id, this.allItemIds);
        },
        exitPackingMode() {
            this.deactivate();
        },
        onTogglePack(itemId) {
            this.toggleItem(itemId);
            if (!this.showCompletionModal && this.packingProgress.packed === this.packingProgress.total && this.packingProgress.total > 0) {
                this.showCompletionModal = true;
                this.completionPhrase = this.pickPhrase();
            }
        },
        resetPacking() {
            this.reset();
            this.showCompletionModal = false;
        },
        pickPhrase() {
            const lang = (navigator.language || 'en').toLowerCase();
            const phrases = lang.startsWith('fr') ? phrasesFr : phrasesEn;
            return phrases[Math.floor(Math.random() * phrases.length)];
        },
        handleItemReorder() {
            if (this.itemDrake) {
                this.itemDrake.destroy();
            }
            const categoryItems = queryContainers(this.$el, '.lpItems');
            const drake = createDragDrop(categoryItems, {
                moves($el, $source, $handle, $sibling) {
                    return $handle.classList.contains('lpItemHandle');
                },
                accepts($el, $target, $source, $sibling) {
                    if (!$sibling || $sibling.classList.contains('lpItemsHeader')) {
                        return false; // header and footer are technically part of this list - exclude them both.
                    }
                    return true;
                },
            });
            drake.on('drag', ($el, $target, $source, $sibling) => {
                this.itemDragId = getDatasetInt($el, 'itemId');
            });
            drake.on('drop', ($el, $target, $source, $sibling) => {
                const categoryId = getDatasetInt($target, 'categoryId');
                if (this.itemDragId === null || categoryId === null) {
                    drake.cancel(true);
                    return;
                }
                this.$store.commit('reorderItem', {
                    list: this.list, itemId: this.itemDragId, categoryId, dropIndex: getElementIndex($el) - 1,
                });
                drake.cancel(true);
            });
            this.itemDrake = drake;
        },
        handleCategoryReorder() {
            if (this.categoryDrake) {
                this.categoryDrake.destroy();
            }

            const drake = createDragDrop([this.$refs.categories.$el], {
                moves(el, $source, $handle, $sibling) {
                    return $handle.classList.contains('lpCategoryHandle');
                },
            });
            drake.on('drag', ($el, $target, $source, $sibling) => {
                this.categoryDragStartIndex = getElementIndex($el);
            });
            drake.on('drop', ($el, $target, $source, $sibling) => {
                this.$store.commit('reorderCategory', { list: this.list, before: this.categoryDragStartIndex, after: getElementIndex($el) });
                drake.cancel(true);
            });
            this.categoryDrake = drake;
        },
    },
};
</script>
