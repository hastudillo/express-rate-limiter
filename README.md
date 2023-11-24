# express-rate-limiter

Simple NodeJS/express application that implements a fixed window rate limiter for two endpoints:

- `/private`: under Basic Auth, with a default rate limit of 200 req/hour
- `/public`: with a default rate limit of 100 req/hour

To do so, it relies on a Redis data store.
It includes a `development.env` file with the following variables:

- `PORT`: the port in which the application runs (default is 3000)
- `AUTH_TOKEN`: the base 64 string corresponding to the Basic Auth credentials (by default `am9obkBleGFtcGxlLmNvbTphYmMxMjM=`, corresponding to `john@example.com` : `abc123`; cf. [this online generator](https://www.debugbear.com/basic-auth-header-generator))
- `REDIS_URL`: the url where the Redis database is running (default is `redis://localhost:6379`)
- `RATE_LIMIT_BY_TOKEN`: rate limit for private routes (default is 200)
- `RATE_LIMIT_BY_IP`: rate limit for public routes (default is 100)
- `WINDOW_SIZE_IN_SECONDS`: the fixed window size for the rate limit in seconds (default is 3600, that is to say, 1 hour)

## Running the app

**IMPORTANT**: To be run under [NodeJS 20.6.0 or higher](https://nodejs.org/en/blog/release/v20.6.0) because not using `dotenv`. Ask me for using `dotenv` again if it isn't convenient...

The app needs to connect to a Redis instance when receiving requests (default port 6379).
You may want to run `docker run -p 6379:6379 --name redis redis/redis-stack` or similar.

```bash
$ npm run start
```

## Testing the app

### Jest + Supertest + Async

A small sample test has been added under `./tests` directory for the `/public` endpoint.

```bash
$ npm run test
```

It runs the maximum of HTTP requests (100) in parallel with no error. Try to run one or two more requests (modifying the code): it will fail.

But sorry, it needs a Redis instance ([redis-memory-server](https://github.com/mhassan1/redis-memory-server) wasn't easy to manage). You may want to run `docker run --rm -p 6379:6379 --name redis redis/redis-stack` for this purpose.

### Apache Benchmark

It is clear that unit tests aren't enough to test some aspects of a rate limiter. Even integration tests should be much more accurate and complex.

For a quick benchmark we recommend `ab`, the tool distributed with [Apache HTTP server](https://httpd.apache.org/docs/2.4/programs/ab.html). For instance:

```bash
$ ab -n 4000 -c 100 -l -v 2 "http://localhost:3000/public" > log.txt
```

This command will perform 4000 HTTP requests in ~7s with a rate of >500 RPS. Here we can see the responses to the first requests have status code OK, and non-2xx responses when the rate limit is reached and from then on.

NB: Follow [this](https://www.cedric-dumont.com/2017/02/01/install-apache-benchmarking-tool-ab-on-windows/) for Windows installation.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `./dist/` directory.

## Running the app in any environment

A `Dockerfile` file has been added to get the project ready to be run in any environment.

```bash
$ docker build -t express-rate-limiter .

$ docker run -p 3000:3000 --name express-rate-limiter express-rate-limiter
```

NB. Mind the `host.docker.internal` among the environment variables. Valid for every platform in Docker last versions.

The `docker-compose.yml` can make the task even easier:

```bash
$ docker-compose up
```

It includes 2 instances of the application (same network, for the sake of simplicity) in order to test easily that the same rate limit is shared by all instances at once.
