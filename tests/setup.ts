// Mock Chrome Storage
const storageMock = {
    data: {} as Record<string, any>,
    get: (keys: string | string[] | Object | null, callback?: (items: any) => void) => {
        let result: Record<string, any> = {};
        if (typeof keys === 'string') {
            result[keys] = storageMock.data[keys];
        } else if (Array.isArray(keys)) {
            keys.forEach(key => result[key] = storageMock.data[key]);
        } else if (typeof keys === 'object' && keys !== null) {
            // Handle object with default values
            for (const [key, defaultValue] of Object.entries(keys)) {
                result[key] = storageMock.data[key] === undefined ? defaultValue : storageMock.data[key];
            }
        } else {
            result = { ...storageMock.data };
        }

        // Return promise if no callback, otherwise call callback
        if (callback) {
            callback(result);
        }
        return Promise.resolve(result);
    },
    set: (items: Object, callback?: () => void) => {
        Object.assign(storageMock.data, items);
        if (callback) callback();
        return Promise.resolve();
    },
    clear: () => {
        storageMock.data = {};
        return Promise.resolve();
    }
};

// Mock Chrome API
globalThis.chrome = {
    storage: {
        local: storageMock as any
    },
    runtime: {
        getURL: (path: string) => path,
        onInstalled: { addListener: () => { } },
        onMessage: { addListener: () => { } }
    },
    alarms: {
        create: () => { },
        onAlarm: { addListener: () => { } }
    },
    tabs: {
        create: () => { },
        onUpdated: { addListener: () => { } },
        remove: () => { }
    }
} as any;

export { storageMock };
