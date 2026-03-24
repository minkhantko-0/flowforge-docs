# အကျဉ်းချုပ်

## FlowForge ဆိုတာ ဘာလဲ?

FlowForge သည် **workflow automation platform** တစ်ခုဖြစ်ပြီး အောက်ပါတို့ကို လုပ်ဆောင်နိုင်ပါသည်:

1. JSON Schema ဖြင့် **form များ သတ်မှတ်ခြင်း** — frontend code ရေးစရာ မလိုပါ
2. Drag-and-drop builder ဖြင့် **workflow များ ဒီဇိုင်းဆွဲခြင်း**
3. Form submit လုပ်လိုက်သည်နှင့် approval process အလိုအလျောက် စတင်စေရန် **form များကို workflow များနှင့် ချိတ်ဆက်ခြင်း**
4. Task assignment, conditional branching, parallel execution, SLA monitoring နှင့် escalation များကို ကိုင်တွယ်သော backend engine မှတစ်ဆင့် **workflow များ execute လုပ်ခြင်း**

ဤစနစ်သည် code အသစ် deploy မလုပ်ဘဲ **business process များကို configuration ဖြင့်သာ ဖန်တီးပြင်ဆင်နိုင်အောင်** ဒီဇိုင်းထုတ်ထားပါသည်။

## ပြဿနာ

Enterprise application အများစုတွင် approval workflow များ လိုအပ်ပါသည် — user signup အသစ်များ၊ document review များ၊ expense approval များ၊ access request များ။ ယခင်အတိုင်း တည်ဆောက်ပါက:

- Form တစ်ခုချင်းစီကို custom page အနေဖြင့် **hard-code** ရေးရပါသည်
- Workflow တစ်ခုချင်းစီကို if/else chain များဖြင့် application logic ထဲတွင် **hard-code** ရေးရပါသည်
- Workflow ပြောင်းလဲမှု သို့မဟုတ် form field အသစ် လိုအပ်တိုင်း **ပြန်လည် deploy** လုပ်ရပါသည်
- Feature အမျိုးမျိုးတွင် approval logic များကို **ထပ်ခါထပ်ခါ ရေးရပါသည်**

ဤအချက်များသည် ပြောင်းလဲမှုများကို နှေးကွေးစေပြီး error ဖြစ်ပွားနိုင်ခြေ မြင့်မားကာ ကုန်ကျစရိတ် များပါသည်။

## ဖြေရှင်းနည်း

FlowForge သည် **ဘာကို စုဆောင်းမလဲ** (forms) နှင့် **ဘယ်လို process လုပ်မလဲ** (workflows) ကို ခွဲခြားပြီး နှစ်ခုစလုံးကို runtime တွင် configure လုပ်နိုင်အောင် ဖန်တီးထားပါသည်:

| Layer | ဘာလုပ်သလဲ | ဘယ်လို configure လုပ်သလဲ |
|-------|-----------|------------------------|
| **Forms** | User input စုဆောင်းခြင်း | JSON Schema + UI Schema |
| **Workflows** | Input ကို approval step များ မှတစ်ဆင့် process လုပ်ခြင်း | Visual workflow builder → JSON definition |
| **Mapping** | Form ကို workflow နှင့် ချိတ်ဆက်ခြင်း | Admin portal UI |
| **Execution** | Form submit လုပ်လိုက်သောအခါ workflow run ခြင်း | အလိုအလျောက် — engine က ကိုင်တွယ်ပါသည် |

### ဥပမာ: Approval Process အသစ် ထည့်သွင်းခြင်း

FlowForge ကို အသုံးမပြုလျှင်:
1. Database table များ ဒီဇိုင်းဆွဲရမည်
2. Form page တည်ဆောက်ရမည်
3. Approval logic ရေးရမည်
4. Notification handling ထည့်ရမည်
5. Admin view တည်ဆောက်ရမည်
6. Deploy လုပ်ပြီး test လုပ်ရမည်

FlowForge ကို အသုံးပြုလျှင်:
1. Admin portal တွင် form အတွက် JSON Schema ဖန်တီးပါ
2. Visual builder တွင် workflow ဒီဇိုင်းဆွဲပါ
3. နှစ်ခုကို mapping ဖန်တီးပါ
4. ပြီးပါပြီ — user များ form ကို ချက်ချင်း submit လုပ်နိုင်ပါပြီ

## စနစ် အစိတ်အပိုင်းများ

Platform သည် core system နှစ်ခုနှင့် demo project တစ်ခု ပါဝင်ပါသည်:

### အဓိက စနစ်များ

