import RemoteView from './lib/RemoteView'

export const template = async (event, context, callback) => {
  const view = new RemoteView(event.path.tenant, event.body);
  const response = {
    statusCode: 200,
    body: await view.render(),
  };

  callback(null, response);
};