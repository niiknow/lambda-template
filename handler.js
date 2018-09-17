import RemoteView from './lib/RemoteView'

export const hello = async (event, context, callback) => {
  const view = new RemoteView(event.options);
  const response = {
    statusCode: 200,
    body: await view.render(),
  };

  callback(null, response);
};