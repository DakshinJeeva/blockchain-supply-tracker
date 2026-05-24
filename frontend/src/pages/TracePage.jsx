import { useState } from 'react';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import { getFullTrace } from '../api.js';

function KV({ label, value }) {
    if (!value && value !== 0) return null;
    return (
        <div className="kv-row">
            <span className="kv-key">{label}</span>
            <span className="kv-value">{value}</span>
        </div>
    );
}

function Section({ title, color, children }) {
    return (
        <div className="trace-section">
            <div className="trace-section-title">
                <span style={{ color }}>{title}</span>
            </div>
            {children}
        </div>
    );
}

const STEP_META = [
    { key: 'collection', label: 'Collection', color: 'var(--accent-green)' },
    { key: 'drying',     label: 'Drying',     color: 'var(--accent-orange)' },
    { key: 'mixing',     label: 'Mixing',     color: 'var(--accent-purple)' },
    { key: 'product',    label: 'Product',    color: 'var(--accent-blue)' },
];

function stepStatus(obj) {
    return obj && Object.keys(obj).length > 0;
}

export default function TracePage() {
    const [batchId, setBatchId] = useState('');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [trace, setTrace] = useState(null);

    async function handleTrace() {
        setLoading(true); setAlert(null); setTrace(null);
        try {
            const data = await getFullTrace(batchId);
            setTrace(data);
        } catch (e) {
            setAlert({ type: 'error', message: e.message });
        } finally { setLoading(false); }
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title"><span>Full Traceability</span></h1>
                <p className="page-subtitle">Consumer-level view — trace a batch through the entire supply chain (Org3)</p>
            </div>

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">GetFullBatchDetails</div>
                        <div className="card-subtitle">Enter a batch ID to retrieve its complete history from the ledger</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <input
                        className="form-input"
                        placeholder="Enter Batch ID e.g. BATCH001"
                        value={batchId}
                        onChange={e => setBatchId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleTrace()}
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn-cyan" onClick={handleTrace} disabled={loading || !batchId}>
                        {loading ? <Spinner /> : null} Trace
                    </button>
                </div>
            </div>

            {alert && <Alert {...alert} onClose={() => setAlert(null)} style={{ marginTop: 20 }} />}

            {trace && (
                <div style={{ marginTop: 24 }}>
                    {/* Summary Banner */}
                    <div className="card" style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,.12), rgba(6,182,212,.08))',
                        border: '1px solid rgba(59,130,246,.3)',
                        marginBottom: 20,
                        display: 'flex', alignItems: 'center', gap: 20
                    }}>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Batch ID</div>
                            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-blue)' }}>
                                {trace.batchId}
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {STEP_META.map(s => (
                                <span key={s.key} className={`badge ${stepStatus(trace[s.key]) ? 'badge-green' : 'badge-red'}`}>
                                    {s.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <div>
                                <div className="card-title">Production Timeline</div>
                            </div>
                        </div>
                        <div className="timeline">
                            {STEP_META.map((s, i) => {
                                const done = stepStatus(trace[s.key]);
                                const data = trace[s.key] || {};
                                return (
                                    <div className="timeline-item" key={s.key}>
                                        <div className="timeline-line">
                                            <div className={`timeline-dot ${done ? 'done' : 'pending'}`}>
                                                {done ? '✓' : i + 1}
                                            </div>
                                            {i < STEP_META.length - 1 && <div className="timeline-connector" />}
                                        </div>
                                        <div className="timeline-content">
                                            <div className="timeline-title" style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {s.label}
                                            </div>
                                            {done ? (
                                                <div className="timeline-meta">
                                                    {data.dateTime    && <span>{data.dateTime}</span>}
                                                    {data.location    && <span>{data.location}</span>}
                                                    {data.type        && <span>{data.type}</span>}
                                                    {data.temperature && <span>{data.temperature}</span>}
                                                    {data.duration    && <span>{data.duration}</span>}
                                                    {data.ingredients && <span>{data.ingredients}</span>}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not recorded yet</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Production Details Grid */}
                    <div className="trace-grid">
                        <Section title="Collection" color="var(--accent-green)">
                            <KV label="Type"       value={trace.collection?.type} />
                            <KV label="Location"   value={trace.collection?.location} />
                            <KV label="Date & Time" value={trace.collection?.dateTime} />
                            <KV label="Photo"      value={trace.collection?.photo} />
                        </Section>
                        <Section title="Drying" color="var(--accent-orange)">
                            <KV label="Temperature" value={trace.drying?.temperature} />
                            <KV label="Duration"    value={trace.drying?.duration} />
                            <KV label="Date & Time" value={trace.drying?.dateTime} />
                        </Section>
                        <Section title="Mixing" color="var(--accent-purple)">
                            <KV label="Temperature" value={trace.mixing?.temperature} />
                            <KV label="Ingredients" value={trace.mixing?.ingredients} />
                            <KV label="Date & Time" value={trace.mixing?.dateTime} />
                        </Section>
                        <Section title="Product" color="var(--accent-blue)">
                            <KV label="Date & Time" value={trace.product?.dateTime} />
                            <KV label="Photo"       value={trace.product?.photo} />
                        </Section>
                    </div>

                    {/* Transport Section */}
                    {trace.transport?.length > 0 && (
                        <div className="card" style={{ marginTop: 20 }}>
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Transport History</div>
                                    <div className="card-subtitle">{trace.transport.length} shipment(s)</div>
                                </div>
                            </div>
                            {trace.transport.map((t, ti) => (
                                <div key={ti} style={{
                                    background: 'rgba(255,255,255,.03)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 20,
                                    marginBottom: ti < trace.transport.length - 1 ? 16 : 0
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                                        <div>
                                            <span className="mono" style={{ color: 'var(--accent-cyan)', fontSize: 15, fontWeight: 700 }}>{t.transportId}</span>
                                        </div>
                                        <span className={`badge ${t.status === 'DELIVERED' ? 'badge-green' : 'badge-orange'}`}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <div className="trace-grid" style={{ marginBottom: t.trackingLogs?.length > 0 ? 16 : 0 }}>
                                        <div>
                                            <div className="kv-row"><span className="kv-key">Start Location</span><span className="kv-value">{t.startLocation}</span></div>
                                            <div className="kv-row"><span className="kv-key">Start Time</span><span className="kv-value">{t.startTime}</span></div>
                                        </div>
                                        <div>
                                            {t.endLocation && <div className="kv-row"><span className="kv-key">End Location</span><span className="kv-value">{t.endLocation}</span></div>}
                                            {t.endTime     && <div className="kv-row"><span className="kv-key">End Time</span><span className="kv-value">{t.endTime}</span></div>}
                                        </div>
                                    </div>

                                    {t.trackingLogs?.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                                                Tracking Logs ({t.trackingLogs.length})
                                            </div>
                                            <div className="table-wrap">
                                                <table>
                                                    <thead>
                                                        <tr><th>#</th><th>Timestamp</th><th>Location</th><th>Temp</th><th>Speed</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {t.trackingLogs.map((log, li) => (
                                                            <tr key={li}>
                                                                <td><span className="badge badge-purple">{li + 1}</span></td>
                                                                <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.timestamp}</td>
                                                                <td>{log.location}</td>
                                                                <td>{log.temperature}</td>
                                                                <td>{log.speed}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Raw JSON */}
                    <details style={{ marginTop: 20 }}>
                        <summary style={{ cursor: 'pointer', padding: '12px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14, color: 'var(--text-dim)', listStyle: 'none' }}>
                            View Raw Ledger Data (JSON)
                        </summary>
                        <div className="card" style={{ borderTop: 0, borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
                            <pre className="json-viewer">{JSON.stringify(trace, null, 2)}</pre>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}
