import fs from 'fs';
import os from 'os';
import path from 'path';
import pretty from 'pretty';
import consolidate from 'consolidate';
import nunjucks from 'nunjucks';
import MyNunjucksLoader from './MyNunjucksLoader';

const debug = require('debug')('view-engine');

const TMP_DIR = path.join(process.env.TMPDIR || os.tmpdir(), 'views');

class ViewEngine {
  /**
   * initialize View Engine
   * @param  {string} bucket  view engine caching bucket
   * - allow for multitenancy/conflict segmentations
   * @return {ViewEngine}         self
   */
  constructor(bucket) {
    this.bucket = bucket;

    // throw error if bucket not found
    if (!this.bucket) {
      throw new Error('bucket is required.');
    }

    this.searchPath = path.join(TMP_DIR, this.bucket);
    this.njkLoader = new MyNunjucksLoader(
      this.searchPath,
      {
        noCache: true,
        cacheMin: process.env.CACHE_MIN ? parseInt(process.env.CACHE_MIN) : 10,
      },
    );

    return this;
  }

  getEngine(opt) {
    const engine = consolidate[opt.template.engine];
    if (!opt.template.engine || !engine) {
      new Error('Engine not found, did you forget to install the engine?');
    }

    return engine;
  }

  getJsonItem(k, v, outObj) {
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
  }

  handleExtra(html, extra) {
    if (extra.headAppends) {
      debug('perform extra head prepends');
      html = html.replace('</head>', `${extra.headAppends}</head>`);
    }

    if (extra.contentPrepends) {
      debug('perform extra content prepends');
      if (html.indexOf('<body') > -1) {
        const ptrn = /<body[^>]*>/img;
        const match = ptrn.exec(html);
        html = html.replace(match[0], match[0] + extra.contentPrepends);
      } else {
        html = extra.contentPrepends + html;
      }
    }

    if (extra.contentAppends) {
      debug('perform extra content appends');
      if (html.indexOf('</body>') > 0) {
        html = html.replace('</body>', `${extra.contentAppends}</body>`);
      } else {
        html += extra.contentAppends;
      }
    }

    return html;
  }

  async render(opt = {}) {
    if (!opt.template) {
      throw new Error('template is required.');
    }

    if (!opt.template.url) {
      throw new Error('template url is required.');
    }

    if (!opt.state) {
      throw new Error('state is required.');
    }

    if (!opt.template.engineOptions) {
      opt.template.engineOptions = {
        partials: {},
      };
    }

    if (!opt.template.engineOptions.partials) {
      opt.template.engineOptions.partials = {};
    }
    if (!opt.template.extension) {
      opt.template.extension = 'html';
    }

    if (!opt.template.engine) {
      opt.template.engine = 'nunjucks';
    }

    const engineOptions = opt.template.engineOptions;
    const state = Object.assign({}, opt.state);
    let html = '';
    const url = opt.template.url;

    if (opt.stateUrls) {
      const promises = [];

      for (const k in opt.stateUrls) {
        promises.push(this.getJsonItem(k, opt.stateUrls[k], state));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }

    // deep copy partials
    state.partials = Object.assign({}, engineOptions.partials);

    // const str = fs.readFileSync(absPath).toString();
    // const cpwd = __dirname;

    if (opt.template.engine === 'nunjucks') {
      const env = new nunjucks.Environment(this.njkLoader, engineOptions);
      html = await new Promise((resolve, reject) => {
        env.render(url, state, (err, html) => {
          if (err) {
            return reject(err);
          }
          resolve(html);
          return html;
        });
      });
    } else {
      const engine = this.getEngine(opt);
      const absPath = await this.njkLoader.fetchUrl(opt.template.url);

      process.chdir(path.dirname(absPath));
      html = await engine(absPath, state);
    }

    // change back dir, maybe?
    // process.chdir(cpwd);

    if (opt.extra) {
      html = this.handleExtra(html, opt.extra);
    }

    if (opt.template.pretty) {
      debug('using `pretty` package to beautify HTML');
      html = pretty(html);
    }

    return html;
  }
}

export default ViewEngine;
