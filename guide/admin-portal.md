# Admin Portal

> **Repository:** [github.com/psp-kbz/dynamic-workflow](https://github.com/psp-kbz/dynamic-workflow)

The admin portal (`dynamic-workflow`) is a React application for managing the entire platform: building forms, designing workflows, creating mappings, and monitoring execution in real-time.

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React + TypeScript | 19.2 |
| Build Tool | Vite | 7.3 |
| Routing | React Router | 7.9 |
| UI Library | Mantine | 7.17 |
| Forms | JSON Forms (Material renderers) | 3.7 |
| Workflow Canvas | XYFlow (React Flow) | 12.10 |
| Code Editor | Monaco Editor | 4.7 |
| State (UI) | Zustand | 5.0 |
| State (Server) | TanStack React Query | 5.90 |
| File Upload | UploadThing | 7.7 |
| Real-time | Server-Sent Events (EventSource) | Native |

## Pages

### Form Builder (`/d/forms/builder`)

Create and edit form definitions using JSON Schema and UI Schema.

**What it does:**
- Side-by-side **Monaco editors** for JSON Schema and UI Schema
- **Live preview** renders the form using JSON Forms with all custom controls
- Load existing form definitions from the API
- Save new or update existing definitions
- Sample schema button for quick testing

**How it works behind the scenes:**
1. Admin writes a JSON Schema defining form fields (types, validation rules, enums)
2. Admin writes a UI Schema defining layout (vertical/horizontal groups, control order, custom renderer hints)
3. The preview panel passes both schemas to `<JsonForms>`, which renders the form using Material-UI renderers + custom controls
4. On save, both schemas are POSTed to the Forms API (`POST /api/forms`)

**Example JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "fullName": { "type": "string", "minLength": 2 },
    "age": { "type": "integer", "minimum": 18, "maximum": 100 },
    "rating": { "type": "integer", "minimum": 1, "maximum": 5 },
    "document": { "type": "string", "format": "data-url" }
  },
  "required": ["fullName", "age"]
}
```

**Example UI Schema:**
```json
{
  "type": "VerticalLayout",
  "elements": [
    { "type": "Control", "scope": "#/properties/fullName" },
    { "type": "Control", "scope": "#/properties/age" },
    { "type": "Control", "scope": "#/properties/rating" },
    { "type": "Control", "scope": "#/properties/document" }
  ]
}
```

### Workflow Builder (`/d/workflows/builder`)

Design workflow definitions with an interactive node-based canvas.

**What it does:**
- **Drag-and-drop canvas** powered by XYFlow for placing and connecting nodes
- **7 node types** with dedicated configuration modals
- **Edge configuration** for transition conditions
- **JSON import/export** for workflow definitions
- **Validation** checks before saving
- **Load existing workflows** from a dropdown

**Node types:**

| Node | Icon | Purpose | Configuration |
|------|------|---------|---------------|
| Start | ▶ | Entry point | None |
| Task | 📋 | Human action/approval | Assignment type (role/user/group), SLA rules |
| Decision | ◇ | Conditional branch | JEXL expressions on outgoing transitions |
| Service | ⚙ | Automated HTTP call | Method, URL, headers, body (supports JEXL templates) |
| Parallel Gateway | ⫘ | Fork into branches | Branch definitions with node lists |
| Parallel Join | ⫗ | Merge branches | Join type: all, any, majority, n_of_m |
| End | ⏹ | Completion | None |

**How it works behind the scenes:**
1. The canvas state (nodes + edges) is managed by XYFlow's React hooks
2. Each node stores its configuration in the node's `data` property
3. On save, the canvas state is transformed into the workflow definition JSON format:
   - Nodes → `nodes[]` array with `key`, `type`, and `config`
   - Edges → `transitions[]` array with `from`, `to`, and `condition`
4. The definition is POSTed to the Workflow Engine API (`POST /api/v1/workflows`)

### Workflow Visualizer (`/d/workflows/visualizer`)

Monitor running workflow instances in real-time.

**What it does:**
- **Instance list** with status cards (running, completed, failed)
- **Stage timeline** showing which node the instance is currently at
- **Action history** log showing every action taken (who, when, what, result)
- **Auto-refresh** — instance list updates every 30 seconds, active instance details every 5 seconds

**How it works behind the scenes:**
1. `useWorkflowInstances()` hook polls `GET /api/v1/workflows/instances` every 30s
2. When an instance is selected, `useWorkflowInstanceDetails(id)` polls every 5s for fresh data
3. The detail view shows:
   - All `ParallelBranchInstance` records (branch status)
   - Full `WorkflowActionHistory` ordered by timestamp
   - Current node position within the workflow definition

### Mappings (`/d/mappings`)

Link form definitions to workflow definitions.

**What it does:**
- **Form key selector** — dropdown populated from form definitions
- **Workflow key selector** — dropdown populated from workflow definitions
- **Create mapping** — link a form to a workflow with active/inactive status
- **Table view** — all mappings with update/delete actions

**How it works behind the scenes:**
1. When a mapping is active and a user submits the linked form, the Forms API knows which workflow to trigger
2. The Forms API calls `POST /api/v1/workflows/start` on the engine with the form submission data as context variables

### Notifications (`/d/notifications`)

Real-time notification center.

**What it does:**
- List all notifications with title, message, and timestamp
- Mark as read / delete
- Unread count badge in the sidebar
- Real-time push via Server-Sent Events

**How it works behind the scenes:**
1. `useNotificationStream()` hook opens an EventSource connection to the Forms API
2. New events trigger toast notifications (notistack) and invalidate the `["notifications"]` React Query cache
3. Auto-reconnect with exponential backoff if the connection drops

## Custom JSON Forms Renderers

The admin portal extends JSON Forms with domain-specific controls:

| Renderer | Trigger Condition | What it Renders |
|----------|------------------|-----------------|
| **Rating** | Schema property name ends with `rating` | 5-star interactive rating with hover preview |
| **AgeSlider** | Schema property name ends with `age` | Material-UI slider respecting min/max from schema |
| **FileUpload** | Schema has `format: "data-url"` or `contentMediaType` | File picker with CSV validation (5MB limit) |
| **TextInput** | Custom tester match | Styled text input with validation |
| **NumberInput** | Custom tester match | Numeric input with constraints |

Renderers are registered with a **ranking** (priority). Higher-ranked custom renderers override the default Material-UI renderers when their tester condition matches.

## Layout & Theme

- **Mantine AppShell** with a collapsible sidebar navigation
- Custom Mantine theme with **Poppins** font
- Color palette: primary, secondary, info, success, error, warning
- All pages wrapped in `DashboardLayout`
- Sidebar links: Forms, Submissions, Workflow Builder, Workflow Visualizer, Stages, Mappings, Notifications

## State Management Details

### Zustand Stores

```typescript
// App store — UI state
useAppStore() → {
  opened: boolean       // sidebar open/closed
  activePage: string    // current page name
  toggleSidebar()
}

// Workflow store — selection state
useWorkflowStore() → {
  selectedInstanceId: string | null
  setSelectedInstanceId(id)
}
```

### React Query Hooks

| Hook | Query Key | Refetch Interval |
|------|-----------|-----------------|
| `useFormDefinitions()` | `["form-definitions"]` | Manual |
| `useWorkflowDefinitions()` | `["workflow-definitions"]` | Manual |
| `useWorkflowInstances()` | `["workflow-instances"]` | 30s |
| `useWorkflowInstanceDetails(id)` | `["workflow-instance-details", id]` | 5s (when enabled) |
| `useNotifications()` | `["notifications"]` | Manual (SSE-driven) |
| `useSubmissions()` | `["submissions"]` | Manual |
| `useMappings()` | `["mappings"]` | Manual |

Mutations automatically invalidate their related query keys on success.
