# Form Definition Schema

Form definition များသည် data structure နှင့် validation အတွက် [JSON Schema](https://json-schema.org/) ကို အသုံးပြုပြီး layout နှင့် presentation ကို control လုပ်သော [UI Schema](https://jsonforms.io/docs/uischema/) နှင့် တွဲဖက်ပါသည်။

## Form Definition ဖွဲ့စည်းပုံ

Forms API ထဲတွင် သိမ်းဆည်းထားသော form definition:

```json
{
  "id": "uuid",
  "key": "leave_request",
  "name": "Leave Request Form",
  "schema": { },
  "uiSchema": { },
  "createdAt": "2026-03-22T10:00:00.000Z"
}
```

| Field | Type | ဖော်ပြချက် |
|-------|------|-----------|
| `key` | string | Unique identifier (mapping များတွင် အသုံးပြု) |
| `name` | string | Display name |
| `schema` | JSON Schema | Data structure နှင့် validation rule များ သတ်မှတ်ခြင်း |
| `uiSchema` | UI Schema | Form layout နှင့် control rendering သတ်မှတ်ခြင်း |

---

## JSON Schema (Data Definition)

JSON Schema သည် form က **ဘယ် data ကို စုဆောင်းမလဲ** နှင့် **ဘယ်လို validate လုပ်မလဲ** ကို သတ်မှတ်ပါသည်။

### Support လုပ်သော Field Type များ

#### String

```json
{
  "type": "string",
  "minLength": 1,
  "maxLength": 500,
  "pattern": "^[A-Za-z]+$"
}
```

Text input အနေဖြင့် render ပါသည်။ အထူး behavior အတွက် `format` ထည့်ပါ:

| Format | Renderer |
|--------|----------|
| `email` | Email input with validation |
| `date` | Date picker |
| `date-time` | Date-time picker |
| `data-url` | **File upload** (custom FileUpload renderer trigger) |

#### Number / Integer

```json
{
  "type": "integer",
  "minimum": 0,
  "maximum": 100
}
```

Number input အနေဖြင့် render ပါသည်။ Property name `age` ဖြင့် ဆုံးပါက custom **AgeSlider** renderer activate ဖြစ်ပါသည်။

#### Boolean

```json
{ "type": "boolean" }
```

Checkbox အနေဖြင့် render ပါသည်။

#### Enum (Dropdown)

```json
{
  "type": "string",
  "enum": ["Low", "Medium", "High", "Critical"]
}
```

Dropdown/select အနေဖြင့် render ပါသည်။

### Validation Rule များ

| Rule | သက်ရောက်သည် | ဥပမာ |
|------|------------|------|
| `required` | object | `"required": ["name", "email"]` |
| `minLength` / `maxLength` | string | `"minLength": 2` |
| `minimum` / `maximum` | number, integer | `"minimum": 0` |
| `pattern` | string | `"pattern": "^\\d{3}-\\d{4}$"` |
| `format` | string | `"format": "email"` |
| `enum` | string, number | `"enum": ["A", "B", "C"]` |

Validation ကို **AJV** (Another JSON Schema Validator) ဖြင့် ကိုင်တွယ်ပါသည်။

---

## UI Schema (Layout Definition)

UI Schema သည် **form ဘယ်လို ပုံစံဖြင့် ပြမလဲ** ကို သတ်မှတ်ပါသည် — field စီစဥ်ခြင်း, grouping နှင့် custom control များ။

### Layout Type များ

#### VerticalLayout

Field များ ဒေါင်လိုက် stack (အသုံးအများဆုံး):

```json
{
  "type": "VerticalLayout",
  "elements": [
    { "type": "Control", "scope": "#/properties/name" },
    { "type": "Control", "scope": "#/properties/email" }
  ]
}
```

#### HorizontalLayout

Field များ ဘေးချင်းယှဉ်:

```json
{
  "type": "HorizontalLayout",
  "elements": [
    { "type": "Control", "scope": "#/properties/firstName" },
    { "type": "Control", "scope": "#/properties/lastName" }
  ]
}
```

#### Group

Label နှင့် border ပါသော section:

```json
{
  "type": "Group",
  "label": "ကိုယ်ရေး အချက်အလက်",
  "elements": [
    { "type": "Control", "scope": "#/properties/name" },
    { "type": "Control", "scope": "#/properties/age" }
  ]
}
```

---

## Custom Renderer များ

Platform သည် schema property ပေါ်မူတည်၍ အလိုအလျောက် activate ဖြစ်သော custom control များဖြင့် JSON Forms ကို extend လုပ်ပါသည်။

### Rating Control

**Trigger:** Schema property name `rating` ဖြင့်ဆုံး

```json
{ "rating": { "type": "integer", "minimum": 1, "maximum": 5 } }
```

Hover preview နှင့် click-to-select ပါ interactive ကြယ် ၅ ပွင့် rating component render ပါသည်။

### Age Slider Control

**Trigger:** Schema property name `age` ဖြင့်ဆုံး

```json
{ "age": { "type": "integer", "minimum": 18, "maximum": 100 } }
```

Schema မှ `minimum` နှင့် `maximum` ကို respect လုပ်သော Material-UI slider render ပါသည်။

### File Upload Control

**Trigger:** Schema တွင် `format: "data-url"` သို့ `contentMediaType` ရှိ

```json
{ "document": { "type": "string", "format": "data-url" } }
```

File picker button render ပါသည်:
- CSV file validation (`.csv` extension သီးသန့်)
- 5MB maximum file size
- ရွေးချယ်ထားသော file name ပြသခြင်း

### Renderer Priority

Custom renderer များသည် default ကို override ရန် **ranking system** ကို အသုံးပြုပါသည်:

```
Rank 3: Custom renderer များ (Rating, AgeSlider, FileUpload)
Rank 2: Material-UI default renderer များ
Rank 1: Fallback renderer များ
```
