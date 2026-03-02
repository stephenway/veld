#!/usr/bin/env node

(async () => {
  try {
    await require("./lib").cli(process);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
