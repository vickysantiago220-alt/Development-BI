import pptxgen from "pptxgenjs";
import jsPDF from "jspdf";

type PlanningTask = {
  id?: string;
  name?: string;
  dueDate?: Date | null;
  priority?: string;
  projectPriority?: string;
  planningPriority?: string;
  planningStatus?: string;
  project?: { name?: string };
  list?: { name?: string };
  responsible?: string[];
};

type PlanningDeveloper = {
  name: string;
  tasks: PlanningTask[];
};

type PlanningData = {
  nextWeekStart: Date;
  nextWeekEnd: Date;
  tasks: PlanningTask[];
  developers: PlanningDeveloper[];
};

const getProjectName = (task: PlanningTask) =>
  task.project?.name && task.project.name !== "hidden"
    ? task.project.name
    : task.list?.name || "Sem projeto";

const formatDate = (date: Date | null | undefined) =>
  date
    ? date.toLocaleDateString("pt-BR")
    : "Sem prazo";

const loadLogo = async () => { const response = await fetch("/dev-management-logo-color.svg"); const svg = await response.text(); const blob = new Blob([svg], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob); return await new Promise<string>((resolve, reject) => { const img = new Image(); img.onload = () => { const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth || 800; canvas.height = img.naturalHeight || 200; const context = canvas.getContext("2d"); if (!context) { URL.revokeObjectURL(url); reject(new Error("Não foi possível preparar a logo.")); return; } context.drawImage(img, 0, 0); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/png")); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível carregar a logo.")); }; img.src = url; }); };

