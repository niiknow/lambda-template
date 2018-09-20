import fs from 'fs';
import os from 'os';
import path from 'path';
import pretty from 'pretty';
import consolidate from 'consolidate';
import nunjucks from 'nunjucks';
import MyNunjucksLoader from './MyNunjucksLoader';
import minifier from './HtmlMinifier'

const PWD = __dirname;
const SEO_HTML = fs.readFileSync(path.join(PWD, 'seo.htm'), 'utf8');
const TMP_DIR = path.join(process.env.TMPDIR || os.tmpdir(), 'views');
const debug = require('debug')('view-engine');

class ViewEngine {
  /**
   * initialize View Engine
   * @param  {string} bucket  view engine caching bucket
   * - allow for multitenancy/conflict segmentations
   * @param  {string} initUrl the initial url
   * @return {ViewEngine}         self
   */
  constructor(bucket, initUrl) {
    // throw error if bucket not found
    if (!bucket) {
      throw new Error('bucket is required.');
    }

    this.baseUrl = null;
    this.bucket  = bucket.trim('/').toLowerCase();

    const parts = initUrl.split('/' + this.bucket + '/');
    if (parts.length > 1) {
      this.baseUrl       = parts[0];
      this.templateUrl   = this.baseUrl + '/layouts/default.htm';
      this.partialNavUrl = this.baseUrl + '/partials/nav.htm';
    }

    this.searchPath = path.join(TMP_DIR, this.bucket);
    this.njkLoader  = new MyNunjucksLoader(
      this.searchPath,
      {
        baseUrl: this.baseUrl,
        noCache: true,
        cacheMin: process.env.CACHE_MIN ? parseInt(process.env.CACHE_MIN) : 10,
      },
    );

    return this;
  }

  getEngine(opt) {
    debug('get engine', opt);
    const engine = consolidate[opt.template.engine];
    if (!opt.template.engine || !engine) {
      new Error('Engine not found, did you forget to install the engine?');
    }

    return engine;
  }

  /*getJsonItem(k, v, outObj) {
    if (typeof (v) === 'string') {
      v = {
        url: v,
        body: null,
      };
    }

    v.headers = v.headers || {};

    return new Promise((resolve) => {
      this.njkLoader.fetchUrl(v.url, v.body, v.headers)
        .then((absPath) => {
          const str = fs.readFileSync(absPath).toString();
          if (str) {
            let obj = null;
            try {
              obj = JSON.parse(str);
            } catch (e) {
              const vstr = JSON.stringify(v);
              debug(`Object parsing error ${e}, object ${k}: ${vstr}`);
            }

            outObj[k] = obj;
          }

          resolve(str);
        });
    });
  }*/

  replaceTitle(html, newTitle) {
    const title = (newTitle + '').trim();

    if (title.length > 0) {
      const ptrn = /<title>[\s\S]*?<\/title>/img;
      const match = ptrn.exec(html);
      if (match && match[0] && match[0].length > 10) {
        html = html.replace(match[0], title);
      }
    }

    return html;
  }

  handleExtra(html, extra) {
    if (extra) {
      if (extra.headBottom) {
        debug('perform extra head prepends');
        html = html.replace('</head>', `${extra.headBottom}</head>`);
      }

      if (extra.contentTop) {
        debug('perform extra content prepends');
        if (html.indexOf('<body') > -1) {
          const ptrn = /<body[^>]*>/img;
          const match = ptrn.exec(html);
          if (match && match[0]) {
            html = html.replace(match[0], match[0] + extra.contentTop);
          }
        } else {
          html = extra.contentTop + html;
        }
      }

      if (extra.contentBottom) {
        debug('perform extra content appends');
        if (html.indexOf('</body>') > 0) {
          html = html.replace('</body>', `${extra.contentBottom}</body>`);
        } else {
          html += extra.contentBottom;
        }
      }
    }

    return html;
  }

