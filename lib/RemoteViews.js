import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import URL from 'url';
import os from 'os';
import request from 'request';
import pretty from 'pretty';
import consolidate from 'consolidate';

const debug = require('debug')('remote-views');
const EXISTS = fs.existsSync || path.existsSync;
const TMP_DIR = path.join(os.tmpdir(), 'views');
const CACHE_MIN = parseInt(process.env.CACHE_MIN) || 10;

function mkdirSync(mkPath) {
  try {
    var parentPath = path.dirname(mkPath);
    if(!EXISTS(parentPath)){
      mkdirSync(parentPath);
    }

    if(!EXISTS(mkPath)){
      fs.mkdirSync(mkPath);
    }

    return true;
  } catch(e) {
    return false;
  }
}

class RemoteViews {
  /**
   * initialize RemoteView
   * @param  Object options the options option
   * @return Object         self
   */
  constructor(tenant, options) {
    this.tenant = tenant;
    this.opt = Object.assign({
      template: {
        engine: 'dot',
        engine_options: {
          partials: {}
        },
        extension: 'dot'
      }
    }, options);

    // throw error if tenant not found
    if (!this.tenant) {
      throw new Error('tenant is required.')
    }

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
      this.opt.template.extension = 'dot';
    }

    // set base path to support various templates
    if (!this.opt.template.engine_options.settings) {
      this.opt.template.engine_options.settings = {
        views: this.getTempDir()
      };
    }
    
    return this;
  }

  getTempDir() {
    return path.join(TMP_DIR, this.tenant);
  }

  md5(data) {
    const md5 = crypto.createHash('md5');
    const encoding = typeof data === 'string' ? 'utf8' : 'binary';
    md5.update(data, encoding);
    return md5.digest('hex');
  }

  async downloadFile(url) {
    const tmp_dir   = this.getTempDir();
    const info      = URL.parse(url);
    const file_name = this.md5(url) + '.' + this.opt.template.extension;
    const file_path = path.join(tmp_dir, file_name);
    let headers     = {};

    debug(`cache path: ${file_path}`);
    if (EXISTS(file_path)) {
      // determine if file has changed
      const stats = fs.statSync(file_path);
      const liveUntil = (new Date(stats.mtime + CACHE_MIN*60000)).getTime();
      if (liveUntil > (new Date()).getTime()) {
        return file_path;
      }

      headers = {'If-Modified-Since': stats.mtime.toUTCString()};
    } else {
      mkdirSync(tmp_dir);
    }
    var options = {
      uri: url,
      headers: headers 
    };

    await new Promise((resolve, reject) => {
      const response_stream = request(options);
      response_stream.on('error', resolve)
      response_stream.on('response', (response) => {
        const ws = fs.createWriteStream(file_path);
        response_stream.pipe(ws);
        ws.on('finish', resolve);
      });
    });

    return file_path;
  }

  getEngine() {
    const engineName = this.opt.template.engine || 'dot';
    const engine     = consolidate[engineName];
    if (!engineName || !engine) {
      new Error(`Engine not found, did you forget to install the engine?`);
    }

    return engine;
  }

  async render() {
    const absPath = await this.downloadFile(this.opt.template.url);
    let state = Object.assign({}, this.opt.state);
    // console.log(state);

    // deep copy partials
    state.partials = Object.assign({}, this.opt.template.engine_options.partials);
    // const str = fs.readFileSync(absPath).toString();
    const engine = this.getEngine();
    const cpwd   = process.pwd();

    let html = await new Promise((resolve, reject) => {
      // set current path to view path
      process.chdir(path.dirname(absPath));
      engine(absPath, state).then(resolve).catch(reject);
    });

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

export default RemoteViews;