export async function exportPlanningPptx(data: PlanningData) {
  const pptx = new pptxgen();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "DEV MANAGEMENT BI";
  pptx.subject = "Planejamento Semanal";
  pptx.title = "Planejamento Semanal";
  pptx.company = "DEV MANAGEMENT BI";

  const logo = await loadLogo();

  const navy = "163A63";
  const blue = "1683D8";
  const light = "F7F8FA";
  const gray = "64748B";
  const green = "16845B";
  const amber = "C88719";
  const red = "C53A43";

  const addHeader = (slide: pptxgen.Slide, title: string) => {
    slide.background = { color: "FFFFFF" };

    slide.addImage({
      data: logo,
      x: 0.45,
      y: 0.28,
      w: 2.15,
      h: 0.62,
    });

    slide.addText(title, {
      x: 0.45,
      y: 1.05,
      w: 11.8,
      h: 0.42,
      fontFace: "Aptos Display",
      fontSize: 23,
      bold: true,
      color: navy,
      margin: 0,
    });

    slide.addShape(pptx.ShapeType.line, {
      x: 0.45,
      y: 1.55,
      w: 12.3,
      h: 0,
      line: { color: "DCE3EA", width: 1 },
    });
  };

  const addFooter = (slide: pptxgen.Slide) => {
    slide.addText(
      `DEV MANAGEMENT BI • ClickUp • ${formatDate(data.nextWeekStart)} – ${formatDate(data.nextWeekEnd)}`,
      {
        x: 0.45,
        y: 7.05,
        w: 12,
        h: 0.2,
        fontSize: 8,
        color: gray,
        margin: 0,
        align: "right",
      }
    );
  };

  // CAPA
  {
    const slide = pptx.addSlide();
    slide.background = { color: navy };

    slide.addImage({
      data: logo,
      x: 0.7,
      y: 0.75,
      w: 3.5,
      h: 1.05,
    });

    slide.addText("PLANEJAMENTO", {
      x: 0.75,
      y: 2.45,
      w: 8,
      h: 0.4,
      fontSize: 15,
      bold: true,
      color: "8EC9FF",
      charSpacing: 2,
      margin: 0,
    });

    slide.addText("Planejamento Semanal", {
      x: 0.7,
      y: 2.95,
      w: 10.8,
      h: 0.8,
      fontSize: 34,
      bold: true,
      color: "FFFFFF",
      margin: 0,
    });

    slide.addText(
      `${formatDate(data.nextWeekStart)} – ${formatDate(data.nextWeekEnd)}`,
      {
        x: 0.72,
        y: 3.9,
        w: 7,
        h: 0.4,
        fontSize: 18,
        color: "D9E7F5",
        margin: 0,
      }
    );

    slide.addText("DEV MANAGEMENT BI", {
      x: 0.72,
      y: 6.65,
      w: 5,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: "FFFFFF",
      margin: 0,
    });
  }

  // RESUMO
  {
    const slide = pptx.addSlide();
    addHeader(slide, "Resumo executivo");

    const planned = data.tasks.filter(
      (task) => task.planningStatus !== "Sem prazo"
    );

    const developers = data.developers.filter(
      (developer) => developer.name !== "Sem responsável"
    );

    const projects = new Set(planned.map(getProjectName)).size;

    const withoutResponsible = planned.filter(
      (task) => !task.responsible?.length
    ).length;

    const cards = [
      ["Demandas planejadas", String(planned.length), blue],
      ["Desenvolvedores", String(developers.length), navy],
      ["Projetos envolvidos", String(projects), green],
      ["Sem responsável", String(withoutResponsible), red],
    ];

    cards.forEach(([label, value, color], index) => {
      const x = 0.55 + index * 3.05;

      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.95,
        w: 2.75,
        h: 1.35,
        rectRadius: 0.08,
        fill: { color: "F7F9FC" },
        line: { color: "E2E8F0", width: 1 },
      });

      slide.addText(label, {
        x: x + 0.18,
        y: 2.15,
        w: 2.35,
        h: 0.25,
        fontSize: 10,
        bold: true,
        color: gray,
        margin: 0,
      });

      slide.addText(value, {
        x: x + 0.18,
        y: 2.48,
        w: 2.35,
        h: 0.5,
        fontSize: 25,
        bold: true,
        color,
        margin: 0,
      });
    });

    slide.addText("Leitura gerencial", {
      x: 0.55,
      y: 3.75,
      w: 3,
      h: 0.35,
      fontSize: 17,
      bold: true,
      color: navy,
      margin: 0,
    });

    slide.addText(
      `O planejamento reúne ${planned.length} demandas com prazo definido para a próxima semana, distribuídas entre ${developers.length} desenvolvedores e ${projects} projetos. ${withoutResponsible > 0 ? `${withoutResponsible} demandas ainda precisam de responsável definido.` : "Todas as demandas possuem responsável definido."}`,
      {
        x: 0.55,
        y: 4.25,
        w: 11.8,
        h: 1.05,
        fontSize: 15,
        color: gray,
        breakLine: false,
        margin: 0.05,
        valign: "middle",
      }
    );

    addFooter(slide);
  }

  // CALENDÁRIO
  {
    const slide = pptx.addSlide();
    addHeader(slide, "Calendário de entregas");

    for (let index = 0; index < 7; index++) {
      const date = new Date(data.nextWeekStart);
      date.setDate(date.getDate() + index);

      const dayTasks = data.tasks.filter((task) => {
        if (!task.dueDate) return false;

        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        return due.getTime() === date.getTime();
      });

      const x = 0.35 + index * 1.77;

      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.85,
        w: 1.58,
        h: 4.65,
        rectRadius: 0.05,
        fill: { color: "F8FAFC" },
        line: {
          color: dayTasks.length >= 15
            ? "F0B7BB"
            : dayTasks.length >= 8
              ? "F4D99B"
              : "E2E8F0",
          width: 1,
        },
      });

      slide.addText(
        date.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase(),
        {
          x: x + 0.12,
          y: 2.08,
          w: 1.3,
          h: 0.25,
          fontSize: 9,
          bold: true,
          color: gray,
          margin: 0,
          align: "center",
        }
      );

      slide.addText(String(date.getDate()).padStart(2, "0"), {
        x: x + 0.12,
        y: 2.38,
        w: 1.3,
        h: 0.4,
        fontSize: 22,
        bold: true,
        color: navy,
        margin: 0,
        align: "center",
      });

      slide.addText(`${dayTasks.length} entregas`, {
        x: x + 0.12,
        y: 2.9,
        w: 1.3,
        h: 0.25,
        fontSize: 9,
        color: dayTasks.length >= 15 ? red : gray,
        bold: dayTasks.length >= 8,
        margin: 0,
        align: "center",
      });

            const projectGroups = new Map<string, { count: number; developers: string[]; priority: string }>();

      dayTasks.forEach((task) => {
        const project = getProjectName(task).trim() || "Sem projeto";

        if (!projectGroups.has(project)) {
          projectGroups.set(project, {
            count: 0,
            developers: [],
            priority: task.projectPriority || "Não definida",
          });
        }

        const group = projectGroups.get(project)!;
        group.count += 1;

        const priorityRank: Record<string, number> = {
          Alta: 3,
          Média: 2,
          Baixa: 1,
          "Não definida": 0,
        };

        const taskPriority = task.projectPriority || "Não definida";

        if (
          (priorityRank[taskPriority] || 0) >
          (priorityRank[group.priority] || 0)
        ) {
          group.priority = taskPriority;
        }

        const developers = task.responsible?.length
          ? task.responsible
          : ["Sem responsável"];

        developers.forEach((developer) => {
          if (!group.developers.includes(developer)) {
            group.developers.push(developer);
          }
        });
      });

      Array.from(projectGroups.entries())
        .slice(0, 4)
        .forEach(([project, group], index) => {
          const y = 3.35 + index * 0.68;

          slide.addText(`${project} (${group.count})`, {
            x: x + 0.12,
            y,
            w: 1.32,
            h: 0.25,
            fontSize: 7,
            bold: true,
            color: navy,
            margin: 0,
            breakLine: false,
          });

          slide.addText(group.developers.join(", "), {
            x: x + 0.12,
            y: y + 0.25,
            w: 1.32,
            h: 0.28,
            fontSize: 5.5,
            color: gray,
            margin: 0,
            breakLine: false,
          });
        });

      if (dayTasks.length > 6) {
        slide.addText(`+ ${dayTasks.length - 6} demandas`, {
          x: x + 0.12,
          y: 6.08,
          w: 1.32,
          h: 0.2,
          fontSize: 7,
          color: gray,
          italic: true,
          margin: 0,
        });
      }
    }

    addFooter(slide);
  }

  // DESENVOLVEDORES
  {
    const slide = pptx.addSlide();
    addHeader(slide, "Organização por desenvolvedor");

    const developers = [...data.developers]
      .filter((developer) => developer.name !== "Sem responsável")
      .sort((a, b) => b.tasks.length - a.tasks.length);

    developers.slice(0, 8).forEach((developer, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 0.55 + col * 6.15;
      const y = 1.85 + row * 1.28;

      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 5.75,
        h: 1.05,
        rectRadius: 0.04,
        fill: { color: "F8FAFC" },
        line: { color: "E2E8F0", width: 1 },
      });

      slide.addText(developer.name, {
        x: x + 0.2,
        y: y + 0.18,
        w: 3.9,
        h: 0.25,
        fontSize: 13,
        bold: true,
        color: navy,
        margin: 0,
      });

      slide.addText(`${developer.tasks.length} demandas`, {
        x: x + 0.2,
        y: y + 0.53,
        w: 3,
        h: 0.2,
        fontSize: 9,
        color: gray,
        margin: 0,
      });

      const high = developer.tasks.filter(
        (task) => task.priority === "Alta"
      ).length;

      slide.addText(
        high > 0 ? `${high} de alta prioridade` : "Sem alta prioridade",
        {
          x: x + 3.55,
          y: y + 0.35,
          w: 1.9,
          h: 0.25,
          fontSize: 9,
          bold: high > 0,
          color: high > 0 ? red : green,
          margin: 0,
          align: "right",
        }
      );
    });

    addFooter(slide);
  }

  // DETALHAMENTO
  {
    const developers = [...data.developers]
      .filter((developer) => developer.name !== "Sem responsável")
      .sort((a, b) => b.tasks.length - a.tasks.length);

    developers.forEach((developer) => {
      const slide = pptx.addSlide();
      addHeader(slide, developer.name);

      slide.addText(
        `${developer.tasks.length} demandas planejadas`,
        {
          x: 0.55,
          y: 1.75,
          w: 5,
          h: 0.3,
          fontSize: 12,
          color: gray,
          margin: 0,
        }
      );

      developer.tasks.slice(0, 10).forEach((task, index) => {
        const y = 2.2 + index * 0.42;

        slide.addText(task.name || "Sem nome", {
          x: 0.55,
          y,
          w: 6.8,
          h: 0.24,
          fontSize: 9,
          color: navy,
          margin: 0,
          breakLine: false,
        });

        slide.addText(formatDate(task.dueDate), {
          x: 7.55,
          y,
          w: 1.4,
          h: 0.24,
          fontSize: 8,
          color: gray,
          margin: 0,
          align: "center",
        });

        slide.addText(task.projectPriority || "Não definida", {
          x: 9.15,
          y,
          w: 1.35,
          h: 0.24,
          fontSize: 8,
          color:
            task.projectPriority === "Alta"
              ? red
              : task.projectPriority === "Média"
                ? amber
                : green,
          margin: 0,
          align: "center",
        });

        slide.addText(task.priority || "Não definida", {
          x: 10.7,
          y,
          w: 1.35,
          h: 0.24,
          fontSize: 8,
          color:
            task.priority === "Alta"
              ? red
              : task.priority === "Normal"
                ? amber
                : green,
          margin: 0,
          align: "center",
        });
      });

      if (developer.tasks.length > 10) {
        slide.addText(
          `+ ${developer.tasks.length - 10} demandas adicionais`,
          {
            x: 0.55,
            y: 6.55,
            w: 5,
            h: 0.25,
            fontSize: 9,
            italic: true,
            color: gray,
            margin: 0,
          }
        );
      }

      addFooter(slide);
    });
  }

  await pptx.writeFile({
    fileName: `Planejamento_Semanal_${formatDate(data.nextWeekStart).replaceAll("/", "-")}.pptx`,
  });
}

