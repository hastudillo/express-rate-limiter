/**
 * Just hacking Express interface Request in order to include user
 */
declare namespace Express {
  export interface Request {
    user: string;
  }
}
