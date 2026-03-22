# Workflow Engine

The workflow engine (`poc-workflow-engine`) is a Hono-based Node.js backend that executes workflow definitions, manages tasks, monitors SLAs, and processes events. It is the core runtime of the platform.

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Web Framework | Hono (Node.js adapter) | 4.11 |
| Database | PostgreSQL via Prisma | 7.1 |
| Job Queue | BullMQ | 5.66 |
| Cache / Queue Backend | IORedis | 5.8 |
| Expression Engine | JEXL | 2.3 |
| JSON Validation | AJV | 8.18 |
| HTTP Client | Axios | 1.13 |
| Language | TypeScript | 5.8 |

## How the Engine Works

### Starting a Workflow

When a form is submitted (or any client calls `POST /api/v1/workflows/start`), the engine:

1. **Fetches the workflow definition** from the Workflow Master API by key
2. **Creates a `WorkflowInstance`** record in PostgreSQL with:
   - Status: `running`
   - Variables: the submitted form data (context)
   - `defSnapshot`: a full copy of the workflow definition (immutable)
   - `currentNode`: set to the start node
3. **Finds the start node** and begins execution via `handleNode()`

### Node Processing

The `handleNode()` method is the central router. It receives an instance ID, a node key, and the workflow definition, then dispatches to the appropriate handler:

#### Start Node
- Records an action in `WorkflowActionHistory`
- Finds the outgoing transition
- Calls `handleNode()` on the next node

#### Task Node
- **Creates a `Task` record** with status `pending`
- **Assigns the task** based on configuration:
  - `role` — assigns to a role (e.g., `manager`)
  - `user` — assigns to a specific user
  - `group` — assigns to a group
- **Sets up SLAs** if defined:
  - For each SLA fact (level), creates a BullMQ delayed job
  - The job fires after `targetDuration` and triggers escalation actions
- **Waits** — the engine stops here until the task is completed via `POST /api/v1/tasks/:id/complete`

#### Task Completion Flow

When a task is completed:
1. Task `status` is updated to `completed`
2. Task `outputs` are stored (`{ isApproved, remark }`)
3. Instance `variables` are updated with the task outputs
4. `dispatchWorkflow()` is called to continue execution from the next node

#### Service Node
- **Queues an HTTP request** on the `http-service-queue` (BullMQ)
- The request details are built from the node's config:
  - Method, URL, headers, body
  - JEXL template interpolation (e.g., `${context.variables.fileName}` is evaluated)
- Records the action with status `pending`
- **Advances immediately** to the next node (fire-and-forget)

The `http-worker` picks up the job, executes the HTTP request via Axios, and updates the action history to `completed` or `failed`.

#### Decision Node
- Evaluates **JEXL conditions** on each outgoing transition
- The first transition whose condition evaluates to `true` is followed
- Conditions have access to the full instance context:
  ```
  context.variables.isApproved == true
  context.variables.amount > 10000
  ```
- Calls `handleNode()` on the chosen next node

#### Parallel Gateway
- Reads the `branches` configuration in the node definition
- **Creates a `ParallelBranchInstance`** record per branch (status: `running`)
- **Executes all branches concurrently** — each branch starts at its first node
- Each branch runs independently through its own node sequence

#### Parallel Join
- Checks the status of all `ParallelBranchInstance` records for this gateway
- Evaluates the **join condition**:
  - `all` — all branches must be completed
  - `any` — at least one branch completed
  - `majority` — more than half completed
  - `n_of_m` — N specific branches completed
- If the condition is met, marks remaining branches as complete and advances
- If not, waits (subsequent branch completions will re-check the join)

#### End Node
- Updates the instance status to `completed`
- Records the final action in history

### Expression Evaluation (JEXL)

