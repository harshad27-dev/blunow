import { Request, Response, NextFunction } from 'express';

export const anonymityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Strip author data from responses downstream if isAnonymous is true and not revealed
  const originalSend = res.json;

  res.json = function (body: any) {
    if (body.success && body.data) {
      const processConfession = (confession: any) => {
        if (confession.isAnonymous && !confession.isRevealed) {
          // Hide author info
          delete confession.author;
          delete confession.authorId;
        }
        return confession;
      };

      if (Array.isArray(body.data)) {
        body.data = body.data.map(processConfession);
      } else {
        body.data = processConfession(body.data);
      }
    }
    return originalSend.call(this, body);
  };

  next();
};
