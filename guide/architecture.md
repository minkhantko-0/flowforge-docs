# Architecture

## System Topology

The platform runs as a set of services that communicate over HTTP:

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER                                    │
│                                                                    │
│   ┌────────────────────────┐    ┌────────────────────────────┐   │
│   │   Admin Portal (:5174) │    │   User Portal (:5173)      │   │
│   │                        │    │   (or your own frontend)    │   │
│   │   • Form Builder       │    │                             │   │
│   │   • Workflow Builder    │    │   • Login & Auth            │   │
│   │   • Mappings Manager   │    │   • Browse Forms            │   │
│   │   • Instance Monitor   │    │   • Submit Requests         │   │
│   │   • Notifications      │    │   • View History            │   │
│   └──────────┬─────────────┘    └──────────┬──────────────────┘   │
│              │                              │                      │
└──────────────┼──────────────────────────────┼──────────────────────┘
               │                              │
       ┌───────┴───────┐              ┌───────┴───────┐
       │               │              │               │
       ▼               ▼              ▼               │
┌─────────────┐  ┌──────────────┐  ┌─────────────┐   │
│ Forms API   │  │  Workflow    │  │ Forms API   │   │
│ (:3001)     │  │  Engine      │  │ (:3001)     │   │
│             │  │  (:3002)     │  │             │   │
│ • Form CRUD │  │              │  │ • Read forms│   │
│ • Mappings  │  │ • Start      │  │ • Submit    │───┘
│ • Notifs    │  │ • Execute    │  │             │
│ • SSE       │  │ • Tasks      │  └─────────────┘
└─────────────┘  │ • SLAs       │
                 │ • Events     │
                 └──────┬───────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   ┌────────────┐ ┌──────────┐ ┌──────────────┐
   │ PostgreSQL │ │ Redis 7  │ │ Workflow     │
   │            │ │ (BullMQ) │ │ Master API   │
   │ Instances  │ │          │ │ (:5000)      │
   │ Tasks      │ │ Job      │ │              │
   │ History    │ │ Queues   │ │ Definitions  │
   │ SLAs       │ │          │ │ Roles        │
   │ Events     │ │          │ │ SLAs/Timers  │
   └────────────┘ └──────────┘ └──────────────┘
```

## Two-API Pattern

The frontends communicate with **two separate APIs**, each responsible for a different domain:

### Forms API (Port 3001)

Handles everything related to form definitions and data collection:

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/forms` | CRUD for form definitions (JSON Schema + UI Schema) |
| `POST /api/submit` | Submit form data → triggers workflow start |
| `GET /api/submissions` | List submitted form responses |
| `GET/POST /api/form-mappings` | Link forms to workflows |
| `GET /api/notifications` | Fetch notifications |
| SSE stream | Real-time notification push |

### Workflow Engine API (Port 3002)

Handles workflow execution and task management:

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/v1/workflows` | CRUD for workflow definitions |
| `POST /api/v1/workflows/start` | Start a new workflow instance |
| `GET /api/v1/workflows/instances` | List running/completed instances |
| `GET /api/v1/workflows/instances/:id` | Instance details with branches and history |
| `GET/POST /api/v1/tasks` | Task listing and completion |
| `GET /api/v1/roles` | Available roles |

## Data Flow

### Creating a Workflow (Admin)

```
Admin opens Workflow Builder
        │
        ├── Drags nodes onto canvas (Start → Task → Decision → End)
        ├── Configures each node (roles, conditions, SLAs)
        ├── Connects nodes with transitions
        │
        └── Clicks Save
                │
                ▼
        POST /api/v1/workflows
                │
                ▼
        Workflow Master API stores definition as JSON
```

### Creating a Form (Admin)

```
Admin opens Form Builder
        │
        ├── Writes JSON Schema (fields, types, validation)
        ├── Writes UI Schema (layout, custom controls)
        ├── Previews with live JSON Forms rendering
        │
        └── Clicks Save
                │
                ▼
        POST /api/forms
                │
                ▼
        Forms API stores definition in database
