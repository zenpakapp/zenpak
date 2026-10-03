const dashboard = () => import(/* webpackChunkName: "view-dashboard" */ './views/dashboard.vue');
const welcome = () => import(/* webpackChunkName: "view-welcome" */ './views/welcome.vue');
const forgotPassword = () => import(/* webpackChunkName: "view-forgot-password" */ './views/forgot-password.vue');
const resetPassword = () => import(/* webpackChunkName: "view-reset-password" */ './views/reset-password.vue');
const moderation = () => import(/* webpackChunkName: "view-moderation" */ './views/moderation.vue');
const publicProfile = () => import(/* webpackChunkName: "view-public-profile" */ './views/public-profile.vue');
const publicList = () => import(/* webpackChunkName: "view-public-list" */ './views/public-list.vue');
const communityView = () => import(/* webpackChunkName: "view-community" */ './views/community.vue');
const guideView = () => import(/* webpackChunkName: "view-guide" */ './views/guide.vue');
const aboutView = () => import(/* webpackChunkName: "view-about" */ './views/about.vue');
const notFound = () => import(/* webpackChunkName: "view-not-found" */ './views/not-found.vue');
const verifyEmail = () => import(/* webpackChunkName: "view-verify-email" */ './views/verify-email.vue');

export default [
    { path: '/', component: dashboard },
    { path: '/welcome', component: welcome },
    { path: '/signin', redirect: '/welcome' },
    { path: '/signin/reset-password', redirect: '/welcome' },
    { path: '/signin/forgot-username', redirect: '/welcome' },
    { path: '/register', redirect: '/welcome' },
    { path: '/forgot-password', component: forgotPassword },
    { path: '/reset-password', component: resetPassword },
    { path: '/moderation', component: moderation },
    { path: '/feed', redirect: '/community/feed' },
    { path: '/community', component: communityView },
    { path: '/community/feed', component: communityView },
    { path: '/u/:username', component: publicProfile },
    { path: '/p/:externalId', component: publicList },
    { path: '/guide', component: guideView },
    { path: '/about', component: aboutView },
    { path: '/verify-email', component: verifyEmail },
    { path: '/:pathMatch(.*)*', component: notFound },
];
