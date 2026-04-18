import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    app: "egadisailing",
    env: process.env.NODE_ENV ?? "development",
  },
});

export function childLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
