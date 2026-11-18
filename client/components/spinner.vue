<style lang="scss">
@import "../css/_globals";

$spinnerSize: 18px;

@keyframes spinner {
    to { transform: rotate(360deg); }
}

@keyframes spinnerPulse {
    50% { opacity: 0.35; }
}

.lpSpinner::before {
    animation: spinner $loopDurationSpinner linear infinite;
    border: 1px solid $orange1;
    border-radius: $radius-round;
    border-top-color: transparent;
    content: "";
    display: block;
    height: $spinnerSize;
    width: $spinnerSize;
}

.lpButton .lpSpinner {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);

    &::before {
        border-color: $background1;
        border-top-color: transparent;
    }
}

.lpButton.lpSmall .lpSpinner {
    right: 50%;
    transform: translateY(-50%) translateX(50%);
}

// Reduced motion: the ring breathes in place instead of turning.
@media (prefers-reduced-motion: reduce) {
    .lpSpinner::before {
        animation-name: spinnerPulse;
    }
}
</style>

<template>
    <div class="lpSpinner" />
</template>

<script>
export default {
    name: 'Spinner',
};
</script>
