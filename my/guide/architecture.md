# ဗိသုကာ

## စနစ် ဖွဲ့စည်းပုံ

Platform သည် HTTP မှတစ်ဆင့် ဆက်သွယ်သော service အစုတစ်ခုအနေဖြင့် run ပါသည်:

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER                                    │
│                                                                    │
│   ┌────────────────────────┐    ┌────────────────────────────┐   │
│   │   Admin Portal (:5174) │    │   User Portal (:5173)      │   │
│   │                        │    │   (သို့မဟုတ် သင့် frontend)  │   │
│   │   • Form Builder       │    │                             │   │
│   │   • Workflow Builder    │    │   • Login & Auth            │   │
│   │   • Mappings Manager   │    │   • Form များ ကြည့်ရှုခြင်း   │   │
│   │   • Instance Monitor   │    │   • Request များ submit      │   │
│   │   • Notifications      │    │   • History ကြည့်ရှုခြင်း     │   │
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
│ • Form CRUD │  │              │  │ • Form ဖတ်  │   │
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

## API နှစ်ခု ပုံစံ

Frontend များသည် domain အမျိုးမျိုးအတွက် တာဝန်ယူသော **သီးခြား API နှစ်ခု** နှင့် ဆက်သွယ်ပါသည်:

### Forms API (Port 3001)

Form definition များနှင့် data collection နှင့် ပတ်သက်သော အရာအားလုံးကို ကိုင်တွယ်ပါသည်:

| Endpoint | ရည်ရွယ်ချက် |
|----------|-----------|
| `GET/POST /api/forms` | Form definition များ CRUD |
| `POST /api/submit` | Form data submit → workflow start trigger |
| `GET /api/submissions` | Submit ထားသော form response များ စာရင်း |
| `GET/POST /api/form-mappings` | Form များကို workflow များနှင့် ချိတ်ဆက်ခြင်း |
| `GET /api/notifications` | Notification များ ရယူခြင်း |
| SSE stream | Real-time notification push |

### Workflow Engine API (Port 3002)

Workflow execution နှင့် task management ကို ကိုင်တွယ်ပါသည်:

| Endpoint | ရည်ရွယ်ချက် |
|----------|-----------|
| `GET/POST /api/v1/workflows` | Workflow definition များ CRUD |
| `POST /api/v1/workflows/start` | Workflow instance အသစ် စတင်ခြင်း |
| `GET /api/v1/workflows/instances` | Running/completed instance များ စာရင်း |
| `GET /api/v1/workflows/instances/:id` | Branch နှင့် history အပါအဝင် instance အသေးစိတ် |
| `GET/POST /api/v1/tasks` | Task စာရင်းနှင့် completion |
| `GET /api/v1/roles` | ရရှိနိုင်သော role များ |

## Data Flow

### Workflow ဖန်တီးခြင်း (Admin)

```
Admin က Workflow Builder ဖွင့်ပါသည်
        │
        ├── Canvas ပေါ်တွင် node များ drag လုပ်ပါသည် (Start → Task → Decision → End)
        ├── Node တစ်ခုချင်းစီကို configure လုပ်ပါသည် (role, condition, SLA)
        ├── Transition များဖြင့် node များ ချိတ်ဆက်ပါသည်
        │
        └── Save နှိပ်ပါသည်
                │
                ▼
        POST /api/v1/workflows
                │
                ▼
        Workflow Master API က definition ကို JSON အနေဖြင့် သိမ်းဆည်းပါသည်
```

### Form ဖန်တီးခြင်း (Admin)

```
Admin က Form Builder ဖွင့်ပါသည်
        │
        ├── JSON Schema ရေးပါသည် (field, type, validation)
        ├── UI Schema ရေးပါသည် (layout, custom control)
        ├── Live JSON Forms rendering ဖြင့် preview ကြည့်ပါသည်
        │
        └── Save နှိပ်ပါသည်
                │
                ▼
        POST /api/forms
                │
                ▼
        Forms API က definition ကို database ထဲ သိမ်းဆည်းပါသည်
```

### Form Submit လုပ်ခြင်း (User)

