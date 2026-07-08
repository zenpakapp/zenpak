<style lang="scss">
@import "../css/_import-csv";
</style>

<template>
    <div id="importCSV">
        <modal id="importValidate" :shown="shown" @hide="shown = false">
            <h2>{{ $t('library.confirmImportTitle') }} <span v-if="importItemCount">({{ importItemCount }} {{ $t('library.importItemsCount') }})</span></h2>
            <p class="importSummary">
                <span class="importBadge">{{ acceptedRowCount }} {{ $t('library.importAccepted') }}</span>
                <span v-if="rejectedRowCount" class="importBadge isRejected">{{ rejectedRowCount }} {{ $t('library.importRejected') }}</span>
            </p>
            <p v-if="importData.mergeCount || reviewCount" class="importSummary">
                <span v-if="importData.mergeCount" class="importBadge">{{ importData.mergeCount }} {{ $t('library.importMergeCount') }}</span>
                <span v-if="reviewCount" class="importBadge isAmbiguous">{{ reviewCount }} {{ $t('library.importNeedsReview') }}</span>
            </p>
            <ul v-if="rejectedRowCount" class="importErrors">
                <li v-for="row in importData.rejectedRows" :key="row.rowNumber">
                    {{ $t('library.importRowError', { rowNumber: row.rowNumber, reason: row.reason }) }}
                </li>
            </ul>
            <div id="importData">
                <ul class="lpTable lpDataTable">
                    <li class="lpRow lpHeader">
                        <span class="lpCell">{{ $t('library.importTableHeaderName') }}</span>
                        <span class="lpCell">{{ $t('library.importTableHeaderType') }}</span>
                        <span class="lpCell">{{ $t('library.importTableHeaderDescription') }}</span>
                        <span class="lpCell lpNumber">{{ $t('library.importTableHeaderQty') }}</span>
                        <span class="lpCell lpNumber">{{ $t('library.importTableHeaderWeight') }}</span>
                        <span class="lpCell">{{ $t('library.importTableHeaderUnit') }}</span>
                        <span class="lpCell">{{ $t('library.importTableHeaderLink') }}</span>
                        <span class="lpCell lpNumber">{{ $t('library.importTableHeaderPrice') }}</span>
                        <span class="lpCell">{{ $t('library.importTableHeaderWorn') }}</span>
                        <span class="lpCell">{{ $t('library.importTableHeaderConsumable') }}</span>
                    </li>
                    <li v-for="(row, index) in importData.data" :key="index" class="lpRow">
                        <span class="lpCell">{{ row.name }}</span>
                        <span class="lpCell">{{ row.category }}</span>
                        <span class="lpCell">{{ row.description }}</span>
                        <span class="lpCell">{{ row.qty }}</span>
                        <span class="lpCell">{{ row.weight }}</span>
                        <span class="lpCell">{{ row.unit }}</span>
                        <span class="lpCell">{{ row.url ? $t('library.importYesValue') : '' }}</span>
                        <span class="lpCell">{{ row.price }}</span>
                        <span class="lpCell">{{ row.worn ? $t('library.importYesValue') : '' }}</span>
                        <span class="lpCell">{{ row.consumable ? $t('library.importYesValue') : '' }}</span>
                    </li>
                </ul>
            </div>
            <div v-if="reviewCount" class="importReview">
                <h3>{{ $t('library.importReviewTitle') }}</h3>
                <div v-for="(row, index) in ambiguousRows" :key="index" class="importReviewRow">
                    <div class="importReviewCol">
                        <p class="importReviewLabel">{{ $t('library.importReviewLabelImported') }}</p>
                        <p class="importReviewName">{{ row.name }}</p>
                        <p class="importReviewMeta">{{ row.weight }} {{ row.unit }}<span v-if="row.brand"> · {{ row.brand }}</span></p>
                    </div>
                    <div class="importReviewCol">
                        <p class="importReviewLabel">{{ $t('library.importReviewLabelExisting') }}</p>
                        <p class="importReviewName">{{ row._match.item.name }}</p>
                        <p class="importReviewMeta">{{ displayWeight(row._match.item.weight, row._match.item.authorUnit) }} {{ row._match.item.authorUnit }}<span v-if="row._match.item.brand"> · {{ row._match.item.brand }}</span></p>
                    </div>
                    <div class="importReviewActions">
                        <button class="lpButton lpButtonSm" @click="resolveReview(index, 'merge')">{{ $t('library.importReviewMergeButton') }}</button>
                        <button class="lpButton lpButtonSm lpButtonSecondary" @click="resolveReview(index, 'new')">{{ $t('library.importReviewKeepBothButton') }}</button>
                    </div>
                </div>
            </div>
            <div class="lpModalActions">
                <a class="lpButton close" @click="shown = false">{{ $t('library.importCancelButton') }}</a>
                <a id="importConfirm" class="lpButton" @click="importList">{{ $t('library.importConfirmButton') }}</a>
            </div>
        </modal>
        <modal id="importText" :shown="showTextInput" @hide="closeTextInput">
            <h2>{{ $t('library.textImportTitle') }}</h2>
            <p style="color: var(--color-text-muted); font-size: 14px; margin: 0 0 16px;">{{ $t('library.textImportHint') }}</p>
            <textarea
                v-model="textInput"
                class="lpImportTextarea"
                :placeholder="$t('library.textImportPlaceholder')"
                rows="10"
            />
            <label style="display:block; font-size:13px; font-weight:600; margin: 14px 0 6px;">{{ $t('library.textImportListNameLabel') }}</label>
            <input
                v-model="textName"
                class="lpImportUrlInput"
                type="text"
                :placeholder="$t('library.textImportListNamePlaceholder')"
            >
            <p v-if="textError" style="color: var(--color-danger); font-size: 13px; margin: 8px 0 0;">{{ textError }}</p>
            <div class="lpModalActions">
                <a class="lpButton lpButtonSecondary" @click="closeTextInput">{{ $t('library.textImportCancelButton') }}</a>
                <a class="lpButton" @click="importFromText">{{ $t('library.textImportButton') }}</a>
            </div>
        </modal>
        <modal id="importLP" :shown="showLPInput" @hide="closeLPInput">
            <h2>{{ $t('library.lpImportTitle') }}</h2>
            <p style="color: var(--color-text-muted); font-size: 14px; margin: 0 0 16px;">{{ $t('library.lpImportHint') }}</p>
            <input
                v-model="lpUrl"
                class="lpImportUrlInput"
                type="url"
                :placeholder="$t('library.lpImportUrlPlaceholder')"
                @keyup.enter="importFromLP"
            >
            <label style="display:block; font-size:13px; font-weight:600; margin: 14px 0 6px;">{{ $t('library.lpImportListNameLabel') }}</label>
            <input
                v-model="lpName"
                class="lpImportUrlInput"
                type="text"
                :placeholder="$t('library.lpImportListNamePlaceholder')"
                @keyup.enter="importFromLP"
            >
            <p v-if="lpError" style="color: var(--color-danger); font-size: 13px; margin: 8px 0 0;">{{ lpError }}</p>
            <div class="lpModalActions">
                <a class="lpButton lpButtonSecondary" @click="closeLPInput">{{ $t('library.lpImportCancelButton') }}</a>
                <a class="lpButton" :class="{ disabled: lpLoading }" @click="importFromLP">
                    {{ lpLoading ? $t('library.lpImportLoadingButton') : $t('library.lpImportButton') }}
                </a>
            </div>
        </modal>
        <form id="csvUpload">
            <input id="csv" ref="csvInput" type="file" name="csv">
        </form>
    </div>
