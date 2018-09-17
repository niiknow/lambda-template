import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import URL from 'url';
import os from 'os';
import fetch from 'node-fetch';
import pretty from 'pretty';
import consolidate from 'consolidate';

const debug = require('debug')('remote-views');
const EXISTS = fs.existsSync || path.existsSync;
const TMP_DIR = path.join(os.tmpDir(), 'views')

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
  constructor(options) {
    this.opt = Object.assign({}, options);

    // throw error if tenant not found
    if (!this.opt.tenant) {
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
    const file_name = this.md5(url) + '.html';
    const file_path = path.join(tmp_dir, file_name)

    if (EXISTS(file_path)) {
      return file_path;
    } else {
      mkdirSync(tmp_dir);
    }

    const res = await fetch(url);
    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(file_path);
      res.body.pipe(fileStream);
      res.body.on("error", (err) => {
        reject(err);
      });
      fileStream.on("finish", function() {
        resolve();
      });
    });
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
    const absPath = this.downloadFile(this.opt.template.url); 

    let state = Object.assign({}, this.opt.state);

    // deep copy partials
    state.partials = Object.assign({}, this.opt.template.engine_options.partials);
    await { html } = this.getEngine()(absPath, state);
    
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
