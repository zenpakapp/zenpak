import { testRoot } from './utils';
import config from 'config';
import { MongoClient } from 'mongodb';

export async function getSharedUser(page) {
    const password = 'testtest';
    const username = 'testuser';
    const email = 'testuser@lighterpack.com';

    const response = await page.request.post(`${testRoot}register`, {
        data: { username, email, password },
    });

    return { username, password, email };
}

export async function registerUser(page, username, password, email) {
    await page.goto(testRoot);

    await page.fill('.lpRegister input[name="username"]', username);
    await page.fill('.lpRegister input[name="email"]', email);
    await page.fill('.lpRegister input[name="password"]', password);
    await page.fill('.lpRegister input[name="passwordConfirm"]', password);
    await page.getByRole('button').filter({hasText: 'Register'}).click();
    await page.getByRole('button', { name: 'Create my list' }).click();
}

export async function verifyUserEmail(username) {
    const databaseUrl = config.get('databaseUrl');
    const client = new MongoClient(`mongodb://${databaseUrl}`);
    const dbName = databaseUrl.split('/').pop();

    try {
        await client.connect();
        const users = client.db(dbName).collection('users');
        for (let attempt = 0; attempt < 20; attempt++) {
            const result = await users.updateOne(
                { username },
                { $set: { emailVerified: true }, $unset: { emailVerifyToken: '' } },
            );
            if (result.matchedCount > 0) return;
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error(`Unable to verify test user ${username}`);
    } finally {
        await client.close();
    }
}

export async function registerUserWithTemplate(page, username, password, email, templateName) {
    await page.goto(testRoot);

    await page.fill('.lpRegister input[name="username"]', username);
    await page.fill('.lpRegister input[name="email"]', email);
    await page.fill('.lpRegister input[name="password"]', password);
    await page.fill('.lpRegister input[name="passwordConfirm"]', password);
    await page.getByRole('button').filter({hasText: 'Register'}).click();
    const templateCard = page.getByText(templateName, { exact: true });
    await templateCard.waitFor();
    await templateCard.locator('..').locator('..').getByRole('button', { name: 'Select' }).click();
}

export async function loginUser(page, username, password) {
    await page.goto(testRoot);
  
    await page.fill('.signin input[name="username"]', username);
    await page.fill('.signin input[name="password"]', password);
    await page.getByRole('button').filter({hasText: 'Sign in'}).click();
}

export async function logoutUser(page) { 
    await page.locator('.accountDropdownName').hover();
    await page.getByText('Sign out').click();
}