| စနစ် | အခန်းကဏ္ဍ | Port | Repository |
|------|-----------|------|------------|
| **Admin Portal** (`dynamic-workflow`) | Form တည်ဆောက်ခြင်း၊ workflow ဒီဇိုင်းဆွဲခြင်း၊ mapping ဖန်တီးခြင်း၊ execution စောင့်ကြည့်ခြင်း | 5174 | [GitHub](https://github.com/psp-kbz/dynamic-workflow) |
| **Workflow Engine** (`poc-workflow-engine`) | Workflow execute လုပ်ခြင်း၊ task စီမံခြင်း၊ SLA process လုပ်ခြင်း၊ event ကိုင်တွယ်ခြင်း | 3002 | [GitHub](https://github.com/mmhkbz/poc-workflow-engine) |

### ပံ့ပိုးမှု ဝန်ဆောင်မှုများ

| ဝန်ဆောင်မှု | အခန်းကဏ္ဍ | Port |
|-------------|-----------|------|
| **Forms API** | Form definition, submission နှင့် mapping များ သိမ်းဆည်းခြင်း | 3001 |
| **Workflow Master** | Workflow definition များ သိမ်းဆည်းခြင်း (JSON Server) | 5000 |
| **Redis** | Job queue backend (BullMQ) | 6379 |
| **PostgreSQL** | Workflow instance persistence | 5432 |

### Demo Project

| Project | အခန်းကဏ္ဍ | Port | Repository |
|---------|-----------|------|------------|
| **Request Form Demo** (`request-form-demo`) | Form များ render လုပ်ပြီး workflow များသို့ submit လုပ်သော user-facing portal တည်ဆောက်နည်း ပြသခြင်း | 5173 | [GitHub](https://github.com/minkhantko-0/request-form-demo) |

## အဓိက စွမ်းရည်များ

### Dynamic Form Rendering
- JSON Schema + UI Schema ဖြင့် form များ သတ်မှတ်ခြင်း
- [JSON Forms](https://jsonforms.io/) ကို အသုံးပြု၍ runtime တွင် render လုပ်ခြင်း
- Custom control များ: star rating, slider, file upload အစရှိသည်
- AJV (JSON Schema validation) ဖြင့် validation

### Visual Workflow Builder
- [React Flow (XYFlow)](https://reactflow.dev/) ဖြင့် drag-and-drop canvas
- Node type ၇ မျိုး: Start, End, Task, Service, Decision, Parallel Gateway, Parallel Join
- Task assignment, HTTP service, JEXL condition နှင့် SLA rule များ configure လုပ်ခြင်း
- Workflow များကို JSON အနေဖြင့် export/import လုပ်ခြင်း

### Workflow Execution Engine
- Workflow definition များကို node-by-node process လုပ်ခြင်း
- Condition နှင့် dynamic value များအတွက် JEXL expression evaluation
- Configurable join strategy များဖြင့် parallel branch orchestration
- Async HTTP call နှင့် SLA monitoring အတွက် BullMQ-backed job queue များ
- Multi-level SLA escalation (notify → reassign → force-complete)
- External trigger များအတွက် event dispatch system

### Real-time Monitoring
- Auto-refresh ဖြင့် live workflow instance tracking
- Stage-by-stage timeline ရုပ်ပုံဖော်ခြင်း
- Action history audit log အပြည့်အစုံ
- Push notification များအတွက် Server-Sent Events

## ဘယ်သူတွေအတွက်လဲ?

| ပရိသတ် | Use Case |
|--------|----------|
| **Platform team များ** | Product ထဲသို့ configurable workflow engine ထည့်သွင်းခြင်း |
| **Enterprise developer များ** | Hard-coded approval flow များကို dynamic configuration ဖြင့် အစားထိုးခြင်း |
| **Internal tools team များ** | Form-driven process များဖြင့် admin portal များ တည်ဆောက်ခြင်း |
| **Architect များ** | Workflow orchestration pattern များအတွက် reference implementation |

## နောက်ထပ် ဆက်ဖတ်ရန်

- [**ဗိသုကာ**](/my/guide/architecture) — အစိတ်အပိုင်းများ ဘယ်လို အတူတကွ အလုပ်လုပ်သလဲ နားလည်ရန်
- [**Admin Portal**](/my/guide/admin-portal) — Form builder နှင့် workflow designer အသေးစိတ်
- [**Workflow Engine**](/my/guide/workflow-engine) — Engine က workflow များကို နောက်ကွယ်တွင် ဘယ်လို execute လုပ်သလဲ
- [**ပေါင်းစည်းမှု လမ်းညွှန်**](/my/guide/integration) — သင့် project ထဲသို့ ဘယ်လို ပေါင်းစည်းရမည်ကို လေ့လာရန်
