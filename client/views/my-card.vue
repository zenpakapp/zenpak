<style lang="scss">
@import "../css/_globals";

.lpMyCard {
    margin: 0 auto;
    max-width: 420px;
    padding: 20px 16px 60px;
    text-align: center;

    .lpMyCardNav {
        margin-bottom: 16px;
        text-align: left;

        a {
            color: $color-text-muted;
            display: inline-block;
            font-size: $fontSize-base;
            line-height: 44px;
            text-decoration: none;

            &:hover { color: $color-text; }
        }
    }

    // White and black whatever the theme: a QR code reads best this way, also in full sun.
    .lpMyCardPanel {
        background: #fff;
        border: 1px solid $color-border;
        border-radius: $radius-md;
        color: #111;
        padding: 24px 16px;
    }

    .lpMyCardQr {
        display: block;
        height: auto;
        margin: 0 auto 16px;
        max-width: 320px;
        width: 100%;
    }

    .lpMyCardName {
        font-size: 30px;
        font-weight: $fontWeight-bold;
        line-height: 1.2;
        margin: 0;
        overflow-wrap: anywhere;
    }

    .lpMyCardHandle {
        color: #555;
        font-size: $fontSize-md;
        margin: 4px 0 0;
        overflow-wrap: anywhere;
    }

    .lpMyCardAddress {
        color: #111;
        font-size: $fontSize-md;
        margin: 12px 0 0;
        overflow-wrap: anywhere;
        user-select: all;
    }

    .lpMyCardActions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 20px;

        .lpButton {
            min-height: 44px;
            width: 100%;
        }
    }

    .lpMyCardPrivate {
        p {
            color: $color-text-muted;
            font-size: 15px;
            line-height: 1.5;
            margin: 0 0 16px;
        }

        .lpButton {
            min-height: 44px;
        }
    }
}
</style>

<template>
    <div v-if="library" class="lpMyCard">
        <nav class="lpMyCardNav">
            <router-link to="/">
                {{ $t('misc.backToZenPak') }}
            </router-link>
        </nav>

        <div v-if="isPublic" class="lpMyCardPanel">
            <img v-if="qrSrc" class="lpMyCardQr" :src="qrSrc" :alt="$t('card.qrAlt', { name })" width="320" height="320">
            <h1 class="lpMyCardName">
                {{ name }}
            </h1>
            <p v-if="name !== username" class="lpMyCardHandle">
                @{{ username }}
            </p>
            <p class="lpMyCardAddress">
                {{ shortAddress }}
            </p>
            <div class="lpMyCardActions">
                <button v-if="canShare" class="lpButton" @click="share">
                    {{ $t('card.share') }}
                </button>
                <button class="lpButton lpButtonSecondary" @click="copy">
                    {{ copied ? $t('card.copied') : $t('card.copy') }}
                </button>
            </div>
        </div>

        <div v-else class="lpMyCardPanel lpMyCardPrivate">
            <h1 class="lpMyCardName">
                {{ $t('card.title') }}
            </h1>
            <p>{{ $t('card.private') }}</p>
            <button class="lpButton" @click="openSettings">
                {{ $t('card.openSettings') }}
            </button>
        </div>
    </div>
</template>

<script>
import { openDialog } from '../services/dialogs';
import { isPublicVisibility } from '../services/public-visibility';

export default {
    name: 'MyCardView',
    data() {
        return { qrSrc: '', copied: false, origin: window.location.origin };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        username() {
            return this.$store.state.loggedIn || '';
        },
        profile() {
            return (this.library && this.library.publicProfile) || {};
        },
        isPublic() {
            return isPublicVisibility(this.profile.visibility);
        },
        // The display name is a Kin and Wayfarer feature, as in the account menu.
        name() {
            const plan = this.library && this.library.entitlements && this.library.entitlements.plan;
            const isTrail = plan === 'supporter' || plan === 'creator';
            return (isTrail && this.profile.displayName) || this.username;
        },
        url() {
            return `${this.origin}/u/${this.username}`;
        },
        shortAddress() {
            return this.url.replace(/^https?:\/\//, '');
        },
        canShare() {
            return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
        },
    },
    watch: {
        isPublic: {
            immediate: true,
            handler(isPublic) {
                if (isPublic) this.makeQr();
            },
        },
        url() {
            if (this.isPublic) this.makeQr();
        },
    },
    created() {
        this.useReachableOrigin();
    },
    methods: {
        // On localhost the QR code would point to an address a phone cannot open: take the
        // address the server is configured with, when that one is reachable.
        async useReachableOrigin() {
            const isLocal = (host) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
            if (!isLocal(window.location.hostname)) return;
            try {
                const res = await fetch('/api/public/origin');
                const { origin } = await res.json();
                if (origin && !isLocal(new URL(origin).hostname)) this.origin = origin.replace(/\/$/, '');
            } catch (err) {
                // Keep the current address.
            }
        },
        async makeQr() {
            const { toDataURL } = await import(/* webpackChunkName: "qrcode" */ 'qrcode');
            this.qrSrc = await toDataURL(this.url, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 640,
                color: { dark: '#000000', light: '#ffffff' },
            });
        },
        async share() {
            try {
                await navigator.share({ title: this.name, url: this.url });
            } catch (err) {
                // The person closed the share sheet: nothing to do.
            }
        },
        async copy() {
            try {
                await navigator.clipboard.writeText(this.url);
                this.copied = true;
                setTimeout(() => { this.copied = false; }, 2000);
            } catch (err) {
                // No clipboard access (insecure address): the address is shown and selectable.
            }
        },
        // The account dialog lives in the editor: go there first, the dialog opens once it is ready.
        async openSettings() {
            await this.$router.push('/');
            openDialog('account', 'visibility');
        },
    },
};
</script>
