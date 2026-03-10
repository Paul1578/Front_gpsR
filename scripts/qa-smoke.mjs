import { spawn } from "node:child_process";

const steps = [
  { name: "Lint", cmd: "npm", args: ["run", "lint"] },
  { name: "Build", cmd: "npm", args: ["run", "build"] },
];

const runStep = (step) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(step.cmd, step.args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        resolve({ ...step, elapsed });
        return;
      }
      reject(new Error(`${step.name} falló con código ${code ?? "desconocido"}`));
    });
  });

const run = async () => {
  console.log(">> QA smoke: iniciando");
  const results = [];
  for (const step of steps) {
    console.log(`\n>> ${step.name}`);
    const result = await runStep(step);
    results.push(result);
    console.log(`>> ${step.name} OK (${result.elapsed}s)`);
  }

  console.log("\n>> QA smoke completado");
  for (const result of results) {
    console.log(`- ${result.name}: ${result.elapsed}s`);
  }
};

run().catch((error) => {
  console.error("\n>> QA smoke falló");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
