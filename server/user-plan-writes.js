const db = require('./db.js');

// Billing and plan changes are written field by field. A whole-document save would put back, from
// the moment the account was read, a library, password or session that changed in between.

// Only the billing record (customer id, status, dates).
function saveBilling(user) {
    return db.users.updateOne({ _id: user._id }, { $set: { billing: user.billing } });
}

// The billing record and the plan it grants.
function savePlanState(user) {
    const set = { billing: user.billing };
    const plan = user.library && user.library.entitlements && user.library.entitlements.plan;
    if (typeof plan !== 'undefined') set['library.entitlements.plan'] = plan;
    return db.users.updateOne({ _id: user._id }, { $set: set });
}

module.exports = { saveBilling, savePlanState };
