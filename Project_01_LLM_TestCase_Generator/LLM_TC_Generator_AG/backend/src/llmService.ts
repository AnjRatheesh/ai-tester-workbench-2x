import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import axios from 'axios';

export interface LLMConfig {
  provider: string;   // 'ollama' | 'groq' | 'openai' | 'lmstudio' | 'claude' | 'gemini'
  apiKey?: string;
  endpoint?: string;
  model: string;
}

const generatePrompt = (requirement: string) => `Generate test cases from the given Jira requirement.

The output will be displayed in a UI table, so follow the structure strictly.

IMPORTANT RULES:
- Return ONLY valid JSON
- Do NOT include markdown
- Do NOT include explanations
- Do NOT include text outside JSON

JSON Structure (matches the UI table):

{
  "testSuiteTitle": "Short Title (3-6 words)",
  "testCases": [
    {
      "id": "TC-001",
      "title": "Test case title",
      "type": "Functional | Negative | Edge | Performance | Security",
      "description": "What the test verifies",
      "preconditions": [
        "condition1",
        "condition2"
      ],
      "steps": [
        "step1",
        "step2",
        "step3"
      ],
      "expectedResult": "Expected outcome"
    }
  ]
}

Instructions:
- Generate 6–8 test cases
- Include functional, negative, and edge cases
- Ensure steps are clear and sequential
- Extract a short 3-6 word "testSuiteTitle" summarizing the main scenario.
- IF a Jira ID is present in the requirement, format title as: JIRA-ID – Scenario Title

Requirement:
${requirement}

Return only the JSON object.`;


export async function generateTestCases(requirement: string, config: LLMConfig): Promise<string> {
  const { provider, apiKey, endpoint, model } = config;
  const finalPrompt = generatePrompt(requirement);

  try {
    switch (provider) {
      case 'openai': {
        const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
        const res = await openai.chat.completions.create({
          model: model || 'gpt-4o',
          messages: [
            { role: 'user', content: finalPrompt }
          ],
        });
        return res.choices[0]?.message?.content || 'No response from OpenAI.';
      }
      case 'groq': {
        const groq = new Groq({ apiKey: apiKey || process.env.GROQ_API_KEY });
        const res = await groq.chat.completions.create({
          model: model || 'mixtral-8x7b-32768',
          messages: [
            { role: 'user', content: finalPrompt }
          ],
        });
        return res.choices[0]?.message?.content || 'No response from Groq.';
      }
      case 'claude': {
        const anthropic = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
        const res = await anthropic.messages.create({
          model: model || 'claude-3-opus-20240229',
          max_tokens: 4000,
          messages: [{ role: 'user', content: finalPrompt }],
        });
        // @ts-ignore
        return res.content[0]?.text || 'No response from Claude.';
      }
      case 'gemini': {
        const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || 'test' });
        const res = await ai.models.generateContent({
          model: model || 'gemini-2.5-flash',
          contents: finalPrompt,
        });
        return res.text || 'No response from Gemini.';
      }
      case 'ollama': {
        const res = await axios.post(`${endpoint || 'http://localhost:11434'}/api/chat`, {
          model: model || 'llama3',
          messages: [
            { role: 'user', content: finalPrompt }
          ],
          stream: false
        });
        return res.data?.message?.content || 'No response from Ollama.';
      }
      case 'lmstudio': {
        const openaiLM = new OpenAI({ 
          apiKey: apiKey || 'lm-studio', 
          baseURL: endpoint || 'http://localhost:1234/v1' 
        });
        const res = await openaiLM.chat.completions.create({
          model: model || 'local-model',
          messages: [
            { role: 'user', content: finalPrompt }
          ],
        });
        return res.choices[0]?.message?.content || 'No response from LM Studio.';
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error: any) {
    console.error(`Error generating with ${provider}:`, error.message);
    throw new Error(`Failed to generate test cases: ${error.message}`);
  }
}

export async function testConnection(config: LLMConfig): Promise<boolean> {
  // A simple test message just to see if auth works
  const TEST_REQ = "Reply 'OK' if you can read this.";
  try {
    // Re-use generation logic but with a highly simplified prompt to avoid burning tokens on test
    const { provider, apiKey, endpoint, model } = config;
    const testPrompt = "Return a valid empty JSON array looking like: { \"testCases\": [] }";
    
    // Check if the provider can instantiate and respond
    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
      await openai.chat.completions.create({ model: model || 'gpt-4o', messages: [{ role: 'user', content: testPrompt }]});
      return true;
    } else if (provider === 'groq') {
       const groq = new Groq({ apiKey: apiKey || process.env.GROQ_API_KEY });
       await groq.chat.completions.create({ model: model || 'mixtral-8x7b-32768', messages: [{ role: 'user', content: testPrompt }]});
       return true;
    } else if (provider === 'claude') {
       const anthropic = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
       await anthropic.messages.create({ model: model || 'claude-3-opus-20240229', max_tokens: 100, messages: [{ role: 'user', content: testPrompt }]});
       return true;
    } else if (provider === 'gemini') {
       const ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || 'test' });
       // Gemini SDK requires apiKey to be valid length usually, but just creating the instance doesn't throw. 
       // If it fails on generation, that's fine, it will catch.
       await ai.models.generateContent({ model: model || 'gemini-2.5-flash', contents: testPrompt });
       return true;
    } else if (provider === 'ollama') {
       await axios.post(`${endpoint || 'http://localhost:11434'}/api/chat`, { model: model || 'llama3', messages: [{ role: 'user', content: testPrompt }], stream: false });
       return true;
    } else if (provider === 'lmstudio') {
       const openaiLM = new OpenAI({ apiKey: apiKey || 'lm-studio', baseURL: endpoint || 'http://localhost:1234/v1' });
       await openaiLM.chat.completions.create({ model: model || 'local-model', messages: [{ role: 'user', content: testPrompt }]});
       return true;
    }
    
    return false;
  } catch (e) {
    throw e;
  }
}
