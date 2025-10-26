import { databases, storage } from '../../shared/appwrite.js';
import {AppwriteException, Query} from 'appwrite';

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STORIES = import.meta.env.VITE_COLLECTION_ID_STORIES;
const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES;

export async function fetchHighlights(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const CACHE_KEY = `highlightsCache_page_${page}`;
    console.log("Using cache key:", CACHE_KEY);

    try {
        const cachedItem = sessionStorage.getItem(CACHE_KEY);
        if (cachedItem) {
            const { timestamp, data } = JSON.parse(cachedItem);
            if ((Date.now() - timestamp) < CACHE_DURATION_MS) {
                return data;
            }
        }
    } catch (error) {
        console.error("Failed to read from cache:", error);
    }
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_STORIES,
            [
                Query.equal('isAccepted', true),
                Query.orderDesc('$createdAt'),
                Query.limit(limit),
                Query.offset(offset)
            ]
        );

        const highlights = response.documents.map(doc => {
            const imageUrl = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, doc.image_bucket, 800);
            const meanings = doc.meaning || [];
            const formattedLinks = (doc.related_links || []).map((link, index) => {
                const name = meanings[index];
                if (link && name) {
                    try {
                        new URL(link);
                        return { name, url: link };
                    } catch (e) { return null; }
                }
                return null;
            }).filter(Boolean);

            return {
                id: doc.$id, title: doc.title, description: doc.post_description, details: doc.post_details,
                postedBy: doc.author,
                date: new Date(doc.$createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'}),
                image: imageUrl,

                links: formattedLinks
            };
        });

        const result = {
            documents: highlights,
            total: response.total
        };

        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: result }));
        } catch (error) {
            console.error("Failed to write to cache:", error);
        }

        return result;

    } catch (error) {
        console.error("Failed to fetch highlights from Appwrite:", error);
        return { documents: [], total: 0 }; // Return a default structure on error
    }
}

export async function fetchHighlightById(id) {
    const CACHE_KEY = `highlightCache_ID_${id}`;

    try {
        const cachedItem = sessionStorage.getItem(CACHE_KEY);
        if (cachedItem) {
            const { timestamp, data } = JSON.parse(cachedItem);
            if ((Date.now() - timestamp) < (15 * 60 * 1000)) {
                return data;
            }
        }
    } catch (error) {
        console.error("Failed to read highlight from cache:", error);
    }

    try {
        const doc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID_STORIES,
            id
        );

        const imageUrl = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, doc.image_bucket, 1200); // Larger image for details page
        const meanings = doc.meaning || [];
        const formattedLinks = (doc.related_links || []).map((link, index) => {
            const name = meanings[index];
            if (link && name) {
                try {
                    new URL(link);
                    return { name, url: link };
                } catch (e) { return null; }
            }
            return null;
        }).filter(Boolean);

        const highlight = {
            id: doc.$id, title: doc.title, description: doc.post_description, details: doc.post_details,
            postedBy: doc.author,
            date: new Date(doc.$createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            image: imageUrl,
            links: formattedLinks
        };

        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: highlight }));
        } catch (error) {
            console.error("Failed to write highlight to cache:", error);
        }

        return highlight;

    } catch (error) {
        if (error instanceof AppwriteException && error.code === 404) {
            // This is an expected error if the ID doesn't exist.
            console.warn(`Highlight with ID ${id} not found.`);
        } else {
            // This is an unexpected network or server error.
            console.error(`Failed to fetch highlight by ID ${id}:`, error);
        }
        return null;
    }
}