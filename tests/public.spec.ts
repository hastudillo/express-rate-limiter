import { times } from 'async';
import request from 'supertest';

import { server } from '../src/index';

describe('/public', () => {
  it('will make concurrent requests', (done) => {
    const parallelRuns = 100;
    let actualRuns = 0;
    const asyncTask = () => {
      request(server)
        .get('/public')
        .expect(200)
        .end((err) => {
          actualRuns++;
          if (err) {
            return done(err);
          }
          if (actualRuns === parallelRuns) {
            done();
          }
        });
    };
    times(parallelRuns, asyncTask, done);
  });
});

afterAll((done) => {
  server.close(done);
});
