const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAndroidCleartextTraffic(config, enabled = true) {
  return withAndroidManifest(config, (c) => {
    const app = c.modResults?.manifest?.application?.[0];
    if (!app) return c;
    app.$ = app.$ ?? {};
    app.$["android:usesCleartextTraffic"] = enabled ? "true" : "false";
    return c;
  });
};
