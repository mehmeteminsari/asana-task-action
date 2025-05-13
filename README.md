# 🔧 Asana Task Action

This GitHub Action automates Asana task operations based on pull request (PR) descriptions. It is especially useful for keeping your task board in sync with development activities.

When a PR contains a specific trigger phrase, the action will:

- 🔗 Detect and extract **Asana task links** after the trigger phrase
- 💬 Add a comment (with a PR link) to each detected task
- 📦 Move main tasks to a specified section
- ✅ Mark tasks as complete (optional)

---

## ✅ Inputs

### `asana-pat` (required)
- **Description**: Your [Asana Personal Access Token](https://app.asana.com/0/developer-console) used to authenticate API requests.
- **Type**: `string`

### `trigger-phrase` (required)
- **Description**: The phrase that marks the beginning of Asana task links in the PR body.  
  > Only the task links **after** this phrase are processed.
- **Type**: `string`
- **Example**: `'ASANA TASKS:'`

### `task-comment` (optional)
- **Description**: The text of the comment that will be added to each task.  
  The PR link is automatically appended to the end of this comment.
- **Type**: `string`
- **Example**: `'Linked PR: ' → Comment becomes: "Linked PR: https://github.com/org/repo/pull/123"`

### `target-section` (optional)
- **Description**: The name of the section within the Asana project to which a task should be moved.  
  Only applies to **main tasks** (not subtasks).
- **Type**: `string`

### `mark-complete` (optional)
- **Description**: Whether to mark each task as completed after processing.
- **Type**: `boolean`
- **Default**: `false`

---

## 🚀 Example Usage

### PR description
```
Implements authentication flow and fixes logout bug.

https://app.asana.com/1/123456789/project/123456789/task/123456789 ❌

ASANA TASKS:

[Auth task](https://app.asana.com/1/123456789/project/123456789/task/123456789) ✔️

https://app.asana.com/1/123456789/project/123456789/task/123456789 ✔️

https://app.asana.com/1/123456789/project/123456789/task/123456789?focus=true ✔️

Sub Tasks:

- [Auth subtask](https://app.asana.com/1/123456789/project/123456789/task/123456789) ✔️
```

### Workflow
```yaml
name: Process Asana Tasks

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  process-asana-tasks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Trigger Asana Task Manager Action
        uses: your-username/asana-task-manager-action@v1
        with:
          asana-pat: ${{ secrets.ASANA_PAT }}
          trigger-phrase: 'ASANA_TASK'
          task-comment: 'PR has been created or updated: '
          target-section: 'In Progress'
          mark-complete: true
