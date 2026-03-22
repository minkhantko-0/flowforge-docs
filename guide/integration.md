# Integration Guide

This guide explains how to integrate FlowForge into your own project. There are several integration levels depending on what you need.

## Integration Approaches

| Approach | What You Use | Effort | Best For |
|----------|-------------|--------|----------|
| **Full system** | Engine + Admin Portal + Your Frontend | Medium | New projects that need complete workflow automation |
| **Engine only** | Engine API as a backend service | Low | Projects that already have a frontend and just need workflow execution |
| **Forms only** | JSON Forms rendering with custom schemas | Low | Projects that need dynamic forms but have their own workflow logic |
| **Reference** | Study the architecture and adapt patterns | — | Teams building their own engine with different tech |

---

## Approach 1: Full System Integration

Deploy the workflow engine and admin portal alongside your application. Your frontend acts as the user-facing layer (like the `request-form-demo` project).

### Step 1: Deploy the Infrastructure

```bash
# Start Redis (required for BullMQ job queues)
docker run -d --name redis -p 6379:6379 redis:7 --requirepass password

# Set up PostgreSQL (any managed instance or local)
# Create a database and note the connection string
```

### Step 2: Deploy the Workflow Engine

```bash
cd poc-workflow-engine

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/workflows
#   REDIS_HOST=localhost
#   REDIS_PORT=6379
#   REDIS_PASSWORD=password
#   WORKFLOW_MASTER_API_URL=http://localhost:5000

# Run database migrations
npm run apply:migrate

# Start the Workflow Master API (workflow definition storage)
npm run start:workflow-master

# Start the engine
npm run dev     # development
npm run start   # production
```

The engine is now running on port **3002**.

### Step 3: Deploy the Admin Portal

```bash
cd dynamic-workflow

# Install dependencies
npm install

# Configure environment
echo "VITE_API_URL=http://localhost:3001" > .env
echo "VITE_WORKFLOW_URL=http://localhost:3002" >> .env

# Start
npm run dev     # development
npm run build   # production (then serve the dist/ folder)
```

### Step 4: Set Up the Forms API

The system expects a Forms API on port 3001 that handles:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/forms` | GET, POST | CRUD for form definitions |
| `/api/form-mappings` | GET, POST, PUT, DELETE | Form-to-workflow mappings |
| `/api/submit` | POST | Form submission (triggers workflow start) |
| `/api/submissions` | GET | List submissions |
| `/api/notifications` | GET, POST, DELETE, PATCH | Notification management |
| `/api/notifications/stream` | GET (SSE) | Real-time notification stream |

You can build this as a simple CRUD API in any framework. The key integration point is the **submit endpoint**, which should:

1. Store the submission
2. Look up the form-to-workflow mapping
3. Call `POST http://localhost:3002/api/v1/workflows/start` with:

```json
{
  "workflowId": "<workflow-key-from-mapping>",
  "refId": "<submission-id>",
  "context": {
    // ... all form data as key-value pairs
  }
}
```

### Step 5: Build Your Frontend

Your frontend needs to:

1. **Fetch available form templates** — call your Forms API for mappings
2. **Render forms dynamically** — use JSON Forms with the schema from the form definition
3. **Submit to your Forms API** — which triggers the workflow
4. **Show history** — query `GET /api/v1/workflows/instances?createdBy=<user>` on the engine

See the `request-form-demo` project for a complete reference implementation.

**Minimal form rendering example:**

```tsx
import { JsonForms } from "@jsonforms/react";
import {
  materialRenderers,
  materialCells,
} from "@jsonforms/material-renderers";

function DynamicForm({ schema, uiSchema, onSubmit }) {
  const [data, setData] = useState({});

  return (
    <>
      <JsonForms
        schema={schema}
        uischema={uiSchema}
        data={data}
        renderers={materialRenderers}
        cells={materialCells}
        onChange={({ data }) => setData(data)}
      />
      <button onClick={() => onSubmit(data)}>Submit</button>
    </>
  );
}
```

---

## Approach 2: Engine-Only Integration

Use the workflow engine as a standalone microservice. You manage your own forms and UI — the engine just handles workflow execution.

### What You Call

**Start a workflow:**
```bash
POST http://localhost:3002/api/v1/workflows/start
Content-Type: application/json
x-user-id: user@example.com

{
  "workflowId": "approval_flow_v1",
  "refId": "REQUEST-001",
  "context": {
    "applicantName": "John Doe",
    "amount": 5000,
    "department": "Engineering"
  }
}
```

**Check instance status:**
```bash
GET http://localhost:3002/api/v1/workflows/instances?createdBy=user@example.com
```

**Get instance details:**
```bash
GET http://localhost:3002/api/v1/workflows/instances/<instance-id>
```

**List pending tasks (for an approver):**
```bash
GET http://localhost:3002/api/v1/tasks?status=pending
x-role-id: manager
```

**Complete a task:**
```bash
POST http://localhost:3002/api/v1/tasks/<task-id>/complete
Content-Type: application/json

{
  "instanceId": "<instance-id>",
  "isApproved": true,
  "remark": "Looks good, approved."
}
```

### Creating Workflow Definitions

You can create workflow definitions programmatically:

