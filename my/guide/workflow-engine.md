# Workflow Engine

> **Repository:** [github.com/mmhkbz/poc-workflow-engine](https://github.com/mmhkbz/poc-workflow-engine)

Workflow engine (`poc-workflow-engine`) သည် workflow definition များ execute လုပ်ခြင်း, task များ စီမံခြင်း, SLA စောင့်ကြည့်ခြင်းနှင့် event များ process လုပ်ခြင်းတို့ ပြုလုပ်သော Hono-based Node.js backend ဖြစ်ပါသည်။ ဤသည်မှာ platform ၏ core runtime ဖြစ်ပါသည်။

## Tech Stack

| အမျိုးအစား | နည်းပညာ | Version |
|-----------|---------|---------|
| Web Framework | Hono (Node.js adapter) | 4.11 |
| Database | PostgreSQL via Prisma | 7.1 |
| Job Queue | BullMQ | 5.66 |
| Cache / Queue Backend | IORedis | 5.8 |
| Expression Engine | JEXL | 2.3 |
| JSON Validation | AJV | 8.18 |
| HTTP Client | Axios | 1.13 |
| Language | TypeScript | 5.8 |

## Engine ဘယ်လို အလုပ်လုပ်သလဲ

### Workflow စတင်ခြင်း

Form submit လုပ်လိုက်သောအခါ (သို့မဟုတ် client တစ်ခုခုက `POST /api/v1/workflows/start` ခေါ်သောအခါ) engine သည်:

1. Workflow Master API မှ key ဖြင့် **workflow definition ယူပါသည်**
2. PostgreSQL ထဲတွင် **`WorkflowInstance` record ဖန်တီးပါသည်**:
   - Status: `running`
   - Variables: submit ထားသော form data (context)
   - `defSnapshot`: workflow definition ၏ full copy (ပြောင်းလဲ၍မရ)
   - `currentNode`: start node သို့ set လုပ်ထားသည်
3. **Start node ကို ရှာ**ပြီး `handleNode()` မှတစ်ဆင့် execution စတင်ပါသည်

### Node Processing

`handleNode()` method သည် central router ဖြစ်ပါသည်။ Instance ID, node key နှင့် workflow definition ကို လက်ခံပြီး သင့်လျော်သော handler သို့ dispatch လုပ်ပါသည်:

#### Start Node
- `WorkflowActionHistory` ထဲတွင် action record လုပ်ပါသည်
- Outgoing transition ကို ရှာပါသည်
- နောက် node ပေါ်တွင် `handleNode()` ခေါ်ပါသည်

#### Task Node
- Status `pending` ဖြင့် **`Task` record ဖန်တီး**ပါသည်
- Configuration အရ **task assign** လုပ်ပါသည်:
  - `role` — role တစ်ခုသို့ assign (ဥပမာ `manager`)
  - `user` — user တစ်ဦးတည်းသို့ assign
  - `group` — group တစ်ခုသို့ assign
- သတ်မှတ်ထားပါက **SLA များ set up** လုပ်ပါသည်:
  - SLA fact (level) တစ်ခုချင်းစီအတွက် BullMQ delayed job ဖန်တီးပါသည်
  - Job သည် `targetDuration` ပြီးနောက် fire ဖြစ်ပြီး escalation action များ trigger လုပ်ပါသည်
- **စောင့်ပါသည်** — `POST /api/v1/tasks/:id/complete` မှတစ်ဆင့် task complete ဖြစ်သည်အထိ engine ဤနေရာတွင် ရပ်ပါသည်

#### Task Completion Flow

Task complete ဖြစ်သောအခါ:
1. Task `status` ကို `completed` သို့ update လုပ်ပါသည်
2. Task `outputs` သိမ်းဆည်းပါသည် (`{ isApproved, remark }`)
3. Task output များဖြင့် instance `variables` update လုပ်ပါသည်
4. နောက် node မှ execution ဆက်လက်ရန် `dispatchWorkflow()` ခေါ်ပါသည်

#### Service Node
- `http-service-queue` (BullMQ) ပေါ်တွင် **HTTP request queue** လုပ်ပါသည်
- Node ၏ config မှ request detail များ တည်ဆောက်ပါသည်:
  - Method, URL, header, body
  - JEXL template interpolation (ဥပမာ `${context.variables.fileName}` ကို evaluate လုပ်ပါသည်)
- Status `pending` ဖြင့် action record လုပ်ပါသည်
- **ချက်ချင်း နောက် node သို့ ဆက်သွား**ပါသည် (fire-and-forget)

`http-worker` က job ကို pick up လုပ်ပြီး Axios ဖြင့် HTTP request execute လုပ်ကာ action history ကို `completed` သို့မဟုတ် `failed` သို့ update လုပ်ပါသည်။

#### Decision Node
- Outgoing transition တစ်ခုချင်းစီတွင် **JEXL condition များ evaluate** လုပ်ပါသည်
- Condition `true` ဖြစ်သော ပထမ transition ကို follow လုပ်ပါသည်
- Condition များသည် instance context အပြည့်အစုံကို access လုပ်နိုင်ပါသည်:
  ```
  context.variables.isApproved == true
  context.variables.amount > 10000
  ```

#### Parallel Gateway
- Node definition ထဲရှိ `branches` configuration ကို ဖတ်ပါသည်
- Branch တစ်ခုချင်းစီအတွက် **`ParallelBranchInstance` record ဖန်တီး**ပါသည် (status: `running`)
- **Branch အားလုံးကို တစ်ပြိုင်နက် execute** လုပ်ပါသည်
- Branch တစ်ခုချင်းစီ မိမိ node sequence အတိုင်း သီးခြား run ပါသည်

#### Parallel Join
- ဤ gateway ၏ `ParallelBranchInstance` record အားလုံး၏ status ကို စစ်ဆေးပါသည်
- **Join condition** evaluate လုပ်ပါသည်:
  - `all` — branch အားလုံး complete ဖြစ်ရမည်
  - `any` — branch တစ်ခုခု complete ဖြစ်လျှင် ရပါပြီ
  - `majority` — ထက်ဝက်ကျော် complete ဖြစ်ရမည်
  - `n_of_m` — N ခု complete ဖြစ်ရမည်

#### End Node
- Instance status ကို `completed` သို့ update လုပ်ပါသည်
- History ထဲတွင် နောက်ဆုံး action record လုပ်ပါသည်

### Expression Evaluation (JEXL)

Engine တစ်လျှောက်တွင် safe expression evaluation အတွက် [JEXL](https://github.com/TomFrost/Jexl) ကို အသုံးပြုပါသည်။ `eval()` နှင့် မတူဘဲ JEXL သည်:
- Node.js global များကို access မလုပ်နိုင်ပါ
- Arbitrary code execute မလုပ်နိုင်ပါ
- Sandboxed context object ပေါ်တွင် operate လုပ်ပါသည်

**JEXL ကို ဘယ်နေရာတွေမှာ သုံးသလဲ:**

| နေရာ | ဥပမာ |
|------|------|
| Decision node transition များ | `context.variables.isApproved == true` |
| Event condition များ | `context.status == 'running'` |
| Service node body template များ | `${context.variables.fileName}` |
| Event action condition များ | `context.variables.amount > 1000` |

### SLA Monitoring နှင့် Escalation

SLA များကို multi-level escalation ဖြင့် task တစ်ခုချင်းစီတွင် သတ်မှတ်ပါသည်:

```
Task ဖန်တီးပါသည်
    │
    ├── Level 1 SLA (ဥပမာ ၅ မိနစ်)
    │       │
    │       └── BullMQ delayed job fire ဖြစ်ပါသည်
    │               │
    │               ├── စစ်ဆေး: task pending ဖြစ်နေသေးသလား?
    │               │   ├── မဟုတ် → ကျော်ပါ (complete ဖြစ်ပြီ)
    │               │   └── ဟုတ် → escalation action များ execute:
    │               │       ├── service → HTTP request queue (notification ပို့)
    │               │       ├── escalate → senior role ထံ task အသစ် assign
    │               │       └── mutation → node အခြားတစ်ခုသို့ force transition
    │               │
    │               └── SlaInstance ကို "breached" အဖြစ် mark
    │
    ├── Level 2 SLA (ဥပမာ ၁၅ မိနစ်)
    │       └── (flow တူညီ, severity ပိုမြင့်)
    │
    └── Level 3 SLA (ဥပမာ ၃၀ မိနစ်)
            └── (ဥပမာ workflow ကို force-end)
```

### Event Dispatch System

External system များသည် running workflow instance များသို့ event များ ပို့နိုင်ပါသည်:

```
POST /api/v1/workflows/instances/:id/dispatch
{
  "event": "payment_received",
  "payload": { "amount": 500, "currency": "USD" }
}
```

**Processing flow:**
1. Workflow definition ၏ `events[]` ထဲတွင် event key ရှိမရှိ validate လုပ်ပါသည်
2. Event ၏ `payloadSchema` (AJV) ဖြင့် payload validate လုပ်ပါသည်
3. Event-level `condition` (JEXL) evaluate လုပ်ပါသည်
4. Event ထဲရှိ action တစ်ခုချင်းစီအတွက်:
   - Action-level condition evaluate လုပ်ပါသည်
   - Action execute လုပ်ပါသည်:
     - `update_context` — instance variable များထဲသို့ data merge
     - `service` — HTTP request queue
     - `update_stage` — node တစ်ခုသို့ force-transition
5. `EventLog` နှင့် `EventActionLog` ထဲတွင် အားလုံး record လုပ်ပါသည်

## Database Schema

### အဓိက Model များ

| Model | Track လုပ်သည် |
|-------|-------------|
| `WorkflowInstance` | Instance ID, status, context variable, current node, definition snapshot |
| `Task` | Assign ထားသော task, status, input/output, escalation chain |
| `ParallelBranchInstance` | Parallel gateway အတွက် branch execution status |
| `WorkflowActionHistory` | Action တိုင်း — audit trail အပြည့်အစုံ |
| `SlaInstance` | SLA deadline နှင့် breach status |
| `EventLog` | Event dispatch နှင့် processing result |
| `EventActionLog` | Event action execution record တစ်ခုချင်းစီ |

## Background Worker များ

### HTTP Worker
- **Queue:** `http-service-queue`
- **Job data:** `{ url, method, headers, body, actionId }`
- **Process:** Axios ဖြင့် HTTP request execute
- **Success:** `WorkflowActionHistory` ကို `completed` သို့ update
- **Failure:** `failed` သို့ update

### SLA Worker
- **Queue:** `sla-queue`
- **Job data:** `{ slaInstanceId, level }`
- **Process:**
  1. Task pending ဖြစ်နေသေးသလား စစ်ဆေး
  2. သတ်မှတ်ထားသော level အတွက် SLA fact load
  3. Escalation action များ execute (service call, task reassign, forced transition)
  4. `SlaInstance` status ကို `breached` သို့ update
  5. `WorkflowActionHistory` ထဲတွင် record

## Environment Variable များ

| Variable | Default | ဖော်ပြချက် |
|----------|---------|-----------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | `password` | Redis password |
| `WORKFLOW_MASTER_API_URL` | `http://localhost:5000` | Workflow definition storage API |