</template>

<script>
import modal from './modal.vue';
import { registerDialogOpener, unregisterDialogOpener } from '../services/dialogs';
import { showGlobalAlert } from '../services/user-feedback';
import { findBestMatch } from '../composables/useGearMatcher.js';
import { useUtils } from '../composables/useUtils.js';

const csvImportUtils = require('../utils/csv-import.js');
const textImportUtils = require('../utils/text-import.js');
const weightUtils = require('../utils/weight.js');
const { displayWeight } = useUtils();

function computeDedup(importData, libraryItems) {
    let mergeCount = 0;
    let reviewCount = 0;

    importData.data = importData.data.map(row => {
        const weightMg = weightUtils.WeightToMg(parseFloat(row.weight), row.unit);
        const match = findBestMatch(row, libraryItems, weightMg);
        if (match.decision === 'merge') mergeCount++;
        if (match.decision === 'review') reviewCount++;
        return { ...row, _match: match };
    });

    importData.mergeCount = mergeCount;
    importData.reviewCount = reviewCount;
    return importData;
}

export default {
    name: 'ImportCsv',
    components: {
        modal,
    },
    data() {
        return {
            csvInput: false,
            listId: false,
            importData: {},
            shown: false,
            showTextInput: false,
            textInput: '',
            textName: '',
            textError: '',
            showLPInput: false,
            lpUrl: '',
            lpName: '',
            lpLoading: false,
            lpError: '',
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        importItemCount() {
            return this.importData.data ? this.importData.data.length : 0;
        },
        acceptedRowCount() {
            return this.importData.acceptedRows || this.importItemCount;
        },
        rejectedRowCount() {
            return this.importData.rejectedRows ? this.importData.rejectedRows.length : 0;
        },
        ambiguousRows() {
            if (!this.importData.data) return [];
            return this.importData.data.filter(row => row._match && row._match.decision === 'review');
        },
        reviewCount() {
            return this.ambiguousRows.length;
        },
    },
    mounted() {
        this.csvInput = this.$refs.csvInput;
        this.csvInput.onchange = this.importCSV;

        registerDialogOpener('importText', () => {
            this.textInput = '';
            this.textName = '';
            this.textError = '';
            this.showTextInput = true;
        });
        registerDialogOpener('importCSV', () => {
            this.csvInput.click();
        });
        registerDialogOpener('importLP', () => {
            this.lpUrl = '';
            this.lpName = '';
            this.lpError = '';
            this.showLPInput = true;
        });
    },
    beforeUnmount() {
        if (this.csvInput) {
            this.csvInput.onchange = null;
        }
        unregisterDialogOpener('importText');
        unregisterDialogOpener('importCSV');
        unregisterDialogOpener('importLP');
    },
    methods: {
        importCSV(evt) {
            const file = evt.target.files[0];
            const name = file.name;

            if (file.name.length < 1) {
                return;
            }
            if (file.size > 1000000) {
                showGlobalAlert(this.$t('library.csvImportErrorFileToBig'));
                return;
            }
            if (name.substring(name.length - 4).toLowerCase() !== '.csv') {
                showGlobalAlert(this.$t('library.csvImportErrorNotCsv'));
                return;
            }
            const reader = new FileReader();

            reader.onload = ((theFile) => {
                this.validateImport(theFile.target.result, file.name.substring(0, file.name.length - 4).replace(/_/g, ' '));
            });

            reader.readAsText(file);
        },
        validateImport(input, name) {
            this.importData = csvImportUtils.parseImportCsv(input, name);
            this.importData = computeDedup(this.importData, this.library.items);

            if (!this.importData.data.length) {
                showGlobalAlert(this.$t('library.csvImportErrorLoadFailed'));
            } else {
                this.shown = true;
            }
        },
        importList() {
            this.$store.commit('importCSV', this.importData);
            this.shown = false;
            if (this.csvInput) this.csvInput.value = '';
        },
        closeTextInput() {
            this.showTextInput = false;
            this.textInput = '';
            this.textName = '';
            this.textError = '';
        },
        importFromText() {
            this.textError = '';
            const text = this.textInput.trim();
            if (!text) {
                this.textError = this.$t('library.textImportErrorEmpty');
                return;
            }
            const items = textImportUtils.parseTextList(text);
            if (!items.length) {
                this.textError = this.$t('library.textImportErrorNoItems');
                return;
            }
            const name = this.textName.trim() || this.$t('library.textImportDefaultListName');
            this.showTextInput = false;
            const importData = {
                data: items,
                name,
                listDescription: '',
                acceptedRows: items.length,
                rejectedRows: [],
                errors: [],
            };
            const deduped = computeDedup(importData, this.library.items);
            this.importData = deduped;
            this.shown = true;
        },
        closeLPInput() {
            this.showLPInput = false;
            this.lpUrl = '';
            this.lpName = '';
            this.lpError = '';
        },
        async importFromLP() {
            if (this.lpLoading) return;
            this.lpError = '';
            const url = this.lpUrl.trim();
            if (!url) {
                this.lpError = this.$t('library.lpImportErrorUrlEmpty');
                return;
            }
            this.lpLoading = true;
            try {
                const res = await fetch('/api/import/lighterpack', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });
                const data = await res.json();
                if (!res.ok) {
                    this.lpError = data.error || this.$t('library.lpImportErrorDefault');
                    return;
                }
                if (!this.lpName) this.lpName = data.name;
                this.showLPInput = false;
                this.validateImport(data.csv, this.lpName || data.name);
            } catch {
                this.lpError = this.$t('library.lpImportErrorNetwork');
            } finally {
                this.lpLoading = false;
            }
        },
        displayWeight,
        resolveReview(rowIndex, decision) {
            const ambiguous = this.importData.data.filter(row => row._match && row._match.decision === 'review');
            const row = ambiguous[rowIndex];
            if (row) row._match.decision = decision;
        },
    },
};
</script>
