import { useState, useEffect, useCallback } from 'react';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { createBatch, addDrying, addMixing, addProduct, getAllBatches } from '../api.js';

const TABS = [
    { id: 'create',  label: 'Create Batch',  color: 'rgba(16,185,129,.15)',  accent: '#10b981' },
    { id: 'drying',  label: 'Drying',         color: 'rgba(245,158,11,.15)',  accent: '#f59e0b' },
    { id: 'mixing',  label: 'Mixing',          color: 'rgba(139,92,246,.15)', accent: '#8b5cf6' },
    { id: 'product', label: 'Product Ready',   color: 'rgba(59,130,246,.15)', accent: '#3b82f6' },
];

function now() { return new Date().toISOString().slice(0, 16); }

/* Compact batch status pill */
function StageBadge({ batch }) {
    const hasProduct = batch.product?.txMeta;
    const hasMixing  = batch.mixing?.txMeta;
    const hasDrying  = batch.drying?.txMeta;

    if (hasProduct) return <span style={pill('#10b981')}>Product Ready</span>;
    if (hasMixing)  return <span style={pill('#8b5cf6')}>Mixing Done</span>;
    if (hasDrying)  return <span style={pill('#f59e0b')}>Drying Done</span>;
    return <span style={pill('#6b7280')}>Collected</span>;
}

function pill(color) {
    return {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: color + '22',
        color,
        border: `1px solid ${color}44`,
    };
}

