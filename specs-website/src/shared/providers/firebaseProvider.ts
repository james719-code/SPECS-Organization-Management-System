/**
 * Firebase Provider Implementation
 * Implements auth and database using Firebase SDK
 * Note: Firebase Auth and Firestore only - use CloudflareR2Provider for storage
 */

import { IAuthProvider, IDatabaseProvider } from './interface';

// Firebase imports will be loaded dynamically when needed
let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;

/**
 * Initialize Firebase lazily
 */
async function initFirebase(config: any) {
    if (firebaseApp) return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };

    const { initializeApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');

    firebaseApp = initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);

    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
}

/**
 * Firebase Authentication Provider
 */
export class FirebaseAuthProvider extends IAuthProvider {
    private config: any;
    private auth: any;

    constructor(config: any) {
        super();
        this.config = config;
        this.auth = null;
    }

    private async _ensureAuth() {
        if (!this.auth) {
            const { auth } = await initFirebase(this.config);
            this.auth = auth;
        }
        return this.auth;
    }

    async getCurrentUser(): Promise<any> {
        const auth = await this._ensureAuth();
        const { onAuthStateChanged } = await import('firebase/auth');

        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user: any) => {
                unsubscribe();
                if (user) {
                    resolve({
                        $id: user.uid,
                        email: user.email,
                        name: user.displayName,
                        emailVerification: user.emailVerified
                    });
                } else {
                    reject(new Error('Not authenticated'));
                }
            });
        });
    }

    async login(email: string, password: string): Promise<any> {
        const auth = await this._ensureAuth();
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const result = await signInWithEmailAndPassword(auth, email, password);
        return {
            $id: result.user.uid,
            userId: result.user.uid
        };
    }

    async logout(): Promise<void> {
        const auth = await this._ensureAuth();
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
    }

    async register(email: string, password: string, name: string): Promise<any> {
        const auth = await this._ensureAuth();
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const result = await createUserWithEmailAndPassword(auth, email, password);

        if (name) {
            await updateProfile(result.user, { displayName: name });
        }

        return {
            $id: result.user.uid,
            email: result.user.email,
            name: name
        };
    }

    async sendPasswordRecovery(email: string, redirectUrl: string): Promise<void> {
        const auth = await this._ensureAuth();
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email, {
            url: redirectUrl
        });
    }

    async confirmPasswordRecovery(oobCode: string, password: string): Promise<void> {
        const auth = await this._ensureAuth();
        const { confirmPasswordReset } = await import('firebase/auth');
        await confirmPasswordReset(auth, oobCode, password);
    }

    async sendVerification(redirectUrl: string): Promise<void> {
        const auth = await this._ensureAuth();
        const { sendEmailVerification } = await import('firebase/auth');
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser, {
                url: redirectUrl
            });
            return;
        }
        throw new Error('No user logged in');
    }

    async confirmVerification(oobCode: string): Promise<void> {
        const auth = await this._ensureAuth();
        const { applyActionCode } = await import('firebase/auth');
        await applyActionCode(auth, oobCode);
    }
}

/**
 * Firebase Firestore Database Provider
 */
export class FirebaseDatabaseProvider extends IDatabaseProvider {
    private config: any;
    private db: any;

    constructor(config: any) {
        super();
        this.config = config;
        this.db = null;
    }

    private async _ensureDb() {
        if (!this.db) {
            const { db } = await initFirebase(this.config);
            this.db = db;
        }
        return this.db;
    }

    private _parseAppwriteQuery(queryStr: string | any) {
        const str = typeof queryStr === 'string' ? queryStr : String(queryStr);
        const match = str.match(/^(\w+)\((.+)\)$/);
        if (!match) return null;

        const method = match[1];
        const argsStr = match[2];

        const args = [];
        let current = '';
        let inString = false;
        let inArray = false;
        let stringChar = '';

        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            if (!inString && !inArray && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && argsStr[i - 1] !== '\\') {
                inString = false;
            } else if (!inString && char === '[') {
                inArray = true;
                current += char;
            } else if (!inString && char === ']') {
                inArray = false;
                current += char;
            } else if (!inString && !inArray && char === ',') {
                args.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        if (current.trim()) args.push(current.trim());

        const parsedArgs = args.map(arg => {
            arg = arg.trim();
            if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
                return arg.slice(1, -1);
            }
            if (arg.startsWith('[') && arg.endsWith(']')) {
                try { return JSON.parse(arg); } catch { return arg; }
            }
            if (!isNaN(arg as any)) return Number(arg);
            if (arg === 'true') return true;
            if (arg === 'false') return false;
            return arg;
        });

        return { method, args: parsedArgs };
    }

