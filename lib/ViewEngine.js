import os from 'os';
import path from 'path';
import pretty from 'pretty';
import consolidate from 'consolidate';
import MyNunjucksLoader from './MyNunjucksLoader';
import nunjucks from 'nunjucks';

const debug = require('debug')('view-engine');
const TMP_DIR = path.join(process.env.TMPDIR || os.tmpdir(), 'views');

class ViewEngine {
  /**
   * initialize View Engine
   * @param  {string} bucket  view engine caching bucket - allow for multitenancy/conflict segmentations
   * @param  {object} options json object for view options
   * @return {ViewEngine}         self
   */
  constructor(bucket, options) {
    this.bucket = bucket;
    this.opt = Object.assign({
      template: {
        engine: 'nunjucks',
        engine_options: {
          partials: {}
        },
        extension: 'html'
      }
    }, options);

    // throw error if bucket not found
    if (!this.bucket) {
      throw new Error('bucket is required.')
    }

    this.searchPath = path.join(TMP_DIR, this.bucket);
    this.njkLoader = new MyNunjucksLoader(
      this.searchPath,
      {
        noCache: true,
        cacheMin: process.env.CACHE_MIN ? parseInt(process.env.CACHE_MIN) : 10
      }
    );


    if (!this.opt.template) {
      throw new Error('template is required.')
    }

    if (!this.opt.template.url) {
      throw new Error('template url is required.')
    }

    if (!this.opt.state) {
      throw new Error('state is required.')
    }

    if (!this.opt.template.engine_options) {
      this.opt.template.engine_options = {
        partials: {}
      };
    }
    
    if (!this.opt.template.engine_options.partials) {
      this.opt.template.engine_options.partials = {};
    }
    if (!this.opt.template.extension) {
      this.opt.template.extension = 'html';
    }

    if (!this.opt.template.engine) {
      this.opt.template.engine = 'nunjucks';
    }
    
    return this;
  }

  getEngine(engineOptions = {}) {
    const engine     = consolidate[this.opt.template.engine];
    if (!this.opt.template.engine || !engine) {
      new Error(`Engine not found, did you forget to install the engine?`);
    }

    return engine;
  }

  getJsonItem(k, v, outObj) {
    if (typeof(v) === 'string') {
      v = {
        url: item,
        body: null
      };
    }

    v.headers = v.headers || {};

    return new Promise(resolve, reject) {
      this.njkLoader.fetchUrl(v.url, v.body, v.headers)
      .then(file_path => {
        const str = fs.readFileSync(absPath).toString();
        if (str) {
          let obj = null;
          try {
            obj = JSON.parse(str)
          } catch(e) {
            const vstr = JSON.stringify(v);
            debug(`Object parsing error ${k} and ${vstr}`)
          }

          outObj[k] = obj;
        }
      });
    }
  }

  async render(engineOptions = {}, stateUrls = null) {
    if (!engineOptions) {
      engineOptions = {
        partials: {}
      };
    }
    
    if (!engineOptions.partials) {
      engineOptions.partials = {};
    }

    let state = Object.assign({}, this.opt.state);
    let html  = '';
    const url = this.opt.template.url;

    if (stateUrls) {
      let promises = [];
      
      for(var k in stateUrls) {
        promises.push(getJsonItem(k, stateUrls[k], state));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }

    // deep copy partials
    state.partials = Object.assign({}, engineOptions.partials);

    // const str = fs.readFileSync(absPath).toString();
    const cpwd   = __dirname;

    if (this.opt.template.engine === 'nunjucks') {
      const env = new nunjucks.Environment(this.njkLoader, engineOptions);
      html = await new Promise((resolve, reject) => {
        env.render(url, state, (err, html) => {
          console.log(err);
          if (err) {
            return reject(err);
          }
          resolve(html);
          return html;
        });
      });
    } else {
      const engine = this.getEngine(engineOptions);
      const absPath = await this.njkLoader.fetchUrl(this.opt.template.url);

      process.chdir(path.dirname(absPath));
      html = await engine(absPath, state);
    }

    // change back dir, maybe?
    // process.chdir(cpwd);

    if (this.opt.extra) {
      if (this.opt.extra.head_appends) {
        debug('perform extra head prepends');
        html = html.replace('</head>', this.opt.extra.head_appends + '</head>');
      }

      if (this.opt.extra.content_prepends) {
        debug('perform extra content prepends');
        if (html.indexOf('<body') > -1) {
          const ptrn = /\<body\.*\>/mg;
          const match = ptrn.exec(html);
          html = html.replace(match, match + this.opt.extra.content_prepends);
        } else {
          html = this.opt.extra.content_prepends + html;
        }
      }

      if (this.opt.extra.content_appends) {
        debug('perform extra content appends');
        if (html.indexOf('</body>') > 0) {
          html = html.replace('</body>',  this.opt.extra.content_appends + '</body>');
        } else {
          html = html + this.opt.extra.content_prepends;
        }
      }
    }

    if (this.opt.template.pretty) {
      debug('using `pretty` package to beautify HTML');
      html = pretty(html);
    }

    return html;
  }
}

export default ViewEngine;
