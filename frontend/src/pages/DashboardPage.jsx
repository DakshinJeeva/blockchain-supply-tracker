import { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '../context/AuthContext';

function AdminPanel({ user }) {
    const [pending, setPending] = useState([]);
    const [loadingId, setLoadingId] = useState(null);
    const [flash, setFlash] = useState(null);
    const [caEnrolled, setCaEnrolled] = useState(null); // null=loading, true, false
    const [caEnrolling, setCaEnrolling] = useState(false);
    const [caFlash, setCaFlash] = useState(null);

    const fetchPending = useCallback(async () => {
        try {
            const res = await fetch(`${API}/auth/admin/pending`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            const data = await res.json();
            if (data.success) setPending(data.pending || []);
        } catch { /* silent */ }
    }, [user.token]);

    const fetchCAStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API}/auth/admin/ca-status`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            const data = await res.json();
            if (data.success) setCaEnrolled(data.caEnrolled);
        } catch { /* silent */ }
    }, [user.token]);

    useEffect(() => {
        fetchCAStatus();
        fetchPending();
        const interval = setInterval(fetchPending, 8000);
        return () => clearInterval(interval);
    }, [fetchCAStatus, fetchPending]);

    const enrollCA = async () => {
        setCaEnrolling(true);
        setCaFlash(null);
        try {
            const res = await fetch(`${API}/auth/admin/enroll-ca`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setCaEnrolled(true);
            setCaFlash({ type: 'success', msg: data.message });
        } catch (e) {
            setCaFlash({ type: 'error', msg: e.message });
        } finally {
            setCaEnrolling(false);
        }
    };

    const approve = async (targetId) => {
        setLoadingId(targetId);
        setFlash(null);
        try {
            const res = await fetch(`${API}/auth/admin/approve/${targetId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setFlash({ id: targetId, type: 'success', msg: 'Certificate generated & user approved.' });
            setPending(p => p.filter(u => u.id !== targetId));
        } catch (e) {
            setFlash({ id: targetId, type: 'error', msg: e.message });
        } finally {
            setLoadingId(null);
        }
    };

    const reject = async (targetId) => {
        setLoadingId(targetId + '_reject');
        setFlash(null);
        try {
            const res = await fetch(`${API}/auth/admin/reject/${targetId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setFlash({ id: targetId, type: 'error', msg: 'User rejected.' });
            setPending(p => p.filter(u => u.id !== targetId));
        } catch (e) {
            setFlash({ id: targetId, type: 'error', msg: `❌ ${e.message}` });
        } finally {
            setLoadingId(null);
        }
    };

    const ORG_COLOR = { Org1: '#6366f1', Org2: '#0ea5e9', Org3: '#10b981' };
    const orgColor = ORG_COLOR[user.org] || '#6366f1';

    return (
        <div className="card" style={{
            marginBottom: 28,
            border: `1px solid ${orgColor}33`,
            background: `linear-gradient(135deg, ${orgColor}08, transparent)`,
        }}>
            <div className="card-header">
                <div>
                    <div className="card-title">Admin — Certificate Manager</div>
                    <div className="card-subtitle">Manage Fabric CA and member certificates for {user.org}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pending.length > 0 && (
                        <span style={{
                            background: '#f59e0b', color: '#000',
                            borderRadius: 20, padding: '2px 10px',
                            fontSize: 12, fontWeight: 700,
                        }}>{pending.length}</span>
                    )}
                    <span style={{
                        background: `${orgColor}22`, color: orgColor,
                        border: `1px solid ${orgColor}44`,
                        borderRadius: 20, padding: '3px 10px',
                        fontSize: 11, fontWeight: 600,
                    }}>ORG ADMIN</span>
                </div>
            </div>

            {/* ─── Step 1: CA Certificate Status ─── */}
            <div style={{
                background: caEnrolled === null
                    ? 'rgba(255,255,255,.03)'
                    : caEnrolled
                        ? 'rgba(16,185,129,.06)'
                        : 'rgba(239,68,68,.06)',
                border: `1px solid ${caEnrolled === null ? 'var(--border)' : caEnrolled ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
                borderRadius: 12,
                padding: '18px 20px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
            }}>
                <div style={{ fontSize: 32, flexShrink: 0 }}>
                    {caEnrolled === null ? '...' : caEnrolled ? '+' : '!'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontWeight: 700, fontSize: 14, marginBottom: 4,
                        color: caEnrolled === null ? 'var(--text-muted)' : caEnrolled ? '#10b981' : '#ef4444',
                    }}>
                        {caEnrolled === null
                            ? 'Checking CA certificate status…'
                            : caEnrolled
                                ? `Fabric CA Admin Certificate — Enrolled for ${user.org}`
                                : `Fabric CA Admin Certificate — NOT Enrolled`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {caEnrolled === true
                            ? 'The admin CA certificate is in the wallet. You can now sign member certificates.'
                            : caEnrolled === false
                                ? 'You must enroll the CA admin certificate before approving any member certificates.'
                                : ''}
                    </div>
                    {caFlash && (
                        <div style={{
                            marginTop: 8, fontSize: 12,
                            color: caFlash.type === 'success' ? '#10b981' : '#ef4444',
                        }}>{caFlash.msg}</div>
                    )}
                </div>
                {caEnrolled === false && (
                    <button
                        id="enroll-ca-admin-btn"
                        onClick={enrollCA}
                        disabled={caEnrolling}
                        style={{
                            padding: '10px 18px', border: 'none', borderRadius: 8,
                            cursor: 'pointer', flexShrink: 0,
                            background: caEnrolling ? 'rgba(239,68,68,.3)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: '#fff', fontWeight: 700, fontSize: 12,
                            boxShadow: caEnrolling ? 'none' : '0 4px 12px rgba(239,68,68,.3)',
                        }}
                    >
                        {caEnrolling ? 'Enrolling...' : 'Enroll CA Certificate'}
                    </button>
                )}
                {caEnrolled === true && (
                    <button
                        onClick={enrollCA}
                        disabled={caEnrolling}
                        title="Re-enroll (if wallet was reset)"
                        style={{
                            padding: '8px 14px', border: '1px solid rgba(16,185,129,.3)',
                            borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                            background: 'rgba(16,185,129,.08)',
                            color: '#10b981', fontWeight: 600, fontSize: 11,
                        }}
                    >
                        {caEnrolling ? '⏳…' : '↻ Re-enroll'}
                    </button>
                )}
            </div>

            {/* ─── Step 2: Pending Members ─── */}
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending Member Approvals
            </div>

            {flash && !pending.find(p => p.id === flash.id) && (
                <div style={{
                    margin: '0 0 16px',
                    padding: '10px 16px', borderRadius: 8, fontSize: 13,
                    background: flash.type === 'success' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
                    border: `1px solid ${flash.type === 'success' ? '#10b98155' : '#ef444455'}`,
                    color: flash.type === 'success' ? '#10b981' : '#ef4444',
                }}>
                    {flash.msg}
                </div>
            )}

            {pending.length === 0 ? (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '24px 0', color: 'var(--text-muted)', gap: 8,
                }}>
                    <div style={{ fontSize: 13 }}>No pending approvals</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pending.map(u => (
                        <div key={u.id} style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            background: 'rgba(255,255,255,.03)',
                            border: '1px solid var(--border)',
                            borderRadius: 12, padding: '14px 18px',
                        }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: '50%',
                                border: `2px solid ${orgColor}55`, overflow: 'hidden', flexShrink: 0,
                                background: 'rgba(255,255,255,.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {u.picture
                                    ? <img src={u.picture} alt={u.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <span style={{ fontWeight: 700, fontSize: 16 }}>{u.name?.[0] || '?'}</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{u.email}</div>
                                {u.registeredAt && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        Requested: {new Date(u.registeredAt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                            {flash?.id === u.id && (
                                <div style={{ fontSize: 12, color: flash.type === 'success' ? '#10b981' : '#ef4444' }}>
                                    {flash.msg}
                                </div>
                            )}
                            <span style={{
                                background: 'rgba(245,158,11,.12)', color: '#f59e0b',
                                border: '1px solid rgba(245,158,11,.3)',
                                borderRadius: 20, padding: '3px 10px',
                                fontSize: 11, fontWeight: 600, flexShrink: 0,
                            }}>PENDING</span>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                <button
                                    id={`approve-btn-${u.id}`}
                                    onClick={() => approve(u.id)}
                                    disabled={!!loadingId || !caEnrolled}
                                    title={!caEnrolled ? 'Enroll the CA certificate first' : ''}
                                    style={{
                                        padding: '8px 14px', borderRadius: 8, border: 'none', cursor: caEnrolled ? 'pointer' : 'not-allowed',
                                        background: !caEnrolled
                                            ? 'rgba(255,255,255,.08)'
                                            : loadingId === u.id
                                                ? 'rgba(16,185,129,.3)'
                                                : 'linear-gradient(135deg, #10b981, #059669)',
                                        color: !caEnrolled ? 'var(--text-muted)' : '#fff',
                                        fontWeight: 700, fontSize: 12,
                                        opacity: loadingId && loadingId !== u.id ? 0.5 : 1,
                                    }}
                                >
                                    {loadingId === u.id ? 'Generating...' : 'Generate Certificate'}
                                </button>
                                <button
                                    id={`reject-btn-${u.id}`}
                                    onClick={() => reject(u.id)}
                                    disabled={!!loadingId}
                                    style={{
                                        padding: '8px 12px', borderRadius: 8,
                                        border: '1px solid rgba(239,68,68,.4)', cursor: 'pointer',
                                        background: 'rgba(239,68,68,.08)',
                                        color: '#ef4444', fontWeight: 600, fontSize: 12,
                                        opacity: loadingId ? 0.5 : 1,
                                    }}
                                >
                                    {loadingId === u.id + '_reject' ? '…' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}




export default function DashboardPage() {
    const { user } = useAuth();

    const steps = [
        { org: 'Org1', label: 'Production', color: 'var(--accent-green)', steps: ['CreateBatch', 'AddDrying', 'AddMixing', 'AddProduct'] },
        { org: 'Org2', label: 'Transport', color: 'var(--accent-cyan)', steps: ['CreateTransport', 'TrackCargo', 'CompleteTransport'] },
        { org: 'Org3', label: 'Consumer', color: 'var(--accent-purple)', steps: ['GetFullBatchDetails'] },
    ];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title"><span>ChainTrace Dashboard</span></h1>
                <p className="page-subtitle">Hyperledger Fabric · Supply Chain Tracker · 3-org network on channel <span className="mono" style={{ color: 'var(--accent-blue)' }}>mychannel</span></p>
            </div>

            {/* Admin panel — only visible to org admins */}
            {user?.isAdmin && <AdminPanel user={user} />}

            {/* Stats row */}
            <div className="stats-row">
                <div className="stat-card blue">
                    <div className="stat-value">3</div>
                    <div className="stat-label">Organizations</div>
                </div>
                <div className="stat-card cyan">
                    <div className="stat-value">9</div>
                    <div className="stat-label">Chaincode Functions</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-value">1</div>
                    <div className="stat-label">Channel</div>
                </div>
                <div className="stat-card purple">
                    <div className="stat-value">4</div>
                    <div className="stat-label">Production Steps</div>
                </div>
            </div>

            {/* Org flow */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div>
                        <div className="card-title">Network Architecture</div>
                        <div className="card-subtitle">How the 3 organizations interact on the blockchain</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                    {steps.map((o) => (
                        <div key={o.org} style={{
                            background: 'rgba(255,255,255,.03)',
                            border: `1px solid ${o.color}30`,
                            borderRadius: 'var(--radius-md)',
                            padding: 20,
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                background: `${o.color}`,
                            }} />
                            <div style={{ fontWeight: 700, fontSize: 15, color: o.color, marginBottom: 4 }}>{o.org}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{o.label}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {o.steps.map(fn => (
                                    <div key={fn} style={{
                                        background: 'rgba(0,0,0,.3)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 6,
                                        padding: '5px 10px',
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontSize: 11,
                                        color: 'var(--accent-cyan)',
                                    }}>{fn}()</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
