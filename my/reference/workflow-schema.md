# Workflow Definition Schema

Workflow definition သည် process တစ်ခုလုံးကို ဖော်ပြသော JSON document ဖြစ်ပါသည်: step များ (node), flow (transition) နှင့် optional event handler များ။

## အဓိက ဖွဲ့စည်းပုံ

```json
{
  "key": "string (လိုအပ်)",
  "name": "string (လိုအပ်)",
  "nodes": [],
  "transitions": [],
  "events": []
}
```

| Field | Type | လိုအပ် | ဖော်ပြချက် |
|-------|------|-------|-----------|
| `key` | string | ဟုတ် | Workflow အတွက် unique identifier (API call နှင့် mapping များတွင် အသုံးပြု) |
| `name` | string | ဟုတ် | လူဖတ်ရလွယ်သော အမည် |
| `nodes` | Node[] | ဟုတ် | Node definition array |
| `transitions` | Transition[] | ဟုတ် | Node များ ချိတ်ဆက်သော transition definition array |
| `events` | EventDefinition[] | မဟုတ် | External system များ triggger နိုင်သော event handler array |

---

## Node များ

### Field အများသုံး

Node တိုင်းတွင်:

| Field | Type | လိုအပ် | ဖော်ပြချက် |
|-------|------|-------|-----------|
| `key` | string | ဟုတ် | Workflow အတွင်း unique identifier |
| `type` | NodeType | ဟုတ် | `start`, `end`, `task`, `service`, `decision`, `parallel_gateway`, `parallel_join` ထဲမှ တစ်ခု |
| `config` | NodeConfig | မဟုတ် | Type-specific configuration |

### Node အမျိုးအစားများ

#### `start`

Workflow ၏ entry point။ Workflow တိုင်းတွင် start node တစ်ခုတည်း ရှိရမည်။

```json
{ "key": "start", "type": "start" }
```

#### `end`

Completion point။ Workflow တစ်ခုတွင် end node အများ ရှိနိုင်သည် (ဥပမာ approved vs rejected outcome)။

```json
{ "key": "approved_end", "type": "end" }
```

#### `task`

လူသား action (approval, review, data entry) လိုအပ်သော step။ Engine က `Task` record ဖန်တီးပြီး API မှတစ်ဆင့် complete ဖြစ်သည်အထိ စောင့်ပါသည်။

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
                  "body": { "message": "Task overdue" }
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Assignment Type များ:**

| Type | ဖော်ပြချက် |
|------|-----------|
| `role` | သတ်မှတ်ထားသော role ရှိသူထံ assign |
| `user` | User တစ်ဦးတည်းထံ assign |
| `group` | Group တစ်ခုထံ assign |
| `dynamic` | Runtime တွင် assignment evaluate |

#### `service`

External HTTP endpoint ကို ခေါ်သော automated step။ Engine က request queue လုပ်ပြီး ချက်ချင်း ဆက်သွားပါသည် (fire-and-forget)။

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
      "body": {
        "fileName": "${context.variables.fileName}",
        "path": "${context.variables.path}"
      }
    }
  }
}
```

Service config ရှိ string value အားလုံးတွင် **JEXL template interpolation** support ပါသည်။ Expression များကို `${...}` ဖြင့် wrap ပါ။

#### `decision`

Outgoing transition များတွင် condition evaluate လုပ်ပြီး path ရွေးချယ်သော branching point။ Node ကိုယ်တိုင်တွင် configuration မရှိ — logic သည် transition များတွင် ရှိပါသည်။

```json
{ "key": "check_approval", "type": "decision" }
```

#### `parallel_gateway`

Execution ကို parallel branch အများအဖြစ် fork ခြင်း။ Branch တစ်ခုချင်းစီ သီးခြား run ပါသည်။

```json
{
  "key": "split",
  "type": "parallel_gateway",
  "branches": [
    { "key": "finance_branch", "nodes": ["finance_review"] },
    { "key": "legal_branch", "nodes": ["legal_review"] }
  ]
}
```

#### `parallel_join`

Parallel branch များ complete ဖြစ်သည်အထိ စောင့်ပြီးမှ ဆက်လက်ခြင်း။

**Join Type များ:**

| Type | ဖော်ပြချက် |
|------|-----------|
| `all` | Branch အားလုံး complete ဖြစ်သည်အထိ စောင့် (default) |
| `any` | Branch တစ်ခုခု complete ဖြစ်လျှင် ဆက်သွား |
| `majority` | ထက်ဝက်ကျော် complete ဖြစ်လျှင် ဆက်သွား |
| `n_of_m` | N ခု complete ဖြစ်လျှင် ဆက်သွား |

---

## Transition များ

Transition များသည် node များကြား flow ကို သတ်မှတ်ပါသည်။

```json
{
  "from": "string (လိုအပ်)",
  "to": "string (လိုအပ်)",
  "condition": {
    "type": "jexl",
    "expression": "string"
  }
}
```

| Field | Type | လိုအပ် | ဖော်ပြချက် |
|-------|------|-------|-----------|
| `from` | string | ဟုတ် | Source node key |
| `to` | string | ဟုတ် | Target node key |
| `condition` | Condition | မဟုတ် | ရှိပါက condition `true` ဖြစ်မှသာ transition ကို follow |

### Condition Context

Condition များကို workflow instance ၏ context object ဖြင့် evaluate လုပ်ပါသည်:

```javascript
{
  context: {
    variables: {
      // Form data + task output အားလုံး
      fileName: "data.csv",
      isApproved: true,
      amount: 5000
    }
  }
}
```

**Expression ဥပမာများ:**

| Expression | Evaluate လုပ်သည် |
|-----------|----------------|
| `context.variables.isApproved == true` | Approval စစ်ဆေးခြင်း |
| `context.variables.amount > 10000` | Threshold စစ်ဆေးခြင်း |
| `context.variables.department == "Engineering"` | String match |

---

## Event များ

External system များသည် running workflow instance များနှင့် interact လုပ်နိုင်ပါသည်။

```json
{
  "key": "payment_received",
  "payloadSchema": {
    "type": "object",
    "properties": {
      "amount": { "type": "number" }
    },
    "required": ["amount"]
  },
  "condition": "context.status == 'running'",
  "actions": [
    {
      "key": "update_payment",
      "type": "update_context",
      "payload": { "paymentAmount": "${event.amount}" }
    }
  ]
}
```

### Action Type များ

| Type | ဖော်ပြချက် | Payload |
|------|-----------|---------|
| `update_context` | Instance variable များထဲသို့ data merge | Key-value pair (JEXL template support) |
| `service` | HTTP request queue | Service node config နှင့်တူ |
| `update_stage` | Node တစ်ခုသို့ force-transition | `{ targetNode: "node_key" }` |
