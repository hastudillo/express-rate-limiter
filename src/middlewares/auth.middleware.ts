import express from 'express';

const BASIC: string = 'Basic';
const authToken: string | undefined = process.env.AUTH_TOKEN;

export const authMiddleware: () => (
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
      const authHeader: string = req.headers['authorization'] ?? '';
      const [basic, b64auth]: string[] = authHeader.split(' ');
      if (basic !== BASIC || b64auth !== authToken)
        return res.status(401).json({
          errorMessage: 'Unauthorized. Check your basic authentication',
        });
      const [user, password]: string[] = Buffer.from(b64auth, 'base64')
        .toString()
        .split(':');
      req.user = user;
      console.log(`User is authenticated as ${req.user}`);
      next();
    } catch (err: unknown) {
      return res.status(500).json({
        errorMessage: `An error occurred when checking the authentication of the request: ${err}`,
      });
    }
  };
};
