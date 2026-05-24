import { useState, useEffect } from 'react';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import {
    getEligibleBatches,
    getAllTransports,
    createTransport,
    trackCargo,
    completeTransport,
    readTransport,
} from '../api.js';

function now() { return new Date().toISOString().slice(0, 16); }

export default function TransportPage() {
    const [tab, setTab] = useState('create');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [result, setResult] = useState(null);

    // Eligible batches (product-ready, not yet in any transport)
    const [eligibleBatches, setEligibleBatches] = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(false);

    // All transports from persistent registry
    const [transports, setTransports] = useState([]);
    const [transportsLoading, setTransportsLoading] = useState(false);

    // Create Transport form
    const [ct, setCt] = useState({ transportId: '', selectedBatchIds: [], startTime: now(), location: '' });

    // Track Cargo form
    const [tk, setTk] = useState({ transportId: '', temperature: '', speed: '', location: '' });

    // Complete form
    const [cp, setCp] = useState({ transportId: '', endLocation: '' });

    // Read form
    const [rd, setRd] = useState({ transportId: '' });

    function showAlert(type, msg) { setAlert({ type, message: msg }); }

    // Load eligible batches when create tab is active
    useEffect(() => {
        if (tab === 'create') {
            setBatchesLoading(true);
            getEligibleBatches()
                .then(data => setEligibleBatches(data || []))
                .catch(e => showAlert('error', 'Failed to load eligible batches: ' + e.message))
                .finally(() => setBatchesLoading(false));
        }
    }, [tab]);

    // Load all transports when track/complete/read tabs are active
    useEffect(() => {
        if (tab === 'track' || tab === 'complete' || tab === 'read') {
            setTransportsLoading(true);
            getAllTransports()
                .then(data => setTransports(data || []))
                .catch(e => showAlert('error', 'Failed to load transports: ' + e.message))
                .finally(() => setTransportsLoading(false));
        }
    }, [tab]);

    // Derived: transports that can still be tracked (IN_TRANSIT only)
    const inTransitTransports = transports.filter(t => t.status === 'IN_TRANSIT');
    // Derived: transports that can be completed (not yet DELIVERED)
    const activeTransports = transports.filter(t => t.status !== 'DELIVERED');

    // Stage guard helpers
    const hasAnyTransport = transports.length > 0;
    const selectedTrackTransport = transports.find(t => t.transportId === tk.transportId);
    const hasTrackingLog = selectedTrackTransport && selectedTrackTransport.trackingLogs?.length > 0;

    function toggleBatch(batchId) {
        setCt(p => {
            const already = p.selectedBatchIds.includes(batchId);
            return {
                ...p,
                selectedBatchIds: already
                    ? p.selectedBatchIds.filter(b => b !== batchId)
                    : [...p.selectedBatchIds, batchId],
            };
        });
    }

    async function handleCreate() {
        if (!ct.selectedBatchIds.length) { showAlert('error', 'Select at least one eligible batch.'); return; }
        setLoading(true); setAlert(null);
        try {
            const data = await createTransport({
                transportId: ct.transportId,
                batchIds: ct.selectedBatchIds,
                startTime: ct.startTime,
                location: ct.location,
            });
            setResult(data);
            showAlert('success', `Transport "${ct.transportId}" created!`);
            // Refresh eligible batches (selected ones are now assigned)
            const fresh = await getEligibleBatches();
            setEligibleBatches(fresh || []);
            setCt({ transportId: '', selectedBatchIds: [], startTime: now(), location: '' });
        } catch (e) { showAlert('error', e.message); }
        finally { setLoading(false); }
    }

    async function handleTrack() {
        setLoading(true); setAlert(null);
        try {
            const batchIds = selectedTrackTransport?.batchIds || [];
            const data = await trackCargo(tk.transportId, { ...tk, batchIds });
            setResult(data);
            showAlert('success', 'Tracking log appended to the ledger!');
            // Refresh transports so hasTrackingLog updates
            const fresh = await getAllTransports();
            setTransports(fresh || []);
        } catch (e) { showAlert('error', e.message); }
        finally { setLoading(false); }
    }

    async function handleComplete() {
        setLoading(true); setAlert(null);
        try {
            const data = await completeTransport(cp.transportId, { endLocation: cp.endLocation });
            setResult(data);
            showAlert('success', `Transport "${cp.transportId}" marked as DELIVERED!`);
            const fresh = await getAllTransports();
            setTransports(fresh || []);
        } catch (e) { showAlert('error', e.message); }
        finally { setLoading(false); }
    }

    async function handleRead() {
        setLoading(true); setAlert(null);
        try {
            const data = await readTransport(rd.transportId);
            setResult(data);
        } catch (e) { showAlert('error', e.message); }
        finally { setLoading(false); }
    }

    const TABS = [
        { id: 'create', label: 'Create' },
        { id: 'track', label: 'Track Cargo' },
        { id: 'complete', label: 'Complete' },
        { id: 'read', label: 'Query' },
    ];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title"><span>Transport Management</span></h1>
                <p className="page-subtitle">Create, track, complete, and query transport shipments (Org2)</p>
            </div>

            <div className="tabs">
                {TABS.map(t => {
                    let disabled = false;
                    let tooltip = '';
                    if (t.id === 'track' && !hasAnyTransport) {
                        disabled = true; tooltip = 'Create a transport first';
                    }
                    if (t.id === 'complete' && !hasAnyTransport) {
                        disabled = true; tooltip = 'Create a transport first';
                    }
                    return (
                        <button
                            key={t.id}
                            className={`tab-btn ${tab === t.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                            title={tooltip}
                            style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                            onClick={() => { if (!disabled) { setTab(t.id); setResult(null); setAlert(null); } }}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

            {/* ── Create Transport ── */}
            {tab === 'create' && (
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Create Transport</div>
                            <div className="card-subtitle">Initiate a new shipment — only Product-Ready batches are shown</div>
                        </div>
                    </div>

                    <div className="form-grid form-grid-2">
                        <div className="form-group">
                            <label>Transport ID *</label>
                            <input
                                className="form-input"
                                placeholder="e.g. TRANS001"
                                value={ct.transportId}
                                onChange={e => setCt(p => ({ ...p, transportId: e.target.value }))}
                            />
                        </div>

                        <div className="form-group">
                            <label>Start Location *</label>
                            <input
                                className="form-input"
                                placeholder="e.g. WarehouseA"
                                value={ct.location}
                                onChange={e => setCt(p => ({ ...p, location: e.target.value }))}
                            />
                        </div>

                        <div className="form-group">
                            <label>Start Time *</label>
                            <input
                                className="form-input"
                                type="datetime-local"
                                value={ct.startTime}
                                onChange={e => setCt(p => ({ ...p, startTime: e.target.value }))}
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>
                                Eligible Batches (Product-Ready &amp; Unassigned) *
                                {batchesLoading && <Spinner style={{ marginLeft: 8 }} />}
                            </label>

                            {!batchesLoading && eligibleBatches.length === 0 && (
                                <div style={{
                                    padding: '14px 16px',
                                    borderRadius: 10,
                                    background: 'rgba(245,158,11,.08)',
                                    border: '1px solid rgba(245,158,11,.25)',
                                    color: 'var(--text-muted)',
                                    fontSize: 14,
                                }}>
                                    ⚠️ No eligible batches found. Batches must have all 4 Org1 production steps completed and must not already be assigned to a transport.
                                </div>
                            )}

                            {!batchesLoading && eligibleBatches.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    maxHeight: 220,
                                    overflowY: 'auto',
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1.5px solid var(--border)',
                                    background: 'var(--surface)',
                                }}>
                                    {eligibleBatches.map(b => {
                                        const selected = ct.selectedBatchIds.includes(b.batchId);
                                        return (
                                            <label
                                                key={b.batchId}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    background: selected ? 'rgba(6,182,212,.12)' : 'transparent',
                                                    border: selected ? '1px solid rgba(6,182,212,.4)' : '1px solid transparent',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleBatch(b.batchId)}
                                                    style={{ accentColor: '#06b6d4', width: 16, height: 16 }}
                                                />
                                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{b.batchId}</span>
                                                {b.type && (
                                                    <span className="badge badge-blue" style={{ fontSize: 11 }}>{b.type}</span>
                                                )}
                                                <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: 11 }}>Product Ready</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {ct.selectedBatchIds.length > 0 && (
                                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                    Selected: {ct.selectedBatchIds.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-cyan"
                            onClick={handleCreate}
                            disabled={loading || !ct.transportId || !ct.selectedBatchIds.length || !ct.location}
                        >
                            {loading ? <Spinner /> : null} Create Transport
                        </button>
                    </div>
                </div>
            )}

            {/* ── Track Cargo ── */}
            {tab === 'track' && (
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Track Cargo</div>
                            <div className="card-subtitle">Append a real-time tracking log to an active transport</div>
                        </div>
                    </div>

                    {/* Stage guard: must select a transport first */}
                    {!hasAnyTransport && (
                        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
                            ⚠️ No transports exist yet. Create a transport first.
                        </div>
                    )}

                    <div className="form-grid form-grid-2">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Select Transport (IN_TRANSIT only) *</label>
                            {transportsLoading
                                ? <Spinner />
                                : <select
                                    className="form-input"
                                    value={tk.transportId}
                                    onChange={e => setTk(p => ({ ...p, transportId: e.target.value }))}
                                >
                                    <option value="">-- Choose a transport --</option>
                                    {inTransitTransports.map(t => (
                                        <option key={t.transportId} value={t.transportId}>
                                            {t.transportId} — {t.startLocation} → logs: {t.trackingLogs?.length || 0}
                                        </option>
                                    ))}
                                </select>
                            }
                            {!transportsLoading && inTransitTransports.length === 0 && hasAnyTransport && (
                                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                                    All transports are already DELIVERED.
                                </div>
                            )}
                        </div>

                        {selectedTrackTransport && (
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Batches in this transport</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                    {selectedTrackTransport.batchIds.map(b => (
                                        <span key={b} className="badge badge-blue">{b}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Temperature *</label>
                            <input className="form-input" placeholder="e.g. 25C" value={tk.temperature} onChange={e => setTk(p => ({ ...p, temperature: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Speed *</label>
                            <input className="form-input" placeholder="e.g. 60kmh" value={tk.speed} onChange={e => setTk(p => ({ ...p, speed: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Current Location *</label>
                            <input className="form-input" placeholder="e.g. Checkpoint A" value={tk.location} onChange={e => setTk(p => ({ ...p, location: e.target.value }))} />
                        </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-warning"
                            onClick={handleTrack}
                            disabled={loading || !tk.transportId || !tk.temperature || !tk.speed || !tk.location}
                        >
                            {loading ? <Spinner /> : null} Send Tracking Log
                        </button>
                    </div>
                </div>
            )}

            {/* ── Complete Transport ── */}
            {tab === 'complete' && (
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Complete Transport</div>
                            <div className="card-subtitle">Mark a transport as DELIVERED</div>
                        </div>
                    </div>

                    {!hasAnyTransport && (
                        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
                            ⚠️ No transports exist yet. Create a transport first.
                        </div>
                    )}

                    <div className="form-grid form-grid-2">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Select Transport *</label>
                            {transportsLoading
                                ? <Spinner />
                                : <select
                                    className="form-input"
                                    value={cp.transportId}
                                    onChange={e => setCp(p => ({ ...p, transportId: e.target.value }))}
                                >
                                    <option value="">-- Choose a transport --</option>
                                    {activeTransports.map(t => (
                                        <option key={t.transportId} value={t.transportId}>
                                            {t.transportId} — {t.status} — logs: {t.trackingLogs?.length || 0}
                                        </option>
                                    ))}
                                </select>
                            }
                            {!transportsLoading && activeTransports.length === 0 && hasAnyTransport && (
                                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                                    All transports are already DELIVERED.
                                </div>
                            )}
                        </div>

                        {/* Stage guard: warn if no tracking log has been added yet */}
                        {cp.transportId && !hasTrackingLog && (() => {
                            const selT = transports.find(t => t.transportId === cp.transportId);
                            return selT ? (
                                <div style={{ gridColumn: '1 / -1', padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', fontSize: 14, color: 'var(--text-muted)' }}>
                                    ⚠️ No tracking logs recorded for this transport yet. It is recommended to add at least one tracking log before completing the transport.
                                </div>
                            ) : null;
                        })()}

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>End / Delivery Location *</label>
                            <input className="form-input" placeholder="e.g. RetailStoreB" value={cp.endLocation} onChange={e => setCp(p => ({ ...p, endLocation: e.target.value }))} />
                        </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-success"
                            onClick={handleComplete}
                            disabled={loading || !cp.transportId || !cp.endLocation}
                        >
                            {loading ? <Spinner /> : null} Mark as Delivered
                        </button>
                    </div>
                </div>
            )}

            {/* ── Query Transport ── */}
            {tab === 'read' && (
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Query Transport</div>
                            <div className="card-subtitle">Read a transport record from the ledger</div>
                        </div>
                    </div>
                    <div className="form-grid form-grid-2">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Select Transport *</label>
                            {transportsLoading
                                ? <Spinner />
                                : <select
                                    className="form-input"
                                    value={rd.transportId}
                                    onChange={e => { setRd({ transportId: e.target.value }); setResult(null); }}
                                >
                                    <option value="">-- Choose a transport --</option>
                                    {transports.map(t => (
                                        <option key={t.transportId} value={t.transportId}>
                                            {t.transportId} — {t.status}
                                        </option>
                                    ))}
                                </select>
                            }
                            {!transportsLoading && transports.length === 0 && (
                                <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                                    No transports found. Create one first.
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleRead} disabled={loading || !rd.transportId}>
                            {loading ? <Spinner /> : null} Query Ledger
                        </button>
                    </div>
                </div>
            )}

            {/* ── Result ── */}
            {result && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Ledger Response</div>
                            {result.status && (
                                <div style={{ marginTop: 6 }}>
                                    <span className={`badge ${result.status === 'DELIVERED' ? 'badge-green' : 'badge-orange'}`}>
                                        {result.status}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {tab === 'read' && result.trackingLogs?.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <div className="card-title" style={{ marginBottom: 12 }}>Tracking Logs</div>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Timestamp</th>
                                            <th>Location</th>
                                            <th>Temperature</th>
                                            <th>Speed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.trackingLogs.map((log, i) => (
                                            <tr key={i}>
                                                <td><span className="badge badge-blue">{i + 1}</span></td>
                                                <td className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.timestamp}</td>
                                                <td>📍 {log.location}</td>
                                                <td>🌡️ {log.temperature}</td>
                                                <td>⚡ {log.speed}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <pre className="json-viewer">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
