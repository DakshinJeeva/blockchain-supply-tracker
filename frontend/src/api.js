const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
    return localStorage.getItem('ct_token');
}

async function request(method, path, body) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    const json = await res.json();

    if (res.status === 401) {
        // Token expired – clear and reload to trigger re-login
        localStorage.removeItem('ct_token');
        window.location.reload();
        throw new Error('Session expired');
    }

    if (!json.success) throw new Error(json.error || 'Unknown error');
    return json.data;
}

// ─── Batch ─────────────────────────────────────────────────────────────────────
export const createBatch = (data) => request('POST', '/batch', data);
export const addDrying = (id, data) => request('POST', `/batch/${id}/drying`, data);
export const addMixing = (id, data) => request('POST', `/batch/${id}/mixing`, data);
export const addProduct = (id, data) => request('POST', `/batch/${id}/product`, data);
export const readBatch = (id) => request('GET', `/batch/${id}`);
export const getAllBatches = () => request('GET', '/batches');

// ─── Transport ─────────────────────────────────────────────────────────────────
export const getEligibleBatches = () => request('GET', '/batches/eligible');
export const createTransport = (data) => request('POST', '/transport', data);
export const trackCargo = (id, data) => request('POST', `/transport/${id}/track`, data);
export const completeTransport = (id, data) => request('POST', `/transport/${id}/complete`, data);
export const readTransport = (id) => request('GET', `/transport/${id}`);
export const getAllTransports = () => request('GET', '/transports');

// ─── Trace ─────────────────────────────────────────────────────────────────────
export const getFullTrace = (id) => request('GET', `/trace/${id}`);
