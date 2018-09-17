import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import URL from 'url';
import nunjucks from 'nunjucks';
import request from 'request';

const debug = require('debug')('my-nunjucks-loader');
const EXISTS = fs.existsSync || path.existsSync;

class MyNunjucksLoader extends nunjucks.Loader {
  constructor(searchPath, opts) {
    super();

    opts = opts || {};
    this.async      = true;
    this.searchPath = searchPath;
    this.noCache    = !!opts.noCache;
    this.cacheMin   = opts.cacheMin || 10;
  }

  getSource(url, callback) {
    this.fetchUrl(url).then(fullpath => {
      callback(null, {
        src: fs.readFileSync(fullpath, 'utf-8'),
        path: fullpath,
        noCache: this.noCache
      });      
    });
  }

  md5(data) {
    const md5 = crypto.createHash('md5');
    const encoding = typeof data === 'string' ? 'utf8' : 'binary';
    md5.update(data, encoding);
    return md5.digest('hex');
  }

  mkdirSync(mkPath) {
    try {
      var parentPath = path.dirname(mkPath);
      if(!EXISTS(parentPath)){
        this.mkdirSync(parentPath);
      }

      if(!EXISTS(mkPath)){
        fs.mkdirSync(mkPath);
      }

      return true;
    } catch(e) {
      return false;
    }
  }

  promisify(cb, fn) {
    return new Promise((resolve, reject) => {
      cb = cb || function(err, html) {
        if (err) {
          return reject(err);
        }
        resolve(html);
      };
      fn(cb);
    });
  }

  async fetchUrl(url, body = null, headers = {}) {
    const tmp_dir = this.searchPath;
    const info    = URL.parse(url);
    const self    = this;

    var options = {
      uri: url,
      headers: headers,
      method: body ? 'POST' : 'GET'
    };

    if (body) {
      options.body = body;
      options.json = true;
    }

    // serialize the entire options as md5 for our filename
    const file_name = this.md5(JSON.stringify(options)) + path.extname(info.pathname);
    const file_path = path.join(tmp_dir, file_name);

    if (EXISTS(file_path)) {
      // determine if file has changed
      const stats = fs.statSync(file_path);
      const liveUntil = (new Date(stats.mtime + this.cacheMin*60000)).getTime();
      if (liveUntil > (new Date()).getTime()) {
        return file_path;
      }

      // local cache has expired, so lets check the server
      headers = {'If-Modified-Since': stats.mtime.toGMTString()};
    } else {
      this.mkdirSync(tmp_dir);
    }

    await new Promise((resolve, reject) => {
      const response_stream = request(options);
      response_stream.on('error', resolve)
      response_stream.on('response', (response) => {
        const ws = fs.createWriteStream(file_path);
        response_stream.pipe(ws);
        ws.on('finish', () => {
          resolve();
          self.emit('update', file_path);
        });
      });
    });

    return file_path;
  }
}

export default MyNunjucksLoader;
