import { getFirebaseIdToken } from './firebaseProvider';

export class FirebaseFunctionProvider {
    private functionUrl: string;
    private firebaseConfig: any;

    constructor(functionUrl: string, firebaseConfig: any) {
        this.functionUrl = functionUrl.replace(/\/$/, '');
        this.firebaseConfig = firebaseConfig;
    }

    async createExecution(_functionId: string, body: string | Record<string, unknown>): Promise<any> {
        const token = await getFirebaseIdToken(this.firebaseConfig);
        if (!token) throw new Error('You must be signed in to call this function');
        const response = await fetch(this.functionUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: typeof body === 'string' ? body : JSON.stringify(body)
        });
        const responseBody = await response.text();
        if (!response.ok) {
            let message = `Function request failed (${response.status})`;
            try {
                const payload = JSON.parse(responseBody);
                if (typeof payload?.error === 'string' && payload.error.trim()) message = payload.error;
            } catch {
                if (responseBody.trim()) message = responseBody.trim();
            }
            throw new Error(message);
        }
        return {
            $id: crypto.randomUUID(),
            status: 'completed',
            responseBody
        };
    }
}
