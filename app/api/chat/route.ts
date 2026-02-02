import Anthropic from "@anthropic-ai/sdk";
import { pluginTools } from "@/lib/ai/tools";

export async function POST(request: Request) {
  const apiKey = process.env.LABFORGE_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      "ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.",
      { status: 500 }
    );
  }

  const { messages, pluginContext } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response("Invalid request: messages array required", {
      status: 400,
    });
  }

  const client = new Anthropic({ apiKey });

  const anthropicMessages = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: pluginContext || "",
          messages: anthropicMessages,
          tools: pluginTools,
          stream: true,
        });

        let currentToolName = "";
        let currentToolInput = "";

        for await (const event of response) {
          if (event.type === "content_block_start") {
            if (event.content_block.type === "tool_use") {
              currentToolName = event.content_block.name;
              currentToolInput = "";
            }
          } else if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "text", content: event.delta.text }) + "\n"
                )
              );
            } else if (event.delta.type === "input_json_delta") {
              currentToolInput += event.delta.partial_json;
            }
          } else if (event.type === "content_block_stop") {
            if (currentToolName && currentToolInput) {
              try {
                const input = JSON.parse(currentToolInput);
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({ type: "tool_use", name: currentToolName, input }) + "\n"
                  )
                );
              } catch {
                // malformed tool input, skip
              }
              currentToolName = "";
              currentToolInput = "";
            }
          }
        }

        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "error", content: message }) + "\n"
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