```
User က form portal ဖွင့်ပါသည်
        │
        ├── ရရှိနိုင်သော form-workflow mapping များ ရယူပါသည်
        ├── Form template ရွေးချယ်ပါသည်
        ├── JSON Schema မှ JSON Forms ဖြင့် form render လုပ်ပါသည်
        ├── User က data ဖြည့်ပါသည်
        │
        └── Submit နှိပ်ပါသည်
                │
                ▼
        POST /api/submit → Forms API → POST /api/v1/workflows/start
                                                │
                                                ▼
                                        Workflow Engine က instance ဖန်တီးပြီး
                                        execution စတင်ပါသည်
```

### Workflow Execution (Engine)

```
Engine က start request လက်ခံပါသည်
        │
        ├── PostgreSQL ထဲတွင် WorkflowInstance ဖန်တီးပါသည်
        ├── Workflow definition အပြည့်အစုံကို snapshot လုပ်ပါသည်
        ├── "start" node မှ စတင်ပါသည်
        │
        ▼
    ┌─ handleNode() router ────────────────────────────────┐
    │                                                        │
    │   start ──► နောက် node သို့ ဆက်သွားပါသည်               │
    │                                                        │
    │   task ──► Task record ဖန်တီးပါသည်                     │
    │            role/user ထံ assign လုပ်ပါသည်                │
    │            SLA timer များ set up လုပ်ပါသည်              │
    │            ◄── task completion ကို စောင့်ပါသည် ──►       │
    │            နောက် node သို့ ဆက်သွားပါသည်                │
    │                                                        │
    │   service ──► HTTP request queue လုပ်ပါသည် (BullMQ)    │
    │               HTTP worker က request execute လုပ်ပါသည်   │
    │               နောက် node သို့ ဆက်သွားပါသည်              │
    │                                                        │
    │   decision ──► JEXL condition များ evaluate လုပ်ပါသည်   │
    │                ကိုက်ညီသော transition ကို follow လုပ်ပါသည်│
    │                                                        │
    │   parallel_gateway ──► branch instance များ ဖန်တီးပါသည် │
    │                        branch အားလုံး parallel execute   │
    │                                                        │
    │   parallel_join ──► branch completion စစ်ဆေးပါသည်       │
    │                     join condition ပြည့်မီလျှင် merge     │
    │                     နောက် node သို့ ဆက်သွားပါသည်        │
    │                                                        │
    │   end ──► instance ကို completed အဖြစ် mark လုပ်ပါသည်   │
    └────────────────────────────────────────────────────────┘
```

## State Management

### Server State (Workflow Engine)

Workflow state အားလုံးကို Prisma မှတစ်ဆင့် PostgreSQL ထဲတွင် persist လုပ်ထားပါသည်:

| Model | Track လုပ်သည် |
|-------|-------------|
| `WorkflowInstance` | Instance ID, status, context variable, current node, definition snapshot |
| `Task` | Assign ထားသော task များ, status, input/output, escalation chain |
| `ParallelBranchInstance` | Parallel gateway အတွက် branch တစ်ခုချင်းစီ၏ execution status |
| `WorkflowActionHistory` | လုပ်ဆောင်ခဲ့သော action တိုင်း — audit trail အပြည့်အစုံ |
| `SlaInstance` | SLA deadline နှင့် breach status |
| `EventLog` | External event dispatch များနှင့် processing result များ |

### Client State (Frontend များ)

Frontend နှစ်ခုစလုံး pattern တူညီစွာ အသုံးပြုပါသည်:

- **Zustand** — local UI state (sidebar, ရွေးချယ်ထားသော item, auth)
- **TanStack React Query** — server state (caching, auto-refresh, invalidation)

## နောက်ကွယ် Processing

Engine သည် async job processing အတွက် **BullMQ** (Redis backed) ကို အသုံးပြုပါသည်:

| Queue | Worker | ရည်ရွယ်ချက် |
|-------|--------|-----------|
| `http-service-queue` | `http-worker` | HTTP service node request များ execute လုပ်ခြင်း |
| `sla-queue` | `sla-worker` | SLA breach များ process လုပ်ခြင်း, escalation action များ trigger လုပ်ခြင်း |
| `timer-queue` | `timer-worker` | Timer-based event များ |
| `notification-queue` | — | Notification delivery |
