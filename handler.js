import ViewEngine from './lib/ViewEngine'

export const template = async (event, context, callback) => {
  const viewng = new ViewEngine(event.path.bucket);
  const response = {
    statusCode: 200,
    body: await viewng.render(event.body),
  };

  callback(null, response);
};
