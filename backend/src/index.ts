import "dotenv/config";
import app from "./app.js";
import { validateEnv } from "./config/env.js";

validateEnv();

const port = Number(process.env.PORT) || 3001;

app.listen(port, "0.0.0.0", () => {
  console.log(`API: http://0.0.0.0:${port}`);
});
