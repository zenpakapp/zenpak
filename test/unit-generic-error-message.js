/**
 * Unit test: the message shown when a request fails with nothing to say is in the language of the
 * page. utils.js stays free of the i18n module (tests load it in Node), so the app hands it the
 * translated sentence; a message from the server is never replaced.
 * Run with: node test/unit-generic-error-message.js
 */

'use strict';

const assert = require('assert');
const { fetchJson, setGenericErrorMessage } = require('../client/utils/utils.js');

const fail = (response) => {
    global.fetch = async () => response;
    return fetchJson('/x').then(
        () => assert.fail('should reject'),
        (error) => error,
    );
};
const emptyFailure = { ok: false, status: 500, text: async () => '' };

(async () => {
    // Before the app sets anything: the English sentence.
    assert.strictEqual((await fail(emptyFailure)).message, 'An error occurred, please try again later.');

    // The app sets the sentence of the page language.
    setGenericErrorMessage("Une erreur s'est produite, veuillez réessayer plus tard.");
    assert.strictEqual((await fail(emptyFailure)).message, "Une erreur s'est produite, veuillez réessayer plus tard.");

    // A lost connection says the same, in the same language.
    global.fetch = async () => { throw new TypeError('Failed to fetch'); };
    const offline = await fetchJson('/x').then(() => assert.fail('should reject'), (error) => error);
    assert.strictEqual(offline.message, "Une erreur s'est produite, veuillez réessayer plus tard.");

    // A message from the server is kept as it is.
    const withMessage = await fail({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Username taken.' }) });
    assert.strictEqual(withMessage.message, 'Username taken.');
    const withErrors = await fail({ ok: false, status: 400, text: async () => JSON.stringify({ errors: [{ message: 'Bad email.' }] }) });
    assert.strictEqual(withErrors.message, 'Bad email.');

    // Nothing usable given: the English sentence comes back rather than an empty message.
    setGenericErrorMessage('');
    assert.strictEqual((await fail(emptyFailure)).message, 'An error occurred, please try again later.');
    setGenericErrorMessage(undefined);
    assert.strictEqual((await fail(emptyFailure)).message, 'An error occurred, please try again later.');

    console.log('ok');
})();
