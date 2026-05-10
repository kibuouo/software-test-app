import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { banks, knowledgeNotes, knowledgePoints, questions } from "./data.js";
import "./styles.css";

const h = React.createElement;
const ALL = "全部";
const navItems = [
  ["dashboard", "学习总览", "grid"],
  ["practice", "题库练习", "cards"],
  ["exam", "模拟考试", "timer"],
  ["history", "答题记录", "history"],
  ["knowledge", "知识要点", "book"],
];

function useLocalState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function Icon({ name }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const parts = {
    grid: [h("rect", { x: 3, y: 3, width: 7, height: 7, rx: 1.5 }), h("rect", { x: 14, y: 3, width: 7, height: 7, rx: 1.5 }), h("rect", { x: 3, y: 14, width: 7, height: 7, rx: 1.5 }), h("rect", { x: 14, y: 14, width: 7, height: 7, rx: 1.5 })],
    cards: [h("path", { d: "M8 4h9a2 2 0 0 1 2 2v11" }), h("rect", { x: 5, y: 7, width: 11, height: 13, rx: 2 }), h("path", { d: "M8 11h5M8 15h4" })],
    timer: [h("path", { d: "M10 2h4M12 8v5l3 2" }), h("circle", { cx: 12, cy: 14, r: 7 })],
    history: [h("path", { d: "M3 12a9 9 0 1 0 3-6.7L3 8" }), h("path", { d: "M3 4v4h4M12 7v5l3 2" })],
    book: [h("path", { d: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H7a3 3 0 0 0-3 3z" }), h("path", { d: "M4 5.5V22M8 7h8M8 11h7" })],
    check: [h("path", { d: "m5 12 4 4L19 6" })],
    close: [h("path", { d: "M6 6l12 12" }), h("path", { d: "M18 6 6 18" })],
    arrow: [h("path", { d: "M5 12h14M13 6l6 6-6 6" })],
  };
  return h("svg", props, ...(parts[name] || []));
}

const normalize = (answer) => (Array.isArray(answer) ? [...answer].sort((a, b) => a - b) : answer === null || answer === undefined ? [] : [answer]);
const pct = (value) => `${Math.round(value * 100)}%`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function isCorrect(question, answer) {
  const expected = normalize(question.answer);
  const selected = normalize(answer);
  return expected.length === selected.length && expected.every((item, index) => item === selected[index]);
}

function answerText(question, answer) {
  const indexes = normalize(answer);
  return indexes.length ? indexes.map((index) => `${String.fromCharCode(65 + index)}. ${question.options[index]}`).join("；") : "未作答";
}

function clock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getStats(bankId, history) {
  const bank = banks.find((item) => item.id === bankId) || banks[0];
  const bankQuestions = questions.filter((item) => item.bankId === bankId);
  const records = history.filter((item) => item.bankId === bankId);
  const answeredIds = new Set(records.map((item) => item.questionId));
  const attempts = records.length;
  const correct = records.filter((item) => item.correct).length;
  const accuracy = attempts ? correct / attempts : 0;
  const coverage = bankQuestions.length ? answeredIds.size / bankQuestions.length : 0;
  const examRecords = records.filter((item) => item.mode === "模拟考试");
  const examAccuracy = examRecords.length ? examRecords.filter((item) => item.correct).length / examRecords.length : accuracy;
  const passRate = clamp(0.18 + coverage * 0.32 + accuracy * 0.34 + examAccuracy * 0.16, 0, 0.98);
  const moduleStats = bank.modules.map((module) => {
    const moduleQuestions = bankQuestions.filter((item) => item.module === module);
    const moduleRecords = records.filter((item) => item.module === module);
    const answered = new Set(moduleRecords.map((item) => item.questionId)).size;
    const moduleAccuracy = moduleRecords.length ? moduleRecords.filter((item) => item.correct).length / moduleRecords.length : 0;
    return { module, total: moduleQuestions.length, answered, accuracy: moduleAccuracy, coverage: moduleQuestions.length ? answered / moduleQuestions.length : 0 };
  });
  return { attempts, correct, accuracy, coverage, passRate, total: bankQuestions.length, moduleStats };
}

function App() {
  const [bankId, setBankId] = useLocalState("exam-app-bank", "ncre3");
  const [module, setModule] = useLocalState("exam-app-module", ALL);
  const [view, setView] = useLocalState("exam-app-view", "dashboard");
  const [history, setHistory] = useLocalState("exam-app-history", []);
  const [noteProgress, setNoteProgress] = useLocalState("exam-app-note-progress", {});
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [exam, setExam] = useState({ questions: [], index: 0, answers: {}, startedAt: null, result: null });
  const [now, setNow] = useState(Date.now());
  const bank = banks.find((item) => item.id === bankId) || banks[0];
  const stats = useMemo(() => getStats(bankId, history), [bankId, history]);
  const filtered = useMemo(() => {
    const bankQuestions = questions.filter((item) => item.bankId === bankId);
    return module === ALL ? bankQuestions : bankQuestions.filter((item) => item.module === module);
  }, [bankId, module]);
  const current = filtered[index % filtered.length] || filtered[0];
  const points = knowledgePoints.filter((item) => item.bankId === bankId && (module === ALL || item.module === module));
  const noteBook = knowledgeNotes.find((item) => item.bankId === bankId);
  const [noteId, setNoteId] = useState("");
  const recent = history.filter((item) => item.bankId === bankId).slice(0, 8);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIndex(0);
    setAnswer(null);
    setSubmitted(false);
    setNoteId("");
  }, [bankId, module]);

  function addRecord(question, selected, mode) {
    const record = {
      id: `${question.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      bankId: question.bankId,
      questionId: question.id,
      module: question.module,
      stem: question.stem,
      options: question.options,
      selected,
      correctAnswer: question.answer,
      correct: isCorrect(question, selected),
      mode,
      createdAt: new Date().toISOString(),
    };
    setHistory((items) => [record, ...items].slice(0, 120));
    return record;
  }

  function choosePractice(option) {
    if (!current || submitted) return;
    if (Array.isArray(current.answer)) {
      const selected = normalize(answer);
      setAnswer(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option].sort((a, b) => a - b));
    } else {
      setAnswer(option);
    }
  }

  function startExam() {
    const pool = [...filtered].sort(() => Math.random() - 0.5).slice(0, Math.min(6, filtered.length));
    setExam({ questions: pool, index: 0, answers: {}, startedAt: Date.now(), result: null });
    setView("exam");
  }

  function chooseExam(option) {
    const question = exam.questions[exam.index];
    const currentAnswer = exam.answers[question.id];
    const next = Array.isArray(question.answer)
      ? normalize(currentAnswer).includes(option)
        ? normalize(currentAnswer).filter((item) => item !== option)
        : [...normalize(currentAnswer), option].sort((a, b) => a - b)
      : option;
    setExam((state) => ({ ...state, answers: { ...state.answers, [question.id]: next } }));
  }

  function submitExam() {
    const records = exam.questions.map((question) => addRecord(question, exam.answers[question.id], "模拟考试"));
    const correct = records.filter((item) => item.correct).length;
    setExam((state) => ({ ...state, result: { total: records.length, correct, accuracy: records.length ? correct / records.length : 0, duration: Date.now() - state.startedAt } }));
  }

  let main;
  if (view === "exam") main = h(Exam, { exam, now, setExam, startExam, chooseExam, submitExam });
  else if (view === "history") main = h(History, { records: history.filter((item) => item.bankId === bankId), full: true, clear: () => setHistory((items) => items.filter((item) => item.bankId !== bankId)) });
  else if (view === "knowledge") main = h(KnowledgeNotes, { noteBook, module, noteId, setNoteId, noteProgress, setNoteProgress });
  else if (view === "dashboard") main = h(Overview, { bank, bankId, module, stats, history, points, setView, startExam });
  else main = h("div", { className: "content-grid" }, h(QuestionCard, { question: current, answer, submitted, onChoose: choosePractice, onSubmit: () => { addRecord(current, answer, "题库练习"); setSubmitted(true); }, onNext: () => { setIndex((value) => (value + 1) % filtered.length); setAnswer(null); setSubmitted(false); }, index, total: filtered.length }), h("aside", { className: "insight-column" }, h(Assessment, { stats }), h(Knowledge, { points, moduleStats: stats.moduleStats }), h(History, { records: recent })));

  return h("div", { className: "app-shell" },
    h(Sidebar, { bank, bankId, setBankId, setModule, view, setView, stats }),
    h("main", { className: "workspace" },
      h("header", { className: "topbar" }, h("div", null, h("p", null, bank.target), h("h1", null, `${bank.name}题库与知识要点`)), h("div", { className: "top-actions" }, h("button", { className: "ghost-button", onClick: () => setView("history"), type: "button" }, h(Icon, { name: "history" }), "记录"), h("button", { className: "primary-button", onClick: startExam, type: "button" }, h(Icon, { name: "timer" }), "开始模拟考试"))),
      h("section", { className: "subject-tabs", "aria-label": bankId === "ncre3" ? "计算机三级二级科目" : "软考资格方向" },
        h("div", { className: "subject-tabs-head" }, h("span", null, bankId === "ncre3" ? "二级科目" : "资格方向"), h("strong", null, module === ALL ? "全部" : module)),
        h("div", { className: "module-tabs" }, ...[ALL, ...bank.modules].map((item) => h("button", { className: module === item ? "active" : "", key: item, onClick: () => setModule(item), type: "button" }, item))),
      ),
      h(Dashboard, { stats, history, bankId }),
      main,
    ),
  );
}

function Sidebar({ bank, bankId, setBankId, setModule, view, setView, stats }) {
  return h("aside", { className: "sidebar", "aria-label": "主导航" },
    h("div", { className: "brand" }, h("div", { className: "brand-mark" }, "Q"), h("div", null, h("strong", null, "题库训练台"), h("span", null, "三级 / 软工备考"))),
    h("div", { className: "bank-switch" }, ...banks.map((item) => h("button", { className: item.id === bankId ? "active" : "", key: item.id, onClick: () => { setBankId(item.id); setModule(ALL); }, type: "button" }, h("span", null, item.shortName), item.name))),
    h("nav", { className: "nav-list" }, ...navItems.map(([id, label, iconName]) => h("button", { className: view === id ? "active" : "", key: id, onClick: () => setView(id), type: "button" }, h(Icon, { name: iconName }), label))),
    h("div", { className: "sidebar-progress" }, h("span", null, `${bank.name}总进度`), h("strong", null, pct(stats.coverage)), h("div", { className: "meter" }, h("span", { style: { width: pct(stats.coverage) } }))),
  );
}

function Dashboard({ stats, history, bankId }) {
  const today = new Date().toDateString();
  const todayCount = history.filter((item) => item.bankId === bankId && new Date(item.createdAt).toDateString() === today).length;
  return h("section", { className: "dashboard-strip", "aria-label": "学习进度" },
    h(Metric, { label: "今日学习进度", value: `${todayCount} 题`, detail: "练习与模拟均计入" }),
    h(Metric, { label: "累计正确率", value: pct(stats.accuracy), detail: `${stats.correct}/${stats.attempts || 0} 次答对` }),
    h(Metric, { label: "题库覆盖率", value: pct(stats.coverage), detail: `已覆盖 ${Math.round(stats.coverage * stats.total)}/${stats.total} 题` }),
    h(Metric, { label: "预计通过率", value: pct(stats.passRate), detail: stats.passRate >= 0.72 ? "建议进入套卷训练" : "继续补齐薄弱模块" }),
  );
}

function Metric({ label, value, detail }) {
  return h("div", { className: "metric" }, h("span", null, label), h("strong", null, value), h("p", null, detail));
}

function Overview({ bank, bankId, module, stats, history, points, setView, startExam }) {
  const bankQuestions = questions.filter((item) => item.bankId === bankId);
  const sourceCounts = bankQuestions.reduce((acc, item) => {
    acc[item.sourceType] = (acc[item.sourceType] || 0) + 1;
    return acc;
  }, {});
  const weak = [...stats.moduleStats].sort((a, b) => a.coverage + a.accuracy - (b.coverage + b.accuracy)).slice(0, 3);
  const latest = history.filter((item) => item.bankId === bankId).slice(0, 4);
  const planTitle = stats.coverage < 0.4 ? "先补覆盖率" : stats.accuracy < 0.7 ? "转入错题复盘" : "开始限时套卷";
  const planCopy = stats.coverage < 0.4
    ? "优先把每个标签页至少做一轮，先建立知识点覆盖。"
    : stats.accuracy < 0.7
      ? "集中处理错误记录，把解析里的知识点补到笔记。"
      : "通过率已进入较高区间，建议每天做一组模拟考试保持手感。";

  return h("section", { className: "overview-grid" },
    h("div", { className: "overview-main panel" },
      h("div", { className: "overview-hero" },
        h("div", null,
          h("span", null, bankId === "ncre3" ? "考试科目总览" : "软考资格总览"),
          h("h2", null, `${bank.name}学习总览`),
          h("p", null, `当前标签：${module === ALL ? "全部" : module}。${planCopy}`),
        ),
        h("div", { className: "pass-card" }, h("span", null, "预计通过率"), h("strong", null, pct(stats.passRate))),
      ),
      h("div", { className: "overview-actions" },
        h("button", { className: "primary-button", onClick: () => setView("practice"), type: "button" }, "进入题库练习"),
        h("button", { className: "ghost-button", onClick: startExam, type: "button" }, h(Icon, { name: "timer" }), "开始模拟考试"),
        h("button", { className: "ghost-button", onClick: () => setView("knowledge"), type: "button" }, h(Icon, { name: "book" }), "查看知识要点"),
      ),
      h("div", { className: "module-progress-list" },
        ...stats.moduleStats.map((item) => h("article", { className: "module-progress", key: item.module },
          h("div", null, h("strong", null, item.module), h("span", null, `覆盖 ${item.answered}/${item.total} · 正确率 ${pct(item.accuracy)}`)),
          h("div", { className: "meter" }, h("span", { style: { width: pct(item.coverage) } })),
        )),
      ),
    ),
    h("aside", { className: "overview-side" },
      h("section", { className: "panel" },
        h("div", { className: "panel-title" }, h("h2", null, "下一步建议"), h("span", null, planTitle)),
        h("div", { className: "advice-list" }, ...weak.map((item, index) => h("div", { className: "advice-item", key: item.module }, h("span", null, `${index + 1}`), h("div", null, h("strong", null, item.module), h("p", null, `覆盖率 ${pct(item.coverage)}，正确率 ${pct(item.accuracy)}。建议优先补题。`))))),
      ),
      h("section", { className: "panel" },
        h("div", { className: "panel-title" }, h("h2", null, "题源分布"), h("span", null, `${bankQuestions.length} 题`)),
        h("div", { className: "source-list" }, ...Object.entries(sourceCounts).map(([name, count]) => h("div", { className: "source-row", key: name }, h("span", null, name), h("strong", null, `${count} 题`)))),
      ),
      h("section", { className: "panel" },
        h("div", { className: "panel-title" }, h("h2", null, "近期动态"), h("span", null, `${latest.length} 条`)),
        latest.length
          ? h("div", { className: "history-list compact" }, ...latest.map((record) => h("article", { className: "history-row", key: record.id }, h("div", { className: record.correct ? "status-dot ok" : "status-dot bad" }), h("div", null, h("strong", null, record.stem), h("span", null, `${record.module} · ${record.mode}`)))))
          : h("div", { className: "empty-state" }, "还没有学习记录。先进入题库练习完成第一题。"),
      ),
      h("section", { className: "panel" },
        h("div", { className: "panel-title" }, h("h2", null, "知识覆盖"), h("span", null, `${points.length} 条`)),
        h("div", { className: "overview-points" }, ...points.slice(0, 4).map((point) => h("span", { key: point.title }, point.title))),
      ),
    ),
  );
}

function QuestionCard({ question, answer, submitted, onChoose, onSubmit, onNext, index, total, examMode = false }) {
  if (!question) return null;
  const selected = normalize(answer);
  const expected = normalize(question.answer);
  const correct = submitted && isCorrect(question, answer);
  return h("section", { className: "question-card" },
    h("div", { className: "question-head" }, h("div", null, h("span", { className: "tag" }, question.module), h("span", { className: "tag muted" }, question.type), h("span", { className: "tag muted" }, question.difficulty), h("span", { className: "tag source" }, `${question.year} ${question.sourceType}`)), h("strong", null, `${index + 1}/${total}`)),
    h("h2", null, question.stem),
    h("div", { className: "option-list" }, ...question.options.map((option, i) => h("button", { className: ["option-button", selected.includes(i) ? "selected" : "", submitted && expected.includes(i) ? "correct" : "", submitted && selected.includes(i) && !expected.includes(i) ? "wrong" : ""].filter(Boolean).join(" "), key: option, onClick: () => onChoose(i), type: "button" }, h("span", null, String.fromCharCode(65 + i)), option, submitted && expected.includes(i) ? h(Icon, { name: "check" }) : null, submitted && selected.includes(i) && !expected.includes(i) ? h(Icon, { name: "close" }) : null))),
    h("div", { className: "question-actions" }, examMode ? null : h("button", { className: "primary-button", disabled: !selected.length || submitted, onClick: onSubmit, type: "button" }, "提交答案"), h("button", { className: "ghost-button", onClick: onNext, type: "button" }, "下一题", h(Icon, { name: "arrow" }))),
    examMode ? null : h("div", { className: `explanation ${submitted ? "show" : ""}` }, submitted ? [h("div", { className: correct ? "result correct-text" : "result wrong-text", key: "r" }, correct ? "回答正确" : "需要复盘"), h("p", { key: "a" }, h("strong", null, "正确答案："), answerText(question, question.answer)), h("p", { key: "e" }, question.explanation), h("div", { className: "point-row", key: "p" }, ...question.points.map((point) => h("span", { key: point }, point)))] : h("div", { className: "result" }, "提交后显示答案解析")),
  );
}

function Assessment({ stats }) {
  const weak = [...stats.moduleStats].sort((a, b) => a.accuracy + a.coverage - (b.accuracy + b.coverage))[0];
  const copy = stats.passRate >= 0.72 ? "当前正确率和覆盖率已接近稳定通过区间，建议每天保留一套模拟卷。" : `建议优先补强「${weak?.module ?? "基础模块"}」，提高覆盖率后再进入限时训练。`;
  return h("section", { className: "panel assessment" }, h("div", { className: "panel-title" }, h("h2", null, "通过率评估"), h("strong", null, pct(stats.passRate))), h("div", { className: "ring", style: { "--score": `${Math.round(stats.passRate * 360)}deg` } }, h("span", null, pct(stats.passRate))), h("p", null, copy));
}

function Knowledge({ points, moduleStats, full = false }) {
  return h("section", { className: full ? "panel full-panel knowledge-full" : "panel" }, h("div", { className: "panel-title" }, h("h2", null, "知识要点"), h("span", null, `${points.length} 条`)), h("div", { className: "knowledge-list" }, ...points.map((point) => {
    const stat = moduleStats.find((item) => item.module === point.module);
    return h("article", { className: "knowledge-item", key: point.title }, h("div", null, h("span", null, point.module), h("h3", null, point.title), h("p", null, point.summary)), h("div", { className: "mini-progress" }, h("span", { style: { width: pct(stat?.coverage ?? 0) } })));
  })));
}

function flattenNotes(noteBook, module) {
  if (!noteBook) return [];
  const chapterMatches = (chapter) => {
    if (module === ALL) return true;
    if (chapter.title === module || chapter.title.includes(module)) return true;
    if (Array.isArray(chapter.scope) && chapter.scope.includes(module)) return true;
    return chapter.sections.some((section) => section.title === module || section.title.includes(module));
  };
  const chapters = noteBook.chapters.filter(chapterMatches);
  return chapters.flatMap((chapter) => chapter.sections.map((section) => ({ chapter, section })));
}

function getNotePosition(noteBook, selected) {
  let absolute = 1;
  for (const chapter of noteBook.chapters) {
    for (const section of chapter.sections) {
      if (section.id === selected.section.id) {
        return {
          absolute,
          chapter: noteBook.chapters.findIndex((item) => item.id === selected.chapter.id) + 1,
          section: selected.chapter.sections.findIndex((item) => item.id === selected.section.id) + 1,
          title: `${String(absolute).padStart(2, "0")}：${selected.section.title}`,
        };
      }
      absolute += 1;
    }
  }
  return { absolute: 1, chapter: 1, section: 1, title: `01：${selected.section.title}` };
}

function noteRule(section) {
  const text = `${section.title} ${section.bullets.join(" ")}`;
  if (/IP|VLAN|STP|路由|NAT|OSPF|网络/.test(text)) {
    return {
      title: "转发判断式",
      value: "目标地址 ∈ 本网段 → 二层直达；目标地址 ∉ 本网段 → 默认网关 → 路由表最长前缀匹配 → NAT / ACL 检查",
    };
  }
  if (/数据库|SQL|事务|索引|范式|候选码|GROUP BY|锁/.test(text)) {
    return {
      title: "数据库解题链",
      value: "关系结构 → 键与依赖 → 查询条件 → 分组聚合 → 事务一致性 → 性能代价",
    };
  }
  if (/安全|加密|签名|XSS|注入|风险|等级保护/.test(text)) {
    return {
      title: "安全分析式",
      value: "资产价值 × 威胁可能性 × 漏洞暴露面 = 风险优先级；控制措施要对应机密性、完整性、可用性",
    };
  }
  if (/Linux|ls|chmod|Shell|进程|权限/.test(text)) {
    return {
      title: "Linux 操作线",
      value: "路径定位 → 文件属性 → 权限位 → 进程状态 → 管道过滤 → 日志验证",
    };
  }
  if (/项目|关键路径|基线|风险|变更/.test(text)) {
    return {
      title: "项目控制线",
      value: "范围基线 + 进度基线 + 成本基线 → 变更影响分析 → 审批 → 执行 → 复盘",
    };
  }
  return {
    title: "通用学习式",
    value: "定义 → 场景 → 条件 → 例题 → 错因复盘",
  };
}

function KnowledgeNotes({ noteBook, module, noteId, setNoteId, noteProgress, setNoteProgress }) {
  const entries = flattenNotes(noteBook, module);
  const selected = entries.find((entry) => entry.section.id === noteId) || entries[0];
  const masteredCount = entries.filter((entry) => noteProgress[entry.section.id]).length;
  const progressValue = entries.length ? masteredCount / entries.length : 0;

  if (!noteBook || !selected) {
    return h("section", { className: "panel full-panel exam-empty" }, h("h2", null, "学习笔记"), h("p", null, "当前标签下暂无笔记。"));
  }

  const selectedDone = Boolean(noteProgress[selected.section.id]);
  const toggleSelected = () => {
    setNoteProgress((current) => ({ ...current, [selected.section.id]: !current[selected.section.id] }));
  };
  const guide = beginnerGuide(selected.section);
  const position = getNotePosition(noteBook, selected);
  const currentEntryIndex = entries.findIndex((entry) => entry.section.id === selected.section.id);
  const prevEntry = entries[currentEntryIndex - 1];
  const nextEntry = entries[currentEntryIndex + 1];
  const rule = noteRule(selected.section);
  const heading = (index, title) => h("h3", null, `${position.absolute}.${index} ${title}`);

  return h("section", { className: "notes-shell" },
    h("aside", { className: "notes-toc panel" },
      h("div", { className: "panel-title" }, h("h2", null, "目录"), h("span", null, `${masteredCount}/${entries.length} 已掌握`)),
      h("div", { className: "notes-progress" }, h("div", { className: "meter" }, h("span", { style: { width: pct(progressValue) } }))),
      ...noteBook.chapters.map((chapter) => h("div", { className: "toc-chapter", key: chapter.id },
        h("strong", null, chapter.title),
        ...chapter.sections.map((section) => h("button", {
          className: selected.section.id === section.id ? "active" : "",
          disabled: module !== ALL && !(chapter.title === module || chapter.title.includes(module) || (Array.isArray(chapter.scope) && chapter.scope.includes(module)) || section.title === module || section.title.includes(module)),
          key: section.id,
          onClick: () => setNoteId(section.id),
          type: "button",
        }, h("span", { className: noteProgress[section.id] ? "toc-check done" : "toc-check" }, noteProgress[section.id] ? "✓" : ""), section.title)),
      )),
    ),
    h("article", { className: "note-reader note-paper" },
      h("nav", { className: "note-breadcrumb" },
        h("span", null, "考试题库"),
        h("span", null, "/"),
        h("span", null, noteBook.title),
        h("span", null, "/"),
        h("span", null, selected.chapter.title),
        h("span", null, "/"),
        h("strong", null, position.title),
      ),
      h("header", { className: "paper-title" },
        h("div", null,
          h("span", null, selected.chapter.title),
          h("h2", null, position.title),
        ),
        h("button", { className: selectedDone ? "ghost-button" : "primary-button", onClick: toggleSelected, type: "button" }, selectedDone ? "已掌握 ✓" : "标记已掌握"),
      ),
      h("p", { className: "paper-intro" }, selected.chapter.summary),
      h("section", { className: "paper-section" },
        heading(1, "学习目标"),
        h("ul", { className: "paper-inline-list" }, ...guide.steps.map((step) => h("li", { key: step }, step))),
      ),
      h("section", { className: "paper-section" },
        heading(2, "概念先导"),
        h("p", { className: "paper-lead" }, guide.plain),
      ),
      h("section", { className: "paper-section" },
        heading(3, "核心规则"),
        h("ul", { className: "paper-list" }, ...selected.section.bullets.map((item) => h("li", { key: item }, item))),
        h("div", { className: "formula-block" },
          h("span", null, rule.title),
          h("strong", null, rule.value),
        ),
      ),
      h("section", { className: "paper-section" },
        heading(4, "易错点与记忆"),
        h("ul", { className: "paper-list muted" }, ...guide.mistakes.map((item) => h("li", { key: item }, item))),
        h("p", { className: "paper-memory" }, h("mark", { className: "highlight-note" }, "记忆抓手"), ` ${guide.memory}`),
      ),
      h("section", { className: "paper-section paper-example" },
        h("h3", null, "01：例题切入"),
        h("p", null, selected.section.example),
        h("div", { className: "solution-block" },
          h("strong", null, "解："),
          h("span", null, selected.section.review),
        ),
      ),
      h("section", { className: "paper-section" },
        heading(5, "练习建议"),
        h("p", null, guide.practice),
      ),
      h("footer", { className: "paper-footer" },
        h("button", { className: "ghost-button", disabled: !prevEntry, onClick: () => prevEntry && setNoteId(prevEntry.section.id), type: "button" }, "上一节"),
        h("span", null, `${currentEntryIndex + 1}/${entries.length}`),
        h("button", { className: "primary-button", disabled: !nextEntry, onClick: () => nextEntry && setNoteId(nextEntry.section.id), type: "button" }, "下一节"),
      ),
    ),
  );
}

function beginnerGuide(section) {
  const text = `${section.title} ${section.bullets.join(" ")}`;
  const isNetwork = /IP|VLAN|STP|路由|NAT|OSPF|网络/.test(text);
  const isDb = /数据库|SQL|事务|索引|范式|候选码|GROUP BY|锁/.test(text);
  const isSecurity = /安全|加密|签名|XSS|注入|风险|等级保护/.test(text);
  const isLinux = /Linux|ls|chmod|Shell|进程|权限/.test(text);
  const isProject = /项目|关键路径|基线|风险|变更/.test(text);

  if (isNetwork) {
    return {
      steps: ["先画拓扑", "再看地址", "最后看转发路径"],
      plain: "网络题不要先背设备名。先想清楚谁和谁通信、在同一个网段还是跨网段、数据包下一跳去哪里。能把路径画出来，大多数配置题就能顺着推出答案。",
      mistakes: ["把 VLAN 当成三层路由技术。", "看到 NAT 就只想到安全，忘了它最常见用途是地址转换。", "排障时跳过物理层，直接猜协议错误。"],
      memory: "记住一句话：VLAN 分广播域，路由跨网段，NAT 换地址，STP 防环路。",
      practice: "做题时把题干里的地址、掩码、网关、下一跳圈出来；每做错一道，把数据包转发路径重新画一遍。",
    };
  }
  if (isDb) {
    return {
      steps: ["先分清表和关系", "再看键与依赖", "最后看 SQL 或事务"],
      plain: "数据库题的核心是数据如何组织、如何查询、如何保证正确。初学时先把表、行、列、主键、外键这些词弄清楚，再进入 SQL、范式和事务。",
      mistakes: ["把候选码和主键混为一谈。", "不知道 WHERE 先于分组过滤，HAVING 用于分组后过滤。", "只记索引能加速查询，忽略它会增加写入成本。"],
      memory: "关系模型看键，SQL 查询看顺序，事务题看 ACID，性能题先想索引和代价。",
      practice: "把每道 SQL 题改写成中文步骤：从哪张表取、先过滤什么、按什么分组、最后输出什么。",
    };
  }
  if (isSecurity) {
    return {
      steps: ["先识别资产", "再判断威胁", "最后选择控制措施"],
      plain: "安全题不要只背攻击名。先问保护什么，再问谁来攻击、利用什么弱点、造成什么影响，最后才选择加密、认证、授权、审计或过滤等措施。",
      mistakes: ["把加密、摘要、签名的用途混淆。", "以为输入过滤可以替代参数化查询。", "只关注技术措施，忽视管理和运维控制。"],
      memory: "机密性靠加密，完整性靠摘要/签名，身份靠认证，权限靠授权，事后追踪靠审计。",
      practice: "每遇到攻击题，写出攻击入口、被攻击资产、防护点三项，再看选项是否匹配。",
    };
  }
  if (isLinux) {
    return {
      steps: ["先熟悉目录", "再掌握权限", "最后练进程和脚本"],
      plain: "Linux 学习先从命令行基本动作开始：我在哪里、目录里有什么、文件谁能读写执行。权限和进程理解后，再学 Shell 管道和开发工具。",
      mistakes: ["把文件的 x 权限和目录的 x 权限当成同一含义。", "只会背命令，不会看输出字段。", "误用 kill -9 作为所有进程问题的第一选择。"],
      memory: "ls 看文件，cd 换目录，chmod 改权限，ps 看进程，grep 找文本。",
      practice: "准备一个空目录，反复执行 ls -l、chmod、mkdir、touch、grep，把每列输出含义写出来。",
    };
  }
  if (isProject) {
    return {
      steps: ["先定目标", "再拆活动", "最后跟踪变更和风险"],
      plain: "项目管理题关注计划和控制。不要只看单个活动，要看它对范围、进度、成本、质量和风险的连锁影响。",
      mistakes: ["把关键路径理解成活动数量最多的路径。", "把风险当成已经发生的问题。", "把基线当成普通备份文件。"],
      memory: "关键路径管工期，基线管变更，风险管未来不确定性，问题管已经发生的偏差。",
      practice: "做案例题时按“现象、原因、措施、结果”四列整理，训练论文和案例表达。",
    };
  }
  return {
    steps: ["先读定义", "再看例子", "最后做对比"],
    plain: "这一节适合用概念卡片学习。先用自己的话解释术语，再找一个生活或工程例子，最后和相近概念做对比。",
    mistakes: ["只背关键词，不理解适用场景。", "看到相似概念时不做边界区分。", "做题后不回看解析里的限定条件。"],
    memory: "定义解决是什么，场景解决什么时候用，对比解决容易混在哪里。",
    practice: "每学完一个概念，写出一句定义、一个例子、一个反例，再去做对应题。",
  };
}

function History({ records, full = false, clear }) {
  return h("section", { className: full ? "panel full-panel" : "panel" }, h("div", { className: "panel-title" }, h("h2", null, "最近答题记录"), clear ? h("button", { className: "text-button", onClick: clear, type: "button" }, "清空本题库") : h("span", null, `${records.length} 条`)), h("div", { className: "history-list" }, records.length ? records.map((record) => h("article", { className: "history-row", key: record.id }, h("div", { className: record.correct ? "status-dot ok" : "status-dot bad" }), h("div", null, h("strong", null, record.stem), h("span", null, `${record.module} · ${record.mode} · ${new Date(record.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`), full ? h("p", null, `你的答案：${answerText(record, record.selected)}；正确答案：${answerText(record, record.correctAnswer)}`) : null))) : h("div", { className: "empty-state" }, "还没有答题记录。完成练习或模拟考试后会自动保存。")));
}

function Exam({ exam, now, setExam, startExam, chooseExam, submitExam }) {
  if (!exam.questions.length) return h("section", { className: "panel full-panel exam-empty" }, h("h2", null, "模拟考试"), h("p", null, "从当前题库和模块中抽取题目，记录考试得分并同步更新通过率评估。"), h("button", { className: "primary-button", onClick: startExam, type: "button" }, h(Icon, { name: "timer" }), "开始模拟考试"));
  if (exam.result) return h("section", { className: "panel full-panel exam-result" }, h("div", null, h("span", null, "本次模拟考试"), h("h2", null, `${exam.result.correct}/${exam.result.total} 题正确`), h("p", null, `正确率 ${pct(exam.result.accuracy)} · 用时 ${clock(exam.result.duration)}`)), h("button", { className: "primary-button", onClick: startExam, type: "button" }, "再做一套"));
  const active = exam.questions[exam.index];
  const answered = exam.questions.filter((item) => exam.answers[item.id] !== undefined).length;
  return h("section", { className: "exam-layout" }, h("div", { className: "exam-main" }, h("div", { className: "exam-toolbar" }, h("strong", null, "模拟考试"), h("span", null, `用时 ${clock(now - exam.startedAt)}`), h("span", null, `已答 ${answered}/${exam.questions.length}`)), h(QuestionCard, { question: active, answer: exam.answers[active.id], submitted: false, onChoose: chooseExam, onNext: () => setExam((state) => ({ ...state, index: Math.min(state.index + 1, state.questions.length - 1) })), index: exam.index, total: exam.questions.length, examMode: true })), h("aside", { className: "panel exam-side" }, h("div", { className: "panel-title" }, h("h2", null, "答题卡"), h("span", null, `${answered} 已答`)), h("div", { className: "answer-sheet" }, ...exam.questions.map((item, i) => h("button", { className: `${i === exam.index ? "active" : ""} ${exam.answers[item.id] !== undefined ? "filled" : ""}`, key: item.id, onClick: () => setExam((state) => ({ ...state, index: i })), type: "button" }, i + 1))), h("button", { className: "primary-button wide", disabled: answered !== exam.questions.length, onClick: submitExam, type: "button" }, "提交模拟考试")));
}

createRoot(document.getElementById("root")).render(h(App));
