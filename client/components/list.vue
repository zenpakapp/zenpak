<style lang="scss">
@import "../css/_globals";

.lp-list-enter-active {
    animation: lpSlideDown 0.2s ease-out;
}

.lp-list-leave-active {
    animation: lpSlideDown 0.15s ease-in reverse;
}

@keyframes lpSlideDown {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

#listDescriptionContainer {
    margin: 25px 0;

    h3,
    p {
        display: inline-block;
        margin: 0 0 5px;
    }

    h3 {
        margin-right: 10px;
    }

    textarea {
        height: 65px;
        width: 100%;
    }
}

#getStarted {
    background: $color-bg;
    border-radius: $radius-lg;
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.7;
    margin-bottom: $spacingLarge;
    min-height: 200px;
    padding: $spacingLarge * 1.5;

    h2 {
        color: $color-text;
        font-size: 22px;
        font-weight: $fontWeight-bold;
        letter-spacing: -0.01em;
        line-height: 1.2;
        margin: 0 0 $spacingMedium;
    }

    p {
        color: $color-text-muted;
        font-size: $fontSize-base;
        margin: 0 0 $spacingSmall;
    }

    ol {
        color: $color-text-muted;
        margin: 0 0 $spacingMedium;
        padding-left: 20px;

        li {
            margin-bottom: 4px;
        }
    }

    & > *:last-child {
        margin-bottom: 0;
    }
}

.lpPackingBar {
    align-items: center;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-lg;
    display: flex;
    gap: $spacingMedium;
    justify-content: space-between;
    margin-bottom: $spacingMedium;
    padding: $spacingSmall $spacingMedium;
}

.lpPackingProgress {
    color: $color-text-muted;
    font-size: $fontSize-sm;
}

.lpPackingProgressTrack {
    background: $color-control-muted;
    border-radius: 99px;
    flex: 1;
    height: 6px;
    overflow: hidden;
}

.lpPackingProgressFill {
    background: $color-accent;
    border-radius: 99px;
    height: 100%;
    transition: width 0.2s ease;
}

.lpPackBtn {
    background: $color-accent;
    border: none;
    border-radius: $radius-sm;
    color: #fff;
    cursor: pointer;
    font-size: $fontSize-sm;
    font-weight: $fontWeight-bold;
    padding: 6px 14px;

    &:hover { background: $color-accent-hover; }
}

.lpPackBtnExit {
    background: $color-control-muted;
    color: $color-text;

    &:hover { background: $color-border; }
}

.lpPackModal {
    align-items: center;
    background: var(--color-overlay);
    bottom: 0;
    display: flex;
    justify-content: center;
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 200;
}

.lpPackModalInner {
    background: $color-surface;
    border-radius: $radius-lg;
    box-shadow: var(--shadow-modal);
    max-width: 400px;
    padding: $spacingLarge * 1.5;
    text-align: center;
    width: 90%;
}

.lpPackModalPhrase {
    font-size: 20px;
    font-weight: $fontWeight-bold;
    line-height: 1.4;
    margin: 0 0 $spacingMedium;
}

.lpPackModalWeight {
    color: $color-text-muted;
    font-size: $fontSize-base;
    margin: 0 0 $spacingLarge;
}

.lpPackModalActions {
    display: flex;
    gap: $spacingSmall;
    justify-content: center;
}

.lpPackModalBtn {
    border: none;
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: $fontSize-base;
    padding: 10px 20px;
}

.lpPackModalBtnReset {
    background: $color-control-muted;
    color: $color-text;

    &:hover { background: $color-border; }
}

.lpPackModalBtnClose {
    background: $color-accent;
    color: #fff;

    &:hover { background: $color-accent-hover; }
}

</style>

<template>
    <div class="lpListBody">
        <!-- Packing mode bar -->
        <div v-if="isPackingMode" class="lpPackingBar">
            <span class="lpPackingProgress">{{ packingProgress.packed }} / {{ packingProgress.total }} items packed</span>
            <div class="lpPackingProgressTrack">
                <div class="lpPackingProgressFill" :style="{ width: packingProgressPct + '%' }" />
            </div>
            <button class="lpPackBtn lpPackBtnExit" @click="exitPackingMode">Exit Packing</button>
        </div>

        <!-- Completion modal -->
        <div v-if="showCompletionModal" class="lpPackModal" @click.self="showCompletionModal = false">
            <div class="lpPackModalInner">
                <p class="lpPackModalPhrase">{{ completionPhrase }}</p>
                <p class="lpPackModalWeight">Total: {{ packTotalWeight }}</p>
                <div class="lpPackModalActions">
                    <button class="lpPackModalBtn lpPackModalBtnReset" @click="resetPacking">Reset</button>
                    <button class="lpPackModalBtn lpPackModalBtnClose" @click="showCompletionModal = false">Close</button>
                </div>
            </div>
        </div>

        <div v-if="isListNew" id="getStarted">
            <h2>Welcome to JustPack!</h2>
            <p>Here's what you need to get started:</p>
            <ol>
                <li>Click on things to edit them. Give your list and category a name.</li>
                <li>Add new categories and give items weights to start the visualization.</li>
                <li v-if="!isLocalSaving">
                    When you're done, share your list with others!
                </li>
            </ol>
            <p v-if="isLocalSaving" class="lpWarning">
                <strong>Note:</strong> Your data is being saved to your local computer. In order to share your lists please register an account.
            </p>
        </div>
        <list-summary v-if="!isListNew" :list="list" />

        <div v-if="!isListNew && !isPackingMode" style="margin-bottom: 10px;">
            <button class="lpPackBtn" @click="enterPackingMode">🎒 Pack this list</button>
        </div>

        <div style="clear: both;" />

        <div v-if="library.optionalFields['listDescription']" id="listDescriptionContainer">
            <h3>List Description</h3> <p>(<a href="https://guides.github.com/features/mastering-markdown/" target="_blank" class="lpHref">Markdown</a> supported)</p>
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

        <a v-if="!isPackingMode" class="lpAdd addCategory" @click="newCategory"><i class="lpSprite lpSpriteAdd" />Add new category</a>
    </div>
</template>

<script>
import category from './category.vue';
import listSummary from './list-summary.vue';
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
            return this.list.totalWeight === 0;
        },
        isLocalSaving() {
            return this.$store.state.saveType === 'local';
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

            const drake = createDragDrop([this.$refs.categories], {
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
