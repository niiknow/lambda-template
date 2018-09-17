# Lambda Template
Render dynamic UI in the cloud with AWS Lambda

## Psuedo-code
parameters:
```
tenant: 'the tenant id',
template: {
  url: 'https://the.template.url',
  engine: 'pug',
  engine_options: 'engine options'
},
context: {
  item: 'json/context object to pass to template or the public url to get the json, example: product or recipe'
},
extra: {
  head_appends: 'append content to the head tag, if </head> is found',
  content_prepends: 'prepend after the body tag if found; otherwise, append to content if no body tag found',
  content_appends: 'stuff to append to the content body, if found; otherwise, append to the content'
}
```

1. Generate MD5 template url: $url_md5
2. Download and save template to /tmp/$tenant_id/$url_md5.tpl = $saved_template
3. Initialize template engine based on engine and options, set base path of engine to /tmp/$tenant_id
4. Call renderFile($saved_template, context)
5. process head_appends, content_prepends, and content_appends 

Obviously, since the entire template is provided, user can add their own head and body content.  The purpose of head_appends, content_preprends, and content_appends is for your product to add additional analytic/counter/optimization script/pixel/etc...

## Usage
* Commonly use to dynamically generate landing page.
* Can be use to generate html for email.

### Demo

A demo version of this service is hosted on AWS - [`https://z6pv80ao4l.execute-api.us-east-1.amazonaws.com/dev/hello`](https://z6pv80ao4l.execute-api.us-east-1.amazonaws.com/dev/hello)

And here is the ES7 source behind it

``` javascript
export const hello = async (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: `Go Serverless v1.0! ${(await message({ time: 1, copy: 'Your function executed successfully!'}))}`,
      input: event,
    }),
  };

  callback(null, response);
};

const message = ({ time, ...rest }) => new Promise((resolve, reject) => 
  setTimeout(() => {
    resolve(`${rest.copy} (with a delay)`);
  }, time * 1000)
);
```

### Requirements

- [Install the Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/installation/)
- [Configure your AWS CLI](https://serverless.com/framework/docs/providers/aws/guide/credentials/)

### Installation

To create a new Serverless project.

``` bash
$ serverless install --url https://github.com/AnomalyInnovations/serverless-nodejs-starter --name my-project
```

Enter the new directory

``` bash
$ cd my-project
```

Install the Node.js packages

``` bash
$ npm install
```

### Usage

To run unit tests on your local

``` bash
$ npm test
```

To run a function on your local

``` bash
$ serverless invoke local --function hello
```

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
$ serverless deploy function --function hello
```

To add another function as a new file to your project, simply add the new file and add the reference to `serverless.yml`. The `webpack.config.js` automatically handles functions in different files.

To add environment variables to your project

1. Rename `env.example` to `env.yml`.
2. Add environment variables for the various stages to `env.yml`.
3. Uncomment `environment: ${file(env.yml):${self:provider.stage}}` in the `serverless.yml`.
4. Make sure to not commit your `env.yml`.

# MIT
