module.exports = {
    "extends": "stylelint-config-standard",
    "plugins": [
        "stylelint-order"
    ],
    "rules": {
        "at-rule-no-unknown": [true, {
            "ignoreAtRules": ["function", "for", "each", "include", "mixin"] // for SASS directives
        }],
        "indentation": 4, // stylistic preference
        "no-descending-specificity": null, // stylistic preference
        "no-empty-source": null, // for vue file support
        "order/properties-alphabetical-order": true, // stylistic preference
        "unit-no-unknown": [true, {
            "ignoreUnits": ["dvh"] // newer than the stylelint 13 unit list
        }],
        "property-no-unknown": [true, {
            "ignoreProperties": ["accent-color"] // newer than the stylelint 13 property list
        }],
    }
};