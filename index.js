/* eslint max-len: 0, guard-for-in: 0 */
const uaParser = require('ua-parser-js');
const fs = require('fs');
const path = require('path');
const url = require('url');
const util = require('util');
const register = async (server, options) => {
  await server.state('ftDeviceType', {
    path: '/'
  });

  server.ext({
    type: 'onPreResponse',
    async method(request, h) {
      if (request.response.variety !== 'view') {
        return h.continue;
      }

      if (request.query.ftDeviceType === 'desktop') {
        const query = request.url;

        query.search = '';
        delete query.query.ftDeviceType;

        h.state('ftDeviceType', 'desktop');

        return h.redirect(url.format(query))
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
        return h.continue;
      }
      const templatePath = request.response.source.compiled.settings.path;
      let template = request.response.source.template;

      if (context.__isMobile) {
        template = `${template}-mobile`;
      }
      try {
        const stat = await util.promisify(fs.stat)(path.join(templatePath, `${template}.html`));
        if (!stat.isFile()) {
          return h.continue;
        }
        const response = h.view(template, context);
        response.vary('User-Agent');
        const headers = request.response.headers;
        for (const header of Object.keys(headers)) {
          response.header(header, headers[header]);
        }
        response.code(request.response.statusCode);
        return response.takeover();
      } catch (e) {
        return h.continue;
      }
    }
  });
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};
