import express, { NextFunction, Request, Response } from 'express';
import fetch from 'node-fetch';
import * as redis from 'redis';

const app = express();

// Connect to redis server
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisClient = redis.createClient({ url: REDIS_URL });
(async () => {
  await redisClient.connect();
})();
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('error', (err) =>
  console.log('Redis Client Connection Error', err)
);
// Connect to redis server end

// Util Function
const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Fetching Data ...');
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data: any = await response.json();
    console.log('Fetching Data Completed ...');

    // Store repo no on redis
    const repos = data.public_repos;
    redisClient.set(username, repos, { EX: 5 });

    return res.json({ username, repos });
  } catch (error) {
    return res.status(500);
  }
};

const cacheMiddleWare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { username } = req.params;
  const data = await redisClient.get(username);

  if (data) {
    return res.json({ username, repos: data });
  }
  next();
};
// Util Function End

app.get('/repos/:username', cacheMiddleWare, getUser);

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`);
});
