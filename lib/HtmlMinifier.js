const Minifier = require('html-minifier');
const Options = {
  removeComments:                 true,
  collapseWhitespace:             true,
  removeRedundantAttributes:      true,
  removeScriptTypeAttributes:     true,
  removeStyleLinkTypeAttributes:  true,
  caseSensitive:                  true,
  minifyCSS:                      true
};

module.exports = (data) => {
  return Minifier.minify(data, Options);
};
