'use strict';

const { resolvePublicItemLink } = require('../server/public-sharing.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

const creator = {
    affiliateRules: [
        { type: 'brand', match: 'Zpacks', affiliateUrl: 'https://rule-url.example/zpacks', appendParam: 'ref=rule', promoCode: 'ZPACKS10', promoLabel: '10% off' },
        { type: 'domain', match: 'rei.com', affiliateUrl: 'https://rule-url.example/rei', appendParam: 'tag=myref', promoCode: '', promoLabel: '' },
        { type: 'shop', match: 'Garage Grown Gear', affiliateUrl: '', appendParam: '', promoCode: 'LIGHTER10', promoLabel: 'Discount' },
    ],
};

// 1. item.affiliateUrl set → used as-is, rule URL ignored
const r1 = resolvePublicItemLink({ url: 'https://zpacks.com/pack', affiliateUrl: 'https://zpacks.com/pack?ref=creator123', brand: 'Zpacks', shop: '', promoCode: '', promoLabel: '' }, creator);
assert('item.affiliateUrl used exactly when set', r1.url === 'https://zpacks.com/pack?ref=creator123');
assert('item.affiliateUrl not replaced by rule.affiliateUrl', r1.url !== 'https://rule-url.example/zpacks');
assert('hasAffiliateLink true when affiliateUrl set', r1.hasAffiliateLink === true);

// 2. no item.affiliateUrl → item.url used, rule.affiliateUrl NOT applied
const r2 = resolvePublicItemLink({ url: 'https://zpacks.com/pack', affiliateUrl: '', brand: 'Zpacks', shop: '', promoCode: '', promoLabel: '' }, creator);
assert('item.url used when no affiliateUrl', r2.url === 'https://zpacks.com/pack');
assert('rule.affiliateUrl does not replace item.url', r2.url !== 'https://rule-url.example/zpacks');

// 3. appendParam rule does NOT mutate URL
const r3 = resolvePublicItemLink({ url: 'https://rei.com/product/123', affiliateUrl: '', brand: '', shop: '', promoCode: '', promoLabel: '' }, creator);
assert('appendParam rule does not mutate URL', r3.url === 'https://rei.com/product/123');
assert('URL with existing query string preserved exactly', r3.url.indexOf('tag=myref') === -1);

// 4. URL with existing query string not modified
const r4 = resolvePublicItemLink({ url: 'https://zpacks.com/pack?color=blue&size=L', affiliateUrl: 'https://zpacks.com/pack?ref=me&color=blue', brand: 'Zpacks', shop: '', promoCode: '', promoLabel: '' }, creator);
assert('URL with multiple query params preserved exactly', r4.url === 'https://zpacks.com/pack?ref=me&color=blue');

// 5. URL with fragment preserved
const r5 = resolvePublicItemLink({ url: 'https://zpacks.com/pack', affiliateUrl: 'https://zpacks.com/pack?ref=me#details', brand: 'Zpacks', shop: '', promoCode: '', promoLabel: '' }, creator);
assert('URL with fragment preserved exactly', r5.url === 'https://zpacks.com/pack?ref=me#details');

// 6. URL with encoded characters preserved
const r6 = resolvePublicItemLink({ url: 'https://example.com/search?q=ultralight%20pack', affiliateUrl: 'https://example.com/search?q=ultralight%20pack&ref=cr', brand: '', shop: '', promoCode: '', promoLabel: '' }, creator);
assert('encoded characters in URL preserved', r6.url === 'https://example.com/search?q=ultralight%20pack&ref=cr');

// 7. promo codes from rules still returned when no item-level code
const r7 = resolvePublicItemLink({ url: 'https://zpacks.com/pack', affiliateUrl: '', brand: 'Zpacks', shop: '', promoCode: '', promoLabel: '' }, creator);
assert('rule promoCode returned when item has none', r7.promoCode === 'ZPACKS10');
assert('rule promoLabel returned when item has none', r7.promoLabel === '10% off');
assert('hasAffiliateLink true from promo code alone', r7.hasAffiliateLink === true);

// 8. item-level promoCode takes priority over rule
const r8 = resolvePublicItemLink({ url: 'https://zpacks.com/pack', affiliateUrl: '', brand: 'Zpacks', shop: '', promoCode: 'MYCODE', promoLabel: 'My label' }, creator);
assert('item.promoCode takes priority over rule.promoCode', r8.promoCode === 'MYCODE');
assert('item.promoLabel takes priority over rule.promoLabel', r8.promoLabel === 'My label');

// 9. shop rule promo code matched
const r9 = resolvePublicItemLink({ url: 'https://garagegrowngear.com/item', affiliateUrl: '', brand: '', shop: 'Garage Grown Gear', promoCode: '', promoLabel: '' }, creator);
assert('shop rule promoCode matched', r9.promoCode === 'LIGHTER10');
assert('shop rule URL not replaced', r9.url === 'https://garagegrowngear.com/item');

// 10. no URL, no rules → empty URL, no affiliate
const r10 = resolvePublicItemLink({ url: '', affiliateUrl: '', brand: '', shop: '', promoCode: '', promoLabel: '' }, {});
assert('empty item returns empty URL', r10.url === '');
assert('hasAffiliateLink false when no url and no promo', r10.hasAffiliateLink === false);

// 11. null item returns safe defaults
const r11 = resolvePublicItemLink(null, creator);
assert('null item returns empty url', r11.url === '');
assert('null item hasAffiliateLink false', r11.hasAffiliateLink === false);

// 12. no creator → item.url used
const r12 = resolvePublicItemLink({ url: 'https://example.com/gear', affiliateUrl: '', brand: 'Zpacks', shop: '', promoCode: '', promoLabel: '' }, null);
assert('no creator falls back to item.url', r12.url === 'https://example.com/gear');

// 13. invalid protocol in affiliateUrl → blocked, falls back to item.url
const r13 = resolvePublicItemLink({ url: 'https://example.com/gear', affiliateUrl: 'javascript:alert(1)', brand: '', shop: '', promoCode: '', promoLabel: '' }, null);
assert('javascript: affiliateUrl blocked', r13.url === 'https://example.com/gear');
assert('javascript: affiliateUrl not treated as affiliate', r13.hasAffiliateLink === false);

// 14. invalid protocol in item.url → empty URL returned
const r14 = resolvePublicItemLink({ url: 'javascript:void(0)', affiliateUrl: '', brand: '', shop: '', promoCode: '', promoLabel: '' }, null);
assert('javascript: item.url blocked', r14.url === '');

// 15. ftp: protocol blocked
const r15 = resolvePublicItemLink({ url: 'ftp://files.example.com/gear.zip', affiliateUrl: '', brand: '', shop: '', promoCode: '', promoLabel: '' }, null);
assert('ftp: item.url blocked', r15.url === '');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
