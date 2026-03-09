import { useState, useEffect } from 'react';
import { Save, Plug, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('ollama');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  
  const [testStatus, setTestStatus] = useState<{loading: boolean, success?: boolean, msg?: string}>({ loading: false });
  const [saveMsg, setSaveMsg] = useState('');

  const tabs = [
    { id: 'ollama', label: 'Ollama Setting' },
    { id: 'groq', label: 'Groq Setting' },
    { id: 'openai', label: 'Open AI API keys' },
    { id: 'lmstudio', label: 'LM Studio' },
    { id: 'claude', label: 'Claude API' },
    { id: 'gemini', label: 'Gemini API' },
  ];

  // Load active configuration from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('llm_config');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        setActiveTab(config.provider || 'ollama');
        setApiKey(config.apiKey || '');
        setEndpoint(config.endpoint || '');
        setModel(config.model || '');
      } catch (e) {
        // no op
      }
    }
  }, []);

  // Preset default endpoints for local models to help the user
  useEffect(() => {
    if (activeTab === 'ollama' && !endpoint) setEndpoint('http://localhost:11434');
    if (activeTab === 'lmstudio' && !endpoint) setEndpoint('http://localhost:1234/v1');
  }, [activeTab]);

  const handleSave = () => {
    const config = { 
      provider: activeTab, 
      apiKey, 
      endpoint, 
      model,
      status: testStatus.success ? 'connected' : 'not connected'
    };
    localStorage.setItem('llm_config', JSON.stringify(config));
    setSaveMsg('Settings saved successfully!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    try {
      const response = await fetch('http://localhost:3001/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: activeTab, apiKey, endpoint, model })
      });
      const data = await response.json();
      
      if (data.success) {
        setTestStatus({ loading: false, success: true, msg: data.message });
        // Automatically mark as connected in localstorage for instant UI update
        const stored = localStorage.getItem('llm_config');
        if (stored) {
           const c = JSON.parse(stored);
           if (c.provider === activeTab) {
              c.status = 'connected';
              localStorage.setItem('llm_config', JSON.stringify(c));
           }
        }
      } else {
        setTestStatus({ loading: false, success: false, msg: data.error });
      }
    } catch (err: any) {
      setTestStatus({ loading: false, success: false, msg: err.message || 'Failed to connect to backend API server.' });
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-card">
        <div className="settings-header">
          <h2>LLM Configuration</h2>
          <p className="text-muted">Configure your local and cloud LLM providers here.</p>
        </div>

        {/* Tab Navigation */}
        <div className="nav-links" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveTab(tab.id);
                setTestStatus({ loading: false });
                setSaveMsg('');
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Provider Settings Form */}
        <div className="input-group">
          <label className="input-label">API Key</label>
          <input 
            type="password" 
            className="input-field" 
            placeholder={`Enter API Key for ${tabs.find(t => t.id === activeTab)?.label}`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Endpoint URL (Optional for Cloud)</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g., http://localhost:11434"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Model Name</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g., gpt-4, llama3, mixtral-8x7b-32768, claude-3-opus-20240229..."
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
        
        {/* Status Messages */}
        <div style={{ marginTop: '1rem', minHeight: '2rem' }}>
          {testStatus.msg && (
            <div className={`flex-row gap-2 ${testStatus.success ? 'success-text' : 'error-text'}`}>
               {testStatus.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
               <span>{testStatus.msg}</span>
            </div>
          )}
          {saveMsg && (
            <div className="success-text flex-row gap-2">
              <CheckCircle size={16} /> <span>{saveMsg}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button 
            className="btn btn-secondary" 
            onClick={handleTestConnection}
            disabled={testStatus.loading}
          >
            <Plug size={18} />
            {testStatus.loading ? 'Testing...' : 'Test Connection'}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={18} />
            Save Button
          </button>
        </div>
      </div>
    </div>
  );
}