    private async _convertQueries(queries: any[]) {
        const { where, orderBy, limit: firestoreLimit } = await import('firebase/firestore');
        
        const constraints = [];
        let limitValue = null;
        let offsetValue = 0;

        for (const query of queries) {
            const parsed = this._parseAppwriteQuery(query);
            if (!parsed) continue;

            const { method, args } = parsed;

            switch (method) {
                case 'equal':
                    if (args.length >= 2) {
                        constraints.push(where(args[0], '==', args[1]));
                    }
                    break;
                case 'notEqual':
                    if (args.length >= 2) {
                        constraints.push(where(args[0], '!=', args[1]));
                    }
                    break;
                case 'greaterThan':
                    if (args.length >= 2) {
                        constraints.push(where(args[0], '>', args[1]));
                    }
                    break;
                case 'greaterThanEqual':
                    if (args.length >= 2) {
                        constraints.push(where(args[0], '>=', args[1]));
                    }
                    break;
                case 'lessThan':
                    if (args.length >= 2) {
                        constraints.push(where(args[0], '<', args[1]));
                    }
                    break;
                case 'lessThanEqual':
                    if (args.length >= 2) {
                        constraints.push(where(args[0], '<=', args[1]));
                    }
                    break;
                case 'orderDesc':
                    if (args.length >= 1) {
                        constraints.push(orderBy(args[0], 'desc'));
                    }
                    break;
                case 'orderAsc':
                    if (args.length >= 1) {
                        constraints.push(orderBy(args[0], 'asc'));
                    }
                    break;
                case 'limit':
                    if (args.length >= 1) {
                        limitValue = Number(args[0]);
                    }
                    break;
                case 'offset':
                    offsetValue = Number(args[0]);
                    console.warn('[FirebaseProvider] offset() is not efficiently supported in Firestore. Consider cursor-based pagination.');
                    break;
            }
        }

        if (limitValue !== null) {
            constraints.push(firestoreLimit(limitValue));
        }

        return { constraints, limitValue, offsetValue };
    }

    async listDocuments(databaseId: string, collectionId: string, queries: any[] = []): Promise<{ documents: any[]; total: number }> {
        const db = await this._ensureDb();
        const { collection, getDocs, query } = await import('firebase/firestore');

        const collectionRef = collection(db, collectionId);

        const { constraints, offsetValue } = await this._convertQueries(queries);
        const q = query(collectionRef, ...constraints);
        const snapshot = await getDocs(q);

        let documents = snapshot.docs.map(doc => ({
            $id: doc.id,
            ...doc.data()
        }));

        if (offsetValue > 0) {
            documents = documents.slice(offsetValue);
        }

        return {
            documents,
            total: documents.length
        };
    }

    async getDocument(databaseId: string, collectionId: string, documentId: string): Promise<any> {
        const db = await this._ensureDb();
        const { doc, getDoc } = await import('firebase/firestore');

        const docRef = doc(db, collectionId, documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error(`Document not found: ${documentId}`);
        }

        return {
            $id: docSnap.id,
            ...docSnap.data()
        };
    }

    async createDocument(databaseId: string, collectionId: string, documentId: string, data: any): Promise<any> {
        const db = await this._ensureDb();
        const { doc, setDoc } = await import('firebase/firestore');

        const id = documentId === 'unique()' ? crypto.randomUUID() : documentId;
        const docRef = doc(db, collectionId, id);

        const docData = {
            ...data,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, docData);

        return {
            $id: id,
            ...docData
        };
    }

    async updateDocument(databaseId: string, collectionId: string, documentId: string, data: any): Promise<any> {
        const db = await this._ensureDb();
        const { doc, updateDoc, getDoc } = await import('firebase/firestore');

        const docRef = doc(db, collectionId, documentId);

        await updateDoc(docRef, {
            ...data,
            $updatedAt: new Date().toISOString()
        });

        const updated = await getDoc(docRef);
        return {
            $id: updated.id,
            ...updated.data()
        };
    }

    async deleteDocument(databaseId: string, collectionId: string, documentId: string): Promise<void> {
        const db = await this._ensureDb();
        const { doc, deleteDoc } = await import('firebase/firestore');

        const docRef = doc(db, collectionId, documentId);
        await deleteDoc(docRef);
    }
}

/**
 * Create Firebase providers from configuration
 */
export function createFirebaseProviders(config: any) {
    return {
        auth: new FirebaseAuthProvider(config),
        database: new FirebaseDatabaseProvider(config),
        storage: null
    };
}
