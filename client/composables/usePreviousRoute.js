import { ref } from 'vue';

const previousPath = ref(null);

export function setPreviousRoute(path) {
    previousPath.value = path;
}

export function usePreviousRoute() {
    return { previousPath };
}
