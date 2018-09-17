import ViewEngine from './lib/ViewEngine';

export const template = async (event, context, callback) => {
  const viewng = new ViewEngine(event.path.bucket);
  let response = {
    statusCode: 200,
  };

  // two step process, slower
  if (event.method === 'GET') {
    if (event.query.url) {
      // retrieve remote config
      await viewng.getJsonItem('body', event.query.url, event);
    } else {
      return callback(null, {
        statusCode: 422,
        body: 'The query string parameter "url" of your config json is required.',
      });
    }
  }

  response = {
    statusCode: 200,
    body: await viewng.render(event.body),
  };

  callback(null, response);
};
