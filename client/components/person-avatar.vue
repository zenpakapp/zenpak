<style lang="scss">
@import "../css/_globals";

// A small round avatar beside a person's name: the photo, or their initial on a colour taken from
// their username when there is no photo or it does not load.
.lpPersonAvatar {
    align-items: center;
    border-radius: 50%;
    color: #fff;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 10px;
    font-weight: $fontWeight-bold;
    height: 20px;
    justify-content: center;
    overflow: hidden;
    vertical-align: middle;
    width: 20px;

    img {
        background: #fff;
        height: 100%;
        object-fit: cover;
        width: 100%;
    }
}
</style>

<template>
    <span class="lpPersonAvatar" :style="{ background: showPhoto ? '#fff' : background }" aria-hidden="true">
        <img v-if="showPhoto" :src="avatarUrl" alt="" loading="lazy" @error="failed = true">
        <template v-else>{{ initial }}</template>
    </span>
</template>

<script>
import { avatarColor, avatarInitial } from '../utils/avatar';

export default {
    name: 'PersonAvatar',
    props: {
        avatarUrl: { type: String, default: '' },
        displayName: { type: String, default: '' },
        username: { type: String, default: '' },
    },
    data() {
        return { failed: false };
    },
    computed: {
        showPhoto() {
            return Boolean(this.avatarUrl) && !this.failed;
        },
        initial() {
            return avatarInitial(this.displayName, this.username);
        },
        background() {
            return avatarColor(this.username);
        },
    },
    watch: {
        avatarUrl() {
            this.failed = false;
        },
    },
};
</script>
