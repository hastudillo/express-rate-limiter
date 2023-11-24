import express from 'express';
import * as redis from 'redis';

const redisUrl: string | undefined = process.env.REDIS_URL;
const redisClient: redis.RedisClientType = redis.createClient({
  url: redisUrl,
});
const rateLimitByToken: number = parseInt(
  process.env.RATE_LIMIT_BY_TOKEN ?? '200',
);
const rateLimitByIp = parseInt(process.env.RATE_LIMIT_BY_IP ?? '100');
const time: number = parseInt(process.env.WINDOW_SIZE_IN_SECONDS ?? '3600');

/**
 * Middleware that limits the rate of requests following a Fixed Window algorithm
 * Has to be used after authMiddleware
 * If the client is authenticated (private routes) the rate limit is different than for public routes
 * @param req express request
 * @param res express response
 * @param next express next function
 * @returns a response with errorMessage or executes next function
 */
export const rateLimiterMiddleware: () => (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => Promise<express.Response | undefined> = () => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const rateLimit: number = getRateLimit(req);
      const clientId: string = getClientId(req);

      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const updatedNumberOfRequests: number = await redisClient.INCR(clientId);
      if (updatedNumberOfRequests === 1) {
        await redisClient.EXPIRE(clientId, time);
      }
      logValues(clientId, updatedNumberOfRequests);

      if (updatedNumberOfRequests > rateLimit) {
        return raiseTooManyRequests(updatedNumberOfRequests, clientId, res);
      }
      next();
    } catch (err: unknown) {
      return res.status(500).json({
        errorMessage: 'An error occurred when checking the request: ' + err,
      });
    }
  };
};

function getClientId(req: express.Request): string {
  if (!!req.user) {
    return req.user;
  }
  const ips: string | string[] | undefined =
    req.headers['x-forwarded-for'] ?? req.socket.remoteAddress;
  let ip: string | undefined;
  if (Array.isArray(ips)) {
    ip = ips[0].split(',').shift();
  } else {
    ip = ips?.split(',').shift();
  }
  if (!ip) {
    throw 'IP cannot be retrieved';
  }
  return ip;
}

function getRateLimit(req: express.Request): number {
  if (!!req.user) {
    return rateLimitByToken;
  }
  return rateLimitByIp;
}

async function logValues(
  clientId: string,
  updatedNumberOfRequests: number,
): Promise<void> {
  console.log(`Client ${clientId} - current value: ${updatedNumberOfRequests}`);
}

async function getTtl(
  updatedNumberOfRequests: number,
  clientId: string,
): Promise<number> {
  let ttl: number;
  if (updatedNumberOfRequests === 1) {
    ttl = time;
  } else {
    ttl = await redisClient.TTL(clientId);
  }
  return ttl;
}

async function raiseTooManyRequests(
  updatedNumberOfRequests: number,
  clientId: string,
  res: express.Response<any, Record<string, any>>,
) {
  const ttl: number = await getTtl(updatedNumberOfRequests, clientId);
  const date: Date = new Date();
  date.setSeconds(date.getSeconds() + ttl);
  return res.status(429).json({
    errorMessage: `Too many requests. Try again after ${ttl} seconds: ${date}`,
  });
}
