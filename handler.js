import RemoteViews from './lib/RemoteViews'

export const template = async (event, context, callback) => {
  const view = new RemoteViews(event.path.tenant, event.body);
  const response = {
    statusCode: 200,
    body: await view.render(),
  };

  callback(null, response);
};