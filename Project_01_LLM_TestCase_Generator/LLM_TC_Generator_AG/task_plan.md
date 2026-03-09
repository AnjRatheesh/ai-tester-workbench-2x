# Task Plan
### Phase 1: Discovery (Completed)
- [x] Ask discovery questions
- [x] Receive requirements from user
- [x] Draft Blueprint
- [x] Obtain Blueprint approval from user

---
## 🏗️ BLUEPRINT (Draft for Approval)

### 1. Architecture & Tech Stack
- **Frontend**: React (TypeScript) for the User Interface.
- **Backend**: Node.js (TypeScript) for API handling and LLM orchestration.
- **Configuration Storage**: Settings window to store API keys and select the active LLM provider.

### 2. Core Features & UI Layout
- **Main View (Generator):**
  - **Left Sidebar**: "History" panel to track past generated test cases.
  - **Main Output Area**: Displays the generated "Test Case" from Ollama, Groq, OpenAI, etc.
  - **Input Area**: A text box ("Ask here is here TC for Requiremnt") where users paste the Jira requirement.
- **Settings View:**
  - Dedicated configuration inputs for: `Ollama Setting`, `Groq Setting`, `Open AI API keys` (and others as requested: LM Studio, Claude, Gemini).
  - Action buttons: `Save Button` to persist settings, and `Test Connection` to verify API keys/URLs are valid.
- **Test Case Generator Engine**:
  - Automatically identifies whether context requires Web App or API tests.
  - Generates both Functional and Non-Functional test cases.
  - Structures output strictly in a Jira-compatible format.

### 3. Application Flow
1. User opens Settings view, configures LLM settings, and clicks "Test Connection" to verify, then "Save Button".
2. User navigates to Main View, pastes a Jira requirement into the bottom input area.
3. Backend dispatches the prompt to the configured LLM.
4. LLM responds with Jira-formatted test cases, which are displayed in the Main Output Area.
5. The request/response is saved to the History sidebar.

### Phase 2: Implementation (Completed)
- [x] Initialize Node.js & React TypeScript project structures.
- [x] Create UI for settings and requirement input.
- [x] Implement LLM integration service.
- [x] Implement Test Case formatting tools.

### Phase 3: Testing & Delivery (Completed)
- [x] Validate configurations with different LLM providers (Endpoints implemented and wired).
- [x] Ensure formatting matches Jira specifications (Strict JSON Schema generating 6-8 test cases).

### Phase 4: Test Case Management (Completed)
- [x] Add Save, Clear, and Export (CSV, Excel) buttons above output table.
- [x] Create History Page to display tabular saved records from localStorage.
- [x] Enable loading History records back into the Generator side.
