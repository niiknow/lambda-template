import * as handler from '../handler';

require('debug').enabled('*');

test('template', async () => {
  const event = {
  	path: {
  		tenant: 'test'
  	},
  	body: {
      template: {
        url: 'https://raw.githubusercontent.com/niiknow/serverless-template/master/tests/views/test1.dot'
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
