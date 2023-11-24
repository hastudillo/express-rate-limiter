import express from 'express';
import * as http from 'http';

import { authMiddleware } from './middlewares/auth.middleware';
import { rateLimiterMiddleware } from './middlewares/rate-limiter.middleware';

const port: string = process.env.PORT ?? '3000';

const app: express.Application = express();
app.use(
  '/private',
  authMiddleware(),
  rateLimiterMiddleware(),
  (
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(200).json({ message: 'Response from private endpoint' });
  },
);

app.use(
  '/public',
  rateLimiterMiddleware(),
  (
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(200).json({ message: 'Response from public endpoint' });
  },
);

export const server: http.Server = app.listen(port, () =>
  console.log(`Server listening on port ${port}`),
);
