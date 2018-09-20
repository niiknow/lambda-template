import fs from 'fs';
import ViewEngine from './lib/ViewEngine';

export const template = async (event, context, callback) => {
  const urls = [event.query.url || event.body.meta.url];
  const viewng = new ViewEngine(event.path.bucket, urls[0]);

  if (viewng.baseUrl) {
    urls.push(viewng.partialNavUrl);
    urls.push(viewng.templateUrl);

    const rst = viewng.njkLoaders.fetchUrls(urls);
    rst.forEach((v) => {
      if (v === urls[0]) {
        // expect data to be json, otherwise error
        event.body = viewng.tryParseJson(fs.readFileSync(v.path, 'utf8'));
      }
    });
  }

  const html = await viewng.render(event.body);

  const response = {
    headers: {'Content-Type': 'application/json'},
    statusCode: 200,
    body: (html + '').trim()
  };

  callback(null, response);
};
