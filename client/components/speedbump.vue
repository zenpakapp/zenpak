<style lang="scss">
@import "../css/_globals";

.speedbumpBody {
    max-width: 44ch;
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
            this.callback = null;
            this.shown = false;
            this.$nextTick(() => {
                if (callback && typeof callback === 'function') {
                    callback(true);
                }
            });
        },
    },
};
</script>
