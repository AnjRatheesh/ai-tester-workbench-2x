import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, Save, Trash2 } from 'lucide-react';

export default function GeneratorView() {
  const [requirement, setRequirement] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testCases, setTestCases] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const [llmConfig, setLlmConfig] = useState<any>(null);
  const SUPPORTED_PROVIDERS = ['ollama', 'groq', 'openai', 'gemini', 'claude', 'lmstudio'];

  useEffect(() => {
    const storedLLM = localStorage.getItem('llm_config');
    if (storedLLM) setLlmConfig(JSON.parse(storedLLM));
  }, []);

  // Load record from History page "View" action
  useEffect(() => {
    if (location.state?.loadRecord) {
      const record = location.state.loadRecord;
      setTestCases(record.testCases);
      setRequirement(record.requirement || '');
    }
  }, [location.state]);

  const handleGenerate = async () => {
    if (!requirement.trim()) return;

    const stored = localStorage.getItem('llm_config');
    const config = stored ? JSON.parse(stored) : null;

    if (!config || !config.provider) {
      setError('Please select an LLM provider and configure it in Settings.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setTestCases('Generating test cases... Please wait.');

    try {
      const response = await fetch('http://localhost:3001/api/generate-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement, config }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate test cases.');

      let jsonOutput = data.testCases;
      if (typeof jsonOutput === 'string') {
        jsonOutput = jsonOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
      }

      let parsedData;
      try {
        parsedData = typeof jsonOutput === 'string' ? JSON.parse(jsonOutput) : jsonOutput;
      } catch {
        parsedData = data.testCases;
      }

      setTestCases(parsedData);
    } catch (err: any) {
      setError(err.message);
      setTestCases('Generation failed. See error above.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!testCases || typeof testCases !== 'object' || !testCases.testCases) return;
    const stored = localStorage.getItem('saved_testcases');
    const saved = stored ? JSON.parse(stored) : [];

    const configStored = localStorage.getItem('llm_config');
    const config = configStored ? JSON.parse(configStored) : { model: 'Unknown' };

    const title = testCases.testSuiteTitle || (requirement.substring(0, 30) + (requirement.length > 30 ? '...' : ''));

    const record = {
      id: 'history_' + Math.random().toString(36).substring(7),
      title,
      requirement: requirement || 'Loaded from session',
      model: config.model || 'Unknown',
      timestamp: new Date().toISOString(),
      testCases,
    };

    localStorage.setItem('saved_testcases', JSON.stringify([record, ...saved]));
    alert('Test cases saved to History!');
  };

  const handleClear = () => { setTestCases(null); setRequirement(''); };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value;
    if (!newProv) return;
    const newConfig = { ...(llmConfig || {}), provider: newProv, status: 'not connected' };
    setLlmConfig(newConfig);
    localStorage.setItem('llm_config', JSON.stringify(newConfig));
  };

  const formatProviderName = (p: string) => {
    if (p === 'openai') return 'OpenAI';
    if (p === 'lmstudio') return 'LM Studio';
    return p.charAt(0).toUpperCase() + p.slice(1);
  };

  const renderOutput = () => {
    if (!testCases) {
      return (
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          Welcome to the LLM Test Case Generator.{'\n\n'}Please paste your Jira requirement in the input box below.
        </div>
      );
    }
    if (typeof testCases === 'string') {
      return <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{testCases}</div>;
    }

    const cases = testCases?.testCases || (Array.isArray(testCases) ? testCases : null);
    if (!cases || !Array.isArray(cases)) {
      return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{JSON.stringify(testCases, null, 2)}</pre>;
    }

    return (
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              <th style={{ padding: '0.75rem', border: '1px solid var(--border-color)', width: '8%' }}>ID</th>
              <th style={{ padding: '0.75rem', border: '1px solid var(--border-color)', width: '12%' }}>Type</th>
              <th style={{ padding: '0.75rem', border: '1px solid var(--border-color)', width: '20%' }}>Title & Scenario</th>
              <th style={{ padding: '0.75rem', border: '1px solid var(--border-color)', width: '20%' }}>Preconditions</th>
              <th style={{ padding: '0.75rem', border: '1px solid var(--border-color)', width: '25%' }}>Steps</th>
              <th style={{ padding: '0.75rem', border: '1px solid var(--border-color)', width: '15%' }}>Expected Result</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((tc: any, index: number) => (
              <tr key={tc.id || index} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)', verticalAlign: 'top', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                  {tc.id || `TC-${index + 1}`}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                  {tc.type ? (
                    <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', fontSize: '0.75rem' }}>
                      {tc.type}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                  <strong style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{tc.title || 'Untitled'}</strong>
                  {tc.description && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{tc.description}</span>}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                  {tc.preconditions?.length > 0 ? (
                    <ul style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-secondary)' }}>
                      {tc.preconditions.map((pre: string, i: number) => <li key={i}>{pre}</li>)}
                    </ul>
                  ) : '-'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)', verticalAlign: 'top' }}>
                  {tc.steps?.length > 0 ? (
                    <ol style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-secondary)' }}>
                      {tc.steps.map((step: string, i: number) => <li key={i} style={{ marginBottom: '0.25rem' }}>{step}</li>)}
                    </ol>
                  ) : '-'}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)', verticalAlign: 'top', backgroundColor: 'rgba(16,185,129,0.05)', color: 'var(--success-color)' }}>
                  {tc.expectedResult || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="generator-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Active LLM Provider Selector */}
      <div style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>Active LLM:</label>
        <select
          value={llmConfig?.provider || ''}
          onChange={handleProviderChange}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', minWidth: '230px' }}
        >
          {!llmConfig?.provider && <option value="">🔴 Select LLM</option>}
          {SUPPORTED_PROVIDERS.map(p => {
            const isSelected = llmConfig?.provider === p;
            const isConnected = isSelected && llmConfig?.status === 'connected';
            return (
              <option key={p} value={p}>
                {isConnected ? '🟢' : '🔴'} {formatProviderName(p)} {isConnected ? '(Connected)' : '(Not Connected)'}
              </option>
            );
          })}
        </select>
        {llmConfig?.status !== 'connected' && (
          <span style={{ fontSize: '0.8rem', color: 'var(--error-color)' }}>Configure connection in Settings!</span>
        )}
      </div>

      {/* Output Area */}
      <div className="output-area">
        <div className="output-card">
          {/* Minimal Toolbar — Generate, Save, Clear only */}
          <div className="output-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ margin: 0 }}>Generated Test Cases</h3>
              {error ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--error-color)', fontSize: '0.85rem' }}>
                  <AlertCircle size={15} /> Error
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <CheckCircle size={15} style={{ color: isGenerating ? 'inherit' : 'var(--success-color)' }} />
                  {isGenerating ? 'Processing...' : 'Ready'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleSave}
                disabled={!testCases?.testCases}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', fontSize: '0.85rem', backgroundColor: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '5px', cursor: !testCases?.testCases ? 'not-allowed' : 'pointer', opacity: !testCases?.testCases ? 0.5 : 1, fontWeight: '500' }}
              >
                <Save size={14} /> Save to History
              </button>
              <button
                onClick={handleClear}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', fontSize: '0.85rem', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error-color)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '5px', cursor: 'pointer', fontWeight: '500' }}
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error-color)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div className="output-content">{renderOutput()}</div>
        </div>
      </div>

      {/* Input Area */}
      <div className="input-section">
        <div className="prompt-box">
          <textarea
            className="input-field prompt-input"
            placeholder="Paste your Jira requirement here..."
            value={requirement}
            onChange={e => setRequirement(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
            }}
          />
          <button
            className="btn btn-primary submit-btn"
            onClick={handleGenerate}
            disabled={isGenerating || !requirement.trim()}
          >
            <Send size={18} />
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