```bash
POST http://localhost:3002/api/v1/workflows
Content-Type: application/json

{
  "key": "expense_approval",
  "name": "Expense Approval",
  "nodes": [
    { "key": "start", "type": "start" },
    {
      "key": "manager_review",
      "type": "task",
      "config": {
        "type": "assignment",
        "payload": { "type": "role", "roles": ["manager"] }
      }
    },
    { "key": "check", "type": "decision" },
    { "key": "approved_end", "type": "end" },
    { "key": "rejected_end", "type": "end" }
  ],
  "transitions": [
    { "from": "start", "to": "manager_review" },
    { "from": "manager_review", "to": "check" },
    {
      "from": "check", "to": "approved_end",
      "condition": { "type": "jexl", "expression": "context.variables.isApproved == true" }
    },
    {
      "from": "check", "to": "rejected_end",
      "condition": { "type": "jexl", "expression": "context.variables.isApproved == false" }
    }
  ]
}
```

Or use the admin portal's visual builder and export the JSON.

---

## Approach 3: Forms-Only Integration

Use JSON Forms to render dynamic forms in your project without the workflow engine.

### Install Dependencies

```bash
npm install @jsonforms/core @jsonforms/react @jsonforms/material-renderers
npm install @mui/material @emotion/react @emotion/styled
```

### Render a Form

```tsx
import { JsonForms } from "@jsonforms/react";
import {
  materialRenderers,
  materialCells,
} from "@jsonforms/material-renderers";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 2 },
    email: { type: "string", format: "email" },
    priority: { type: "string", enum: ["Low", "Medium", "High"] },
  },
  required: ["name", "email"],
};

const uiSchema = {
  type: "VerticalLayout",
  elements: [
    { type: "Control", scope: "#/properties/name" },
    { type: "Control", scope: "#/properties/email" },
    { type: "Control", scope: "#/properties/priority" },
  ],
};

function MyForm() {
  const [data, setData] = useState({});

  return (
    <JsonForms
      schema={schema}
      uischema={uiSchema}
      data={data}
      renderers={materialRenderers}
      cells={materialCells}
      onChange={({ data }) => setData(data)}
    />
  );
}
```

### Add Custom Renderers

Create a custom renderer by following this pattern:

**1. Create the renderer component:**
```tsx
import { withJsonFormsControlProps } from "@jsonforms/react";

const RatingControl = ({ data, handleChange, path }) => {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => handleChange(path, star)}
          style={{ cursor: "pointer", fontSize: 24 }}
        >
          {star <= (data || 0) ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
};

export default withJsonFormsControlProps(RatingControl);
```

**2. Create a tester:**
```tsx
import { rankWith, scopeEndsWith } from "@jsonforms/core";

export const ratingControlTester = rankWith(3, scopeEndsWith("rating"));
```

**3. Register the renderer:**
```tsx
const customRenderers = [
  ...materialRenderers,
  { tester: ratingControlTester, renderer: RatingControl },
];

<JsonForms renderers={customRenderers} /* ... */ />;
```

---

## Building an Approval UI

If you're using the engine, you'll likely need a task approval interface for users with specific roles. Here's the pattern:

### Fetch Pending Tasks

```tsx
// Fetch tasks assigned to the current user's role
const { data: tasks } = useQuery({
  queryKey: ["tasks", role],
  queryFn: () =>
    axios.get("/api/v1/tasks", {
      headers: { "x-role-id": role },
      params: { status: "pending" },
    }),
});
```

### Approve / Reject

```tsx
const completeMutation = useMutation({
  mutationFn: ({ taskId, instanceId, isApproved, remark }) =>
    axios.post(`/api/v1/tasks/${taskId}/complete`, {
      instanceId,
      isApproved,
      remark,
    }),
  onSuccess: () => queryClient.invalidateQueries(["tasks"]),
});
```

### Display Task Details

Each task includes:
- `nodeKey` — which workflow step
- `assignedRoleId` — who it's assigned to
- `inputs` — the data available for review
- `outputs` — the result after completion
- The parent `WorkflowInstance` with its full `variables` context

---

## Production Considerations

### Authentication & Authorization

The current system uses header-based identity (`x-user-id`, `x-role-id`). For production:

- **Add JWT/OAuth middleware** to the Hono engine
- **Validate tokens** before processing requests
- **Map authenticated users** to roles from your identity provider
- **Protect the admin portal** with role-based access (only admins should access the workflow builder)

### Scaling

| Component | Scaling Strategy |
|-----------|----------------|
| Workflow Engine | Horizontal — run multiple instances behind a load balancer |
| Workers | Horizontal — BullMQ supports multiple worker instances |
| PostgreSQL | Vertical or read replicas for heavy query loads |
| Redis | Cluster mode for high-throughput queues |
| Admin Portal | Static build → CDN |
| User Frontend | Static build → CDN |

### Replacing the Workflow Master API

The current Workflow Master (JSON Server on port 5000) is a development convenience. For production:

- Store workflow definitions in PostgreSQL alongside instances
- Or use a configuration management service
- Or keep JSON Server behind an internal network

### Monitoring & Observability

- The `WorkflowActionHistory` table provides a full audit trail
- Add structured logging (e.g., Pino) to the Hono server
- Monitor BullMQ queues with [Bull Board](https://github.com/felixmosh/bull-board) or custom dashboards
- Track SLA breach rates for process improvement

### Error Handling

- Failed service nodes record the error in `WorkflowActionHistory`
- Failed HTTP worker jobs are tracked in the `Job` model
- Consider adding BullMQ retry policies for transient failures
- Add dead-letter queues for permanently failed jobs