```

### Mapping a Form to a Workflow (Admin)

```
Admin opens Mappings page
        │
        ├── Selects a form definition (e.g., "Leave Request Form")
        ├── Selects a workflow definition (e.g., "Manager Approval Flow")
        │
        └── Clicks Create Mapping
                │
                ▼
        POST /api/form-mappings
                │
                ▼
        Forms API stores the link: formKey ↔ workflowKey
```

### Submitting a Form (User)

```
User opens form portal
        │
        ├── Fetches available form-workflow mappings
        ├── Selects a form template
        ├── Form renders from JSON Schema via JSON Forms
        ├── User fills in data
        │
        └── Clicks Submit
                │
                ▼
        POST /api/submit  →  Forms API  →  POST /api/v1/workflows/start
                                                    │
                                                    ▼
                                            Workflow Engine creates instance
                                            and starts execution
```

### Workflow Execution (Engine)

```
Engine receives start request
        │
        ├── Creates WorkflowInstance in PostgreSQL
        ├── Snapshots the full workflow definition
        ├── Begins at the "start" node
        │
        ▼
    ┌─ handleNode() router ──────────────────────────────┐
    │                                                      │
    │   start ──► advance to next node                     │
    │                                                      │
    │   task ──► create Task record                        │
    │            assign to role/user                        │
    │            set up SLA timers (BullMQ delayed jobs)    │
    │            ◄── WAIT for task completion ──►           │
    │            advance to next node                       │
    │                                                      │
    │   service ──► queue HTTP request (BullMQ)            │
    │               HTTP worker executes request            │
    │               advance to next node                    │
    │                                                      │
    │   decision ──► evaluate JEXL conditions               │
    │                follow matching transition              │
    │                                                      │
    │   parallel_gateway ──► create branch instances        │
    │                        execute all branches in parallel│
    │                                                      │
    │   parallel_join ──► check branch completion           │
    │                     merge when join condition met      │
    │                     advance to next node              │
    │                                                      │
    │   end ──► mark instance as completed                  │
    └──────────────────────────────────────────────────────┘
```

## State Management

### Server State (Workflow Engine)

All workflow state is persisted in PostgreSQL through Prisma:

| Model | Tracks |
|-------|--------|
| `WorkflowInstance` | Instance ID, status, context variables, current node, definition snapshot |
| `Task` | Assigned tasks, status, inputs/outputs, escalation chain |
| `ParallelBranchInstance` | Per-branch execution status for parallel gateways |
| `WorkflowActionHistory` | Every action taken — full audit trail |
| `SlaInstance` | SLA deadlines and breach status |
| `EventLog` | External event dispatches and processing results |

### Client State (Frontends)

Both frontends use the same pattern:

- **Zustand** for local UI state (sidebar, selected items, auth)
- **TanStack React Query** for server state (caching, auto-refresh, invalidation)

React Query keys follow a consistent pattern:
```
["form-definitions"]
["workflow-definitions"]
["workflow-instances"]              → auto-refreshes every 30s
["workflow-instance-details", id]   → auto-refreshes every 5s
["notifications"]
["mappings"]
["submissions"]
```

## Background Processing

The engine uses **BullMQ** (backed by Redis) for async job processing:

| Queue | Worker | Purpose |
|-------|--------|---------|
| `http-service-queue` | `http-worker` | Execute HTTP service node requests |
| `sla-queue` | `sla-worker` | Process SLA breaches, trigger escalation actions |
| `timer-queue` | `timer-worker` | Timer-based events (placeholder) |
| `notification-queue` | — | Notification delivery (placeholder) |

Workers run as part of the same process, started on server initialization.

## Security Considerations

- **CORS** is configured on the engine (currently allows all origins — restrict in production)
- **User identity** is passed via `x-user-id` and `x-role-id` headers (replace with proper auth in production)
- **JEXL expressions** provide safe evaluation (no access to Node.js globals, unlike raw `eval()`)
- **AJV validation** ensures event payloads match their defined JSON schemas
