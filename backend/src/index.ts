import "dotenv/config";
import app from "./app.js";
import { validateEnv } from "./config/env.js";

validateEnv();

const port = Number(process.env.PORT) || 3001;

app.listen(port, () => {
  console.log(`API: http://localhost:${port}`);
});
