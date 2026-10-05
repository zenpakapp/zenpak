// CommonJS so test/unit-*.js can require it directly.
// Post-commit flow: the copy's version moves forward on commit, which unmounts the apply controls,
// so failures here are reported through `notify` (global alert), never through component state.
async function commitAndSave({ commit, dispatch, notify }, payload) {
    commit('applyForkUpdate', payload);
    try {
        await dispatch('saveNow');
    } catch (saveError) {
        // Never keep a half-applied copy: reload what the server has.
        try {
            await dispatch('loadRemote');
        } catch (reloadError) {
            // Reported below all the same.
        }
        notify({ key: 'list.versioning.updateError' });
    }
}

module.exports = { commitAndSave };
