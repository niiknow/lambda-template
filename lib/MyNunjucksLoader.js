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
    this.fetchUrl(url).then((rst) => {
      const fullpath = rst.path;
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
    const tmp_dir = self.searchPath;
    let opts      = url;

    if (typeof (url) === 'string') {
      opts = {
        url: url
      };
    }

    opts.headers = opts.headers || {};

    const info = URL.parse(opts.url);
    const ext  = (path.extname(info.pathname) || '').toLowerCase();

    if (!opts.method) {
      opts.method = opts.body ? 'POST' : 'GET';
    }

    if (opts.body) {
      opts.json = true;
    }

    // serialize the entire options as md5 for our filename
    const file_name = self.md5(JSON.stringify(opts)) + ext;
    const file_path = path.join(tmp_dir, file_name);

    return { url: opts.url, path: file_path, opts: opts, ext: ext };
  }

  fetchUrl(url) {
    const self      = this;
    const tmp_dir   = self.searchPath;
    const ropts     = self.getRequestOptions(url);
    const file_path = ropts.path;
    const opts      = ropts.opts;

    return new Promise((resolve) => {
      if (EXISTS(file_path)) {
        // determine if file has changed
        const stats = fs.statSync(file_path);
        const liveUntil = (new Date(stats.mtime + self.cacheMin * 60000)).getTime();
        if (liveUntil > (new Date()).getTime()) {
          debug(`cache hit for ${file_path}`);
          resolve(ropts);
          return;
        }

        // local cache has expired, so lets check the server
        opts.headers['If-Modified-Since'] = stats.mtime.toGMTString();
      } else {
        self.mkdirSync(tmp_dir);
      }

      debug('begin request', opts);
      const response_stream = request(opts);
      response_stream.on('error', (err) => {
        // ignore error
        debug('request error', opts, 'error', err);
        resolve(ropts);
      });
      response_stream.on('response', (response) => {
        ropts.type = response.headers['content-type'] || '';

        debug('saving', ropts.url, 'to', file_path);
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
    debug('fetching urls', urls);
    const promises = [];

    for(let i = 0; i < urls.length; i++) {
      promises.push(this.fetchUrl(urls[i]));
    }

    const rst = await Promise.all(promises);

    // array of object contain url, opts, and content
    return rst;
  }
}

export default MyNunjucksLoader;
