const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withGradleWrapperNetworkTimeout(
  config,
  { networkTimeout = 600000, useCdn = true } = {},
) {
  return withDangerousMod(config, [
    "android",
    async (c) => {
      const filePath = path.join(
        c.modRequest.platformProjectRoot,
        "gradle",
        "wrapper",
        "gradle-wrapper.properties",
      );
      let contents = fs.readFileSync(filePath, "utf8");

      const servicesUrl = "distributionUrl=https\\://services.gradle.org/distributions/";
      const cdnUrl = "distributionUrl=https\\://downloads.gradle-dn.com/distributions/";
      const downloadsUrl = "distributionUrl=https\\://downloads.gradle.org/distributions/";

      if (useCdn) {
        contents = contents
          .replace(downloadsUrl, servicesUrl)
          .replace(servicesUrl, cdnUrl);
      } else {
        contents = contents
          .replace(cdnUrl, servicesUrl)
          .replace(downloadsUrl, servicesUrl);
      }

      if (/^networkTimeout=/m.test(contents)) {
        contents = contents.replace(
          /^networkTimeout=.*$/m,
          `networkTimeout=${Number(networkTimeout)}`,
        );
      } else {
        const eol = contents.includes("\r\n") ? "\r\n" : "\n";
        contents = `${contents.replace(/\s*$/, "")}${eol}networkTimeout=${Number(networkTimeout)}${eol}`;
      }

      fs.writeFileSync(filePath, contents);
      return c;
    },
  ]);
};
