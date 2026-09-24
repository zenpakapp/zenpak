const config = require('config');
const createStripe = require('stripe');
const db = require('./db.js');
const { syncUserPublicLists } = require('./public-list-projections.js');

const LEGAL_ENTITY_VERSION = 'ae-fxbenard-v1';
const INVOICE_SELLER_FOOTER = 'FX Bénard AE - ZenPak · SIRET 75082412000026 · 4 impasse chez Huguet, 17150 Soubran';
const VAT_MENTION_FRANCHISE = 'TVA non applicable, article 293 B du CGI';
const VAT_MENTION_EU_REVERSE_CHARGE = 'Autoliquidation - article 283-2 du CGI';
const VAT_MENTION_OUTSIDE_EU = 'TVA non applicable - article 259-1 du CGI';
const EU_COUNTRY_CODES = new Set([
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
    'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

function stripeEnabled() {
    return config.has('stripeSecretKey') && !!config.get('stripeSecretKey');
}

let stripeClient = null;
function getStripe() {
    if (!stripeClient) {
        stripeClient = createStripe(config.get('stripeSecretKey'));
    }
    return stripeClient;
}

function getPlanFromPriceId(priceId) {
    if (!priceId) return 'free';
    if (priceId === config.get('stripePriceIdTrail')) return 'supporter';
    if (priceId === config.get('stripePriceIdTrailAnnual')) return 'supporter';
    if (priceId === config.get('stripePriceIdGuide')) return 'creator';
    if (priceId === config.get('stripePriceIdGuideAnnual')) return 'creator';
    return 'free';
}

function getIntervalFromPriceId(priceId) {
    if (!priceId) return null;
    if (priceId === config.get('stripePriceIdTrail')) return 'month';
    if (priceId === config.get('stripePriceIdTrailAnnual')) return 'year';
    if (priceId === config.get('stripePriceIdGuide')) return 'month';
    if (priceId === config.get('stripePriceIdGuideAnnual')) return 'year';
    return null;
}

async function getOrCreateCustomer(user) {
    if (user.billing && user.billing.customerId) {
        try {
            await getStripe().customers.retrieve(user.billing.customerId);
            return user.billing.customerId;
        } catch (err) {
            if (err.code !== 'resource_missing') throw err;
            user.billing.customerId = null;
        }
    }
    const stripe = getStripe();
    const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { username: user.username },
    });
    if (!user.billing) user.billing = {};
    user.billing.customerId = customer.id;
    user.billing.provider = 'stripe';
    await db.users.save(user);
    return customer.id;
}

async function syncUserBilling(user, subscription, status) {
    if (!user.billing) user.billing = {};

    const existingTermsAccepted = user.billing && user.billing.termsVersionAccepted;

    const now = new Date().toISOString();

    if (!subscription) {
        user.billing.subscriptionId = null;
        user.billing.priceId = null;
        user.billing.plan = 'free';
        user.billing.status = status || 'canceled';
        user.billing.cancelAtPeriodEnd = false;
        user.billing.currentPeriodEnd = null;
        user.billing.lastSyncedAt = now;
        user.billing.legalEntityVersion = LEGAL_ENTITY_VERSION;
        if (existingTermsAccepted) user.billing.termsVersionAccepted = existingTermsAccepted;
        if (!user.library) user.library = {};
        if (!user.library.entitlements) user.library.entitlements = {};
        user.library.entitlements.plan = 'free';
    } else {
        const priceId = subscription.items && subscription.items.data && subscription.items.data[0]
            ? subscription.items.data[0].price.id
            : null;
        const plan = getPlanFromPriceId(priceId);
        const interval = getIntervalFromPriceId(priceId);

        user.billing.provider = 'stripe';
        user.billing.subscriptionId = subscription.id;
        user.billing.priceId = priceId;
        user.billing.interval = interval;
        user.billing.plan = plan;
        user.billing.status = status || subscription.status;
        user.billing.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        user.billing.currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
        user.billing.lastSyncedAt = now;
        user.billing.legalEntityVersion = LEGAL_ENTITY_VERSION;
        if (existingTermsAccepted) user.billing.termsVersionAccepted = existingTermsAccepted;

        if (!user.library) user.library = {};
        if (!user.library.entitlements) user.library.entitlements = {};
        if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
            user.library.entitlements.plan = plan;
        } else {
            user.library.entitlements.plan = 'free';
        }
    }

    await db.users.save(user);
    syncUserPublicLists(user).catch(() => {});
}

