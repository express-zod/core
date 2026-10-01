import * as core from "express-zod";

// Resolved through the `express-zod` path alias to `../src/index.ts`,
// so demos always run against live source — no build required.
console.log("express-zod playground");
console.log("exports:", Object.keys(core));
