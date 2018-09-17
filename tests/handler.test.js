import * as handler from '../handler';

test('test_doT_template', async () => {
  const event = {
  	path: {
  		bucket: 'doT'
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
      bucket: 'njk'
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
  const expected = `<html>
<head>
    <title>Hello</title>
</head>
<body class=\"hi\">
    <div>My name is Slim Shady!</div>
</body>
</html>`;
  
  const context = 'context';
  const callback = (error, response) => {
    expect(response.statusCode).toEqual(200);
    expect(typeof response.body).toBe('string');
    expect(response.body).toEqual(expected);
  };

  await handler.template(event, context, callback);
});


test('test_task_in_mn', async () => {
  const event = {
    path: {
      bucket: 'njk'
    },
    body: {
      template: {
        url: 'https://raw.githubusercontent.com/niiknow/serverless-template/master/tests/views/task-in-mn.html'
      },
      state: {
        firstName: 'Slim',
        lastName: 'Shady'
      },
      stateUrls: {
        mn: 'https://niiknow.github.io/zipcode-us/db/55/55123.json',
        task: 'https://jsonplaceholder.typicode.com/todos/1'
      }
    }
  };
  const expected = `<div>State: MN </div><div>1</div>`;
  const context = 'context';
  const callback = (error, response) => {
    expect(response.statusCode).toEqual(200);
    expect(typeof response.body).toBe('string');
    expect(response.body).toEqual(expected);
  };

  await handler.template(event, context, callback);
}, 3000);