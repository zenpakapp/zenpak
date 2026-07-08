<template>
    <div v-if="showUsernameSetup" class="lpOAuthSetup">
        <div class="lpOAuthSetupCard">
            <h2 class="lpOAuthSetupTitle">{{ $t('misc.oauthSetupTitle') }}</h2>
            <p class="lpOAuthSetupText">{{ $t('misc.oauthSetupText') }}</p>
            <div v-if="setupError" class="lpError">{{ setupError }}</div>
            <input
                v-model="setupUsername"
                class="lpOAuthSetupInput"
                type="text"
                :placeholder="$t('misc.oauthSetupPlaceholder')"
                maxlength="20"
                @keyup.enter="submit"
            />
            <div class="lpButtons" style="margin-top: 16px;">
                <button
                    class="lpButton lpButtonPrimary"
                    :disabled="loading"
                    @click="submit"
                >
                    {{ loading ? $t('misc.oauthSetupSaving') : $t('misc.oauthSetupButton') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'WelcomeOauthOverlay',
    data() {
        return {
            showUsernameSetup: false,
            setupUsername: '',
            setupToken: '',
            setupError: '',
            loading: false,
        };
    },
    mounted() {
        const getCookie = (name) => {
            const c = document.cookie.split('; ').find(r => r.startsWith(`${name}=`));
            return c ? decodeURIComponent(c.split('=')[1]) : '';
        };
        const token = getCookie('oauth_setup_token');
        if (token) {
            this.setupToken = token;
            this.setupUsername = getCookie('oauth_setup_suggested') || '';
            this.showUsernameSetup = true;
            document.cookie = 'oauth_setup_token=; path=/; max-age=0';
            document.cookie = 'oauth_setup_suggested=; path=/; max-age=0';
        }
    },
    methods: {
        async submit() {
            this.loading = true;
            this.setupError = '';
            try {
                const res = await fetch('/api/auth/google/set-username', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ username: this.setupUsername, setupToken: this.setupToken }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Error');
                document.cookie = 'oauth_setup_token=; path=/; max-age=0';
                document.cookie = 'oauth_setup_suggested=; path=/; max-age=0';
                window.location.replace('/welcome?onboarding=1');
            } catch (e) {
                this.setupError = e.message;
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>
