# Serverless Template
> Render dynamic html in the cloud with AWS Lambda

This package help provide server-side rendering, serverlessly.  Say what? ;)

To support rendering of different templating engines, this library use consolidate.js, see list of supported engines here: https://github.com/tj/consolidate.js#supported-template-engines Consolidate.js is a library that define a single rendering API (consolidates) for different templating engines.  It is widely use in various server-side frameworks such as Express and Koa.

## Psuedo-code
parameters:
```
template: {
  url: 'https://the.template.url',
  engine: 'nunjuck',
  engineOptions: 'engine options',
  extension: 'html'
},
state: {
  firstName: 'John'
},
stateConfigs: {
  recipe: 'url to recipe json',
  product: {
    url: 'product url',
    headers: {
      'auth': {
        'user': 'username',
        'pass': 'password',
        'sendImmediately': false
      },
      // or
      'auth': {
        'bearer': 'bearerToken'
      }
      // or
      {'x-token': 'my-token'}
    },
    body: {
      stuff: 'for POST method'
    }
  }
},
extra: {
  headAppends: 'append content to the head tag, if </head> is found',
  contentPrepends: 'prepend after the body tag if found; otherwise, prepend to content if no body tag found',
  contentAppends: 'stuff to append to the content body, if found; otherwise, append to the content'
}
```

1. Generate MD5 template url: $url_md5
2. Download and save template to /tmp/$bucket/$url_md5.extension = $saved_template
3. Initialize template engine based on engine and options, set base path of engine to /tmp/$bucket
4. Loop through stateConfigs and async retrieve all object, merge with state
5. Call renderFile($saved_template, state)
6. process headAppends, contentPrepends, and contentAppends 

Obviously, since the template is provided, user can add their own head and body content.  The purpose of headAppends, contentPrepends, and contentAppends is for additional analytic script/pixel...

## Usage
* Commonly use to dynamically generate landing page.
* Can be use to generate personalized html for email.
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
- [x] Demonstrate consolidate.js using doTjs templating
- [x] Customize nunjucks templating as default template
- [x] Dynamic retrieval of item json
- [x] Since a schema is known and defined, render template from some page configuration file stored in the cloud/secure s3?
- [ ] Optimize, optimize, optimize: caching template file to disk, precompiled template, caching to redis, etc...
- [ ] Demonstrate CMS front-end with openresty.

# NOTE / WARNINGS
* Async is use for all templating including the default nunjucks template, please see all nunjucks recommendation for async templating, especially: https://mozilla.github.io/nunjucks/templating.html#asynceach
* Default file cache for everything is 10 minutes.  This can be overridden with CACHE_MIN environment variable.  CACHE_MIN=0 to basically disable cache but still rely on remote server response to If-Modified-Since.  Note: even a small amount of cache like 2 minutes is better than no cache.  This prevent you from getting DDOS response or max out API request per seconds limit.
* It is also recommended to pass in all your state data and use stateUrls feature only when necessary.  Example, get one object for SEO rendering purpose such as article, blog, product, recipe, etc...
* Caching is done by storing the MD5 hash of the file URL with its content on AWS /tmp folder.  It is difficult to clear all cache because the file/cache can exists on multiple machines.  See next next item...
* Overcoming cache issue/how-to hack the cache - you can use a popular method for cache busting often done the client-side browser side.  Since we generate the cache based on template URLs, you can bypass cache by having a cache-busting querystring in your URL, example: https://template.url.com/index.html?cb=YYYYMMDD for daily cache busting or even hourly.  WARNING: Do this for anything less than hourly.  It may result in running out of /tmp space or even worse, slow performance.
* So you store your config on some private s3 repo.  Simply give your Lambda function access to the repo and use the GET method to render: https://github.com/niiknow/serverless-template/blob/master/handler.js#L10 with https://your-function-url/render/tenantCode?url=https://s3.amazonaws.com/private-bucket-name/tenantCodeOrPath/index.json


# MIT
