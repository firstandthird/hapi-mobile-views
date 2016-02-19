/* eslint max-len: 0, no-console: 0 */
'use strict';

const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hoek = require('hoek');
const async = require('async');
const ua = require('ua-parser-js');

const mobileUA = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12A366 Safari/600.1.4',
  'Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
  'Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0)',
  'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.1.0.346 Mobile Safari/534.11+'
];

const desktopUA = [
  'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1',
  'Mozilla/5.0 (Linux; U; Android 2.3; en-us) AppleWebKit/999+ (KHTML, like Gecko) Safari/999.9',
  'Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25'
];

// test server
const Hapi = require('hapi');
const server = new Hapi.Server();

server.connection();

lab.experiment('specs', () => {
  lab.before(start => {
    // start server
    server.register([require('vision'), require('../')], error => {
      Hoek.assert(!error, error);

      server.views({
        engines: { html: require('handlebars') },
        path: `${__dirname}/views`
      });

      server.route({
        method: 'GET',
        path: '/api',
        handler(request, reply) {
          reply({ test: true });
        }
      });

      server.route({
        method: 'GET',
        path: '/test',
        handler(request, reply) {
          reply.view('test', {
            message: 'Message1'
          }).header('X-Test', 'test');
        }
      });

      server.route({
        method: 'GET',
        path: '/empty',
        handler(request, reply) {
          reply.view('empty').code(204);
        }
      });

      server.route({
        method: 'GET',
        path: '/desktop',
        handler(request, reply) {
          reply.view('desktop', {
            message: 'Message1'
          });
        }
      });

      server.start((err) => {
        Hoek.assert(!err, err);
        console.log(`Server started at: ${server.info.uri}`);
        start();
      });
    });
  });

  // tests
  lab.test('non view', done => {
    server.inject({
      url: '/api'
    }, response => {
      Hoek.assert(response.result.test === true, 'Well something is really wrong...');
      done();
    });
  });

  lab.test('desktop', done => {
    async.each(desktopUA, (agent, cb) => {
      server.inject({
        url: '/test',
        headers: {
          'user-agent': agent
        }
      }, response => {
        Hoek.assert(response.result === 'Desktop: Message1\nisMobile: false\n', `UserAgent: ${ua(agent).os.name} - Expected response: ${JSON.stringify(response.result)} to be ${JSON.stringify('Desktop: Message1\nisMobile: false\n')}`);
        cb();
      });
    }, () => {
      done();
    });
  });

  lab.test('mobile', done => {
    async.each(mobileUA, (agent, cb) => {
      server.inject({
        url: '/test',
        headers: {
          'user-agent': agent
        }
      }, response => {
        Hoek.assert(response.result === 'Mobile: Message1\nisMobile: true\n', `UserAgent: ${ua(agent).os.name} - Expected response: ${JSON.stringify(response.result)} to be ${JSON.stringify('Mobile: Message1\nisMobile: true\n')}`);
        cb();
      });
    }, () => {
      done();
    });
  });

  lab.test('mobile on desktop only view', done => {
    server.inject({
      url: '/desktop',
      headers: {
        'user-agent': mobileUA[0]
      }
    }, response => {
      Hoek.assert(response.result === 'Desktop Only\n', `Expected response: ${JSON.stringify(response.result)} to be ${JSON.stringify('Desktop Only\n')}`);
      done();
    });
  });

  lab.test('vary header set', done => {
    server.inject({
      url: '/test',
      headers: {
        'user-agent': mobileUA[0]
      }
    }, response => {
      Hoek.assert(response.headers.vary === 'User-Agent', 'Vary header not set correctly');
      done();
    });
  });

  lab.test('headers passed through', done => {
    server.inject({
      url: '/test',
      headers: {
        'user-agent': mobileUA[0]
      }
    }, response => {
      Hoek.assert(response.headers['x-test'] === 'test', 'Headers not maintained');
      done();
    });
  });

  lab.test('statusCode passed through', done => {
    server.inject({
      url: '/empty',
      headers: {
        'user-agent': mobileUA[0]
      }
    }, response => {
      Hoek.assert(response.statusCode === 204, 'Status Code not maintained');
      done();
    });
  });

  lab.test.skip('override', done => {
    server.inject({
      url: '/test?ftDeviceType=desktop',
      headers: {
        'user-agent': mobileUA[0]
      }
    }, response => {
      Hoek.assert(response.result === 'Desktop: Message1\nisMobile: false\n', `Expected response: ${JSON.stringify(response.result)} to be ${JSON.stringify('Desktop: Message1\nisMobile: false\n')}`);
      done();
    });
  });
});
