import fs from 'fs';
import os from 'os';
import path from 'path';
import pretty from 'pretty';
import consolidate from 'consolidate';
import nunjucks from 'nunjucks';
import MyNunjucksLoader from './MyNunjucksLoader';

const PWD = __dirname;
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
      this.templateUrl   = this.baseUrl + '/page.htm';
      this.partialNavUrl = this.baseUrl + '/nav.phtm';
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
    const engine = consolidate[opt.site.template_type];
    if (!opt.site.template_type || !engine) {
      new Error('Engine not found, did you forget to install the engine?');
    }

    return engine;
  }

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

  transformLocals(locals) {
    const site = locals.site;

    if (!site.host) {
      throw new Error('site host is required');
    }

    locals.base_path = (locals.base_path || '').replace(/^\/+|\/+$/gm,'');
    site.host = site.host.replace(/^\/+|\/+$/gm,'');
    locals.slug = (locals.slug || '').replace(/^\/+|\/+$/gm,'');

    if (site.host.indexOf('http') < 0) {
      site.host = 'https://' + site.host;
    }

    if (!locals.canonical_url) {
      locals.canonical_url = site.host + '/' + locals.base_path + '/' + locals.slug;
    }

    if (!locals.page_type && locals.base_path === '') {
      locals.page_type = 'website';
    }

    return locals;
  }

  handleExtra(html, locals) {
    const extra = locals.site;

    if (extra.title_top) {
      debug('perform extra title top');
      html = html.replace('<title>', `${extra.head_bottom}<title>`);
    }

    if (extra.title_bottom) {
      debug('perform extra title bottom');
      html = html.replace('</title>', `</title>${extra.title_bottom}`);
    }

    if (extra.head_bottom) {
      debug('perform extra head bottom');
      html = html.replace('</head>', `${extra.head_bottom}</head>`);
    }

    if (extra.content_top) {
      debug('perform extra content top');
      if (html.indexOf('<body') > -1) {
        const ptrn = /<body[^>]*>/img;
        const match = ptrn.exec(html);
        if (match && match[0]) {
          html = html.replace(match[0], match[0] + extra.content_top);
        }
      } else {
        html = extra.content_top + html;
      }
    }

    if (extra.content_bottom) {
      debug('perform extra content bottom');
      if (html.indexOf('</body>') > 0) {
        html = html.replace('</body>', `${extra.content_bottom}</body>`);
      } else {
        html += extra.content_bottom;
      }
    }

    return html;
  }

  handleSeo(html) {
    if (html.indexOf('<script type="text/seo">') > 0) {
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

  tryParseJson(str, defaults = null) {
    try {
      if (!str) {
        return defaults || str;
      }

      str = str.trim().trim('"');
      if (str.indexOf('{') > -1 || str.indexOf('[') > -1) {
        return JSON.parse(str);
      }

      return defaults || str;
    } catch(e) {
      debug('error parsing json, err:', e, ' string:', str)
      return defaults || str;
    }
  }

  async render(opt) {
    if (!opt.site) {
      throw new Error('site is required.');
    }

    // if there is no templateUrl, assume default
    const templateUrl = opt.template_url || this.templateUrl;
    if (!templateUrl) {
      throw new Error('template_url is required.');
    }

    opt.site.template_options = opt.site.template_options || {};
    opt.site.template_type = opt.site.template_type || 'nunjucks';

    if (typeof (opt.site.template_options) === 'string') {
      opt.site.template_options = this.tryParseJson(opt.site.template_options, {});
    }

    const widgetUrls    = {};
    const widgets       = {};
    let locals          = this.transformLocals(Object.assign({}, opt));
    let urls            = opt.site.related_urls || [];

    if (opt.related_urls) {
      urls = urls.concat(opt.related_urls);
    }

    if (opt.widgets) {
      for(const k in opt.widgets) {
        const url = opt.widgets[k];
        widgetUrls[url] = k;
        urls.push(url);
      }
    }

    if (urls.length > 0) {
      // unique urls
      const uurls = urls.filter((v, i, a) => a.indexOf(v) === i);
      const rst = await this.njkLoader.fetchUrls(uurls);
      rst.forEach((v) => {
        const k = widgetUrls[v.url];
        if (k) {
          const content = fs.readFileSync(v.path, 'utf8');
          if (v.ext.indexOf('.js') > -1 ||
            v.type.toLowerCase().indexOf('application/j') > -1) {
            widgets[k] = this.tryParseJson(content);
            debug(v.path, widgets[k], 'converting json', content);
          } else {
            widgets[k] = content;
          }
        }
      });
    }

    locals.widgets = widgets;

    // const cpwd = __dirname;
    let html = '';
    const env = new nunjucks.Environment(this.njkLoader, opt.site.template_options);

    // create canonical urls
    if (opt.site.template_type === 'nunjucks') {
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
      debug(templateUrl, 'other template:', html);
    }

    html = this.handleSeo(html);
    html = this.handleExtra(html, locals);

    if (locals.site.enable_auto_description) {
      // TODO: handle auto description, maybe a plugin?
    }

    // TODO: handle other plugins, minifier? beautifier?

    // always trim output
    return (html + '').trim();
  }
}

export default ViewEngine;
