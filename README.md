# Serverless Template
> Render dynamic html in the cloud with AWS Lambda

This package help provide server-side rendering, serverlessly.  Say what? ;)

To support rendering of different templating engines, this library use consolidate.js, see list of supported engines here: https://github.com/tj/consolidate.js#supported-template-engines Consolidate.js is a library that define a single rendering API (a consolidated API) for different templating engines.  It is widely use in various server-side frameworks such as Express, Koa, hapi, etc...

## Psuedo-code
parameters:
```
{
  site: {
    // this is your site primary domain, https:// if protocol is not provided
    host: 'www.yourdomain.com',
    // additional host names, new line separated
    other_hosts: 'abc.yourdomain.com en.yourdomain.com mobile.yourdomain.com',

    business_name: 'Your site author/business name.',
    business_url: 'Your site author/business url.',
    template_type: 'dot',
    template_options: 'engine specific option json',
    enable_auto_description: 'true to automatically take 250 characters of content as description, when description is empty',
    title_top: 'global content before <title> tag',
    title_bottom: 'global content after the </title> tag',
    head_bottom: 'global content before </head> end tag',
    content_top: 'global content top - add right after <body> tag',
    content_bottom: 'global content bottom - add right before </body> end tag',

    // urls, one per line - for template performance optimization
    related_urls: 'urls line separated',

    // timezone: 'cst' ?
    // money_format: '$0.00' ?
  },
  started_at: yyyymmdd,
  ended_at: yyyymmdd,

  // allow for temporary disable without setting ended_at
  disabled_at: yyyymmdd,

  // default: page.htm
  template_url: 'the template url',

  label: 'give this page an internal name',
  title: 'page title',
 
  // this is the base path, for a page, it is empty
  // this can also be use to identify page type
  base_path: 'blog',

  // it does not allow forward slashes
  // follow ascii and unicode encoding
  slug: 'this is the slug that is your page path',
  image_url: 'this is your sharing/featured image url',

  // also see, enable_auto_description above
  description: 'short description',

  content: 'the page content',

  // when you set this, it will evaluate content as template 
  // then the result is passed to the template
  enable_content_template: 'true to evaluate content as template'

  // tags are like categories of a blog
  // allow for page or blog quick search
  tags: 'space separated tags value',

  // extra fields are defined here
  extra: {
  },

  // dynamically loaded jsons, result become __w
  widgets: {
    widget1: 'url1 to load html or json',
    widget2: 'url2, json are automatically converted'
  },

  // future schema planning for user's specific data
  user: {
    browser: {
      locale: 'locale reported',
      location: 'geo location'
    },
    header: {},
    body: {},
    query: {},
    params: {}
  }
}
```

1. Generate MD5 template url: $url_md5
2. Download and save template to /tmp/$bucket/$url_md5.extension = $saved_template_path
3. Initialize template engine based on engine and options, set base path of engine to /tmp/$bucket
4. Loop through widgets and async retrieve all object, merge with locals
5. Call renderFile($saved_template, locals)
6. process head_bottom, content_top, and content_bottom.  Since the template is provided, user can add their own head and body content.
7. You can also output widgets on the client-side by serializing it, example:
```html
// here we output a partial
<script id="partial1" type="text/x-template">
{{ widgets.partial1 }};
</script>

// here we output a json object; to output oubject that has scripts
// use filter: replace("<\script>", "<\/scr\\ipt>")
<script>
windows.recipe = {{ widgets.recipe | dump )}};
</script>
```

## Usage
* Commonly use to dynamically generate landing page or personalized email template.
* Perfect for something like [grapejs](https://github.com/artf/grapesjs)
* Use with some kind of headless CMS like: cloudcms.com, contentful.com, dotcms.com, prismic.io, etc... https://www.cmswire.com/web-cms/13-headless-cmss-to-put-on-your-radar/
* Build your own headless CMS.  Simply create a UI that output configuration for this.  Use openresty make aws lambda call, cache, and return html to the client.
* Create your own jsfiddle, codepen, plunkr, etc...

## Engine
Default engine is nunjucks; otherwise, just install additional engines and pass engine name and configuration in api call.  We've also installed doTjs engine to demonstrate how it can be done in the unit test.

### Why nunjucks?
* Unlike liquid/tinylinquid in javascript, nunjucks is actively being develop, support, and is popular.
* It has a bunch of filters built-in so we don't have to write additional filters: https://mozilla.github.io/nunjucks/templating.html#builtin-filters
* Liquid like syntax so it's easy to convert existing theme templates from popular providers such as Shopify, Adobe Business Catalyst, or Nation Builder.
* Has {% raw %} and {% endraw %} to support client-side javascript: https://mozilla.github.io/nunjucks/templating.html#raw
* Provide easy way to customize template loader so we can remote load our templates.

### Requirements

- [Install the Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/installation/)
- [Configure your AWS CLI](https://serverless.com/framework/docs/providers/aws/guide/credentials/)

### Usage

To simulate API Gateway locally using [serverless-offline](https://github.com/dherault/serverless-offline)

``` bash
$ serverless offline start
```

Run your tests

``` bash
$ npm test
```

We use Jest to run our tests. You can read more about setting up your tests [here](https://facebook.github.io/jest/docs/en/getting-started.html#content).

Deploy your project

``` bash
$ serverless deploy
```

Deploy a single function

``` bash
$ serverless deploy function --function serverless-template
```

To add environment variables to your project

1. Rename `env.example` to `env.yml`.
2. Add environment variables for the various stages to `env.yml`.
3. Uncomment `environment: ${file(env.yml):${self:provider.stage}}` in the `serverless.yml`.
4. Make sure to not commit your `env.yml`.

# Future Enhancement / TODO
- [ ] Optimize template and data loading in a single load.
- [ ] Demonstrate CMS front-end with openresty.
- [ ] Create a docker build for this instead of serverless so we can better control cache.

# NOTE / WARNINGS
* Async is use for all templating including the default nunjucks template, please see all nunjucks recommendation for async templating, especially: https://mozilla.github.io/nunjucks/templating.html#asynceach
* Default file cache for everything is 10 minutes.  This can be overridden with CACHE_MIN environment variable.  CACHE_MIN=0 to basically disable cache but still rely on remote server response to If-Modified-Since.  Note: even a small amount of cache like 2 minutes is better than no cache.  This prevent you from getting DDOS response or max out API request per seconds limit.
* It is also recommended to pass in all your state data and use stateUrls feature only when necessary.  Example, get one object for SEO rendering purpose such as article, blog, product, recipe, etc...
* Caching is done by storing the MD5 hash of the file URL with its content on AWS /tmp folder.  It is difficult to clear all cache because the file/cache can exists on multiple machines.  See next item...
* Overcoming cache issue/how-to hack the cache - you can use a popular method for cache busting often done on client-side browser.  Since we generate the cache based on template URLs, you can bypass cache by having a cache-busting querystring in your URL, example: https://template.url.com/index.html?cb=YYYYMMDD for daily cache busting or even hourly.  WARNING: Do this for anything less than hourly.  It may result in running out of /tmp space or even worse, slow performance.
* So you store your config on some private s3 repo.  Simply give your Lambda function access to the repo and use the GET method to render: https://github.com/niiknow/serverless-template/blob/master/handler.js#L10 with https://your-function-url/render/tenantCode?url=https://s3.amazonaws.com/private-bucket-name/tenantCodeOrPath/index.json


# MIT
