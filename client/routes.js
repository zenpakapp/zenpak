import dashboard from './views/dashboard.vue';
import welcome from './views/welcome.vue';
import signin from './views/signin.vue';
import register from './views/register.vue';
import forgotPassword from './views/forgot-password.vue';
import moderation from './views/moderation.vue';
import publicProfile from './views/public-profile.vue';
import publicList from './views/public-list.vue';
import communityView from './views/community.vue';
import guideView from './views/guide.vue';
import aboutView from './views/about.vue';

export default [
    { path: '/', component: dashboard },
    { path: '/welcome', component: welcome },
    { path: '/signin', component: signin },
    { path: '/signin/reset-password', component: signin },
    { path: '/signin/forgot-username', component: signin },
    { path: '/register', component: register },
    { path: '/forgot-password', component: forgotPassword },
    { path: '/moderation', component: moderation },
    { path: '/feed', redirect: '/community/feed' },
    { path: '/community', component: communityView },
    { path: '/community/feed', component: communityView },
    { path: '/u/:username', component: publicProfile },
    { path: '/p/:externalId', component: publicList },
    { path: '/guide', component: guideView },
    { path: '/about', component: aboutView },
    { path: '/:pathMatch(.*)*', component: dashboard },
];
