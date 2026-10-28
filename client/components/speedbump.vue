<style lang="scss">
@import "../css/_globals";

.speedbumpBody {
    max-width: 44ch;
}

.speedbumpCheckbox {
    align-items: center;
    color: inherit;
    cursor: pointer;
    display: flex;
    font-size: inherit;
    font-weight: normal;
    gap: 8px;
    letter-spacing: normal;
    margin: 0 0 16px;
    max-width: 44ch;
    text-transform: none;

    input[type="checkbox"] {
        accent-color: $color-accent;
        cursor: pointer;
        flex-shrink: 0;
        height: 15px;
        width: 15px;
    }
}

#speedbump.lpModal {
    z-index: $aboveDialog;
}

.lpModalContainer:has(#speedbump) .lpModalOverlay {
    z-index: $aboveDialog - 1;
}
</style>

<template>
    <modal id="speedbump" :shown="shown" @hide="shown = false">
        <h2 v-if="messages.title">
            {{ messages.title }}
        </h2>

        <p class="speedbumpBody">
            {{ messages.body }}
        </p>

        <label v-if="messages.checkbox" class="speedbumpCheckbox">
            <input v-model="checked" type="checkbox">
            {{ messages.checkbox }}
        </label>

        <div class="lpModalActions">
            <button v-focus-on-create class="lpButton" @click="confirmSpeedbump()">
                {{ messages.confirm }}
            </button>
            <button class="lpButton lpButtonSecondary" @click="shown = false">
                {{ messages.cancel }}
            </button>
        </div>
    </modal>
</template>

<script>
import modal from './modal.vue';
import { clearSpeedbumpOpener, setSpeedbumpOpener } from '../services/speedbump';

export default {
    name: 'Speedbump',
    components: {
        modal,
    },
    data() {
        return {
            messages: {},
            callback: null,
            checked: false,
            shown: false,
        };
    },
    mounted() {
        setSpeedbumpOpener(this.initSpeedbump);
    },
    beforeUnmount() {
        clearSpeedbumpOpener(this.initSpeedbump);
    },
    methods: {
        initSpeedbump(callback, options) {
            this.callback = callback;
            this.checked = false;
            this.messages = {
                title: '',
                body: '',
                confirm: this.$t('misc.yes'),
                cancel: this.$t('misc.no'),
            };
            if (typeof options === 'string') {
                this.messages.body = options;
            } else {
                this.messages = { ...this.messages, ...options };
            }
            this.shown = true;
        },
        confirmSpeedbump() {
            const callback = this.callback;
            const checked = this.checked;
            this.callback = null;
            this.shown = false;
            this.$nextTick(() => {
                if (callback && typeof callback === 'function') {
                    callback(true, { checked });
                }
            });
        },
    },
};
</script>
