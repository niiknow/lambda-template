import * as handler from '../handler';

test('template', async () => {
  const event = {
  	path: {
  		tenant: 'test'
  	},
  	body: {
      template: {
        url: 'https://'
      }
  	}
  };
  
  const context = 'context';
  const callback = (error, response) => {
    expect(response.statusCode).toEqual(200);
    expect(typeof response.body).toBe("string");
  };

  await handler.template(event, context, callback);
});
