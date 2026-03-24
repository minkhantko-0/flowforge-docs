# ပေါင်းစည်းမှု လမ်းညွှန်

ဤလမ်းညွှန်တွင် FlowForge စနစ်ကို သင့် project ထဲသို့ ဘယ်လို ပေါင်းစည်းမလဲ ရှင်းပြပါသည်။ သင် လိုအပ်ချက်ပေါ်မူတည်၍ ပေါင်းစည်းမှု အဆင့်အမျိုးမျိုး ရှိပါသည်။

## ပေါင်းစည်းမှု နည်းလမ်းများ

| နည်းလမ်း | ဘာကို သုံးမလဲ | ကြိုးစားမှု | အကောင်းဆုံး |
|----------|-------------|----------|-----------|
| **စနစ် အပြည့်အစုံ** | Engine + Admin Portal + သင့် Frontend | အလယ်အလတ် | Workflow automation အပြည့်အစုံ လိုအပ်သော project အသစ်များ |
| **Engine သီးသန့်** | Engine API ကို backend service အနေဖြင့် | နည်း | Frontend ရှိပြီးသား workflow execution သာ လိုအပ်သော project များ |
| **Forms သီးသန့်** | Custom schema ဖြင့် JSON Forms rendering | နည်း | Dynamic form လိုအပ်ပြီး workflow logic ကိုယ်ပိုင် ရှိသော project များ |
| **Reference** | Architecture ကို လေ့လာပြီး pattern များ adapt လုပ်ခြင်း | — | မတူညီသော tech ဖြင့် ကိုယ်ပိုင် engine တည်ဆောက်သော team များ |

---

## နည်းလမ်း ၁: စနစ် အပြည့်အစုံ ပေါင်းစည်းခြင်း

