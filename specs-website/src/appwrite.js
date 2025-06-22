// appwrite.js

// 1. Import the 'Users' service from the appwrite package
import { Client, Account, Databases, Storage } from "appwrite";

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// Initialize Appwrite services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// 3. Export the 'users' service alongside the others
export { client, account, databases, storage};