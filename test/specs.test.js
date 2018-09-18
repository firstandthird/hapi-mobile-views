const tap = require('tap');
const ua = require('ua-parser-js');
const Hapi = require('hapi');

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


let server;

tap.beforeEach(async () => {
  server = new Hapi.Server();
  await server.register([require('vision'), require('../')]);
  server.views({
    engines: { html: require('handlebars') },
    path: `${__dirname}/views`
  });
  server.route({
    method: 'GET',
    path: '/api',
    handler(request, h) {
      return { test: true };
    }
  });
  server.route({
    method: 'GET',
    path: '/test',
    handler(request, h) {
      return h.view('test', {
        message: 'Message1'
      }).header('X-Test', 'test');
    }
  });
  server.route({
    method: 'GET',
    path: '/empty',
    handler(request, h) {
      return h.view('empty').code(204);
    }
  });
  server.route({
    method: 'GET',
    path: '/desktop',
    handler(request, h) {
      return h.view('desktop', {
        message: 'Message1'
      });
    }
  });
  await server.start();
  console.log(`Server started at: ${server.info.uri}`);
});

tap.afterEach(async () => {
  await server.stop();
});

tap.test('non view', async t => {
  const response = await server.inject({
    url: '/api'
  });
  t.ok(response.result.test, 'basic test works');
  t.end();
});

tap.test('desktop', (t) => {
  t.plan(desktopUA.length);
  desktopUA.forEach(async agent => {
    const response = await server.inject({
      url: '/test',
      headers: {
        'user-agent': agent
      }
    });
    t.match(response.result, 'Desktop: Message1\nisMobile: false\n');
  });
});

tap.test('mobile', t => {
  t.plan(mobileUA.length);
  mobileUA.forEach(async agent => {
    const response = await server.inject({
      url: '/test',
      headers: {
        'user-agent': agent
      }
    });
    t.match(response.result, 'Mobile: Message1\nisMobile: true\n');
  });
});

tap.test('mobile on desktop only view', async t => {
  const response = await server.inject({
    url: '/desktop',
    headers: {
      'user-agent': mobileUA[0]
    }
  });
  t.equal(response.result, 'Desktop Only\n');
  t.end();
});

tap.test('vary header set', async t => {
  const response = await server.inject({
    url: '/test',
    headers: {
      'user-agent': mobileUA[0]
    }
  });
  t.equal(response.headers.vary, 'User-Agent', 'Vary header set correctly');
  t.end();
});

tap.test('headers passed through', async t => {
  const response = await server.inject({
    url: '/test',
    headers: {
      'user-agent': mobileUA[0]
    }
  });
  t.equal(response.headers['x-test'], 'test', 'Headers maintained');
  t.end();
});

tap.test('statusCode passed through', async t => {
  const response = await server.inject({
    url: '/empty',
    headers: {
      'user-agent': mobileUA[0]
    }
  });
  t.equal(response.statusCode, 204, 'Status Code maintained');
  t.end();
});

tap.test('override', async t => {
  const response = await server.inject({
    url: '/test?ftDeviceType=desktop',
    headers: {
      'user-agent': mobileUA[0]
    }
  });
  t.equal(response.headers.location, '/test', 'Redirect set correctly');
  t.ok(response.headers['set-cookie'], 'Cookie set');
  const response2 = await server.inject({
    url: '/test',
    headers: {
      'user-agent': mobileUA[0],
      Cookie: 'ftDeviceType=desktop;'
    }
  });
  t.equal(response2.result, 'Desktop: Message1\nisMobile: false\n');
  t.end();
});
