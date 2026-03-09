import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Eye, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, FileSpreadsheet, Copy, Download } from 'lucide-react';

interface EditState {
  recordId: string;
  tcIndex: number;
  draft: any;
}

export default function HistoryView() {
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<EditState | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('saved_testcases') || '[]');
    setHistoryRecords(saved);
  }, []);

  const persist = (records: any[]) => {
    setHistoryRecords(records);
    localStorage.setItem('saved_testcases', JSON.stringify(records));
  };

  const handleView = (record: any) => navigate('/', { state: { loadRecord: record } });
  const handleDelete = (id: string) => persist(historyRecords.filter(r => r.id !== id));

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getTestCases = (record: any): any[] => {
    if (Array.isArray(record.testCases)) return record.testCases;
    if (record.testCases?.testCases && Array.isArray(record.testCases.testCases)) return record.testCases.testCases;
    return [];
  };

  // ─── Excel helpers ───────────────────────────────────────────────────────────
  const tcToRow = (tc: any, reqTitle: string) => ({
    'Requirement Title': reqTitle,
    'TC ID': tc.id || '',
    'Type': tc.type || '',
    'Test Case Title': tc.title || '',
    'Description': tc.description || '',
    'Preconditions': tc.preconditions?.join('\n') || '',
    'Steps': tc.steps?.join('\n') || '',
    'Expected Result': tc.expectedResult || '',
    'Comment': '',
  });

  const downloadExcel = (rows: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 20) }));
    worksheet['!cols'] = colWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TestCases');
    XLSX.writeFile(workbook, filename);
  };

  const handleDownloadOne = (record: any) => {
    const tcs = getTestCases(record);
    if (tcs.length === 0) { alert('No test cases to export.'); return; }
    const rows = tcs.map(tc => tcToRow(tc, record.title || record.requirement || ''));
    downloadExcel(rows, `TestCases_${(record.title || 'Batch').replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
  };

  const handleDownloadAll = () => {
    const rows: any[] = [];
    historyRecords.forEach(record => {
      const tcs = getTestCases(record);
      tcs.forEach(tc => rows.push(tcToRow(tc, record.title || record.requirement || '')));
    });
    if (rows.length === 0) { alert('No test cases to export.'); return; }
    downloadExcel(rows, `AllTestCases_${Date.now()}.xlsx`);
  };

  // ─── Copy single TC row ───────────────────────────────────────────────────
  const handleCopyTC = (tc: any, key: string) => {
    const steps = tc.steps?.length ? tc.steps.join(' → ') : '-';
    const text = `${tc.id || '-'} | ${tc.type || '-'} | ${tc.title || '-'} | ${tc.description || '-'} | ${steps} | ${tc.expectedResult || '-'}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  // ─── Inline edit ──────────────────────────────────────────────────────────
  const startEdit = (recordId: string, tcIndex: number, tc: any) =>
    setEditState({ recordId, tcIndex, draft: { ...tc, steps: Array.isArray(tc.steps) ? [...tc.steps] : [] } });

  const cancelEdit = () => setEditState(null);

  const saveEdit = () => {
    if (!editState) return;
    const { recordId, tcIndex, draft } = editState;
    const updated = historyRecords.map(record => {
      if (record.id !== recordId) return record;
      if (Array.isArray(record.testCases)) {
        const tcs = [...record.testCases]; tcs[tcIndex] = draft;
        return { ...record, testCases: tcs };
      } else if (record.testCases?.testCases) {
        const tcs = [...record.testCases.testCases]; tcs[tcIndex] = draft;
        return { ...record, testCases: { ...record.testCases, testCases: tcs } };
      }
      return record;
    });
    persist(updated);
    setEditState(null);
  };

  const updateDraftField = (field: string, value: any) =>
    editState && setEditState({ ...editState, draft: { ...editState.draft, [field]: value } });

  const updateDraftStep = (si: number, v: string) => {
    if (!editState) return;
    const steps = [...editState.draft.steps]; steps[si] = v;
    setEditState({ ...editState, draft: { ...editState.draft, steps } });
  };

  const addStep = () =>
    editState && setEditState({ ...editState, draft: { ...editState.draft, steps: [...editState.draft.steps, ''] } });

  const removeStep = (si: number) => {
    if (!editState) return;
    setEditState({ ...editState, draft: { ...editState.draft, steps: editState.draft.steps.filter((_: any, i: number) => i !== si) } });
  };

  // ─── Colors ───────────────────────────────────────────────────────────────
  const typeBg: Record<string, string> = { Functional: 'rgba(59,130,246,0.15)', Negative: 'rgba(239,68,68,0.15)', Edge: 'rgba(245,158,11,0.15)', Performance: 'rgba(139,92,246,0.15)', Security: 'rgba(16,185,129,0.15)' };
  const typeFg: Record<string, string> = { Functional: '#3b82f6', Negative: '#ef4444', Edge: '#f59e0b', Performance: '#8b5cf6', Security: '#10b981' };

  const inputSty: React.CSSProperties = { width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--accent-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Saved History</h2>
            <p style={{ margin: '0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {historyRecords.length} saved batch{historyRecords.length !== 1 ? 'es' : ''}. Click a row to expand and view test cases.
            </p>
          </div>
          {historyRecords.length > 0 && (
            <button
              onClick={handleDownloadAll}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success-color)', border: '1px solid rgba(16,185,129,0.35)', fontWeight: '600', fontSize: '0.875rem' }}
            >
              <Download size={16} /> Download All (Excel)
            </button>
          )}
        </div>

        {historyRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No saved test cases found.</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Generate and save test cases from the Generator page to see them here.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <th style={TH}>#</th>
                  <th style={TH}>Title</th>
                  <th style={TH}>Date</th>
                  <th style={{ ...TH, textAlign: 'center' }}>TC Count</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.map((record, index) => {
                  const tcs = getTestCases(record);
                  const isExpanded = expandedIds.has(record.id);
                  const dateStr = new Date(record.timestamp).toLocaleDateString();

                  return (
                    <>
                      {/* ── Summary Row ── */}
                      <tr
                        key={record.id}
                        onClick={() => toggleExpand(record.id)}
                        style={{ borderTop: index > 0 ? '1px solid var(--border-color)' : 'none', cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(59,130,246,0.05)' : undefined, transition: 'background-color 0.15s' }}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = ''; }}
                      >
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '500', width: '40px' }}>{index + 1}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isExpanded ? <ChevronDown size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} /> : <ChevronRight size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{record.title || 'Untitled'}</div>
                              {record.requirement && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {record.requirement}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{dateStr}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success-color)', fontWeight: '700' }}>
                            {tcs.length}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => handleView(record)} style={{ ...actionBtn, backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none' }}>
                              <Eye size={12} /> View
                            </button>
                            <button onClick={() => handleDownloadOne(record)} style={{ ...actionBtn, backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--success-color)', border: '1px solid rgba(16,185,129,0.3)' }}>
                              <FileSpreadsheet size={12} /> Download Excel
                            </button>
                            <button onClick={() => handleDelete(record.id)} style={{ ...actionBtn, backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error-color)', border: '1px solid rgba(239,68,68,0.3)' }}>
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded TC Sub-table ── */}
                      {isExpanded && (
                        <tr key={`${record.id}-expanded`}>
                          <td colSpan={5} style={{ padding: '0', backgroundColor: 'var(--bg-primary)' }}>
                            <div style={{ padding: '1rem 2rem 1.5rem', borderTop: '2px solid var(--accent-primary)' }}>
                              <div style={{ marginBottom: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Test Cases — {record.title}
                              </div>
                              {tcs.length === 0 ? (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No test cases found.</div>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                                      <th style={ITH}>#</th>
                                      <th style={ITH}>TC ID</th>
                                      <th style={ITH}>Type</th>
                                      <th style={ITH}>Title</th>
                                      <th style={ITH}>Description</th>
                                      <th style={ITH}>Steps</th>
                                      <th style={ITH}>Expected Result</th>
                                      <th style={{ ...ITH, textAlign: 'center' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tcs.map((tc: any, tcIndex: number) => {
                                      const isEditing = editState?.recordId === record.id && editState?.tcIndex === tcIndex;
                                      const copyKey = `${record.id}-${tcIndex}`;

                                      if (isEditing && editState) {
                                        const d = editState.draft;
                                        return (
                                          <tr key={tcIndex} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(59,130,246,0.04)' }}>
                                            <td style={{ ...ITD, color: 'var(--text-secondary)', fontWeight: '600' }}>{tcIndex + 1}</td>
                                            <td style={{ ...ITD, color: 'var(--accent-primary)', fontWeight: '700' }}>{d.id || `TC-${tcIndex + 1}`}</td>
                                            <td style={ITD}>
                                              <select value={d.type || ''} onChange={e => updateDraftField('type', e.target.value)} style={{ ...inputSty, width: 'auto' }}>
                                                {['Functional', 'Negative', 'Edge', 'Performance', 'Security'].map(t => <option key={t} value={t}>{t}</option>)}
                                              </select>
                                            </td>
                                            <td style={ITD}><input value={d.title || ''} onChange={e => updateDraftField('title', e.target.value)} style={inputSty} /></td>
                                            <td style={ITD}><textarea value={d.description || ''} onChange={e => updateDraftField('description', e.target.value)} rows={3} style={{ ...inputSty, resize: 'vertical' }} /></td>
                                            <td style={ITD}>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                {d.steps.map((step: string, si: number) => (
                                                  <div key={si} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', minWidth: '18px' }}>{si + 1}.</span>
                                                    <input value={step} onChange={e => updateDraftStep(si, e.target.value)} style={{ ...inputSty, flex: 1 }} />
                                                    <button onClick={() => removeStep(si)} style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '0 2px' }}><X size={12} /></button>
                                                  </div>
                                                ))}
                                                <button onClick={addStep} style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--accent-primary)', background: 'none', border: '1px dashed var(--accent-primary)', borderRadius: '3px', cursor: 'pointer', padding: '0.15rem 0.4rem', width: 'fit-content' }}>+ Add Step</button>
                                              </div>
                                            </td>
                                            <td style={ITD}><textarea value={d.expectedResult || ''} onChange={e => updateDraftField('expectedResult', e.target.value)} rows={3} style={{ ...inputSty, resize: 'vertical' }} /></td>
                                            <td style={{ ...ITD, textAlign: 'center' }}>
                                              <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                                <button onClick={saveEdit} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.3rem 0.55rem', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success-color)', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>
                                                  <Check size={12} /> Save
                                                </button>
                                                <button onClick={cancelEdit} style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error-color)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                                                  <X size={12} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      }

                                      // Read-only row
                                      return (
                                        <tr key={tcIndex} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: tcIndex % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)' }}>
                                          <td style={{ ...ITD, color: 'var(--text-secondary)', fontWeight: '600' }}>{tcIndex + 1}</td>
                                          <td style={{ ...ITD, color: 'var(--accent-primary)', fontWeight: '700' }}>{tc.id || `TC-${tcIndex + 1}`}</td>
                                          <td style={ITD}>
                                            {tc.type ? (
                                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', backgroundColor: typeBg[tc.type] || 'var(--bg-tertiary)', color: typeFg[tc.type] || 'var(--text-primary)' }}>
                                                {tc.type}
                                              </span>
                                            ) : '-'}
                                          </td>
                                          <td style={{ ...ITD, fontWeight: '500', color: 'var(--text-primary)' }}>{tc.title || '-'}</td>
                                          <td style={{ ...ITD, color: 'var(--text-secondary)' }}>{tc.description || '-'}</td>
                                          <td style={ITD}>
                                            {tc.steps?.length > 0 ? (
                                              <ol style={{ paddingLeft: '1.1rem', margin: 0, color: 'var(--text-secondary)' }}>
                                                {tc.steps.map((step: string, si: number) => <li key={si} style={{ marginBottom: '0.2rem' }}>{step}</li>)}
                                              </ol>
                                            ) : '-'}
                                          </td>
                                          <td style={{ ...ITD, color: 'var(--success-color)' }}>{tc.expectedResult || '-'}</td>
                                          <td style={{ ...ITD, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                              <button
                                                onClick={() => handleCopyTC(tc, copyKey)}
                                                title="Copy this test case"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.28rem 0.5rem', borderRadius: '4px', cursor: 'pointer', backgroundColor: copiedKey === copyKey ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)', color: copiedKey === copyKey ? 'var(--success-color)' : 'var(--text-secondary)', border: `1px solid ${copiedKey === copyKey ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}`, fontSize: '0.72rem', fontWeight: '500', transition: 'all 0.2s' }}
                                              >
                                                {copiedKey === copyKey ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                                              </button>
                                              <button
                                                onClick={() => startEdit(record.id, tcIndex, tc)}
                                                title="Edit this test case"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.28rem 0.5rem', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.72rem', fontWeight: '500' }}
                                              >
                                                <Pencil size={11} /> Edit
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared style objects ──────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.78rem',
  textTransform: 'uppercase', letterSpacing: '0.05em'
};
const ITH: React.CSSProperties = {
  padding: '0.5rem 0.75rem', textAlign: 'left', border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem',
  textTransform: 'uppercase', letterSpacing: '0.04em'
};
const ITD: React.CSSProperties = {
  padding: '0.6rem 0.75rem', border: '1px solid var(--border-color)',
  verticalAlign: 'top', fontSize: '0.82rem'
};
const actionBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.3rem',
  padding: '0.32rem 0.65rem', borderRadius: '5px', cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: '500'
};
