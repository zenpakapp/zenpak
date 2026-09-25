function getSaveData(state, preparedSaveData) {
    return preparedSaveData || JSON.stringify(state.library.save());
}

module.exports = { getSaveData };
