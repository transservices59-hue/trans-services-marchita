import winston from 'winston';

const PROD = !!(process.env.VERCEL ?? process.env.NODE_ENV === 'production');

const devFormat = winston.format.printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? '  ' + JSON.stringify(meta) : '';
  return `${String(ts)} [${level}] ${String(message)}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: PROD
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.colorize(),
        devFormat,
      ),
  transports: [new winston.transports.Console()],
  // Ne jamais faire crasher le process sur un log raté
  exitOnError: false,
});

// ── Middleware Express : log chaque requête avec durée ────────────────────────

import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { requestId: string }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomBytes(4).toString('hex');
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.path}`, {
      requestId: req.requestId,
      status:    res.statusCode,
      duration:  `${duration}ms`,
      ip:        req.ip,
    });
  });

  next();
}
