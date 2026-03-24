# Admin Portal

> **Repository:** [github.com/psp-kbz/dynamic-workflow](https://github.com/psp-kbz/dynamic-workflow)

Admin portal (`dynamic-workflow`) သည် platform တစ်ခုလုံးကို စီမံခန့်ခွဲရန် React application တစ်ခုဖြစ်ပါသည်: form တည်ဆောက်ခြင်း, workflow ဒီဇိုင်းဆွဲခြင်း, mapping ဖန်တီးခြင်းနှင့် real-time execution စောင့်ကြည့်ခြင်း။

## Tech Stack

| အမျိုးအစား | နည်းပညာ | Version |
|-----------|---------|---------|
| Framework | React + TypeScript | 19.2 |
| Build Tool | Vite | 7.3 |
| Routing | React Router | 7.9 |
| UI Library | Mantine | 7.17 |
| Forms | JSON Forms (Material renderers) | 3.7 |
| Workflow Canvas | XYFlow (React Flow) | 12.10 |
| Code Editor | Monaco Editor | 4.7 |
| State (UI) | Zustand | 5.0 |
| State (Server) | TanStack React Query | 5.90 |
| File Upload | UploadThing | 7.7 |
| Real-time | Server-Sent Events (EventSource) | Native |

## စာမျက်နှာများ

### Form Builder (`/d/forms/builder`)

JSON Schema နှင့် UI Schema ကို အသုံးပြု၍ form definition များ ဖန်တီးပြင်ဆင်ခြင်း။

**လုပ်ဆောင်ချက်များ:**
- JSON Schema နှင့် UI Schema အတွက် ဘေးချင်းယှဉ် **Monaco editor** များ
- Custom control အားလုံးပါဝင်သော JSON Forms ကို အသုံးပြု၍ **live preview**
- API မှ ရှိပြီးသား form definition များ load ခြင်း
- Definition အသစ် save ခြင်း သို့မဟုတ် ရှိပြီးသား update ခြင်း
- မြန်ဆန်စွာ test လုပ်ရန် sample schema ခလုတ်

### Workflow Builder (`/d/workflows/builder`)

Interactive node-based canvas ဖြင့် workflow definition များ ဒီဇိုင်းဆွဲခြင်း။

**လုပ်ဆောင်ချက်များ:**
- Node များ နေရာချပြီး ချိတ်ဆက်ရန် XYFlow ဖြင့် **drag-and-drop canvas**
- Configuration modal များပါဝင်သော **node type ၇ မျိုး**
- Transition condition များအတွက် **edge configuration**
- Workflow definition များ **JSON import/export**
- Save မလုပ်ခင် **validation** စစ်ဆေးခြင်း
- Dropdown မှ **ရှိပြီးသား workflow များ load** ခြင်း

**Node အမျိုးအစားများ:**

| Node | ရည်ရွယ်ချက် | Configuration |
|------|-----------|---------------|
| Start | Entry point | မရှိ |
| Task | လူသား action/approval | Assignment type (role/user/group), SLA rule များ |
| Decision | Condition ပေါ်မူတည်၍ branch ခြင်း | Outgoing transition များတွင် JEXL expression များ |
| Service | HTTP call အလိုအလျောက် | Method, URL, header, body (JEXL template support) |
| Parallel Gateway | Branch များအဖြစ် fork ခြင်း | Node list ပါဝင်သော branch definition များ |
| Parallel Join | Branch များ merge ခြင်း | Join type: all, any, majority, n_of_m |
| End | ပြီးဆုံးခြင်း | မရှိ |

### Workflow Visualizer (`/d/workflows/visualizer`)

Running workflow instance များကို real-time ဖြင့် စောင့်ကြည့်ခြင်း။

**လုပ်ဆောင်ချက်များ:**
- Status card များပါဝင်သော **instance စာရင်း** (running, completed, failed)
- Instance ရောက်ရှိနေသော node ကို ပြသော **stage timeline**
- Action တိုင်းကို ပြသော **action history** log (ဘယ်သူ, ဘယ်အချိန်, ဘာလုပ်ခဲ့, ရလဒ်)
- **Auto-refresh** — instance စာရင်း ၃၀ စက္ကန့်တိုင်း, active instance detail ၅ စက္ကန့်တိုင်း update

### Mappings (`/d/mappings`)

Form definition များကို workflow definition များနှင့် ချိတ်ဆက်ခြင်း။

**လုပ်ဆောင်ချက်များ:**
- Form definition များမှ populate လုပ်ထားသော **form key selector**
- Workflow definition များမှ populate လုပ်ထားသော **workflow key selector**
- Active/inactive status ဖြင့် **mapping ဖန်တီးခြင်း**
- Update/delete action များပါဝင်သော mapping **table view**

### Notifications (`/d/notifications`)

Real-time notification center။

**လုပ်ဆောင်ချက်များ:**
- Title, message နှင့် timestamp ပါဝင်သော notification အားလုံး စာရင်း
- Mark as read / delete
- Sidebar တွင် unread count badge
- Server-Sent Events မှတစ်ဆင့် real-time push
- Connection ကျသွားပါက auto-reconnect with exponential backoff

## Custom JSON Forms Renderer များ

| Renderer | Trigger Condition | Render လုပ်သည် |
|----------|------------------|----------------|
| **Rating** | Schema property name `rating` ဖြင့်ဆုံး | Hover preview ပါ interactive ကြယ် ၅ ပွင့် rating |
| **AgeSlider** | Schema property name `age` ဖြင့်ဆုံး | Schema မှ min/max ကို respect လုပ်သော Material-UI slider |
| **FileUpload** | `format: "data-url"` သို့ `contentMediaType` ရှိ | CSV validation ပါ file picker (5MB limit) |
| **TextInput** | Custom tester match | Validation ပါ styled text input |
| **NumberInput** | Custom tester match | Constraint ပါ numeric input |

## State Management

### Zustand Store များ

```typescript
// App store — UI state
useAppStore() → {
  opened: boolean       // sidebar ဖွင့်/ပိတ်
  activePage: string    // လက်ရှိ page အမည်
  toggleSidebar()
}

// Workflow store — selection state
useWorkflowStore() → {
  selectedInstanceId: string | null
  setSelectedInstanceId(id)
}
```

### React Query Hook များ

| Hook | Query Key | Refetch Interval |
|------|-----------|-----------------|
| `useFormDefinitions()` | `["form-definitions"]` | Manual |
| `useWorkflowDefinitions()` | `["workflow-definitions"]` | Manual |
| `useWorkflowInstances()` | `["workflow-instances"]` | 30s |
| `useWorkflowInstanceDetails(id)` | `["workflow-instance-details", id]` | 5s (enabled ဖြစ်လျှင်) |
| `useNotifications()` | `["notifications"]` | Manual (SSE-driven) |
| `useSubmissions()` | `["submissions"]` | Manual |
| `useMappings()` | `["mappings"]` | Manual |

Mutation များသည် success ဖြစ်လျှင် သက်ဆိုင်ရာ query key များကို အလိုအလျောက် invalidate လုပ်ပါသည်။
