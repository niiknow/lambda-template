import * as handler from '../handler';

test('test_doT_template', async () => {
  const event = {
    path: {
      bucket: 'doT',
    },
    body: {
      site: {
        host: 'example.com',
        template_type: 'dot',
        head_bottom: '<meta name="hi" content="hi" />',
        content_top: 'Hola',
        content_bottom: 'Como Esta?'
      },
      template_url: 'https://raw.githubusercontent.com/niiknow/renderless/master/tests/views/doTjs.dot',
      name: 'john',
      age: 100
    },
  };

  const expected = '<html><head><title>hi</title><meta name="hi" content="hi" /></head><body class="hi">Hola<div>Hi john!</div><div>100</div>Como Esta?</body></html>';
  const context = 'context';
  const callback = (error, response) => {
    expect(response.statusCode).toEqual(200);
    expect(typeof response.body).toBe('string');
    expect(response.body).toEqual(expected);
  };

  await handler.template(event, context, callback);
});

test('test_nunjucks_template', async () => {
  const event = {
    path: {
      bucket: 'njk1',
    },
    body: {
      site: {
        host: 'example.com',
        head_bottom: '<meta name="hi" content="hi" />',
        content_top: '{{ Hola }}',
        content_bottom: 'Como Esta?'
      },
      template_url: 'https://raw.githubusercontent.com/niiknow/renderless/master/tests/views/nunjucks.htm',
      firstName: 'Slim',
      lastName: 'Shady'
    }
  };
  const expected = '<html><head><title>Hello</title><meta name="hi" content="hi" /></head><body>{{ Hola }}<div>My name is Slim Shady!</div>Como Esta?</body></html>';
  const context = 'context';
  const callback = (error, response) => {
    const actual = response.body;
    expect(response.statusCode).toEqual(200);
    expect(typeof actual).toBe('string');
    expect(actual).toEqual(expected);
  };

  await handler.template(event, context, callback);
});

test('test_task_in_mn', async () => {
  const event = {
    path: {
      bucket: 'njk2',
    },
    body: {
      site: {
        host: 'example.com',
        head_bottom: '<meta name="hi" content="hi" />',
        content_top: '{{ Hola }}',
        content_bottom: 'Como Esta?'
      },
      template_url: 'https://raw.githubusercontent.com/niiknow/renderless/master/tests/views/task-in-mn.htm',
      firstName: 'Slim',
      lastName: 'Shady',
      widgets: {
        mn: 'https://raw.githubusercontent.com/niiknow/zipcode-us/master/db/55/55123.json',
        task: 'https://jsonplaceholder.typicode.com/todos/1',
      }
    },
  };
  const expected = `Hola<div>State: MN </div><div>1</div>
Como Esta?`;
  const context = 'context';
  const callback = (error, response) => {
    expect(response.statusCode).toEqual(200);
    expect(typeof response.body).toBe('string');
    expect(response.body).toEqual(expected);
  };

  await handler.template(event, context, callback);
});


test('test_script_text_seo', async () => {
  const event = {
    path: {
      bucket: 'njk3',
    },
    body: {
      site: {
        host: 'example.com'
      },
      template_url: 'https://raw.githubusercontent.com/niiknow/renderless/master/tests/views/script-text-seo.njk',
      firstName: 'Slim',
      lastName: 'Shady'
    },
  };

  const expected = `<html>
<head>
    <title>Rainbow Root Soup - Guiding Stars</title>
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://guidingstars.com/recipes/rainbow-root-soup/" />
<link rel="author" href="Recipes" />
<link rel="description" href="If your family loves their chicken soup with noodles, cook up a pan of whole-wheat pasta and store it in the fridge. Add a handful of noodles as you reheat the soup to prevent the noodles from getting soggy." />
<meta property="og:type" content="article" />
<meta property="og:locale" content="en_US" />
<meta property="og:site_name" content="Rainbow Root Soup - Guiding Stars" />
<meta property="og:url" content="https://guidingstars.com/recipes/rainbow-root-soup/" />
<meta property="og:title" content="Rainbow Root Soup - Guiding Stars" />
<meta property="og:image" content="https://guidingstars.com/wp-content/uploads/2018/02/GSLogoOverlay-3-stars.png" />
<meta property="og:description" content="If your family loves their chicken soup with noodles, cook up a pan of whole-wheat pasta and store it in the fridge. Add a handful of noodles as you reheat the soup to prevent the noodles from getting soggy." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@guidingstars" />
<meta name="twitter:creator" content="@guidingstars" />
<meta name="twitter:title" content="Rainbow Root Soup - Guiding Stars" />
<meta name="twitter:image:src" content="https://guidingstars.com/wp-content/uploads/2018/02/GSLogoOverlay-3-stars.png" />
<meta name="twitter:description" content="If your family loves their chicken soup with noodles, cook up a pan of whole-wheat pasta and store it in the fridge. Add a handful of noodles as you reheat the soup to prevent the noodles from getting soggy." />
<meta itemprop="name" content="Rainbow Root Soup - Guiding Stars" />
<meta itemprop="url" content="https://guidingstars.com/recipes/rainbow-root-soup/" />
<meta itemprop="author" content="Recipes" />
<meta itemprop="image" content="https://guidingstars.com/wp-content/uploads/2018/02/GSLogoOverlay-3-stars.png" />
<meta itemprop="description" content="If your family loves their chicken soup with noodles, cook up a pan of whole-wheat pasta and store it in the fridge. Add a handful of noodles as you reheat the soup to prevent the noodles from getting soggy." />
</head>
<body>
  <div>My name is Slim Shady!</div></body>
</html>`;
  const context = 'context';
  const callback = (error, response) => {
    expect(response.statusCode).toEqual(200);
    expect(typeof response.body).toBe('string');
    expect(response.body).toEqual(expected);
  };

  await handler.template(event, context, callback);
});
