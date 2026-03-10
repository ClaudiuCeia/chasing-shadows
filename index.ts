import { bootstrapGame } from "./src/app/bootstrap.ts";

const hasDom = typeof window !== "undefined" && typeof document !== "undefined";

if (hasDom) {
  bootstrapGame();
} else {
  console.log("Mercury prototype boot skipped: DOM environment not available.");
}
