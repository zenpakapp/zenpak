// Wording of the moderation emails, one block per language. A notice gives the plain fact and
// the way to ask for a review; it never says who reported. de and es are to be read by a native.
// {name} is the list name, {user} the username.
const TEXTS = {
    en: {
        greeting: 'Hi {user},',
        signature: 'The ZenPak team',
        listUnpublished: {
            subject: 'Your list "{name}" was removed from the community',
            body: 'Your list "{name}" was removed from the community because it does not follow the ZenPak terms of use. It is now private: you still have it, and nobody else can see it.\n\nIf you think this is a mistake, reply to this email and a person will review it.',
        },
        accountBanned: {
            subject: 'Your ZenPak account was suspended',
            body: 'Your ZenPak account was suspended because it does not follow the terms of use. Your lists are kept, but you cannot sign in and your public pages are hidden.\n\nIf you think this is a mistake, reply to this email and a person will review it.',
        },
        accountRestored: {
            subject: 'Your ZenPak account is active again',
            body: 'Your ZenPak account is active again. You can sign in, and your public lists are visible again.',
        },
    },
    fr: {
        greeting: 'Bonjour {user},',
        signature: 'L’équipe ZenPak',
        listUnpublished: {
            subject: 'Votre liste « {name} » a été retirée de la communauté',
            body: 'Votre liste « {name} » a été retirée de la communauté car elle ne respecte pas les conditions d’utilisation de ZenPak. Elle est maintenant privée : vous la gardez, et personne d’autre ne peut la voir.\n\nSi vous pensez qu’il s’agit d’une erreur, répondez à cet e-mail : une personne réexaminera votre cas.',
        },
        accountBanned: {
            subject: 'Votre compte ZenPak a été suspendu',
            body: 'Votre compte ZenPak a été suspendu car il ne respecte pas les conditions d’utilisation. Vos listes sont conservées, mais vous ne pouvez plus vous connecter et vos pages publiques sont masquées.\n\nSi vous pensez qu’il s’agit d’une erreur, répondez à cet e-mail : une personne réexaminera votre cas.',
        },
        accountRestored: {
            subject: 'Votre compte ZenPak est de nouveau actif',
            body: 'Votre compte ZenPak est de nouveau actif. Vous pouvez vous connecter, et vos listes publiques sont de nouveau visibles.',
        },
    },
    de: {
        greeting: 'Hallo {user},',
        signature: 'Das ZenPak-Team',
        listUnpublished: {
            subject: 'Deine Liste „{name}“ wurde aus der Community entfernt',
            body: 'Deine Liste „{name}“ wurde aus der Community entfernt, weil sie gegen die ZenPak-Nutzungsbedingungen verstößt. Sie ist jetzt privat: Du behältst sie, und niemand sonst kann sie sehen.\n\nWenn du glaubst, dass das ein Fehler ist, antworte auf diese E-Mail. Eine Person prüft deinen Fall erneut.',
        },
        accountBanned: {
            subject: 'Dein ZenPak-Konto wurde gesperrt',
            body: 'Dein ZenPak-Konto wurde gesperrt, weil es gegen die Nutzungsbedingungen verstößt. Deine Listen bleiben erhalten, aber du kannst dich nicht mehr anmelden und deine öffentlichen Seiten sind ausgeblendet.\n\nWenn du glaubst, dass das ein Fehler ist, antworte auf diese E-Mail. Eine Person prüft deinen Fall erneut.',
        },
        accountRestored: {
            subject: 'Dein ZenPak-Konto ist wieder aktiv',
            body: 'Dein ZenPak-Konto ist wieder aktiv. Du kannst dich anmelden, und deine öffentlichen Listen sind wieder sichtbar.',
        },
    },
    es: {
        greeting: 'Hola {user},',
        signature: 'El equipo de ZenPak',
        listUnpublished: {
            subject: 'Tu lista «{name}» se retiró de la comunidad',
            body: 'Tu lista «{name}» se retiró de la comunidad porque no cumple las condiciones de uso de ZenPak. Ahora es privada: la conservas y nadie más puede verla.\n\nSi crees que es un error, responde a este correo y una persona revisará tu caso.',
        },
        accountBanned: {
            subject: 'Tu cuenta de ZenPak fue suspendida',
            body: 'Tu cuenta de ZenPak fue suspendida porque no cumple las condiciones de uso. Tus listas se conservan, pero no puedes iniciar sesión y tus páginas públicas están ocultas.\n\nSi crees que es un error, responde a este correo y una persona revisará tu caso.',
        },
        accountRestored: {
            subject: 'Tu cuenta de ZenPak está activa de nuevo',
            body: 'Tu cuenta de ZenPak está activa de nuevo. Puedes iniciar sesión y tus listas públicas vuelven a ser visibles.',
        },
    },
};

module.exports = { TEXTS };