export async function exportPlanningPdf(data: PlanningData) {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const navy = "#163A63";
  const blue = "#1683D8";
  const green = "#008844";
  const red = "#D33D44";
  const amber = "#D97706";
  const gray = "#64748B";
  const light = "#F7F9FC";
  const border = "#E2E8F0";
  const white = "#FFFFFF";

  const pageWidth = 297;
  const pageHeight = 210;

  const planned = data.tasks.filter(
    (task) => task.planningStatus !== "Sem prazo"
  );

  const developers = data.developers.filter(
    (developer) => developer.name !== "Sem responsável"
  );

  const projects = new Set(planned.map(getProjectName)).size;

  const withoutResponsible = planned.filter(
    (task) => !task.responsible?.length
  ).length;

  const highAttention = planned.filter(
    (task) =>
      task.planningPriority === "Prioridade máxima" ||
      task.planningPriority === "Alta atenção"
  ).length;

  const drawHeader = (title: string, subtitle?: string) => {
    pdf.setFillColor(navy);
    pdf.rect(0, 0, pageWidth, 22, "F");

    pdf.setTextColor(white);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("DEV MANAGEMENT BI", 16, 9);

    pdf.setFontSize(15);
    pdf.text(title, 16, 18);

    if (subtitle) {
      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(subtitle, pageWidth - 16, 18, { align: "right" });
    }
  };

  const drawFooter = (page: number) => {
    pdf.setDrawColor(border);
    pdf.line(16, 199, pageWidth - 16, 199);

    pdf.setTextColor(gray);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(
      "DEV MANAGEMENT BI • Planejamento semanal baseado nos dados sincronizados do ClickUp",
      16,
      205
    );
    pdf.text(String(page), pageWidth - 16, 205, { align: "right" });
  };

  const drawCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    accent: string
  ) => {
    pdf.setFillColor(light);
    pdf.setDrawColor(border);
    pdf.roundedRect(x, y, w, h, 3, 3, "FD");

    pdf.setFillColor(accent);
    pdf.roundedRect(x, y, 2.5, h, 1, 1, "F");

    pdf.setTextColor(gray);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(label, x + 7, y + 9);

    pdf.setTextColor(navy);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(21);
    pdf.text(value, x + 7, y + 23);
  };

  const getDayTasks = (date: Date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return planned.filter((task) => {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === target.getTime();
    });
  };

  let page = 1;

  // CAPA
  pdf.setFillColor(navy);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFillColor(blue);
  pdf.roundedRect(18, 24, 8, 8, 2, 2, "F");

  pdf.setTextColor(white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text("DEV MANAGEMENT BI", 18, 52);

  pdf.setFontSize(25);
  pdf.text("Planejamento Semanal", 18, 70);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  pdf.setTextColor("#D9E7F5");
  pdf.text(
    `${formatDate(data.nextWeekStart)} – ${formatDate(data.nextWeekEnd)}`,
    18,
    82
  );

  pdf.setTextColor("#B8C7D9");
  pdf.setFontSize(9);
  pdf.text(
    "Visão executiva das demandas previstas, responsáveis, projetos e concentração de entregas.",
    18,
    96
  );

  pdf.setDrawColor("#31557D");
  pdf.line(18, 111, 120, 111);

  pdf.setTextColor(white);
  pdf.setFontSize(9);
  pdf.text("Fonte dos dados", 18, 124);

  pdf.setTextColor("#D9E7F5");
  pdf.text("ClickUp • sincronização do DEV MANAGEMENT BI", 18, 132);

  pdf.setTextColor("#D9E7F5");
  pdf.setFontSize(8);
  pdf.text("Documento gerado automaticamente pelo sistema.", 18, 184);

  // RESUMO EXECUTIVO
  pdf.addPage();
  page++;
  drawHeader(
    "Resumo executivo",
    `${formatDate(data.nextWeekStart)} – ${formatDate(data.nextWeekEnd)}`
  );

  drawCard(16, 34, 61, 31, "Demandas planejadas", String(planned.length), blue);
  drawCard(83, 34, 61, 31, "Desenvolvedores", String(developers.length), navy);
  drawCard(150, 34, 61, 31, "Projetos envolvidos", String(projects), green);
  drawCard(217, 34, 61, 31, "Sem responsável", String(withoutResponsible), red);

  pdf.setTextColor(navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("Indicadores de atenção", 16, 83);

  drawCard(16, 91, 82, 31, "Demandas em alta atenção", String(highAttention), amber);

  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(data.nextWeekStart);
    date.setDate(date.getDate() + index);
    return date;
  });

  const maxDayLoad = Math.max(
    0,
    ...dates.map((date) => getDayTasks(date).length)
  );

  drawCard(104, 91, 82, 31, "Maior concentração diária", String(maxDayLoad), red);

  drawCard(
    192,
    91,
    86,
    31,
    "Projetos com entregas",
    String(projects),
    green
  );

  pdf.setTextColor(navy);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("Leitura executiva", 16, 146);

  pdf.setTextColor(gray);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  const executiveText = [
    `• ${planned.length} demandas estão previstas para a próxima semana.`,
    `• ${developers.length} desenvolvedores possuem demandas planejadas.`,
    `• ${projects} projetos possuem entregas previstas.`,
    `• ${withoutResponsible} demandas planejadas ainda estão sem responsável.`,
    `• O maior volume concentrado em um único dia é de ${maxDayLoad} entregas.`,
  ];

  executiveText.forEach((text, index) => {
    pdf.text(text, 20, 158 + index * 7);
  });

  drawFooter(page);

  // CALENDÁRIO
  pdf.addPage();
  page++;
  drawHeader(
    "Calendário de entregas",
    "Entregas organizadas por desenvolvedores e projetos"
  );

  const columnWidth = 38;
  const startX = 16;
  const startY = 34;

  dates.forEach((date, index) => {
    const tasks = getDayTasks(date);
    const x = startX + index * columnWidth;

    const projectPriorities = tasks
      .map((task) => task.projectPriority || "Não definida")
      .filter(Boolean);

    const dayProjectPriority = projectPriorities.includes("Alta")
      ? "Alta"
      : projectPriorities.includes("Média")
        ? "Média"
        : projectPriorities.includes("Baixa")
          ? "Baixa"
          : "Não definida";

    const projectPriorityColor =
      dayProjectPriority === "Alta"
        ? red
        : dayProjectPriority === "Média"
          ? amber
          : dayProjectPriority === "Baixa"
            ? green
            : "#94A3B8";

    const isHigh = tasks.length >= 15;
    const isAttention = tasks.length >= 8 && tasks.length < 15;

    const cardFill = isHigh
      ? "#FFF1F2"
      : isAttention
        ? "#FFFBEB"
        : "#F8FAFC";

    const accent = isHigh
      ? red
      : isAttention
        ? amber
        : "#94A3B8";

    const badgeFill = isHigh
      ? "#FEE2E2"
      : isAttention
        ? "#FEF3C7"
        : "#DCFCE7";

    const badgeText = isHigh
      ? red
      : isAttention
        ? amber
        : green;

    pdf.setFillColor(cardFill);
    pdf.setDrawColor(border);
    pdf.roundedRect(x, startY, 35.5, 141, 4, 4, "FD");

    // Faixa superior do dia
    pdf.setFillColor(accent);
    pdf.roundedRect(x, startY, 35.5, 16, 4, 4, "F");
    pdf.rect(x, startY + 8, 35.5, 8, "F");

    const weekday = date
      .toLocaleDateString("pt-BR", { weekday: "short" })
      .replace(".", "")
      .toUpperCase();

    pdf.setTextColor(white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text(weekday, x + 4, startY + 7);

    pdf.setTextColor(white);
    pdf.setFontSize(5.5);
    pdf.text(
      `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`,
      x + 31,
      startY + 7,
      { align: "right" }
    );


    // Número de entregas
    pdf.setFillColor(white);
    pdf.setDrawColor("#E2E8F0");
    pdf.roundedRect(x + 3, startY + 21, 29.5, 28, 3, 3, "FD");


    pdf.setTextColor(navy);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text(String(tasks.length), x + 17.75, startY + 34, {
      align: "center",
    });

    pdf.setTextColor(gray);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(
      tasks.length === 1 ? "entrega" : "entregas",
      x + 17.75,
      startY + 42,
      { align: "center" }
    );

    // Badge de carga
    const statusLabel = isHigh
      ? "ALTA CONCENTRAÇÃO"
      : isAttention
        ? "ATENÇÃO"
        : tasks.length === 0
          ? "SEM ENTREGAS"
          : "CARGA NORMAL";

    pdf.setFillColor(badgeFill);
    pdf.roundedRect(x + 3, startY + 53, 29.5, 10, 2.5, 2.5, "F");

    pdf.setTextColor(badgeText);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.3);
    pdf.text(statusLabel, x + 17.75, startY + 59.5, {
      align: "center",
    });

    if (tasks.length === 0) {
      // Estado vazio
      pdf.setDrawColor("#CBD5E1");
      pdf.setLineWidth(0.5);
      pdf.circle(x + 17.75, startY + 84, 7, "S");

      pdf.setTextColor("#94A3B8");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("—", x + 17.75, startY + 86.5, {
        align: "center",
      });

      pdf.setTextColor(navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.text("Nenhuma entrega", x + 17.75, startY + 101, {
        align: "center",
      });

      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.5);

      const emptyLines = pdf.splitTextToSize(
        "Nenhuma demanda prevista para este dia.",
        28
      );

      pdf.text(emptyLines, x + 17.75, startY + 109, {
        align: "center",
      });
    } else {
      // Lista de demandas
      const projectGroups = new Map<string, { count: number; developers: string[]; priority: string }>();

      tasks.forEach((task) => {
        const project = getProjectName(task).trim() || "Sem projeto";

        if (!projectGroups.has(project)) {
          projectGroups.set(project, {
            count: 0,
            developers: [],
            priority: task.projectPriority || "Não definida",
          });
        }

        const group = projectGroups.get(project)!;
        group.count += 1;

        const priorityRank: Record<string, number> = {
          Alta: 3,
          Média: 2,
          Baixa: 1,
          "Não definida": 0,
        };

        const taskPriority = task.projectPriority || "Não definida";

        if (
          (priorityRank[taskPriority] || 0) >
          (priorityRank[group.priority] || 0)
        ) {
          group.priority = taskPriority;
        }

        const developers = task.responsible?.length
          ? task.responsible
          : ["Sem responsável"];

        developers.forEach((developer) => {
          if (!group.developers.includes(developer)) {
            group.developers.push(developer);
          }
        });
      });

      let projectY = startY + 72;

      Array.from(projectGroups.entries())
        .sort(([, a], [, b]) => {
          const rank: Record<string, number> = {
            Alta: 3,
            Média: 2,
            Baixa: 1,
            "Não definida": 0,
          };

          return (rank[b.priority] || 0) - (rank[a.priority] || 0);
        })
        .slice(0, 2)
        .forEach(([project, group]) => {
          const isPriorityProject = group.priority === "Alta";

          if (isPriorityProject) {
            pdf.setFillColor("#FEE2E2");
            pdf.roundedRect(x + 4, projectY - 3, 27.5, 13, 2, 2, "F");

            pdf.setFillColor(red);
            pdf.roundedRect(x + 4, projectY - 3, 1.5, 13, 0.75, 0.75, "F");
          }

          pdf.setTextColor(isPriorityProject ? red : navy);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(isPriorityProject ? 5.4 : 5.2);

          const projectLines = pdf.splitTextToSize(
            `${project} (${group.count})`,
            25
          );

          pdf.text(projectLines.slice(0, 2), x + 7, projectY);

          const projectHeight = projectLines.length > 1 ? 6 : 3.5;

          pdf.setTextColor(gray);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(4.3);

          const developerLines = pdf.splitTextToSize(
            group.developers.join(", "),
            27
          );

          pdf.text(
            developerLines.slice(0, 2),
            x + 7,
            projectY + projectHeight + 2
          );

          projectY += projectHeight + 10;

          pdf.setDrawColor("#E2E8F0");
          pdf.setLineWidth(0.25);
          pdf.line(
            x + 4,
            projectY - 4,
            x + columnWidth - 4,
            projectY - 4
          );
        });

      if (projectGroups.size > 2) {
        pdf.setTextColor(gray);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(4.2);
        pdf.text(
          `Detalhamento completo nas páginas seguintes`,
          x + 17.75,
          startY + 120,
          { align: "center" }
        );
      }    }
  });

  drawFooter(page);

  // ORGANIZAÇÃO POR DESENVOLVEDOR
  pdf.addPage();
  page++;
  drawHeader(
    "Organização por desenvolvedor",
    "Demandas previstas para a próxima semana"
  );

  let y = 36;

  developers.forEach((developer) => {
    const developerTasks = planned.filter((task) =>
      task.responsible?.some(
        (person) => person === developer.name
      )
    );

    if (y > 174) {
      drawFooter(page);
      pdf.addPage();
      page++;
      drawHeader(
        "Organização por desenvolvedor",
        "Continuação"
      );
      y = 36;
    }

    pdf.setFillColor(light);
    pdf.setDrawColor(border);
    pdf.roundedRect(16, y, 265, 19, 3, 3, "FD");

    pdf.setTextColor(navy);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(developer.name, 23, y + 8);

    pdf.setTextColor(blue);
    pdf.setFontSize(12);
    pdf.text(String(developerTasks.length), 250, y + 9, {
      align: "right",
    });

    pdf.setTextColor(gray);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("demandas", 258, y + 8);

    y += 25;
  });

  drawFooter(page);

  // DETALHAMENTO POR DESENVOLVEDOR
  developers.forEach((developer) => {
    const developerTasks = planned
      .filter((task) =>
        task.responsible?.some(
          (person) => person === developer.name
        )
      )
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    pdf.addPage();
    page++;

    drawHeader(
      developer.name,
      `${developerTasks.length} demandas previstas`
    );

    pdf.setTextColor(navy);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Demandas planejadas", 16, 34);

    let rowY = 44;

    developerTasks.forEach((task, index) => {
      if (rowY > 181) {
        drawFooter(page);
        pdf.addPage();
        page++;
        drawHeader(
          developer.name,
          "Continuação das demandas"
        );
        rowY = 34;
      }

      const demandPriority = task.priority || "Não definida";
      const planningPriority = task.planningPriority || "Não definida";
      const project = getProjectName(task);

      pdf.setFillColor(index % 2 === 0 ? white : light);
      pdf.setDrawColor(border);
      pdf.rect(16, rowY - 5, 265, 20, "FD");

      pdf.setTextColor(navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      const titleLines = pdf.splitTextToSize(
        `${index + 1}. ${task.name || "Sem nome"}`,
        112
      );
      pdf.text(titleLines.slice(0, 2), 20, rowY + 1);

      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.text(project.slice(0, 38), 20, rowY + 10);

      pdf.setTextColor(gray);
      pdf.text(
        task.dueDate ? formatDate(task.dueDate) : "Sem prazo",
        139,
        rowY + 1
      );

      pdf.setTextColor(
        demandPriority === "Alta" ? red :
        demandPriority === "Normal" ? blue :
        demandPriority === "Baixa" ? green : gray
      );
      pdf.setFont("helvetica", "bold");
      pdf.text(`Demanda: ${demandPriority}`, 177, rowY + 1);

      pdf.setTextColor(
        planningPriority === "Prioridade máxima" ? red :
        planningPriority === "Alta atenção" ? amber :
        planningPriority === "Planejar" ? blue : gray
      );
      pdf.text(
        `Planejamento: ${planningPriority}`,
        177,
        rowY + 10
      );

      rowY += 22;
    });

    if (developerTasks.length === 0) {
      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Nenhuma demanda planejada.", 20, 50);
    }

    drawFooter(page);
  });

  // SEM RESPONSÁVEL
  const unassigned = planned.filter(
    (task) => !task.responsible?.length
  );

  if (unassigned.length > 0) {
    pdf.addPage();
    page++;

    drawHeader(
      "Demandas sem responsável",
      `${unassigned.length} demandas precisam de definição`
    );

    pdf.setTextColor(red);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("Demandas aguardando responsável", 16, 35);

    let rowY = 45;

    unassigned.forEach((task, index) => {
      if (rowY > 181) {
        drawFooter(page);
        pdf.addPage();
        page++;
        drawHeader(
          "Demandas sem responsável",
          "Continuação"
        );
        rowY = 34;
      }

      pdf.setFillColor(index % 2 === 0 ? white : light);
      pdf.setDrawColor(border);
      pdf.rect(16, rowY - 5, 265, 19, "FD");

      pdf.setTextColor(navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(
        `${index + 1}. ${(task.name || "Sem nome").slice(0, 72)}`,
        20,
        rowY + 1
      );

      pdf.setTextColor(gray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.text(getProjectName(task).slice(0, 42), 20, rowY + 9);

      pdf.text(
        task.dueDate ? formatDate(task.dueDate) : "Sem prazo",
        205,
        rowY + 5
      );

      rowY += 21;
    });

    drawFooter(page);
  }

  // ENCERRAMENTO
  pdf.addPage();
  page++;

  pdf.setFillColor(navy);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setTextColor(white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(23);
  pdf.text("Planejamento concluído", 18, 58);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor("#D9E7F5");
  pdf.text(
    "Este documento representa a camada de gestão do DEV MANAGEMENT BI.",
    18,
    72
  );
  pdf.text(
    "As demandas e prazos apresentados são provenientes do ClickUp.",
    18,
    81
  );

  pdf.setDrawColor("#31557D");
  pdf.line(18, 98, 120, 98);

  pdf.setTextColor(white);
  pdf.setFontSize(9);
  pdf.text(
    `${planned.length} demandas • ${developers.length} desenvolvedores • ${projects} projetos`,
    18,
    112
  );

  pdf.setTextColor("#B8C7D9");
  pdf.setFontSize(8);
  pdf.text(
    "O planejamento não altera automaticamente o ClickUp.",
    18,
    183
  );

  pdf.save(
    `Planejamento_Semanal_${formatDate(data.nextWeekStart).replaceAll("/", "-")}.pdf`
  );
}





















