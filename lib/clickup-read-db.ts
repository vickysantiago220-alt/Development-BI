import { db } from "./db";

export async function getClickUpSnapshotFromDb() {
  const [lastSyncRows] = await db.query("SELECT finished_at FROM bi_clickup_sync_history WHERE status = 'success' ORDER BY id DESC LIMIT 1");
  const lastSyncedAt = (lastSyncRows as any[])[0]?.finished_at || null;
  const [projects] = await db.query(`
    SELECT
      clickup_id,
      name,
      color,
      status,
      priority
    FROM bi_clickup_projects
    ORDER BY name
  `);

  const [tasks] = await db.query(`
    SELECT
      clickup_id,
      name,
      project_clickup_id,
      project_name,
      project_color,
      list_clickup_id,
      list_name,
      status,
      status_color,
      status_type,
      priority,
      assignee,
      creator,
      date_created,
      date_due,
      date_done,
      time_estimate,
      time_spent,
      task_url
    FROM bi_clickup_tasks
    ORDER BY date_due IS NULL, date_due
  `);

  return {
    success: true,
    lastSyncedAt,
    projects: (projects as any[]).map((project) => ({
      id: project.clickup_id,
      name: project.name,
      color: project.color,
      status: project.status,
      priority: project.priority,
    })),
    tasks: (tasks as any[]).map((task) => ({
      id: task.clickup_id,
      name: task.name,

      project: task.project_clickup_id
        ? {
            id: task.project_clickup_id,
            name: task.project_name,
            color: task.project_color,
            priority: (projects as any[]).find((project) => project.clickup_id === task.project_clickup_id)?.priority || null,
          }
        : null,

      list: task.list_clickup_id
        ? {
            id: task.list_clickup_id,
            name: task.list_name,
          }
        : null,

      status: task.status
        ? {
            name: task.status,
            status: task.status,
            color: task.status_color,
            type: task.status_type,
          }
        : null,

      priority: task.priority
          ? {
              name: task.priority,
              priority: task.priority,
            }
          : null,

      responsible: task.assignee
        ? task.assignee
            .split(",")
            .map((username: string) => username.trim())
            .filter(Boolean)
            .map((username: string) => ({
              id: username,
              name: username,
              username,
            }))
        : [],

      creator: task.creator
        ? {
            name: task.creator,
            username: task.creator,
          }
        : null,

      dates: {
        createdAt: task.date_created,
        dueDate: task.date_due,
        dateDone: task.date_done,
      },

      hours: {
        estimated: task.time_estimate,
        tracked: task.time_spent,
      },

      url: task.task_url,
    })),
  };
}









