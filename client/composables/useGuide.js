import { ref, reactive } from 'vue';
import { fetchJson } from '../utils/utils';

export function useGuide() {
    const profile = ref({ bio: '', links: [], gearPhilosophy: [] });
    const affiliateRules = ref([]);
    const disclosure = ref('');
    const itemGroups = reactive([]);

    const savingProfile = ref(false);
    const savingRules = ref(false);
    const savingItems = ref(false);
    const loadingItems = ref(false);

    const profileSaved = ref(false);
    const rulesSaved = ref(false);
    const itemsSaved = ref(false);

    const error = ref(null);

    async function loadProfile() {
        try {
            const data = await fetchJson('/api/guide/profile');
            profile.value = {
                bio: data.bio || '',
                links: data.links || [],
                gearPhilosophy: data.gearPhilosophy || [],
            };
            affiliateRules.value = data.affiliateRules || [];
            disclosure.value = data.disclosure || '';
        } catch (err) {
            // silently ignore — fields stay empty
        }
    }

    async function saveProfile() {
        savingProfile.value = true;
        profileSaved.value = false;
        error.value = null;
        try {
            await fetchJson('/api/guide/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile.value),
            });
            profileSaved.value = true;
            setTimeout(() => { profileSaved.value = false; }, 2000);
        } catch (err) {
            error.value = 'Failed to save profile.';
        } finally {
            savingProfile.value = false;
        }
    }

    async function saveAffiliateRules() {
        savingRules.value = true;
        rulesSaved.value = false;
        error.value = null;
        try {
            await fetchJson('/api/guide/affiliate-rules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ affiliateRules: affiliateRules.value, disclosure: disclosure.value }),
            });
            rulesSaved.value = true;
            setTimeout(() => { rulesSaved.value = false; }, 2000);
        } catch (err) {
            error.value = 'Failed to save rules.';
        } finally {
            savingRules.value = false;
        }
    }

    async function loadItems() {
        loadingItems.value = true;
        error.value = null;
        try {
            const data = await fetchJson('/api/guide/items');
            itemGroups.splice(0, itemGroups.length, ...data);
        } catch (err) {
            error.value = 'Failed to load items.';
        } finally {
            loadingItems.value = false;
        }
    }

    async function saveItems() {
        savingItems.value = true;
        itemsSaved.value = false;
        error.value = null;
        const updates = itemGroups.flatMap(group =>
            group.items.map(item => ({
                listId: group.listId,
                itemId: item.itemId,
                affiliateUrl: item.affiliateUrl,
                promoCode: item.promoCode,
                promoLabel: item.promoLabel,
            }))
        );
        try {
            await fetchJson('/api/guide/items', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            itemsSaved.value = true;
            setTimeout(() => { itemsSaved.value = false; }, 2000);
        } catch (err) {
            error.value = 'Failed to save items.';
        } finally {
            savingItems.value = false;
        }
    }

    function addRule() {
        affiliateRules.value.push({ type: 'brand', match: '', affiliateUrl: '', promoCode: '', promoLabel: '' });
    }

    function removeRule(index) {
        affiliateRules.value.splice(index, 1);
    }

    return {
        profile, loadProfile, saveProfile, savingProfile, profileSaved,
        affiliateRules, disclosure, saveAffiliateRules, savingRules, rulesSaved,
        addRule, removeRule,
        itemGroups, loadItems, saveItems, savingItems, itemsSaved, loadingItems,
        error,
    };
}
