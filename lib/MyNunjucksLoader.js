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
    this.async = true;
    this.searchPath = searchPath;
    this.noCache = !!opts.noCache;
    this.cacheMin = opts.cacheMin || 10;
  }

  getSource(url, callback) {
    this.fetchUrl(url).then((fullpath) => {
      callback(null, {
        src: fs.readFileSync(fullpath, 'utf-8'),
        path: fullpath,
        noCache: this.noCache,
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
      const parentPath = path.dirname(mkPath);
      if (!EXISTS(parentPath)) {
        this.mkdirSync(parentPath);
      }

      if (!EXISTS(mkPath)) {
        fs.mkdirSync(mkPath);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  getRequestOptions(url) {
    const self    = this;
    const tmp_dir = this.searchPath;
    let opts      = url;

    if (typeof (url) === 'string') {
      opts.url = {
        url: url
      };
    }

    opts.headers = opts.headers || {};

    const info = URL.parse(opts.url);

    if (!opts.method) {
      opts.method = opts.body ? 'POST' : 'GET';
    }

    if (opts.body) {
      opts.json = true;
    }

    // serialize the entire options as md5 for our filename
    const file_name = self.md5(JSON.stringify(opts)) + path.extname(info.pathname);
    const file_path = path.join(tmp_dir, file_name);

    return { url: opts.url, path: file_path, opts: opts };
  }

  fetchUrl(url) {
    const self      = this;
    const tmp_dir   = this.searchPath;
    const ropts     = self.getRequestOptions(url);
    const file_path = ropts.path;
    const opts      = ropts.opts;

    return new Promise((resolve) => {
      if (EXISTS(file_path)) {
        // determine if file has changed
        const stats = fs.statSync(file_path);
        const liveUntil = (new Date(stats.mtime + this.cacheMin * 60000)).getTime();
        if (liveUntil > (new Date()).getTime()) {
          debug(`cache hit for ${file_path}`);
          return resolve(ropts);
        }

        // local cache has expired, so lets check the server
        opts.headers['If-Modified-Since'] = stats.mtime.toGMTString();
      } else {
        self.mkdirSync(tmp_dir);
      }

      const response_stream = request(opts);
      response_stream.on('error', resolve);
      response_stream.on('response', (response) => {
        opts.type = response.headers['content-type'] || '';

        const ws = fs.createWriteStream(file_path);
        response_stream.pipe(ws);
        ws.on('finish', () => {
          resolve(ropts);

          // emit for nunjucks
          self.emit('update', file_path);
        });
      });
    });
  }

  async fetchUrls(urls) {
    const promises = [];

    for (const k in urls) {
      promises.push(this.fetchUrl(k));
    }

    const rst = await Promise.all(promises);

    // array of object contain url, opts, and content
    return rst;
  }
}

export default MyNunjucksLoader;
