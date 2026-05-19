import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// AI Agent 入门示例 — 一个能"使用工具"的 Claude Agent
// ---------------------------------------------------------------------------

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 1. 定义 Agent 可以使用的工具
const tools = [
  {
    name: "get_weather",
    description: "获取指定城市的天气信息",
    input_schema: {
      type: "object",
      properties: { city: { type: "string", description: "城市名称，如 Beijing" } },
      required: ["city"],
    },
  },
  {
    name: "calculate",
    description: "执行数学计算",
    input_schema: {
      type: "object",
      properties: {
        expression: { type: "string", description: "数学表达式，如 2+2" },
      },
      required: ["expression"],
    },
  },
];

// 2. 工具的具体实现
function runTool(name, input) {
  switch (name) {
    case "get_weather":
      return `${input.city} 今天晴天，25°C，适合出门散步。`;
    case "calculate":
      return `结果: ${eval(input.expression)}`;
    default:
      return "未知工具";
  }
}

// 3. Agent 主循环：发送消息 → 接收响应 → 执行工具 → 继续对话
async function chat(prompt) {
  const messages = [{ role: "user", content: prompt }];

  while (true) {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "你是一个乐于助人的 AI 助手。说中文。",
      messages,
      tools,
    });

    // 收集文本 + 工具调用
    const toolBlocks = res.content.filter((b) => b.type === "tool_use");
    const text = res.content
      .filter((b) => b.type === "text" && b.text.trim())
      .map((b) => b.text)
      .join("\n");

    if (text) console.log(`🤖 Agent: ${text}`);

    if (toolBlocks.length === 0) break; // 没有工具要调用了，结束

    // 4. 执行工具并添加结果到对话
    const toolResults = toolBlocks.map((t) => ({
      type: "tool_result",
      tool_use_id: t.id,
      content: runTool(t.name, t.input),
    }));

    console.log(
      `🔧 调用工具: ${toolBlocks.map((t) => t.name).join(", ")} → ${toolResults.map((r) => r.content).join(" | ")}`
    );

    messages.push({ role: "assistant", content: res.content });
    messages.push({ role: "user", content: toolResults });
  }
}

// 5. 启动
const q = process.argv[2] || "北京今天天气怎么样？适合出门吗？";
console.log(`💬 用户: ${q}\n`);
chat(q).catch((e) => console.error("出错了:", e.message));
