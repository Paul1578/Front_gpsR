import { spawn } from "node:child_process";

const IGNORE_PATTERNS = [
  "[baseline-browser-mapping] The data in this module is over two months old.",
];

const shouldSkipLine = (line) =>
  IGNORE_PATTERNS.some((pattern) => line.includes(pattern));

const pipeWithFilter = (stream, writer) => {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!shouldSkipLine(line)) {
        writer.write(`${line}\n`);
      }
    }
  });
  stream.on("end", () => {
    if (buffer && !shouldSkipLine(buffer)) {
      writer.write(buffer);
    }
  });
};

const child = spawn("next", ["build"], {
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

pipeWithFilter(child.stdout, process.stdout);
pipeWithFilter(child.stderr, process.stderr);

child.on("close", (code) => {
  process.exit(code ?? 1);
});

