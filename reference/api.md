# API Reference

Complete reference for the Workflow Engine API (port 3002).

## Base URL

```
http://localhost:3002/api/v1
```

## Authentication

Identity is passed via request headers:

| Header | Required | Description |
|--------|----------|-------------|
| `x-user-id` | No | User identifier (defaults to `default-user`) |
| `x-role-id` | No | Role identifier for task filtering |

## Response Format

All responses follow a standard envelope:

```json
{
  "timestamp": "2026-03-22T10:30:00.000Z",
  "status": 200,
  "reqId": "unique-request-id",
  "message": "Success",
  "data": { }
}
```

Error responses:
```json
{
  "timestamp": "2026-03-22T10:30:00.000Z",
  "status": 400,
  "reqId": "unique-request-id",
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid workflow definition",
    "details": [ ]
  }
}
```

---

## Workflows

### List Workflow Definitions

```http
GET /workflows
```

Returns all available workflow definitions from the Workflow Master.

**Response:**
```json
{
  "data": [
    { "key": "csv_upload_v1", "name": "CSV Upload Approval" },
    { "key": "expense_approval", "name": "Expense Approval Flow" }
  ]
}
```

### Get Workflow Definition

```http
GET /workflows/:key
```

Returns a single workflow definition by key.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | path | Workflow definition key |

**Response:**
```json
{
  "data": {
    "key": "csv_upload_v1",
    "name": "CSV Upload Approval",
    "nodes": [ ],
    "transitions": [ ],
    "events": [ ]
  }
}
```

### Create Workflow Definition

```http
POST /workflows
Content-Type: application/json
```

Creates a new workflow definition in the Workflow Master.

**Body:**
```json
{
  "key": "my_workflow",
  "name": "My Custom Workflow",
  "nodes": [
    { "key": "start", "type": "start" },
    { "key": "review", "type": "task", "config": { } },
    { "key": "end", "type": "end" }
  ],
  "transitions": [
    { "from": "start", "to": "review" },
    { "from": "review", "to": "end" }
  ]
}
```

See [Workflow Definition Schema](/reference/workflow-schema) for the full specification.

### Start Workflow Instance

```http
POST /workflows/start
Content-Type: application/json
x-user-id: user@example.com
```

Starts a new workflow instance.

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | string | Yes | Key of the workflow definition |
| `refId` | string | No | External reference ID |
| `context` | object | No | Initial variables (form data) |
| `payloadId` | string | No | Linked payload identifier |

**Example:**
```json
{
  "workflowId": "csv_upload_v1",
  "refId": "UPLOAD-001",
  "context": {
    "fileName": "data.csv",
    "path": "/uploads/data.csv",
    "uploadedBy": "user@example.com"
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid-of-instance",
    "workflowId": "csv_upload_v1",
    "status": "running",
    "variables": { "fileName": "data.csv", "path": "/uploads/data.csv" },
    "currentNode": "manager_approval",
    "refId": "UPLOAD-001",
    "createdBy": "user@example.com",
    "createdAt": "2026-03-22T10:30:00.000Z"
  }
}
```

### List Workflow Instances

```http
GET /workflows/instances
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `createdBy` | string | Filter by the user who started the instance |
| `status` | string | Filter by current node (acts as status) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "refId": "UPLOAD-001",
      "status": "running",
      "currentNode": "manager_approval",
      "variables": { },
      "createdBy": "user@example.com",
      "createdAt": "2026-03-22T10:30:00.000Z",
      "updatedAt": "2026-03-22T10:31:00.000Z"
    }
  ]
}
```

### Get Workflow Instance Details

```http
GET /workflows/instances/:instanceId
```

Returns the instance with all parallel branches and full action history.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "workflowId": "csv_upload_v1",
    "status": "running",
    "variables": { },
    "defSnapshot": { },
    "currentNode": "manager_approval",
    "createdBy": "user@example.com",
    "parallelBranches": [
      { "id": "uuid", "branchKey": "branch_a", "status": "completed" },
      { "id": "uuid", "branchKey": "branch_b", "status": "running" }
    ],
    "actionHistory": [
      {
        "id": "uuid",
        "action": "Entered node: start",
        "status": "completed",
        "performedBy": "system",
        "details": { },
        "createdAt": "2026-03-22T10:30:00.000Z"
      }
    ]
  }
}
```

### Get Instance Action History

```http
GET /workflows/instances/:instanceId/history
```

Returns the ordered action history for an instance.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "Entered node: start",
      "status": "completed",
      "performedBy": "system",
      "details": null,
      "createdAt": "2026-03-22T10:30:00.000Z",
      "completedAt": "2026-03-22T10:30:00.100Z"
    },
    {
      "id": "uuid",
      "action": "Task created: manager_approval",
      "status": "pending",
      "performedBy": "system",
      "details": { "assignedRoleId": "manager" },
      "createdAt": "2026-03-22T10:30:00.200Z",
      "completedAt": null
    }
  ]
}
```

---

## Tasks

### List Tasks

```http
GET /tasks
x-role-id: manager
x-user-id: user@example.com
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `pending` | Task status filter |
| `page` | number | `1` | Page number |
| `pageSize` | number | `10` | Items per page |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nodeKey": "manager_approval",
      "status": "pending",
      "assignedRoleId": "manager",
      "assignedUserId": null,
      "inputs": { },
      "outputs": null,
      "workflowInstance": {
        "id": "uuid",
        "workflowId": "csv_upload_v1",
        "refId": "UPLOAD-001",
        "variables": { "fileName": "data.csv" }
      },
      "createdAt": "2026-03-22T10:30:00.000Z"
    }
  ]
}
```

### Complete Task

```http
POST /tasks/:taskId/complete
Content-Type: application/json
```

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instanceId` | string | Yes | Workflow instance ID |
| `isApproved` | boolean | Yes | Whether the task was approved |
| `remark` | string | Yes | Approver's comment |

**Example:**
```json
{
  "instanceId": "uuid-of-instance",
  "isApproved": true,
  "remark": "File looks correct, approved for processing."
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "status": "completed",
    "outputs": {
      "isApproved": true,
      "remark": "File looks correct, approved for processing."
    }
  }
}
```

After completion, the engine automatically progresses the workflow to the next node.

---

## Roles

### List Roles

```http
GET /roles
```

**Response:**
```json
{
  "data": [
    { "id": "manager", "key": "manager", "name": "Manager" },
    { "id": "senior_manager", "key": "senior_manager", "name": "Senior Manager" }
  ]
}
```

---

## SLAs

### List SLA Definitions

```http
GET /slas
```

### Create SLA Definition

```http
POST /slas
Content-Type: application/json
```

---

## Timers

### List Timer Definitions

```http
GET /timers
```

### Create Timer Definition

```http
POST /timers
Content-Type: application/json
```
