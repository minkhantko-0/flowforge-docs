# Workflow Definition Schema

A workflow definition is a JSON document that describes the complete process: its steps (nodes), the flow between them (transitions), and optional event handlers. This page documents every field.

## Top-Level Structure

```json
{
  "key": "string (required)",
  "name": "string (required)",
  "nodes": [],
  "transitions": [],
  "events": []
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Unique identifier for this workflow (used in API calls and mappings) |
| `name` | string | Yes | Human-readable name |
| `nodes` | Node[] | Yes | Array of node definitions |
| `transitions` | Transition[] | Yes | Array of transition definitions connecting nodes |
| `events` | EventDefinition[] | No | Array of event handlers that external systems can trigger |

---

## Nodes

### Common Fields

Every node has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Unique identifier within this workflow |
| `type` | NodeType | Yes | One of: `start`, `end`, `task`, `service`, `decision`, `parallel_gateway`, `parallel_join` |
| `config` | NodeConfig | No | Type-specific configuration |

### Node Types

#### `start`

Entry point of the workflow. Every workflow must have exactly one.

```json
{ "key": "start", "type": "start" }
```

#### `end`

Completion point. A workflow can have multiple end nodes (e.g., approved vs. rejected outcomes).

```json
{ "key": "approved_end", "type": "end" }
```

#### `task`

A step that requires human action (approval, review, data entry). The engine creates a `Task` record and waits for it to be completed via the API.

```json
{
  "key": "manager_approval",
  "type": "task",
  "config": {
    "type": "assignment",
    "payload": {
      "type": "role",
      "roles": ["manager"]
    },
    "slas": [
      {
        "key": "approval_sla",
        "facts": [
          {
            "level": 1,
            "targetDuration": "5m",
            "actions": [
              {
                "type": "service",
                "config": {
                  "type": "http",
                  "method": "POST",
                  "url": "http://notify-service/alert",
                  "body": { "message": "Task overdue for ${context.variables.refId}" }
                }
              }
            ]
          },
          {
            "level": 2,
            "targetDuration": "15m",
            "actions": [
              {
                "type": "escalate",
                "config": { "roles": ["senior_manager"] }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Assignment Config:**

| Field | Type | Description |
|-------|------|-------------|
| `config.type` | `"assignment"` | Must be `"assignment"` for task nodes |
| `config.payload.type` | AssignmentType | How the task is assigned |
| `config.payload.roles` | string[] | Role keys (when type is `role`) |
| `config.payload.userId` | string | User ID (when type is `user`) |
| `config.payload.groupId` | string | Group ID (when type is `group`) |
| `config.slas` | SlaDefinition[] | Optional SLA rules |

**Assignment Types:**

| Type | Description |
|------|-------------|
| `role` | Assign to anyone with the specified role(s) |
| `user` | Assign to a specific user |
| `group` | Assign to a group |
| `dynamic` | Evaluate assignment at runtime |

**SLA Definition:**

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | SLA identifier |
| `facts` | SlaFact[] | Escalation levels (executed in order of `level`) |

**SLA Fact (escalation level):**

| Field | Type | Description |
|-------|------|-------------|
| `level` | number | Escalation priority (1 = first, 2 = second, etc.) |
| `targetDuration` | string | Time before escalation (e.g., `"5m"`, `"1h"`, `"0.5d"`) |
| `actions` | EscalationAction[] | What to do when breached |

**Escalation Actions:**

| Type | Description | Config |
|------|-------------|--------|
| `service` | Call an HTTP endpoint | `{ type: "http", method, url, body }` |
| `escalate` | Reassign task to a higher role | `{ roles: ["senior_manager"] }` |
| `mutation` | Force-transition to another node | `{ targetNode: "end" }` |

#### `service`

An automated step that calls an external HTTP endpoint. The engine queues the request and advances immediately (fire-and-forget).

```json
{
  "key": "process_file",
  "type": "service",
  "config": {
    "type": "service",
    "payload": {
      "type": "http",
      "method": "POST",
      "url": "http://file-processor/api/process",
      "headers": {
        "Authorization": "Bearer ${context.variables.token}"
      },
      "body": {
        "fileName": "${context.variables.fileName}",
        "path": "${context.variables.path}"
      }
    }
  }
}
```

**Service Config:**

| Field | Type | Description |
|-------|------|-------------|
| `config.type` | `"service"` | Must be `"service"` |
| `config.payload.type` | `"http"` | Service type (currently only HTTP) |
| `config.payload.method` | string | HTTP method: GET, POST, PUT, DELETE |
| `config.payload.url` | string | Target URL (supports JEXL templates) |
| `config.payload.headers` | object | Request headers (supports JEXL templates) |
| `config.payload.body` | object | Request body (supports JEXL templates) |

All string values in the service config support **JEXL template interpolation**. Wrap expressions in `${...}`:
```
"${context.variables.amount}"        → evaluates to the actual value
"File: ${context.variables.fileName}" → string interpolation
```

#### `decision`

A branching point that evaluates conditions on outgoing transitions to determine which path to follow. The node itself has no configuration — the logic is in the transitions.

```json
{ "key": "check_approval", "type": "decision" }
```

Combined with transitions:
```json
[
  {
    "from": "check_approval",
    "to": "process_file",
    "condition": {
      "type": "jexl",
      "expression": "context.variables.isApproved == true"
    }
  },
  {
    "from": "check_approval",
    "to": "rejected_end",
    "condition": {
      "type": "jexl",
      "expression": "context.variables.isApproved == false"
    }
  }
]
```

#### `parallel_gateway`

Forks execution into multiple parallel branches. Each branch runs independently.

```json
{
  "key": "split",
  "type": "parallel_gateway",
  "branches": [
    {
      "key": "finance_branch",
      "nodes": ["finance_review", "finance_approval"]
    },
    {
      "key": "legal_branch",
      "nodes": ["legal_review", "legal_approval"]
    }
  ]
}
```

**Branch Config:**

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique branch identifier |
| `nodes` | string[] | Ordered list of node keys to execute in this branch |

Each node referenced in a branch must be defined in the top-level `nodes` array.

#### `parallel_join`

Waits for parallel branches to complete before continuing. Must be connected after the branches that started from a `parallel_gateway`.

```json
{
  "key": "merge",
  "type": "parallel_join",
  "config": {
    "joinType": "all"
  }
}
```

**Join Types:**

| Type | Description |
|------|-------------|
| `all` | Wait for every branch to complete (default) |
| `any` | Continue as soon as any single branch completes |
| `majority` | Continue when more than half of the branches complete |
| `n_of_m` | Continue when N specific branches complete |

---

## Transitions

Transitions define the flow between nodes.

```json
{
  "from": "string (required)",
  "to": "string (required)",
  "condition": {
    "type": "jexl",
    "expression": "string"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Source node key |
| `to` | string | Yes | Target node key |
| `condition` | Condition | No | When present, this transition is only followed if the condition evaluates to `true` |

### Condition Object

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"jexl"` | Expression language (currently only JEXL) |
| `expression` | string | JEXL expression evaluated against the instance context |

### Condition Context

Conditions are evaluated against the workflow instance's context object:

```javascript
{
  context: {
    variables: {
      // All form data + task outputs
      fileName: "data.csv",
      isApproved: true,
      remark: "Approved",
      amount: 5000
    }
  }
}
```

**Example expressions:**

| Expression | Evaluates |
|-----------|-----------|
| `context.variables.isApproved == true` | Approval check |
| `context.variables.amount > 10000` | Threshold check |
| `context.variables.department == "Engineering"` | String match |
| `context.variables.items\|length > 0` | Array length check |

---

## Events

Events allow external systems to interact with running workflow instances.

```json
{
  "key": "payment_received",
  "payloadSchema": {
    "type": "object",
    "properties": {
      "amount": { "type": "number" },
      "currency": { "type": "string" }
    },
    "required": ["amount"]
  },
  "condition": "context.status == 'running'",
  "actions": [
    {
      "key": "update_payment",
      "type": "update_context",
      "payload": {
        "paymentAmount": "${event.amount}",
        "paymentCurrency": "${event.currency}"
      }
    },
    {
      "key": "notify_finance",
      "type": "service",
      "payload": {
        "type": "http",
        "method": "POST",
        "url": "http://finance-api/notify",
        "body": { "amount": "${event.amount}" }
      }
    }
  ]
}
```

### EventDefinition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Event identifier (used in dispatch API call) |
| `payloadSchema` | JSON Schema | No | Validates the incoming event payload |
| `condition` | string or Condition | No | Only process if this JEXL condition is true |
| `actions` | EventAction[] | Yes | Actions to execute when the event fires |

### EventAction

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | No | Action identifier (for logging) |
| `type` | ActionType | Yes | `update_context`, `service`, or `update_stage` |
| `payload` | object | Yes | Type-specific payload |
| `condition` | string or Condition | No | Only execute if this JEXL condition is true |

**Action Types:**

| Type | Description | Payload |
|------|-------------|---------|
| `update_context` | Merge data into instance variables | Key-value pairs (supports JEXL templates) |
| `service` | Queue an HTTP request | Same as service node config |
| `update_stage` | Force-transition to a specific node | `{ targetNode: "node_key" }` |

---

## Complete Example

```json
{
  "key": "document_approval_v1",
  "name": "Document Approval Workflow",
  "nodes": [
    { "key": "start", "type": "start" },
    {
      "key": "manager_review",
      "type": "task",
      "config": {
        "type": "assignment",
        "payload": { "type": "role", "roles": ["manager"] },
        "slas": [
          {
            "key": "review_sla",
            "facts": [
              {
                "level": 1,
                "targetDuration": "10m",
                "actions": [
                  {
                    "type": "service",
                    "config": {
                      "type": "http",
                      "method": "POST",
                      "url": "http://notify/api/remind",
                      "body": { "task": "manager_review", "ref": "${context.variables.refId}" }
                    }
                  }
                ]
              },
              {
                "level": 2,
                "targetDuration": "30m",
                "actions": [
                  { "type": "escalate", "config": { "roles": ["senior_manager"] } }
                ]
              }
            ]
          }
        ]
      }
    },
    { "key": "check_result", "type": "decision" },
    {
      "key": "parallel_reviews",
      "type": "parallel_gateway",
      "branches": [
        { "key": "legal", "nodes": ["legal_review"] },
        { "key": "compliance", "nodes": ["compliance_review"] }
      ]
    },
    {
      "key": "legal_review",
      "type": "task",
      "config": {
        "type": "assignment",
        "payload": { "type": "role", "roles": ["legal"] }
      }
    },
    {
      "key": "compliance_review",
      "type": "task",
      "config": {
        "type": "assignment",
        "payload": { "type": "role", "roles": ["compliance"] }
      }
    },
    {
      "key": "merge_reviews",
      "type": "parallel_join",
      "config": { "joinType": "all" }
    },
    {
      "key": "publish",
      "type": "service",
      "config": {
        "type": "service",
        "payload": {
          "type": "http",
          "method": "POST",
          "url": "http://doc-service/publish",
          "body": { "documentId": "${context.variables.documentId}" }
        }
      }
    },
    { "key": "approved_end", "type": "end" },
    { "key": "rejected_end", "type": "end" }
  ],
  "transitions": [
    { "from": "start", "to": "manager_review" },
    { "from": "manager_review", "to": "check_result" },
    {
      "from": "check_result",
      "to": "parallel_reviews",
      "condition": { "type": "jexl", "expression": "context.variables.isApproved == true" }
    },
    {
      "from": "check_result",
      "to": "rejected_end",
      "condition": { "type": "jexl", "expression": "context.variables.isApproved == false" }
    },
    { "from": "legal_review", "to": "merge_reviews" },
    { "from": "compliance_review", "to": "merge_reviews" },
    { "from": "merge_reviews", "to": "publish" },
    { "from": "publish", "to": "approved_end" }
  ],
  "events": [
    {
      "key": "external_cancel",
      "payloadSchema": {
        "type": "object",
        "properties": { "reason": { "type": "string" } },
        "required": ["reason"]
      },
      "actions": [
        {
          "key": "record_cancellation",
          "type": "update_context",
          "payload": { "cancellationReason": "${event.reason}" }
        },
        {
          "key": "force_end",
          "type": "update_stage",
          "payload": { "targetNode": "rejected_end" }
        }
      ]
    }
  ]
}
```
