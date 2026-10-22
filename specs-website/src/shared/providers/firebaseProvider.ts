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

    const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missingKeys = requiredKeys.filter((key) => typeof config?.[key] !== 'string' || !config[key].trim());
    if (missingKeys.length > 0) {
        throw new Error(`Firebase configuration is incomplete. Missing: ${missingKeys.join(', ')}. Set the VITE_FIREBASE_* values in specs-website/.env and restart Vite.`);
    }

    const { initializeApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');

    firebaseApp = initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);

    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
}

/** Return the shared Firebase app (used by Cloud Messaging for web push). */
export async function getFirebaseApp(config: any): Promise<any> {
    const { app } = await initFirebase(config);
    return app;
}

/** Return the shared Firebase Auth instance for function/storage requests. */
export async function getFirebaseIdToken(config: any): Promise<string | null> {
    const { auth } = await initFirebase(config);
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
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

        return new Promise((resolve) => {
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
                    // A missing Firebase session is a normal signed-out state,
                    // not a provider failure. Returning null lets the shared
                    // API/auth cache handle it consistently with Appwrite's
                    // 401 response.
                    resolve(null);
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
            url: redirectUrl,
            handleCodeInApp: false
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
                url: redirectUrl,
                handleCodeInApp: false
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

        // Appwrite's current web SDK serializes Query helpers as JSON, for
        // example: {"method":"equal","attribute":"type","values":["student"]}.
        // Keep support for the older equal("field", "value") form below,
        // because both forms may exist while the compatibility layer is in use.
        try {
            const structured = JSON.parse(str);
            if (structured && typeof structured.method === 'string') {
                const values = Array.isArray(structured.values) ? structured.values : [];
                const args = structured.attribute !== undefined
                    ? [structured.attribute, ...values]
                    : values;
                return { method: structured.method, args };
            }
        } catch {
            // Fall through to the legacy function-style parser.
        }

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
        const { where, orderBy } = await import('firebase/firestore');
        
        const constraints: any[] = [];
        let limitValue = null;
        let offsetValue = 0;

        for (const query of queries) {
            const parsed = this._parseAppwriteQuery(query);
            if (!parsed) {
                throw new Error(`[FirebaseProvider] Unsupported Appwrite query: ${String(query)}`);
            }

            const { method, args } = parsed;

            const fieldName = (value: any) => value === '$createdAt' ? 'createdAt' : value === '$updatedAt' ? 'updatedAt' : value;
            const comparisonValues = () => {
                if (args.length < 2) return [];
                if (args.length === 2 && Array.isArray(args[1])) return args[1];
                return args.slice(1);
            };
            const firstComparisonValue = () => comparisonValues()[0];

            switch (method) {
                case 'equal':
                    {
                        const values = comparisonValues();
                        if (values.length === 1) constraints.push(where(fieldName(args[0]), '==', values[0]));
                        else if (values.length > 1) constraints.push(where(fieldName(args[0]), 'in', values));
                    }
                    break;
                case 'notEqual':
                    {
                        const values = comparisonValues();
                        if (values.length === 1) constraints.push(where(fieldName(args[0]), '!=', values[0]));
                        else if (values.length > 1) constraints.push(where(fieldName(args[0]), 'not-in', values));
                    }
                    break;
                case 'isNotNull':
                    if (args.length >= 1) {
                        constraints.push(where(fieldName(args[0]), '!=', null));
                    }
                    break;
                case 'isNull':
                    if (args.length >= 1) {
                        constraints.push(where(fieldName(args[0]), '==', null));
                    }
                    break;
                case 'greaterThan':
                    if (args.length >= 2) {
                        constraints.push(where(fieldName(args[0]), '>', firstComparisonValue()));
                    }
                    break;
                case 'greaterThanEqual':
                    if (args.length >= 2) {
                        constraints.push(where(fieldName(args[0]), '>=', firstComparisonValue()));
                    }
                    break;
                case 'lessThan':
                    if (args.length >= 2) {
                        constraints.push(where(fieldName(args[0]), '<', firstComparisonValue()));
                    }
                    break;
                case 'lessThanEqual':
                    if (args.length >= 2) {
                        constraints.push(where(fieldName(args[0]), '<=', firstComparisonValue()));
                    }
                    break;
                case 'orderDesc':
                    if (args.length >= 1) {
                        constraints.push(orderBy(fieldName(args[0]), 'desc'));
                    }
                    break;
                case 'orderAsc':
                    if (args.length >= 1) {
                        constraints.push(orderBy(fieldName(args[0]), 'asc'));
                    }
                    break;
                case 'limit':
                    if (args.length >= 1) {
                        limitValue = Number(args[0]);
                    }
                    break;
                case 'offset':
                    offsetValue = Number(args[0]);
                    break;
                default:
                    throw new Error(`[FirebaseProvider] Unsupported Appwrite query method: ${method}`);
            }
        }

        return { constraints, limitValue, offsetValue };
    }

    async listDocuments(_databaseId: string, collectionId: string, queries: any[] = []): Promise<{ documents: any[]; total: number }> {
        const db = await this._ensureDb();
        const { collection, getCountFromServer, getDocs, limit: firestoreLimit, query } = await import('firebase/firestore');

        const collectionRef = collection(db, collectionId);

        const { constraints, limitValue, offsetValue } = await this._convertQueries(queries);
        const readConstraints = [...constraints];
        if (limitValue !== null) {
            // Firestore's web SDK has no portable offset constraint. Read
            // through the requested page and slice locally so offset pages do
            // not accidentally repeat page 1 or return an empty page.
            readConstraints.push(firestoreLimit(Math.max(limitValue + offsetValue, 1)));
        }
        const pageQuery = query(collectionRef, ...readConstraints);
        const snapshot = await getDocs(pageQuery);

        const documents = snapshot.docs
            .slice(offsetValue, limitValue === null ? undefined : offsetValue + limitValue)
            .map(doc => this._withAppwriteAliases(doc.id, doc.data()));

        // Firestore aggregation queries are a separate permission-checked
        // request (`runAggregationQuery`). Public landing-page collections
        // allow document reads but do not need an exact server-side count.
        // Avoid sending the aggregation request while signed out; the
        // document page still provides an accurate total for the public
        // event/story reads, and authenticated dashboard reads retain exact
        // counts when rules permit them.
        let total = offsetValue + documents.length;
        if (firebaseAuth?.currentUser) {
            try {
                total = (await getCountFromServer(query(collectionRef, ...constraints))).data().count;
            } catch (error) {
                console.warn('[FirebaseProvider] Count aggregation unavailable; using page count.', error);
            }
        }

        return {
            documents,
            total
        };
    }

    async getDocument(_databaseId: string, collectionId: string, documentId: string): Promise<any> {
        const db = await this._ensureDb();
        const { doc, getDoc } = await import('firebase/firestore');

        const docRef = doc(db, collectionId, documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error(`Document not found: ${documentId}`);
        }

        return this._withAppwriteAliases(docSnap.id, docSnap.data());
    }

    private _withAppwriteAliases(id: string, data: any) {
        const asDate = (value: any) => value && typeof value.toDate === 'function' ? value.toDate() : value;
        return {
            $id: id,
            ...data,
            ...(data.createdAt !== undefined && data.$createdAt === undefined ? { $createdAt: asDate(data.createdAt) } : {}),
            ...(data.updatedAt !== undefined && data.$updatedAt === undefined ? { $updatedAt: asDate(data.updatedAt) } : {})
        };
    }

    private _cleanWriteData(data: any, timestamp: any, includeCreatedAt = true) {
        const { $createdAt, $updatedAt, ...rest } = data || {};
        return {
            ...rest,
            ...(includeCreatedAt ? { createdAt: data?.createdAt ?? $createdAt ?? timestamp } : {}),
            updatedAt: data?.updatedAt ?? $updatedAt ?? timestamp
        };
    }

    async createDocument(_databaseId: string, collectionId: string, documentId: string, data: any): Promise<any> {
        const db = await this._ensureDb();
        const { doc, setDoc, Timestamp } = await import('firebase/firestore');

        const id = documentId === 'unique()' ? crypto.randomUUID() : documentId;
        const docRef = doc(db, collectionId, id);

        const timestamp = Timestamp.now();
        const docData = this._cleanWriteData(data, timestamp);

        await setDoc(docRef, docData);

        return {
            ...this._withAppwriteAliases(id, docData)
        };
    }

    async updateDocument(_databaseId: string, collectionId: string, documentId: string, data: any): Promise<any> {
        const db = await this._ensureDb();
        const { doc, updateDoc, getDoc, Timestamp } = await import('firebase/firestore');

        const docRef = doc(db, collectionId, documentId);

        await updateDoc(docRef, this._cleanWriteData(data, Timestamp.now(), false));

        const updated = await getDoc(docRef);
        return this._withAppwriteAliases(updated.id, updated.data());
    }

    async deleteDocument(_databaseId: string, collectionId: string, documentId: string): Promise<void> {
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
