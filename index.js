const core = require('@actions/core')
const github = require('@actions/github')
const Asana = require('asana')

const GITHUB = {
  ACTIONS: {
    INPUTS: {
      ASANA_PAT: core.getInput('asana-pat', { required: true }),
      TRIGGER_PHRASE: core.getInput('trigger-phrase', { required: true }),
      TASK_COMMENT: core.getInput('task-comment'),
      TARGET_SECTION: core.getInput('target-section'),
      MARK_COMPLETE: core.getInput('mark-complete') === 'true'
    }
  },
  PR: {
    DESCRIPTION: github.context.payload.pull_request.body,
    URL: github.context.payload.pull_request.html_url
  }
}

const ASANA = {
  setToken: function () {
    const client = Asana.ApiClient.instance
    const token = client.authentications['token']
    token.accessToken = GITHUB.ACTIONS.INPUTS.ASANA_PAT
  },
  extractTasks: function () {
    const matches = []

    const triggerIndex = GITHUB.PR.DESCRIPTION.indexOf(
      GITHUB.ACTIONS.INPUTS.TRIGGER_PHRASE
    )

    const textAfterTrigger = GITHUB.PR.DESCRIPTION.slice(
      triggerIndex + GITHUB.ACTIONS.INPUTS.TRIGGER_PHRASE.length
    )

    const linkRegex =
      /(?:\[(.*?)\]\()?(https:\/\/app\.asana\.com\/(?<urlVersion>\d+)\/(?<workspaceId>\d+)(?:\/project\/(?<projectId>\d+))?(?:\/task\/(?<taskId>\d+))?)(?:\))?/g
    let match

    while ((match = linkRegex.exec(textAfterTrigger)) !== null) {
      const { urlVersion, projectId, taskId } = match.groups

      if (urlVersion !== '1') {
        core.setFailed('Unsupported Asana URL version')

        return
      }

      if (!projectId) {
        core.setFailed('No project ID found in PR description')

        return
      }

      if (!taskId) {
        core.setFailed('No task ID found in PR description')

        return
      }

      matches.push({ projectId, taskId })
    }

    return matches
  },
  moveTask: async function ({ projectId, taskId }) {
    this.setToken()
    const sectionService = new Asana.SectionsApi()
    const taskService = new Asana.TasksApi()

    const sections = await sectionService.getSectionsForProject(projectId)
    const task = await taskService.getTask(taskId)
    const isSubTask = !!task.data.parent

    if (!isSubTask) {
      try {
        await sectionService.addTaskForSection(
          sections.data.find(
            s => s.name === GITHUB.ACTIONS.INPUTS.TARGET_SECTION
          ).gid,
          {
            body: { data: { task: taskId } }
          }
        )

        core.info(
          `Task ${taskId} moved to ${GITHUB.ACTIONS.INPUTS.TARGET_SECTION}`
        )
      } catch (error) {
        core.setFailed(
          `Failed to move task ${taskId} to ${GITHUB.ACTIONS.INPUTS.TARGET_SECTION}`
        )
      }
    }
  },
  addComment: async function ({ taskId }) {
    this.setToken()
    const storyService = new Asana.StoriesApi()

    try {
      await storyService.createStoryForTask(
        {
          data: {
            text: GITHUB.ACTIONS.INPUTS.TASK_COMMENT + GITHUB.PR.URL
          }
        },
        taskId
      )

      core.info(`Comment added to task ${taskId}`)
    } catch (error) {
      core.setFailed(`Failed to add comment to task ${taskId}`)
    }
  },
  markComplete: async function ({ taskId }) {
    this.setToken()
    const taskService = new Asana.TasksApi()
    try {
      await taskService.updateTask({ data: { completed: true } }, taskId)
      core.info(`Task ${taskId} marked as complete`)
    } catch (error) {
      core.setFailed(`Failed to mark task ${taskId} as complete`)
    }
  }
}

const run = async () => {
  if (!GITHUB.PR.DESCRIPTION.includes(GITHUB.ACTIONS.INPUTS.TRIGGER_PHRASE)) {
    core.info('Trigger phrase not matched in PR description')

    return
  }

  const tasks = ASANA.extractTasks()

  if (tasks.length === 0) {
    core.info('No tasks found in PR description')

    return
  }

  for (const { projectId, taskId } of tasks) {
    if (GITHUB.ACTIONS.INPUTS.TASK_COMMENT) {
      await ASANA.addComment({ taskId })
    }

    if (GITHUB.ACTIONS.INPUTS.TARGET_SECTION) {
      await ASANA.moveTask({ projectId, taskId })
    }

    if (GITHUB.ACTIONS.INPUTS.MARK_COMPLETE) {
      await ASANA.markComplete({ taskId })
    }
  }
}

try {
  run()
} catch (error) {
  core.setFailed(error.message)
}
