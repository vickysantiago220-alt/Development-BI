import { db } from "./db";

type ClickUpProject = {
  id?: string | null;
  name?: string | null;
  color?: string | null;
  status?: string | null;
  priority?: string | null;
};

type ClickUpTask = {
  id?: string | null;
  name?: string | null;
  project?: {
    id?: string | null;
    name?: string | null;
    color?: string | null;
  } | null;
  list?: {
    id?: string | null;
    name?: string | null;
  } | null;
  status?: {
    name?: string | null;
  } | null;
  priority?: {
    priority?: string | null;
    name?: string | null;
    color?: string | null;
  } | string | null;
  assignees?: Array<{
    username?: string | null;
    email?: string | null;
  }> | null;
  creator?: {
    username?: string | null;
    email?: string | null;
  } | null;
  dates?: {
    createdAt?: string | null;
    dueDate?: string | null;
    dateDone?: string | null;
  } | null;
  hours?: {
    estimated?: number | null;
    tracked?: number | null;
  } | null;
  url?: string | null;
};

function toDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toMysqlDate(value?: string | null) {
  const date = toDate(value);

  if (!date) return null;

  return date.toISOString().slice(0, 19).replace("T", " ");
}

function getPriority(priority: ClickUpTask["priority"]) {
  if (!priority) return null;

  if (typeof priority === "string") {
    return priority;
  }

  return priority.priority || priority.name || null;
}

function getAssignee(task: ClickUpTask) {
  return (
    task.assignees
      ?.map((assignee) => assignee.username || assignee.email)
      .filter(Boolean)
      .join(", ") || null
  );
}

function getCreator(task: ClickUpTask) {
  return task.creator?.username || task.creator?.email || null;
}

async function persistProjects(
  connection: Awaited<ReturnType<typeof db.getConnection>>,
  projects: ClickUpProject[]
) {
  const validProjects = projects.filter((project) => project.id);

  if (!validProjects.length) return;

  const placeholders = validProjects
    .map(() => "(?, ?, ?, ?, ?, NOW())")
    .join(", ");

  const values = validProjects.flatMap((project) => [
    project.id || null,
    project.name || "Sem projeto",
    project.color || null,
    project.status || null,
    project.priority || null,
  ]);

  await connection.execute(
    `
      INSERT INTO bi_clickup_projects
        (
          clickup_id,
          name,
          color,
          status,
          priority,
          last_synced_at
        )
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        color = VALUES(color),
        status = VALUES(status),
        priority = VALUES(priority),
        last_synced_at = NOW()
    `,
    values
  );
}

async function persistTasks(
  connection: Awaited<ReturnType<typeof db.getConnection>>,
  tasks: ClickUpTask[]
) {
  const validTasks = tasks.filter(
    (task) => task.id && task.name
  );

  if (!validTasks.length) return;

  const BATCH_SIZE = 500;

  for (let i = 0; i < validTasks.length; i += BATCH_SIZE) {
    const batch = validTasks.slice(i, i + BATCH_SIZE);

    const placeholders = batch
      .map(
        () =>
          "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
      )
      .join(", ");

    const values = batch.flatMap((task) => [
      task.id || null,
      task.project?.id || null,
      task.project?.name || null,
      task.project?.color || null,
      task.list?.id || null,
      task.list?.name || null,
      task.name || null,
      task.status?.name || null,
      getPriority(task.priority),
      getAssignee(task),
      getCreator(task),
      toMysqlDate(task.dates?.createdAt),
      toMysqlDate(task.dates?.dueDate),
      toMysqlDate(task.dates?.dateDone),
      task.hours?.estimated ?? null,
      task.hours?.tracked ?? null,
      task.url || null,
    ]);

    await connection.execute(
      `
        INSERT INTO bi_clickup_tasks
          (
            clickup_id,
            project_clickup_id,
            project_name,
            project_color,
            list_clickup_id,
            list_name,
            name,
            status,
            priority,
            assignee,
            creator,
            date_created,
            date_due,
            date_done,
            time_estimate,
            time_spent,
            task_url,
            last_synced_at
          )
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          project_clickup_id = VALUES(project_clickup_id),
          project_name = VALUES(project_name),
          project_color = VALUES(project_color),
          list_clickup_id = VALUES(list_clickup_id),
          list_name = VALUES(list_name),
          name = VALUES(name),
          status = VALUES(status),
          priority = VALUES(priority),
          assignee = VALUES(assignee),
          creator = VALUES(creator),
          date_created = VALUES(date_created),
          date_due = VALUES(date_due),
          date_done = VALUES(date_done),
          time_estimate = VALUES(time_estimate),
          time_spent = VALUES(time_spent),
          task_url = VALUES(task_url),
          last_synced_at = NOW()
      `,
      values
    );
  }
}

export async function persistClickUpSnapshot({
  projects,
  tasks,
}: {
  projects: ClickUpProject[];
  tasks: ClickUpTask[];
}) {
  const connection = await db.getConnection();

  const startedAt = new Date();

  try {
    await connection.beginTransaction();

    await persistProjects(connection, projects);
    await persistTasks(connection, tasks);

    const finishedAt = new Date();

    await connection.execute(
      `
        INSERT INTO bi_clickup_sync_history
          (
            started_at,
            finished_at,
            status,
            projects_count,
            tasks_count
          )
        VALUES (?, ?, 'success', ?, ?)
      `,
      [
        startedAt,
        finishedAt,
        projects.length,
        tasks.length,
      ]
    );

    await connection.commit();

    return {
      success: true,
      projects: projects.length,
      tasks: tasks.length,
    };
  } catch (error) {
    await connection.rollback();

    const finishedAt = new Date();

    try {
      await connection.execute(
        `
          INSERT INTO bi_clickup_sync_history
            (
              started_at,
              finished_at,
              status,
              projects_count,
              tasks_count,
              error_message
            )
          VALUES (?, ?, 'error', ?, ?, ?)
        `,
        [
          startedAt,
          finishedAt,
          0,
          0,
          error instanceof Error
            ? error.message
            : "Erro desconhecido na persistência do ClickUp.",
        ]
      );
    } catch {
      // Não sobrescreve o erro original caso o registro do histórico também falhe.
    }

    throw error;
  } finally {
    connection.release();
  }
}

