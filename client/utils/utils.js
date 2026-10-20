const ENGLISH_GENERIC_ERROR = 'An error occurred, please try again later.';
// Shown when a failed request has nothing to say. This file is loaded by tests in Node, where the
// i18n module cannot run, so the app hands it the sentence of the page language (client/i18n.js).
let genericErrorMessage = ENGLISH_GENERIC_ERROR;

export function setGenericErrorMessage(message) {
    genericErrorMessage = typeof message === 'string' && message ? message : ENGLISH_GENERIC_ERROR;
}

class lpError extends Error {
    constructor(response, statusCode = null) {
        super();

        this.message = genericErrorMessage;
        this.statusCode = statusCode;
        this.status = statusCode;
        this.isUnauthorized = statusCode === 401 || statusCode === 403;
        this.errors = null;
        this.id = null;
        this.metadata = null;
        this.limit = response.limit || null;
        this.retryAfterMinutes = response.retryAfterMinutes || null;
        // Set by the image upload routes: why it failed, and the size limit when it is too large.
        this.code = response.code || null;
        this.maxBytes = response.maxBytes || null;

        if (response.message) {
            this.message = response.message;
        } else if (response.errors && response.errors instanceof Array && response.errors.length && response.errors[0].message) {
            this.message = response.errors[0].message;
        }

        if (response.errors) {
            this.errors = response.errors;
        }
    }
}

export function fetchJson(url, options) {
    const fetchOptions = {
        method: 'GET',
        headers: {},
    };

    if (options) {
        Object.assign(fetchOptions, options);
    }

    // A FormData body needs the browser's own multipart Content-Type, which carries the boundary:
    // forcing JSON here made every file upload unreadable for the server.
    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    if (!isFormData && !fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
    }

    function parseJSON(response) {
        return new Promise((resolve, reject) => {
            response
                .text()
                .then((text) => {
                    let json;

                    try {
                        json = text ? JSON.parse(text) : {};
                    } catch (err) {
                        json = { message: response };
                    }

                    return resolve({
                        status: response.status,
                        ok: response.ok,
                        json,
                    });
                })
                .catch((err) => reject(err));
        });
    }

    return new Promise((resolve, reject) => {
        fetch(url, fetchOptions)
            .then(parseJSON)
            .then((response) => {
                if (response.ok) {
                    return resolve(response.json);
                }
                if (response.status && (response.status === 401 || response.status === 403)) {
                    const error = new lpError(response.json || response, response.status);
                    return reject(error);
                }

                if (response.json) {
                    return reject(new lpError(response.json, response.status));
                }

                return reject(new lpError(response));
            })
            .catch((err) => {
                if (err && err instanceof TypeError && err.message === 'Failed to fetch') {
                    err = {};
                }

                return reject(new lpError(err));
            });
    });
}

export function getElementIndex(node) {
    let index = 0;
    let current = node.previousElementSibling;
    while (current) {
        index++;
        current = current.previousElementSibling;
    }
    return index;
}

export function arrayMove(inputArray, oldIndex, newIndex) {
    const array = inputArray.slice();
    const element = array[oldIndex];
    array.splice(oldIndex, 1);
    array.splice(newIndex, 0, element);
    return array;
}
