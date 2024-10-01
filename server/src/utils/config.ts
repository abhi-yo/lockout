import { z } from "zod";

const configSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  DATABASE_URL: z
    .string()
    .default("postgresql://neondb_owner:gXqIh6FlwR2y@ep-late-lake-a58h44vs-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"),
  JWT_SECRET: z.string().default("secret"),
});

export const { PORT, DATABASE_URL, JWT_SECRET } = configSchema.parse(Bun.env);
