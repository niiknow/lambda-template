# Serverless Template
Render dynamic html in the cloud with AWS Lambda

## Psuedo-code
parameters:
```
template: {
  url: 'https://the.template.url',
  engine: 'nunjuck',
  engine_options: 'engine options',
  extension: 'html'
},
state: {
  item: 'json/context object to pass to template or the public url to get the json, example: product or recipe'
},
extra: {
  head_appends: 'append content to the head tag, if </head> is found',
  content_prepends: 'prepend after the body tag if found; otherwise, prepend to content if no body tag found',
  content_appends: 'stuff to append to the content body, if found; otherwise, append to the content'
}
```

1. Generate MD5 template url: $url_md5
2. Download and save template to /tmp/$tenant_id/$url_md5.tpl = $saved_template
3. Initialize template engine based on engine and options, set base path of engine to /tmp/$tenant_id
4. Call renderFile($saved_template, state)
5. process head_appends, content_prepends, and content_appends 

Obviously, since the template is provided, user can add their own head and body content.  The purpose of head_appends, content_prepends, and content_appends is for additional analytic script/pixel...

## Usage
* Commonly use to dynamically generate landing page.
* Can be use to generate personalized html for email.

## Engine
Default engine is nunjucks; otherwise, just install additional engines and pass engine name and configuration in api call. This library use consolidate.js, see list of supported engines here: https://github.com/tj/consolidate.js#supported-template-engines  We've also installed doTjs engine to demonstrate how it can be done in the unit test.

### Why nunjucks?
* Unlike liquid/tinylinquid in javascript, nunjucks is actively being develop, support, and is popular.
* It has a bunch of filters built-in so we don't have to write additional filters.
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
- [ ] Customize nunjucks templating as default template
- [ ] Dynamic retrieval of item json
- [ ] Caching of item - to redis?
- [ ] Retrieve item with authentication, with header? oauth/jwt token?
- [ ] Since a schema is known and defined, render template from some page configuration file stored in the cloud/secure s3?
- [ ] Optimize, optimize, optimize: caching template file to disk, precompiled template, caching to redis, etc...

# MIT
