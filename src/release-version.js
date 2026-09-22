(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PolygonStrikeRelease = api;
  if (root.PolygonStrikeCore) api.install(root.PolygonStrikeCore, root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.6.0';

  function install(core, root = typeof globalThis !== 'undefined' ? globalThis : {}) {
    if (!core) return core;
    core.VERSION = VERSION;

    const document = root && root.document;
    if (document) {
      document.title = `POLYGON STRIKE v${VERSION}`;
      const version = document.querySelector('.version');
      if (version) version.textContent = `v${VERSION}`;
    }

    return core;
  }

  return { VERSION, install };
});