/* Styled batch selector dropdown */
function BatchSelector({ batches, value, onChange, loading }) {
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            <Spinner /> Loading batches…
        </div>
    );

    if (!batches.length) return (
        <div style={{
            padding: '14px 18px',
            borderRadius: 10,
            background: 'rgba(245,158,11,.06)',
            border: '1px solid rgba(245,158,11,.25)',
            color: '#f59e0b',
            fontSize: 13,
            fontWeight: 500,
        }}>
        No batches available for this step yet. Complete the previous step first.
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select
                className="form-input"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ cursor: 'pointer' }}
            >
                <option value="">— Select a batch —</option>
                {batches.map(b => (
                    <option key={b.batchId} value={b.batchId}>
                        {b.batchId}  ·  {b.collection?.type || '?'}  @  {b.collection?.location || '?'}
                    </option>
                ))}
            </select>

            {/* Preview cards for available batches */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {batches.map(b => (
                    <div
                        key={b.batchId}
                        onClick={() => onChange(b.batchId)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            background: value === b.batchId
                                ? 'rgba(59,130,246,.12)'
                                : 'rgba(255,255,255,.03)',
                            border: `1px solid ${value === b.batchId ? 'rgba(59,130,246,.5)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all .15s',
                            fontSize: 12,
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: 2, color: value === b.batchId ? '#3b82f6' : 'var(--text)' }}>
                            {b.batchId}
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
                            {b.collection?.type} · {b.collection?.location}
                        </div>
                        <StageBadge batch={b} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function BatchPage() {
    const [tab, setTab]         = useState('create');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert]     = useState(null);
    const [result, setResult]   = useState(null);

    // All batches from ledger
    const [allBatches, setAllBatches]         = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(false);

    // Create form
    const [c0, setC0] = useState({ batchId: '', type: '', location: '', dateTime: now(), photo: '' });

    // Drying form
    const [bId1, setBId1] = useState('');
    const [c1, setC1]     = useState({ temperature: '', duration: '', dateTime: now() });

    // Mixing form
    const [bId2, setBId2] = useState('');
    const [c2, setC2]     = useState({ temperature: '', ingredients: '', dateTime: now() });

    // Product form
    const [bId3, setBId3] = useState('');
    const [c3, setC3]     = useState({ photo: '', dateTime: now() });

    function showAlert(type, message) { setAlert({ type, message }); }

    const [batchLoadError, setBatchLoadError] = useState(null);

    /* ── Fetch all batches ─────────────────────────────────── */
    const loadBatches = useCallback(async () => {
        setBatchesLoading(true);
        setBatchLoadError(null);
        try {
            const data = await getAllBatches();
            setAllBatches(Array.isArray(data) ? data : []);
        } catch (err) {
            setBatchLoadError(err.message || 'Failed to load batches from ledger.');
            setAllBatches([]);
        } finally {
            setBatchesLoading(false);
        }
    }, []);

    // Reload whenever switching to a process tab
    useEffect(() => {
        if (tab !== 'create') loadBatches();
    }, [tab, loadBatches]);

    /* ── Filtered lists ────────────────────────────────────── */
    const dryingBatches  = allBatches.filter(b =>  b.collection?.txMeta && !b.drying?.txMeta);
    const mixingBatches  = allBatches.filter(b =>  b.drying?.txMeta     && !b.mixing?.txMeta);
    const productBatches = allBatches.filter(b =>  b.mixing?.txMeta     && !b.product?.txMeta);

    /* ── Handlers ──────────────────────────────────────────── */
    async function handleCreate() {
        setLoading(true); setAlert(null);
        try {
            const data = await createBatch({ ...c0 });
            setResult(data);
            showAlert('success', `Batch "${c0.batchId}" created on the ledger! Switch to the Drying tab to continue.`);
            setC0({ batchId: '', type: '', location: '', dateTime: now(), photo: '' });
        } catch (e) { showAlert('error', e.message); }
        finally { setLoading(false); }
    }

    async function handleDrying() {
        setLoading(true); setAlert(null);
        try {
            const data = await addDrying(bId1, { ...c1 });
            setResult(data);
            showAlert('success', `Drying recorded for batch "${bId1}"! It will now appear in the Mixing tab.`);
            setBId1(''); setC1({ temperature: '', duration: '', dateTime: now() });
            await loadBatches();
        } catch (e) { showAlert('error', e.message); }
        finally { setLoading(false); }
    }

    async function handleMixing() {
        setLoading(true); setAlert(null);
        try {
            const data = await addMixing(bId2, { ...c2 });
            setResult(data);
            showAlert('success', `Mixing recorded for batch "${bId2}"! It will now appear in the Product tab.`);
            setBId2(''); setC2({ temperature: '', ingredients: '', dateTime: now() });
            await loadBatches();
        } catch (e) { showAlert('error', e.message); }
        finally { setLoading(false); }
    }

    async function handleProduct() {
        setLoading(true); setAlert(null);
        try {
            const data = await addProduct(bId3, { ...c3 });
            setResult(data);
            showAlert('success', `Batch "${bId3}" is fully production-complete on the ledger!`);
            setBId3(''); setC3({ photo: '', dateTime: now() });
            await loadBatches();
        } catch (e) { showAlert('error', e.message); }
        finally { setLoading(false); }
    }

    const activeTab = TABS.find(t => t.id === tab);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title"><span>Batch Management</span></h1>
                <p className="page-subtitle">
                    Each production step unlocks automatically — only batches that have completed the previous step appear in the next tab.
                </p>
            </div>


            {/* Tab bar */}
            <div className="tabs" style={{ marginBottom: 0 }}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                        onClick={() => { setTab(t.id); setResult(null); setAlert(null); }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {batchLoadError && tab !== 'create' && (
                <div style={{
                    margin: '12px 0 0',
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(239,68,68,.08)',
                    border: '1px solid rgba(239,68,68,.25)',
                    color: '#ef4444',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span><strong>Could not load batches:</strong> {batchLoadError}</span>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={loadBatches}>
                        ↻ Retry
                    </button>
                </div>
            )}

            {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

            {/* ══ CREATE BATCH ══ */}
            {tab === 'create' && (
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Step 1 — Collection</div>
                            <div className="card-subtitle">Register a new raw-material batch on the blockchain</div>
                        </div>
                    </div>
                    <div className="form-grid form-grid-2">
                        <div className="form-group">
                            <label>Batch ID *</label>
                            <input className="form-input" placeholder="e.g. BATCH001" value={c0.batchId}
                                onChange={e => setC0(p => ({ ...p, batchId: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Type / Material *</label>
                            <input className="form-input" placeholder="e.g. Milk, Tea Leaves" value={c0.type}
                                onChange={e => setC0(p => ({ ...p, type: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Collection Location *</label>
                            <input className="form-input" placeholder="e.g. FarmA, Region B" value={c0.location}
                                onChange={e => setC0(p => ({ ...p, location: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Date & Time *</label>
                            <input className="form-input" type="datetime-local" value={c0.dateTime}
                                onChange={e => setC0(p => ({ ...p, dateTime: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1/-1' }}>
                            <label>Photo / Reference URL</label>
                            <input className="form-input" placeholder="https://... or leave blank" value={c0.photo}
                                onChange={e => setC0(p => ({ ...p, photo: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-success" onClick={handleCreate}
                            disabled={loading || !c0.batchId || !c0.type || !c0.location}>
                            {loading ? <Spinner /> : null} Create Batch
                        </button>
                    </div>
                </div>
            )}

            {/* ══ DRYING ══ */}
            {tab === 'drying' && (
                <div className="card">
                    <div className="card-header" style={{ marginBottom: 20 }}>
                        <div>
                            <div className="card-title">Step 2 — Drying</div>
                            <div className="card-subtitle">
                                Only batches that have completed <strong>Collection</strong> appear below.
                                {' '}<button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={loadBatches}>↻ Refresh</button>
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label>Select Batch *</label>
                        <BatchSelector batches={dryingBatches} value={bId1} onChange={setBId1} loading={batchesLoading} />
                    </div>

                    {bId1 && (
                        <>
                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 20px' }} />
                            <div className="form-grid form-grid-3">
                                <div className="form-group">
                                    <label>Temperature *</label>
                                    <input className="form-input" placeholder="e.g. 45C" value={c1.temperature}
                                        onChange={e => setC1(p => ({ ...p, temperature: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Duration *</label>
                                    <input className="form-input" placeholder="e.g. 2h, 90min" value={c1.duration}
                                        onChange={e => setC1(p => ({ ...p, duration: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Date & Time *</label>
                                    <input className="form-input" type="datetime-local" value={c1.dateTime}
                                        onChange={e => setC1(p => ({ ...p, dateTime: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-warning" onClick={handleDrying}
                                    disabled={loading || !c1.temperature || !c1.duration}>
                                    {loading ? <Spinner /> : null} Record Drying for {bId1}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ══ MIXING ══ */}
            {tab === 'mixing' && (
                <div className="card">
                    <div className="card-header" style={{ marginBottom: 20 }}>
                        <div>
                            <div className="card-title">Step 3 — Mixing</div>
                            <div className="card-subtitle">
                                Only batches that have completed <strong>Drying</strong> appear below.
                                {' '}<button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={loadBatches}>↻ Refresh</button>
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label>Select Batch *</label>
                        <BatchSelector batches={mixingBatches} value={bId2} onChange={setBId2} loading={batchesLoading} />
                    </div>

                    {bId2 && (
                        <>
                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 20px' }} />
                            <div className="form-grid form-grid-3">
                                <div className="form-group">
                                    <label>Temperature *</label>
                                    <input className="form-input" placeholder="e.g. 60C" value={c2.temperature}
                                        onChange={e => setC2(p => ({ ...p, temperature: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Ingredients *</label>
                                    <input className="form-input" placeholder="e.g. Sugar, Salt, Flavor" value={c2.ingredients}
                                        onChange={e => setC2(p => ({ ...p, ingredients: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Date & Time *</label>
                                    <input className="form-input" type="datetime-local" value={c2.dateTime}
                                        onChange={e => setC2(p => ({ ...p, dateTime: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-purple" onClick={handleMixing}
                                    disabled={loading || !c2.temperature || !c2.ingredients}>
                                    {loading ? <Spinner /> : null} Record Mixing for {bId2}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ══ PRODUCT ══ */}
            {tab === 'product' && (
                <div className="card">
                    <div className="card-header" style={{ marginBottom: 20 }}>
                        <div>
                            <div className="card-title">Step 4 — Product Finalisation</div>
                            <div className="card-subtitle">
                                Only batches that have completed <strong>Mixing</strong> appear below.
                                {' '}<button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={loadBatches}>↻ Refresh</button>
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label>Select Batch *</label>
                        <BatchSelector batches={productBatches} value={bId3} onChange={setBId3} loading={batchesLoading} />
                    </div>

                    {bId3 && (
                        <>
                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 20px' }} />
                            <div className="form-grid form-grid-2">
                                <div className="form-group">
                                    <label>Product Photo / Reference</label>
                                    <input className="form-input" placeholder="https://... or leave blank" value={c3.photo}
                                        onChange={e => setC3(p => ({ ...p, photo: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Date & Time *</label>
                                    <input className="form-input" type="datetime-local" value={c3.dateTime}
                                        onChange={e => setC3(p => ({ ...p, dateTime: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary" onClick={handleProduct} disabled={loading}>
                                    {loading ? <Spinner /> : null} Finalise Product for {bId3}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Ledger result */}
            {result && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header" style={{ marginBottom: 16 }}>
                        <div className="card-title">Ledger Response</div>
                    </div>
                    <pre className="json-viewer">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
