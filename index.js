/* eslint max-len: 0, guard-for-in: 0 */

'use strict';

const uaParser = require('ua-parser-js');
const fs = require('fs');
const path = require('path');
const url = require('url');

exports.register = function(server, options, next) {
  server.state('ftDeviceType', {
    path: '/'
  });

  server.ext({
    type: 'onPreResponse',
    method: (request, reply) => {
      if (request.response.variety !== 'view') {
        return reply.continue();
      }

      if (request.query.ftDeviceType === 'desktop') {
        const query = request.url;

        query.search = '';
        delete query.query.ftDeviceType;

        reply.state('ftDeviceType', 'desktop');

        return reply.redirect(url.format(query))
                    .temporary(true)
                    .rewritable(false);
      }

      if (!request.response.source.context) {
        request.response.source.context = {};
      }

      const context = request.response.source.context;

      if (request.state.ftDeviceType !== 'desktop') {
        const userAgent = uaParser(request.headers['user-agent']);
        context.__isMobile = (userAgent.device.type === 'mobile' || userAgent.ua.indexOf('IEMobile') !== -1);
      } else {
        context.__isMobile = false;
      }

      if (!context.__isMobile) {
        return reply.continue();
      }

      const templatePath = request.response.source.compiled.settings.path;
      let template = request.response.source.template;

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
    }
  });

  return next();
};

exports.register.attributes = {
  once: true,
  pkg: require('./package.json')
};
