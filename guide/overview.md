# Overview

## What is FlowForge?

FlowForge is a **workflow automation platform** that lets you:

1. **Define forms** using JSON Schema — no frontend code required
2. **Design workflows** visually with a drag-and-drop builder
3. **Map forms to workflows** so that submitting a form automatically triggers an approval process
4. **Execute workflows** through a backend engine that handles task assignment, conditional branching, parallel execution, SLA monitoring, and escalation

The system is designed so that **business processes can be created and modified entirely through configuration**, without deploying new code.

## The Problem

Most enterprise applications need approval workflows — new user signups, document reviews, expense approvals, access requests. Building these typically means:

- **Hard-coding** each form as a custom page
- **Hard-coding** each workflow as application logic with if/else chains
- **Re-deploying** every time a workflow changes or a new form field is needed
- **Duplicating** approval logic across different features

This makes changes slow, error-prone, and expensive.

## The Solution

FlowForge separates **what to collect** (forms) from **how to process it** (workflows) and makes both configurable at runtime:

| Layer | What it does | How it's configured |
|-------|-------------|-------------------|
| **Forms** | Collect user input | JSON Schema + UI Schema |
| **Workflows** | Process the input through approval steps | Visual workflow builder → JSON definition |
| **Mapping** | Connect a form to a workflow | Admin portal UI |
| **Execution** | Run the workflow when a form is submitted | Automatic — handled by the engine |

### Example: Adding a New Approval Process

Without FlowForge:
1. Design database tables
2. Build a form page
3. Write approval logic
4. Add notification handling
5. Build an admin view
6. Deploy and test

With FlowForge:
1. Create a JSON Schema for the form in the admin portal
2. Design the workflow in the visual builder
3. Create a mapping between them
4. Done — users can submit the form immediately

## System Components

The platform consists of two core systems and a demo project:

### Core Systems

| System | Role | Port |
|--------|------|------|
| **Admin Portal** (`dynamic-workflow`) | Build forms, design workflows, create mappings, monitor execution | 5174 |
| **Workflow Engine** (`poc-workflow-engine`) | Execute workflows, manage tasks, process SLAs, handle events | 3002 |

### Supporting Services

| Service | Role | Port |
|---------|------|------|
| **Forms API** | Store form definitions, submissions, and mappings | 3001 |
| **Workflow Master** | Store workflow definitions (JSON Server) | 5000 |
| **Redis** | Job queue backend (BullMQ) | 6379 |
| **PostgreSQL** | Workflow instance persistence | 5432 |

### Demo Project

| Project | Role | Port |
|---------|------|------|
| **Request Form Demo** (`request-form-demo`) | Shows how to build a user-facing portal that renders forms and submits to workflows | 5173 |

## Key Capabilities

### Dynamic Form Rendering
- Forms defined as JSON Schema + UI Schema
- Rendered at runtime using [JSON Forms](https://jsonforms.io/)
- Custom controls: star ratings, sliders, file uploads, and more
- Validation powered by AJV (JSON Schema validation)

### Visual Workflow Builder
- Drag-and-drop canvas powered by [React Flow (XYFlow)](https://reactflow.dev/)
- 7 node types: Start, End, Task, Service, Decision, Parallel Gateway, Parallel Join
- Configure task assignments, HTTP services, JEXL conditions, and SLA rules
- Export/import workflows as JSON

### Workflow Execution Engine
- Processes workflow definitions node-by-node
- JEXL expression evaluation for conditions and dynamic values
- Parallel branch orchestration with configurable join strategies
- BullMQ-backed job queues for async HTTP calls and SLA monitoring
- Multi-level SLA escalation (notify → reassign → force-complete)
- Event dispatch system for external triggers

### Real-time Monitoring
- Live workflow instance tracking with auto-refresh
- Stage-by-stage timeline visualization
- Full action history audit log
- Server-Sent Events for push notifications

## Who Is This For?

| Audience | Use Case |
|----------|----------|
| **Platform teams** | Embed a configurable workflow engine into your product |
| **Enterprise developers** | Replace hard-coded approval flows with dynamic configuration |
| **Internal tools teams** | Build admin portals with form-driven processes |
| **Architects** | Reference implementation for workflow orchestration patterns |

## Next Steps

- [**Architecture**](/guide/architecture) — Understand how the pieces fit together
- [**Admin Portal**](/guide/admin-portal) — Deep dive into the form builder and workflow designer
- [**Workflow Engine**](/guide/workflow-engine) — How the engine executes workflows behind the scenes
- [**Integration Guide**](/guide/integration) — How to integrate this into your own project
