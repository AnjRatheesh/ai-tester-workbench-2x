import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateTestCases, testConnection } from './llmService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.post('/api/test-connection', async (req, res) => {
  const config = req.body;
  try {
    const success = await testConnection(config);
    res.json({ success, message: `Connected to ${config.provider} successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/generate-test-cases', async (req, res) => {
  const { requirement, config } = req.body;
  
  if (!requirement || !config) {
    return res.status(400).json({ error: 'Requirement and valid config is required.' });
  }

  try {
    const testCases = await generateTestCases(requirement, config);
    res.json({ testCases, format: 'Jira' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`LLM Test Case Generator API running on http://localhost:${port}`);
});