Workflow engine နှင့် admin portal ကို သင့် application နှင့်အတူ deploy လုပ်ပါ။ သင့် frontend သည် user-facing layer အဖြစ် ဆောင်ရွက်ပါသည် ([`request-form-demo`](https://github.com/minkhantko-0/request-form-demo) project ကဲ့သို့)။

### အဆင့် ၁: Infrastructure Deploy

```bash
# Redis စတင်ခြင်း (BullMQ job queue များအတွက် လိုအပ်)
docker run -d --name redis -p 6379:6379 redis:7 --requirepass password

# PostgreSQL set up (managed instance သို့မဟုတ် local)
# Database ဖန်တီးပြီး connection string မှတ်ထားပါ
```

### အဆင့် ၂: Workflow Engine Deploy

```bash
cd poc-workflow-engine

# Dependency များ install
npm install

# Environment configure
cp .env.example .env
# .env ပြင်ဆင်ပါ:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/workflows
#   REDIS_HOST=localhost
#   REDIS_PORT=6379
#   REDIS_PASSWORD=password
#   WORKFLOW_MASTER_API_URL=http://localhost:5000

# Database migration run
npm run apply:migrate

# Workflow Master API စတင် (workflow definition storage)
npm run start:workflow-master

# Engine စတင်
npm run dev     # development
npm run start   # production
```

Engine သည် port **3002** တွင် run နေပါပြီ။

### အဆင့် ၃: Admin Portal Deploy

```bash
cd dynamic-workflow

# Dependency များ install
npm install

# Environment configure
echo "VITE_API_URL=http://localhost:3001" > .env
echo "VITE_WORKFLOW_URL=http://localhost:3002" >> .env

# စတင်
npm run dev     # development
npm run build   # production (ပြီးလျှင် dist/ folder ကို serve)
```

### အဆင့် ၄: Forms API Set Up

System သည် port 3001 တွင် Forms API လိုအပ်ပြီး အောက်ပါတို့ကို ကိုင်တွယ်ရပါမည်:

| Endpoint | Method | ရည်ရွယ်ချက် |
|----------|--------|-----------|
| `/api/forms` | GET, POST | Form definition CRUD |
| `/api/form-mappings` | GET, POST, PUT, DELETE | Form-to-workflow mapping |
| `/api/submit` | POST | Form submission (workflow start trigger) |
| `/api/submissions` | GET | Submission စာရင်း |
| `/api/notifications` | GET, POST, DELETE, PATCH | Notification စီမံခန့်ခွဲမှု |
| `/api/notifications/stream` | GET (SSE) | Real-time notification stream |

အဓိက ပေါင်းစည်းမှု အချက်မှာ **submit endpoint** ဖြစ်ပြီး:

1. Submission ကို သိမ်းဆည်း
2. Form-to-workflow mapping ရှာ
3. `POST http://localhost:3002/api/v1/workflows/start` ကို ခေါ်ပါ:

```json
{
  "workflowId": "<mapping-မှ-workflow-key>",
  "refId": "<submission-id>",
  "context": {
    // ... form data အားလုံး key-value pair များအနေဖြင့်
  }
}
```

### အဆင့် ၅: သင့် Frontend တည်ဆောက်ခြင်း

သင့် frontend တွင် လိုအပ်ချက်များ:

1. **ရရှိနိုင်သော form template များ ရယူ** — mapping များအတွက် Forms API ခေါ်
2. **Form များ dynamically render** — form definition မှ schema ဖြင့် JSON Forms သုံး
3. **Forms API သို့ submit** — workflow trigger ဖြစ်
4. **History ပြသ** — engine ပေါ်ရှိ `GET /api/v1/workflows/instances?createdBy=<user>` ကို query

**Form rendering ဥပမာ (အနည်းဆုံး):**

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

## နည်းလမ်း ၂: Engine သီးသန့် ပေါင်းစည်းခြင်း

Workflow engine ကို standalone microservice အနေဖြင့် သုံးပါ။ Form နှင့် UI ကို ကိုယ်တိုင် စီမံပါ — engine က workflow execution သာ ကိုင်တွယ်ပါသည်။

### ခေါ်ရမည့် API များ

**Workflow စတင်ခြင်း:**
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

**Instance status စစ်ဆေးခြင်း:**
```bash
GET http://localhost:3002/api/v1/workflows/instances?createdBy=user@example.com
```

**Pending task များ စာရင်း (approver အတွက်):**
```bash
GET http://localhost:3002/api/v1/tasks?status=pending
x-role-id: manager
```

**Task complete လုပ်ခြင်း:**
```bash
POST http://localhost:3002/api/v1/tasks/<task-id>/complete
Content-Type: application/json

{
  "instanceId": "<instance-id>",
  "isApproved": true,
  "remark": "ကောင်းပါသည်, approve လုပ်ပါသည်။"
}
```

---

## နည်းလမ်း ၃: Forms သီးသန့် ပေါင်းစည်းခြင်း

Workflow engine မပါဘဲ သင့် project ထဲတွင် dynamic form များ render လုပ်ရန် JSON Forms ကို သုံးပါ။

### Dependency များ Install

```bash
npm install @jsonforms/core @jsonforms/react @jsonforms/material-renderers
npm install @mui/material @emotion/react @emotion/styled
```

### Form Render လုပ်ခြင်း

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

---

## Production တွင် ထည့်သွင်းစဉ်းစားရမည့်အချက်များ

### Authentication & Authorization

လက်ရှိ system သည် header-based identity (`x-user-id`, `x-role-id`) ကို အသုံးပြုပါသည်။ Production အတွက်:

- Hono engine သို့ **JWT/OAuth middleware** ထည့်ပါ
- Request process မလုပ်ခင် **token validate** လုပ်ပါ
- Identity provider မှ authenticated user များကို role များနှင့် **map** လုပ်ပါ
- Admin portal ကို role-based access ဖြင့် **ကာကွယ်**ပါ

### Scaling

| Component | Scaling Strategy |
|-----------|----------------|
| Workflow Engine | Horizontal — load balancer နောက်တွင် instance အများ run |
| Worker များ | Horizontal — BullMQ သည် worker instance အများကို support |
| PostgreSQL | Vertical သို့မဟုတ် query load များသော read replica |
| Redis | High-throughput queue များအတွက် cluster mode |
| Admin Portal | Static build → CDN |
| User Frontend | Static build → CDN |

### Monitoring & Observability

- `WorkflowActionHistory` table သည် audit trail အပြည့်အစုံ ပေးပါသည်
- Hono server သို့ structured logging (ဥပမာ Pino) ထည့်ပါ
- [Bull Board](https://github.com/felixmosh/bull-board) ဖြင့် BullMQ queue များ monitor လုပ်ပါ
- Process improvement အတွက် SLA breach rate များ track လုပ်ပါ
