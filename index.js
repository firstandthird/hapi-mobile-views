/* eslint max-len: 0, guard-for-in: 0 */

'use strict';

const uaParser = require('ua-parser-js');
const fs = require('fs');
const path = require('path');

exports.register = function(server, options, next) {
  server.ext('onPreResponse', (request, reply) => {
    if (request.response.variety !== 'view') {
      return reply.continue();
    }

    if (!request.response.source.context) {
      request.response.source.context = {};
    }

    const context = request.response.source.context;
    const userAgent = uaParser(request.headers['user-agent']);
    const templatePath = request.response.source.compiled.settings.path;
    let template = request.response.source.template;

    context.__isMobile = (userAgent.device.type === 'mobile' || userAgent.ua.indexOf('IEMobile') !== -1);

    if (context.__isMobile) {
      template = `${template}-mobile`;
    }

    fs.stat(path.join(templatePath, `${template}.html`), (err, stat) => {
      if (err || !stat.isFile()) {
        return reply.continue();
      }

      const response = reply.view(template, context);
      response.vary('User-Agent');

      const headers = request.response.headers;

      for (const header of Object.keys(headers)) {
        response.header(header, headers[header]);
      }

      response.code(request.response.statusCode);
    });
  });

  return next();
};

exports.register.attributes = {
  once: true,
  pkg: require('./package.json')
};
