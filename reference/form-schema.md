# Form Definition Schema

Form definitions use [JSON Schema](https://json-schema.org/) for data structure and validation, paired with a [UI Schema](https://jsonforms.io/docs/uischema/) that controls layout and presentation. Both are stored together as a form definition.

## Form Definition Structure

A form definition stored in the Forms API:

```json
{
  "id": "uuid",
  "key": "leave_request",
  "name": "Leave Request Form",
  "schema": { },
  "uiSchema": { },
  "createdAt": "2026-03-22T10:00:00.000Z",
  "updatedAt": "2026-03-22T10:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique identifier (used in mappings) |
| `name` | string | Display name |
| `schema` | JSON Schema | Defines the data structure and validation rules |
| `uiSchema` | UI Schema | Defines the form layout and control rendering |

---

## JSON Schema (Data Definition)

The JSON Schema defines **what data the form collects** and **how to validate it**.

### Basic Structure

```json
{
  "type": "object",
  "properties": {
    "fieldName": {
      "type": "string",
      "minLength": 2,
      "maxLength": 100
    }
  },
  "required": ["fieldName"]
}
```

### Supported Field Types

#### String

```json
{
  "type": "string",
  "minLength": 1,
  "maxLength": 500,
  "pattern": "^[A-Za-z]+$"
}
```

Renders as a text input. Add `format` for special behavior:

| Format | Renderer |
|--------|----------|
| `email` | Email input with validation |
| `date` | Date picker |
| `date-time` | Date-time picker |
| `data-url` | **File upload** (triggers custom FileUpload renderer) |

#### Number / Integer

```json
{
  "type": "integer",
  "minimum": 0,
  "maximum": 100
}
```

Renders as a number input. If the property name ends with `age`, the custom **AgeSlider** renderer activates.

#### Boolean

```json
{
  "type": "boolean"
}
```

Renders as a checkbox.

#### Enum (Dropdown)

```json
{
  "type": "string",
  "enum": ["Low", "Medium", "High", "Critical"]
}
```

Renders as a dropdown/select.

#### Array

```json
{
  "type": "array",
  "items": {
    "type": "string"
  }
}
```

Renders as a dynamic list where users can add/remove items.

#### Nested Object

```json
{
  "type": "object",
  "properties": {
    "street": { "type": "string" },
    "city": { "type": "string" },
    "zip": { "type": "string" }
  }
}
```

Renders as a grouped section of inputs.

### Validation Rules

| Rule | Applies To | Example |
|------|-----------|---------|
| `required` | object | `"required": ["name", "email"]` |
| `minLength` / `maxLength` | string | `"minLength": 2` |
| `minimum` / `maximum` | number, integer | `"minimum": 0` |
| `pattern` | string | `"pattern": "^\\d{3}-\\d{4}$"` |
| `format` | string | `"format": "email"` |
| `enum` | string, number | `"enum": ["A", "B", "C"]` |
| `minItems` / `maxItems` | array | `"minItems": 1` |

Validation is handled by **AJV** (Another JSON Schema Validator) at form submission time.

---

## UI Schema (Layout Definition)

The UI Schema defines **how the form looks** — field ordering, grouping, and which custom controls to use.

### Layout Types

#### VerticalLayout

Fields stacked vertically (most common):

```json
{
  "type": "VerticalLayout",
  "elements": [
    { "type": "Control", "scope": "#/properties/name" },
    { "type": "Control", "scope": "#/properties/email" },
    { "type": "Control", "scope": "#/properties/message" }
  ]
}
```

#### HorizontalLayout

Fields side-by-side:

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

Labeled section with a border:

```json
{
  "type": "Group",
  "label": "Personal Information",
  "elements": [
    { "type": "Control", "scope": "#/properties/name" },
    { "type": "Control", "scope": "#/properties/age" }
  ]
}
```

#### Categorization (Tabs)

Multi-tab layout:

```json
{
  "type": "Categorization",
  "elements": [
    {
      "type": "Category",
      "label": "Basic Info",
      "elements": [
        { "type": "Control", "scope": "#/properties/name" }
      ]
    },
    {
      "type": "Category",
      "label": "Details",
      "elements": [
        { "type": "Control", "scope": "#/properties/description" }
      ]
    }
  ]
}
```

### Control Element

Each control maps to a field in the JSON Schema:

```json
{
  "type": "Control",
  "scope": "#/properties/fieldName",
  "label": "Custom Label",
  "options": {
    "multi": true
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"Control"` | Yes | Must be `"Control"` |
| `scope` | string | Yes | JSON Pointer to the schema property |
| `label` | string | No | Override the default label |
| `options` | object | No | Renderer-specific options |

### Nesting Layouts

Layouts can be nested to create complex forms:

```json
{
  "type": "VerticalLayout",
  "elements": [
    {
      "type": "Group",
      "label": "Applicant",
      "elements": [
        {
          "type": "HorizontalLayout",
          "elements": [
            { "type": "Control", "scope": "#/properties/firstName" },
            { "type": "Control", "scope": "#/properties/lastName" }
          ]
        },
        { "type": "Control", "scope": "#/properties/email" }
      ]
    },
    {
      "type": "Group",
      "label": "Request Details",
      "elements": [
        { "type": "Control", "scope": "#/properties/description" },
        { "type": "Control", "scope": "#/properties/priority" }
      ]
    }
  ]
}
```

---

## Custom Renderers

The platform extends JSON Forms with custom controls that activate automatically based on schema properties.

### Rating Control

**Triggers when:** The schema property name ends with `rating`

**Schema:**
```json
{
  "rating": {
    "type": "integer",
    "minimum": 1,
    "maximum": 5
  }
}
```

**Renders:** An interactive 5-star rating component with hover preview and click-to-select.

### Age Slider Control

**Triggers when:** The schema property name ends with `age`

**Schema:**
```json
{
  "age": {
    "type": "integer",
    "minimum": 18,
    "maximum": 100
  }
}
```

**Renders:** A Material-UI slider that respects `minimum` and `maximum` from the schema.

### File Upload Control

**Triggers when:** The schema has `format: "data-url"` or `contentMediaType` is set

**Schema:**
```json
{
  "document": {
    "type": "string",
    "format": "data-url"
  }
}
```

**Renders:** A file picker button with:
- CSV file validation (`.csv` extension only)
- 5MB maximum file size
- Selected file name display
- Stores the `File` object in the form data

When a file is present in the submission, the form is submitted as `multipart/FormData` instead of JSON.

### Renderer Priority

Custom renderers use a **ranking system** to override defaults. The standard Material-UI renderers have rank 2. Custom renderers are registered with rank 3, giving them priority when their tester condition matches.

```
Rank 3: Custom renderers (Rating, AgeSlider, FileUpload)
Rank 2: Material-UI default renderers
Rank 1: Fallback renderers
```

---

## Complete Example

### JSON Schema

```json
{
  "type": "object",
  "properties": {
    "applicantName": {
      "type": "string",
      "minLength": 2,
      "maxLength": 100
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "department": {
      "type": "string",
      "enum": ["Engineering", "Marketing", "Finance", "HR", "Operations"]
    },
    "age": {
      "type": "integer",
      "minimum": 18,
      "maximum": 65
    },
    "requestType": {
      "type": "string",
      "enum": ["Leave", "Equipment", "Travel", "Training"]
    },
    "description": {
      "type": "string",
      "maxLength": 1000
    },
    "priority": {
      "type": "string",
      "enum": ["Low", "Medium", "High"]
    },
    "rating": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "attachment": {
      "type": "string",
      "format": "data-url"
    }
  },
  "required": ["applicantName", "email", "department", "requestType"]
}
```

### UI Schema

```json
{
  "type": "VerticalLayout",
  "elements": [
    {
      "type": "Group",
      "label": "Applicant Information",
      "elements": [
        {
          "type": "HorizontalLayout",
          "elements": [
            { "type": "Control", "scope": "#/properties/applicantName" },
            { "type": "Control", "scope": "#/properties/email" }
          ]
        },
        {
          "type": "HorizontalLayout",
          "elements": [
            { "type": "Control", "scope": "#/properties/department" },
            { "type": "Control", "scope": "#/properties/age" }
          ]
        }
      ]
    },
    {
      "type": "Group",
      "label": "Request Details",
      "elements": [
        { "type": "Control", "scope": "#/properties/requestType" },
        {
          "type": "Control",
          "scope": "#/properties/description",
          "options": { "multi": true }
        },
        { "type": "Control", "scope": "#/properties/priority" }
      ]
    },
    {
      "type": "Group",
      "label": "Additional",
      "elements": [
        { "type": "Control", "scope": "#/properties/rating", "label": "Urgency Rating" },
        { "type": "Control", "scope": "#/properties/attachment", "label": "Supporting Document" }
      ]
    }
  ]
}
```

This form renders:
- **Applicant section:** name + email side-by-side, department dropdown + age slider side-by-side
- **Request section:** request type dropdown, multi-line description, priority dropdown
- **Additional section:** 5-star urgency rating, file upload for CSV documents
