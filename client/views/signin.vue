<style lang="scss">

</style>

<template>
    <div id="signinContainer">
        <modal id="signin" :shown="true" :blackout="true">
            <div class="lpModalHeader">
                <h2>
                    {{ $t('auth.signIn') }}
                </h2>
                <router-link to="/register" class="lpHref">
                    {{ $t('auth.needToRegister') }}
                </router-link>
            </div>
            <a href="/api/auth/google" class="lpButtonGoogle" style="display:flex;align-items:center;gap:10px;justify-content:center;width:100%;padding:11px 16px;border:1px solid #dadce0;border-radius:8px;background:#fff;color:#3c4043;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:16px;">
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
                {{ $t('auth.continueWithGoogle') }}
            </a>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;color:#888;font-size:13px;"><hr style="flex:1;border:none;border-top:1px solid #e0e0e0;"><span>{{ $t('auth.or') }}</span><hr style="flex:1;border:none;border-top:1px solid #e0e0e0;"></div>
            <SigninForm :message="message" />
        </modal>

        <blackoutFooter />
        <globalAlerts />
    </div>
</template>

<script>
import blackoutFooter from '../components/blackout-footer.vue';
import globalAlerts from '../components/global-alerts.vue';
import modal from '../components/modal.vue';
import SigninForm from '../components/signin-form.vue';

export default {
    name: 'Signin',
    components: {
        blackoutFooter,
        globalAlerts,
        modal,
        SigninForm,
    },
    computed: {
        message() {
            if (this.$route.path.indexOf('/reset-password') > -1 || this.$route.path.indexOf('/forgot-username') > -1) {
                return 'An email has been sent to the address associated with your account. Note: emails to yahoo.com addresses are currently being blocked. Please reach out to info@zenpak.app for assistance if you do not receive your email.';
            }
            return '';
        },
    },
};
</script>