  async handleSeo(html, opts, locals, engine) {
    if (opts.template.seo) {
      const m = locals.__m;
      if (!m.canonicalUrl && m.pagePath) {
        if (m.siteUrl) {
          m.canonicalUrl = (m.siteUrl + '/' + m.pagePath)
            .replace(/\/+/mg, '/')
            .replace(':/', '://');
        } else {
          m.canonicalUrl = m.pagePath;
        }
      }
      const title = await engine.renderString(SEO_HTML, locals);
      html = this.replaceTitle(html, title);
    } else if (html.indexOf('<script type="text/seo">') > 0) {
      debug('handle seo script');
      // user can psudo code seo tag into the body
      // we will capture it and move it to the head
      const ptrn = /<script type="text\/seo">[\s\S]*?<\/script>/img;
      const match = ptrn.exec(html);
      if (match && match[0] && match[0].length > 32) {
        // remove from body
        html = html.replace(ptrn, '');
        debug((match[0]).trim().substring(24));
        html = this.replaceTitle(html, (match[0]).trim().substring(24).replace('</script>', ''));
      }
    }

    return html;
  }

  tryParseJson(str) {
    try {
      if (!str) {
        return str;
      }

      str = str.trim().trim('"');
      if (str.indexOf('{') > -1 || str.indexOf('[') > -1) {
        return JSON.parse(str);
      }

      return str;
    } catch(e) {
      debug('error parsing json, err:', e, ' string:', str)
      return str;
    }
  }

  async render(opt) {
    if (!opt.meta) {
      throw new Error('meta is required.');
    }

    // if there is no templateUrl, assume default
    const templateUrl = opt.meta.templateUrl || this.templateUrl;
    if (!templateUrl) {
      throw new Error('templateUrl is required.');
    }

    if (!opt.meta) {
      throw new Error('meta is required.');
    }

    opt.template = opt.template || {};

    if (!opt.template.engineOptions) {
      opt.template.engineOptions = {
        partials: {},
      };
    }

    opt.template.engine = opt.template.engine || 'nunjucks';

    const engineOptions = opt.template.engineOptions;
    const locals        = Object.assign({}, opt.locals);
    const urls          = opt.template.includes || [];
    const widgetUrls    = {};
    const widgets       = {};

    if (opt.widgets) {
      for(const k in opt.widgets) {
        const url = opt.widgets[k];
        widgetUrls[url] = k;
        urls.push(url);
      }
    }

    if (urls.length > 0) {
      const rst = await this.njkLoader.fetchUrls(urls);
      rst.forEach((v) => {
        const k = widgetUrls[v.url];
        if (k) {
          const content = fs.readFileSync(v.path, 'utf8');
          if (v.ext === '.json' ||
            v.type.toLowerCase().indexOf('application/json') > -1) {
            widgets[k] = this.tryParseJson(content);
            debug(v.path, widgets[k], 'converting json', content);
          } else {
            widgets[k] = content;
          }
        }
      });
    }

    locals.__w = widgets;
    locals.__m = opt.meta;
    locals.__c = opt.content;

    // const cpwd = __dirname;
    let html = '';
    const env = new nunjucks.Environment(this.njkLoader, engineOptions);

    if (opt.template.engine === 'nunjucks') {
      await new Promise((resolve, reject) => {
        env.render(templateUrl, locals, (err, ok) => {
          if (err) {
            debug('nunjucks errors', err);
            return reject(err)
          }

          resolve(ok);
          html = ok;
        });
      });

      debug(templateUrl, 'my nunjucks:', html);
    } else {
      const engine = this.getEngine(opt);
      const ropts  = this.njkLoader.getRequestOptions(templateUrl);

      process.chdir(path.dirname(ropts.path));
      const rst = await engine(ropts.path, locals);
      html = (rst + '').trim()
      debug(templateUrl, 'my html:', html);
    }

    // determine if entire html or just partial by spliting at head
    html = this.handleExtra(html, locals.__m);
    html = await this.handleSeo(html, opt, locals, env);

    if (opt.template.pretty) {
      debug(templateUrl, 'using `pretty` package to beautify HTML');
      html = pretty(html);
    }

    if (opt.template.minify) {
      debug(templateUrl, 'using `minify` package to beautify HTML');
      html = minifier(html + '');
    }

    return html;
  }
}

export default ViewEngine;