[JEXL](https://github.com/TomFrost/Jexl) is used throughout the engine for safe expression evaluation. Unlike `eval()`, JEXL:
- Cannot access Node.js globals
- Cannot execute arbitrary code
- Operates on a sandboxed context object

**Where JEXL is used:**

| Location | Example |
|----------|---------|
| Decision node transitions | `context.variables.isApproved == true` |
| Event conditions | `context.status == 'running'` |
| Service node body templates | `${context.variables.fileName}` |
| Event action conditions | `context.variables.amount > 1000` |

**Template interpolation** (`evalTemplate`) recursively evaluates `${...}` expressions within strings, objects, and arrays:

```javascript
// Input
{ "file": "${context.variables.path}", "count": "${context.variables.items|length}" }

// Evaluated (given context.variables = { path: "/uploads/test.csv", items: [1, 2, 3] })
{ "file": "/uploads/test.csv", "count": 3 }
```

### SLA Monitoring and Escalation

SLAs are defined per-task with multi-level escalation:

```
Task created
    │
    ├── Level 1 SLA (e.g., 5 minutes)
    │       │
    │       └── BullMQ delayed job fires
    │               │
    │               ├── Check: is task still pending?
    │               │   ├── No → skip (already completed)
    │               │   └── Yes → execute escalation actions:
    │               │       ├── service  → queue HTTP request (e.g., send notification)
    │               │       ├── escalate → create new task for senior role
    │               │       └── mutation → force transition to another node
    │               │
    │               └── Mark SlaInstance as "breached"
    │
    ├── Level 2 SLA (e.g., 15 minutes)
    │       └── (same flow, higher severity)
    │
    └── Level 3 SLA (e.g., 30 minutes)
            └── (e.g., force-end the workflow)
```

The `sla-worker` processes breach events from the `sla-queue` and executes the configured actions.

### Event Dispatch System

External systems can send events to running workflow instances:

```
POST /api/v1/workflows/instances/:id/dispatch
{
  "event": "payment_received",
  "payload": { "amount": 500, "currency": "USD" }
}
```

**Processing flow:**
1. Validate the event key exists in the workflow definition's `events[]`
2. Validate the payload against the event's `payloadSchema` (AJV)
3. Evaluate the event-level `condition` (JEXL)
4. For each action in the event:
   - Evaluate action-level condition
   - Execute the action:
     - `update_context` — merge data into instance variables
     - `service` — queue an HTTP request
     - `update_stage` — force-transition to a specific node
5. Record everything in `EventLog` and `EventActionLog`

## Database Schema

### Core Models

#### WorkflowInstance
```
id              String    @id @default(uuid())
workflowId      String    — reference to workflow definition key
status          Enum      — running | completed | failed | cancelled
variables       Json      — mutable context (form data + task outputs)
defSnapshot     Json      — immutable copy of workflow definition
currentNode     String?   — key of the node currently being processed
refId           String?   — external reference ID (e.g., form submission ID)
createdBy       String?   — user who started the workflow
createdAt       DateTime
updatedAt       DateTime
```

#### Task
```
id                  String    @id @default(uuid())
instanceId          String    → WorkflowInstance
nodeKey             String    — which node created this task
status              Enum      — pending | assigned | completed | failed | escalated
assignedUserId      String?
assignedRoleId      String?
inputs              Json?     — data passed to the task
outputs             Json?     — result data (isApproved, remark)
escalatedFromTaskId String?   → Task (self-relation for escalation chains)
```

#### WorkflowActionHistory
```
id                  String    @id @default(uuid())
workflowInstanceId  String    → WorkflowInstance
action              String    — description of what happened
performedBy         String?   — who/what performed it
details             Json?     — additional context
status              String    — pending | completed | failed | sla-breached | processing
createdAt           DateTime
completedAt         DateTime?
```

### Supporting Models

| Model | Purpose |
|-------|---------|
| `ParallelBranchInstance` | Tracks each branch's status in a parallel gateway |
| `SlaInstance` | SLA deadline tracking per task (active, breached, paused, completed) |
| `TimerInstance` | Timer event tracking (active, triggered, paused, cancelled) |
| `EventLog` | Records event dispatches and their processing status |
| `EventActionLog` | Records individual event action executions |
| `Job` | Background job tracking |

## Background Workers

### HTTP Worker
- **Queue:** `http-service-queue`
- **Job data:** `{ url, method, headers, body, actionId }`
- **Process:** Execute HTTP request with Axios
- **On success:** Update `WorkflowActionHistory` to `completed`
- **On failure:** Update to `failed`

### SLA Worker
- **Queue:** `sla-queue`
- **Job data:** `{ slaInstanceId, level }`
- **Process:**
  1. Check if the task is still pending
  2. Load the SLA fact for the given level
  3. Execute escalation actions (service call, task reassign, or forced transition)
  4. Update `SlaInstance` status to `breached`
  5. Record in `WorkflowActionHistory`

### Timer Worker
- **Queue:** `timer-queue`
- Placeholder implementation — ready for timer trigger logic

## Middleware

The engine uses a single service middleware that initializes and injects all dependencies into the Hono request context:

```
Request → serviceMiddleware → Route Handler
                │
                ├── redis (IORedis client)
                ├── prisma (PrismaClient)
                ├── workflowMasterService
                ├── workflowEngineService
                ├── taskService
                └── workflowMasterApi (Axios instance)
```

All services are accessible via `c.get("serviceName")` in route handlers.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | `password` | Redis password |
| `WORKFLOW_MASTER_API_URL` | `http://localhost:5000` | Workflow definitions storage API |
