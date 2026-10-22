/**
 * Browser push notifications via Firebase Cloud Messaging (free, no per-message cost).
 *
 * Flow: the user clicks "Enable" -> browser permission prompt -> FCM token -> the Edge
 * Function stores it (push_tokens). When an admin/officer publishes a notification the
 * Edge Function sends it through FCM and /firebase-messaging-sw.js displays it.
 */
import { firebaseConfig, functions } from './appwrite';
import { FUNCTION_ID } from './constants';
import { getFirebaseApp } from './providers/firebaseProvider';

const VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim();
const SW_URL = '/firebase-messaging-sw.js';
const PREF_KEY = 'specs_push_state';
const RESYNC_MS = 12 * 60 * 60 * 1000;

export type PushStatus = 'unavailable' | 'blocked' | 'prompt' | 'enabled' | 'off';

type StoredState = { uid: string; token: string; at: number } | { off: true };

const readState = (): StoredState | null => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); } catch { return null; }
};
const writeState = (state: StoredState | null) => {
    try { state ? localStorage.setItem(PREF_KEY, JSON.stringify(state)) : localStorage.removeItem(PREF_KEY); } catch { /* storage unavailable */ }
};

const usesFirebase = () => import.meta.env.VITE_AUTH_PROVIDER === 'firebase' && !(import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true');

export function isPushAvailable(): boolean {
    return usesFirebase() && !!VAPID_KEY && typeof window !== 'undefined'
        && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getPushStatus(): PushStatus {
    if (!isPushAvailable()) return 'unavailable';
    if (Notification.permission === 'denied') return 'blocked';
    if (Notification.permission === 'default') return 'prompt';
    const state = readState();
    return state && 'token' in state ? 'enabled' : 'off';
}

async function callFunction(action: string, payload: Record<string, unknown>) {
    const execution = await functions.createExecution(FUNCTION_ID || '', JSON.stringify({ action, payload }));
    let result: any = {};
    try { result = JSON.parse(execution?.responseBody || '{}'); } catch { /* ignore */ }
    if (result.success === false) throw new Error(result.error || 'Request failed');
    return result;
}

async function currentToken(): Promise<string> {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) throw new Error('This browser does not support push notifications');
    const registration = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;
    const app = await getFirebaseApp(firebaseConfig);
    const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) throw new Error('Could not get a push token from this browser');
    return token;
}

async function registerCurrentToken(uid: string): Promise<void> {
    const token = await currentToken();
    await callFunction('register_push_token', { token, userAgent: navigator.userAgent });
    writeState({ uid, token, at: Date.now() });
}

/** Must be called from a click handler so the browser allows the permission prompt. */
export async function enablePush(uid: string): Promise<PushStatus> {
    if (!isPushAvailable()) return 'unavailable';
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return getPushStatus();
    await registerCurrentToken(uid);
    return 'enabled';
}

export async function disablePush(): Promise<PushStatus> {
    const state = readState();
    try {
        if (state && 'token' in state) await callFunction('unregister_push_token', { token: state.token });
        const { getMessaging, deleteToken } = await import('firebase/messaging');
        await deleteToken(getMessaging(await getFirebaseApp(firebaseConfig)));
    } catch (error) {
        console.warn('[push] Failed to fully disable push', error);
    }
    writeState({ off: true });
    return getPushStatus();
}

/** Silent refresh after sign-in: keeps the stored token (and role) current. Never prompts. */
export async function syncPush(uid: string): Promise<void> {
    if (!isPushAvailable() || Notification.permission !== 'granted') return;
    const state = readState();
    if (state && 'off' in state) return;
    if (state && state.uid === uid && Date.now() - state.at < RESYNC_MS) return;
    try { await registerCurrentToken(uid); } catch (error) { console.warn('[push] Token sync failed', error); }
}

export type ForegroundPush = { title: string; body: string; link: string; priority: string };

/** Pushes that arrive while the site is open are forwarded by the service worker. */
export function onForegroundPush(handler: (message: ForegroundPush) => void): () => void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};
    const listener = (event: MessageEvent) => {
        if (event.data?.type === 'specs-push') handler(event.data as ForegroundPush);
    };
    navigator.serviceWorker.addEventListener('message', listener);
    return () => navigator.serviceWorker.removeEventListener('message', listener);
}