async function syncKofiBilling(user, { amount, donationDate }) {
    if (!user.billing) user.billing = {};

    const expiryDate = new Date(donationDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const existingTermsAccepted = user.billing.termsVersionAccepted;

    user.billing.provider = 'kofi';
    user.billing.subscriptionId = null;
    user.billing.priceId = null;
    user.billing.plan = 'supporter';
    user.billing.interval = 'oneshot';
    user.billing.status = 'active';
    user.billing.cancelAtPeriodEnd = false;
    user.billing.currentPeriodEnd = expiryDate.toISOString();
    user.billing.kofiAmount = amount;
    user.billing.kofiDonationDate = donationDate;
    user.billing.lastSyncedAt = new Date().toISOString();
    user.billing.legalEntityVersion = LEGAL_ENTITY_VERSION;
    if (existingTermsAccepted) user.billing.termsVersionAccepted = existingTermsAccepted;

    if (!user.library) user.library = {};
    if (!user.library.entitlements) user.library.entitlements = {};
    user.library.entitlements.plan = 'supporter';

    await db.users.save(user);
    syncUserPublicLists(user).catch(() => {});
}

function normalizeCountry(country) {
    return country ? String(country).trim().toUpperCase() : '';
}

function getInvoiceCountry(invoice, customer) {
    return normalizeCountry(
        (invoice.customer_address && invoice.customer_address.country)
        || (invoice.customer_shipping && invoice.customer_shipping.address && invoice.customer_shipping.address.country)
        || (customer && customer.address && customer.address.country),
    );
}

function getTaxIdCountry(taxId) {
    return normalizeCountry(taxId.country || String(taxId.value || '').slice(0, 2));
}

function isVerifiedEuVatId(taxId) {
    if (!taxId || taxId.type !== 'eu_vat') return false;
    const verification = taxId.verification || {};
    return verification.status !== 'unverified';
}

function hasForeignEuVatId(taxIds, customerCountry) {
    return (taxIds || []).some((taxId) => {
        if (!isVerifiedEuVatId(taxId)) return false;
        const taxCountry = getTaxIdCountry(taxId) || customerCountry;
        return taxCountry && taxCountry !== 'FR' && EU_COUNTRY_CODES.has(taxCountry);
    });
}

function getInvoiceVatMention(invoice, customer = null, taxIds = []) {
    const country = getInvoiceCountry(invoice, customer);

    if (hasForeignEuVatId(taxIds, country)) {
        return VAT_MENTION_EU_REVERSE_CHARGE;
    }

    if (country && !EU_COUNTRY_CODES.has(country)) {
        return VAT_MENTION_OUTSIDE_EU;
    }

    return VAT_MENTION_FRANCHISE;
}

function getInvoiceFooter(invoice, customer = null, taxIds = []) {
    return `${INVOICE_SELLER_FOOTER} · ${getInvoiceVatMention(invoice, customer, taxIds)}`;
}

function getInvoiceTaxIds(invoice, customer, listedTaxIds) {
    if (listedTaxIds && listedTaxIds.data) return listedTaxIds.data;
    if (Array.isArray(listedTaxIds)) return listedTaxIds;
    if (invoice && Array.isArray(invoice.customer_tax_ids)) return invoice.customer_tax_ids;
    if (customer && customer.tax_ids && Array.isArray(customer.tax_ids.data)) return customer.tax_ids.data;
    return [];
}

async function updateInvoiceFooter(invoice, stripe = getStripe()) {
    if (!invoice || !invoice.id) return null;

    let customer = null;
    if (invoice.customer && typeof invoice.customer === 'string') {
        customer = await stripe.customers.retrieve(invoice.customer);
    } else if (invoice.customer && typeof invoice.customer === 'object') {
        customer = invoice.customer;
    }

    let listedTaxIds = null;
    if (invoice.customer && typeof invoice.customer === 'string' && stripe.customers.listTaxIds) {
        listedTaxIds = await stripe.customers.listTaxIds(invoice.customer, { limit: 100 });
    }

    const taxIds = getInvoiceTaxIds(invoice, customer, listedTaxIds);
    const footer = getInvoiceFooter(invoice, customer, taxIds);

    if (invoice.footer === footer) return invoice;

    return stripe.invoices.update(invoice.id, { footer });
}

module.exports = {
    LEGAL_ENTITY_VERSION,
    INVOICE_SELLER_FOOTER,
    VAT_MENTION_FRANCHISE,
    VAT_MENTION_EU_REVERSE_CHARGE,
    VAT_MENTION_OUTSIDE_EU,
    stripeEnabled,
    getStripe,
    getPlanFromPriceId,
    getIntervalFromPriceId,
    getOrCreateCustomer,
    syncUserBilling,
    syncKofiBilling,
    getInvoiceVatMention,
    getInvoiceFooter,
    updateInvoiceFooter,
};
