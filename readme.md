# hapi-mobile-views

[![Build Status](https://travis-ci.org/firstandthird/hapi-mobile-views.svg?branch=master)](https://travis-ci.org/firstandthird/hapi-mobile-views)
[![Coverage Status](https://coveralls.io/repos/firstandthird/hapi-mobile-views/badge.svg?branch=master)](https://coveralls.io/r/firstandthird/hapi-mobile-views?branch=master)

Detects mobile user agents and serves mobile views when available. Also handles cooking client for overrides.

## Install

`npm install hapi-mobile-views`

## Usage

Basic:
```js
// index.js
server.register(require('hapi-mobile-views'));
```

[Rapptor](https://github.com/firstandthird/rapptor):
```yaml
# default.yaml
plugins:
  hapi-mobile-views:
```

## Serving mobile views

**NOTE:**: Currently only `*.html` view files are supported and we're only testing against the `vision` module.

This plugin handles everything except creating the mobile views for you. In order to service up a mobile view you will need to create a file that matches a view but end with `-mobile` in the name.

If your return looks like and the template was `pages/homepage.html`

```js
reply('pages/homepage');
```

You'd name the mobile version `pages/homepage-mobile.html`

We also expose a global view context `__isMobile`. Useful if you don't need to change the whole page, just a part. (You should still use media queries if you can).

## Manual Override

Direct the user to the same url but with a `ftDeviceType=<type>` query string. Valid types are `mobile` and `desktop`. The user will be redirected to the original url with a cookie set with the device type.
