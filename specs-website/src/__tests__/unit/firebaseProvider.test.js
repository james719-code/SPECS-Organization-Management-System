import { describe, expect, it } from 'vitest';
import { Query } from 'appwrite';
import { FirebaseDatabaseProvider } from '../../shared/providers/firebaseProvider';

describe('FirebaseDatabaseProvider Appwrite query compatibility', () => {
    const provider = new FirebaseDatabaseProvider({
        apiKey: 'test',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        appId: 'test-app'
    });

    it('parses the JSON query format emitted by the current Appwrite SDK', () => {
        expect(provider._parseAppwriteQuery(Query.equal('students', 'student-123'))).toEqual({
            method: 'equal',
            args: ['students', 'student-123']
        });
    });

    it('keeps limit and offset separate from Firestore filter constraints', async () => {
        const result = await provider._convertQueries([
            Query.equal('type', 'student'),
            Query.isNotNull('custom_session_id'),
            Query.limit(25),
            Query.offset(25)
        ]);

        expect(result.limitValue).toBe(25);
        expect(result.offsetValue).toBe(25);
        expect(result.constraints).toHaveLength(2);
    });
});
