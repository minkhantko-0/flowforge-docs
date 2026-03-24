# API အညွှန်း

Workflow Engine API (port 3002) အတွက် အပြည့်အစုံ reference။

## Base URL

```
http://localhost:3002/api/v1
```

## Authentication

Identity ကို request header မှတစ်ဆင့် ပို့ပါသည်:

| Header | လိုအပ် | ဖော်ပြချက် |
|--------|-------|-----------|
| `x-user-id` | မဟုတ် | User identifier (`default-user` default) |
| `x-role-id` | မဟုတ် | Task filter အတွက် role identifier |

## Response Format

Response အားလုံး standard envelope ပုံစံကို လိုက်နာပါသည်:

```json
{
  "timestamp": "2026-03-22T10:30:00.000Z",
  "status": 200,
  "reqId": "unique-request-id",
  "message": "Success",
  "data": { }
}
```

Error response:
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

## Workflow များ

### Workflow Definition စာရင်း

```http
GET /workflows
```

Workflow Master မှ ရရှိနိုင်သော workflow definition အားလုံး return ပြန်ပါသည်။

### Workflow Definition တစ်ခု ရယူခြင်း

```http
GET /workflows/:key
```

Key ဖြင့် workflow definition တစ်ခုတည်း return ပြန်ပါသည်။

### Workflow Definition ဖန်တီးခြင်း

```http
POST /workflows
Content-Type: application/json
```

Workflow Master ထဲတွင် workflow definition အသစ် ဖန်တီးပါသည်။ [Workflow Definition Schema](/my/reference/workflow-schema) တွင် specification အပြည့်အစုံ ကြည့်ပါ။

### Workflow Instance စတင်ခြင်း

```http
POST /workflows/start
Content-Type: application/json
x-user-id: user@example.com
```

Workflow instance အသစ် စတင်ပါသည်။

**Body:**
| Field | Type | လိုအပ် | ဖော်ပြချက် |
|-------|------|-------|-----------|
| `workflowId` | string | ဟုတ် | Workflow definition ၏ key |
| `refId` | string | မဟုတ် | External reference ID |
| `context` | object | မဟုတ် | Initial variable များ (form data) |
| `payloadId` | string | မဟုတ် | Linked payload identifier |

**ဥပမာ:**
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

### Workflow Instance စာရင်း

```http
GET /workflows/instances
```

**Query Parameter များ:**
| Parameter | Type | ဖော်ပြချက် |
|-----------|------|-----------|
| `createdBy` | string | Instance စတင်သူ user ဖြင့် filter |
| `status` | string | Current node ဖြင့် filter |

### Workflow Instance အသေးစိတ်

```http
GET /workflows/instances/:instanceId
```

Parallel branch အားလုံးနှင့် action history အပြည့်အစုံ ပါဝင်သော instance return ပြန်ပါသည်။

### Instance Action History

```http
GET /workflows/instances/:instanceId/history
```

Instance တစ်ခုအတွက် စီထားသော action history return ပြန်ပါသည်။

---

## Task များ

### Task စာရင်း

```http
GET /tasks
x-role-id: manager
x-user-id: user@example.com
```

**Query Parameter များ:**
| Parameter | Type | Default | ဖော်ပြချက် |
|-----------|------|---------|-----------|
| `status` | string | `pending` | Task status filter |
| `page` | number | `1` | Page number |
| `pageSize` | number | `10` | Page တစ်ခုရှိ item အရေအတွက် |

### Task Complete လုပ်ခြင်း

```http
POST /tasks/:taskId/complete
Content-Type: application/json
```

**Body:**
| Field | Type | လိုအပ် | ဖော်ပြချက် |
|-------|------|-------|-----------|
| `instanceId` | string | ဟုတ် | Workflow instance ID |
| `isApproved` | boolean | ဟုတ် | Task approve ဖြစ်/မဖြစ် |
| `remark` | string | ဟုတ် | Approver ၏ comment |

**ဥပမာ:**
```json
{
  "instanceId": "uuid-of-instance",
  "isApproved": true,
  "remark": "File မှန်ကန်ပါသည်, processing အတွက် approve လုပ်ပါသည်။"
}
```

Complete ဖြစ်ပြီးနောက် engine သည် workflow ကို နောက် node သို့ အလိုအလျောက် ဆက်လက် ဆောင်ရွက်ပါသည်။

---

## Role များ

### Role စာရင်း

```http
GET /roles
```

---

## SLA များ

### SLA Definition စာရင်း

```http
GET /slas
```

### SLA Definition ဖန်တီးခြင်း

```http
POST /slas
Content-Type: application/json
```

---

## Timer များ

### Timer Definition စာရင်း

```http
GET /timers
```

### Timer Definition ဖန်တီးခြင်း

```http
POST /timers
Content-Type: application/json
```
