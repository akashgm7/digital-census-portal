/**
 * IndexedDB Service for Offline-First Survey Storage.
 * 
 * Features:
 * - Auto-save every 10 seconds
 * - Save on field blur
 * - Save on step navigation
 * - Resume exact screen on reload/crash
 * - Preserve drafts on logout
 */
import { openDB } from 'idb';

const DB_NAME = 'CensusPortalDB';
const DB_VERSION = 1;

// Store names
const STORES = {
    DRAFTS: 'drafts',
    SYNC_QUEUE: 'syncQueue',
    CACHE: 'cache',
};

/**
 * Initialize IndexedDB
 */
const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Drafts store - for auto-saving survey forms
            if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
                const draftsStore = db.createObjectStore(STORES.DRAFTS, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                draftsStore.createIndex('surveyorId', 'surveyorId');
                draftsStore.createIndex('updatedAt', 'updatedAt');
            }

            // Sync queue - for pending API calls when offline
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                syncStore.createIndex('createdAt', 'createdAt');
            }

            // Cache - for master addresses and other reference data
            if (!db.objectStoreNames.contains(STORES.CACHE)) {
                const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
                cacheStore.createIndex('expiresAt', 'expiresAt');
            }
        },
    });
};

let dbInstance = null;

const getDB = async () => {
    if (!dbInstance) {
        dbInstance = await initDB();
    }
    return dbInstance;
};

// ============ DRAFT MANAGEMENT ============

/**
 * Save or update a draft survey
 */
export const saveDraft = async (draft) => {
    const db = await getDB();
    const now = new Date().toISOString();

    const draftData = {
        ...draft,
        updatedAt: now,
        createdAt: draft.createdAt || now,
    };

    if (draft.id) {
        await db.put(STORES.DRAFTS, draftData);
        return draft.id;
    } else {
        return await db.add(STORES.DRAFTS, draftData);
    }
};

/**
 * Get all drafts for a surveyor
 */
export const getDraftsForSurveyor = async (surveyorId) => {
    const db = await getDB();
    const drafts = await db.getAllFromIndex(STORES.DRAFTS, 'surveyorId', surveyorId);
    return drafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

/**
 * Get a specific draft by ID
 */
export const getDraft = async (id) => {
    const db = await getDB();
    return await db.get(STORES.DRAFTS, id);
};

/**
 * Delete a draft
 */
export const deleteDraft = async (id) => {
    const db = await getDB();
    await db.delete(STORES.DRAFTS, id);
};

/**
 * Get the most recent draft (for resume on reload)
 */
export const getMostRecentDraft = async (surveyorId) => {
    const drafts = await getDraftsForSurveyor(surveyorId);
    return drafts.length > 0 ? drafts[0] : null;
};

// ============ SYNC QUEUE MANAGEMENT ============

/**
 * Add an action to the sync queue (for offline mode)
 */
export const addToSyncQueue = async (action) => {
    const db = await getDB();
    return await db.add(STORES.SYNC_QUEUE, {
        ...action,
        createdAt: new Date().toISOString(),
        status: 'pending',
    });
};

/**
 * Get all pending sync actions
 */
export const getPendingSyncActions = async () => {
    const db = await getDB();
    const actions = await db.getAll(STORES.SYNC_QUEUE);
    return actions.filter(a => a.status === 'pending');
};

/**
 * Mark a sync action as completed
 */
export const markSyncComplete = async (id) => {
    const db = await getDB();
    const action = await db.get(STORES.SYNC_QUEUE, id);
    if (action) {
        action.status = 'completed';
        action.completedAt = new Date().toISOString();
        await db.put(STORES.SYNC_QUEUE, action);
    }
};

/**
 * Clear completed sync actions
 */
export const clearCompletedSyncActions = async () => {
    const db = await getDB();
    const actions = await db.getAll(STORES.SYNC_QUEUE);
    for (const action of actions) {
        if (action.status === 'completed') {
            await db.delete(STORES.SYNC_QUEUE, action.id);
        }
    }
};

// ============ CACHE MANAGEMENT ============

/**
 * Cache data with expiry
 */
export const cacheData = async (key, data, expiryMinutes = 60) => {
    const db = await getDB();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    await db.put(STORES.CACHE, {
        key,
        data,
        expiresAt,
        cachedAt: new Date().toISOString(),
    });
};

/**
 * Get cached data (returns null if expired)
 */
export const getCachedData = async (key) => {
    const db = await getDB();
    const cached = await db.get(STORES.CACHE, key);

    if (!cached) return null;

    if (new Date(cached.expiresAt) < new Date()) {
        await db.delete(STORES.CACHE, key);
        return null;
    }

    return cached.data;
};

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = async () => {
    const db = await getDB();
    const now = new Date().toISOString();
    const entries = await db.getAll(STORES.CACHE);

    for (const entry of entries) {
        if (entry.expiresAt < now) {
            await db.delete(STORES.CACHE, entry.key);
        }
    }
};

// ============ AUTO-SAVE HOOK ============

/**
 * Create an auto-save handler
 * Returns functions for auto-saving at intervals and on events
 */
export const createAutoSave = (surveyorId, onSave) => {
    let currentDraft = null;
    let saveTimeout = null;
    let intervalId = null;

    const save = async (data, step) => {
        const draft = {
            ...currentDraft,
            surveyorId,
            formData: data,
            currentStep: step,
        };

        const id = await saveDraft(draft);
        currentDraft = { ...draft, id };

        if (onSave) onSave(currentDraft);

        return id;
    };

    // Start auto-save interval (every 10 seconds)
    const startAutoSave = (getData, getStep) => {
        intervalId = setInterval(async () => {
            try {
                await save(getData(), getStep());
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 10000);
    };

    // Stop auto-save
    const stopAutoSave = () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }
    };

    // Debounced save (for field blur events)
    const debouncedSave = (data, step) => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => save(data, step), 500);
    };

    // Load existing draft
    const loadDraft = async (draftId) => {
        if (draftId) {
            currentDraft = await getDraft(draftId);
        } else {
            currentDraft = await getMostRecentDraft(surveyorId);
        }
        return currentDraft;
    };

    // Complete and delete draft
    const completeDraft = async () => {
        if (currentDraft?.id) {
            await deleteDraft(currentDraft.id);
            currentDraft = null;
        }
    };

    return {
        save,
        startAutoSave,
        stopAutoSave,
        debouncedSave,
        loadDraft,
        completeDraft,
        getCurrentDraft: () => currentDraft,
    };
};

// ============ BACKGROUND SYNC ============

/**
 * Process sync queue when online
 */
export const processBackgroundSync = async (apiCallHandler) => {
    const pendingActions = await getPendingSyncActions();

    for (const action of pendingActions) {
        try {
            await apiCallHandler(action);
            await markSyncComplete(action.id);
        } catch (error) {
            console.error('Background sync failed for action:', action.id, error);
        }
    }

    await clearCompletedSyncActions();
};

export default {
    saveDraft,
    getDraft,
    getDraftsForSurveyor,
    deleteDraft,
    getMostRecentDraft,
    addToSyncQueue,
    getPendingSyncActions,
    processBackgroundSync,
    cacheData,
    getCachedData,
    createAutoSave,
};
