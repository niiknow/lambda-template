import * as handler from '../handler';

require('debug').enabled('*');

test('test_dot_template', async () => {
  const event = {
  	path: {
  		bucket: 'test'
  	},
  	body: {
      template: {
        url: 'https://raw.githubusercontent.com/niiknow/serverless-template/master/tests/views/doTjs.dot',
        engine: 'dot',
        extension: 'dot'
      },
      state: {
        name: 'john',
        age: 100
      }
  	}
  };
  
  const context = 'context';
  const callback = (error, response) => {
    expect(response.statusCode).toEqual(200);
    expect(typeof response.body).toBe('string');
    expect(response.body).toEqual('<html><head><title>hi</title></head><body class=\"hi\"><div>Hi john!</div><div>100</div></body></html>');
  };

  await handler.template(event, context, callback);
});

test('test_nunjucks_template', async () => {
  const event = {
    path: {
      bucket: 'test'
    },
    body: {
      template: {
        url: 'https://raw.githubusercontent.com/niiknow/serverless-template/master/tests/views/nunjucks.html'
      },
      state: {
        firstName: 'Slim',
        lastName: 'Shady'
      }
    }
  };
  
  const context = 'context';
  const callback = (error, response) => {
    expect(response.statusCode).toEqual(200);
    expect(typeof response.body).toBe('string');
    expect(response.body).toEqual('<html><head><title>Hello</title></head><body class=\"hi\"><div>My name is Slim Shady!</div></body></html>');
  };

  await handler.template(event, context, callback);
});