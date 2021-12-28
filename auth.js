const { AuthorizationCode } = require('simple-oauth2');
const randomstring = require('randomstring');
const Secrets = require('./lib/secrets');

const secrets = new Secrets({
  GIT_HOSTNAME: process.env.GIT_HOSTNAME,
  OAUTH_TOKEN_PATH: process.env.OAUTH_TOKEN_PATH,
  OAUTH_AUTHORIZE_PATH: process.env.OAUTH_AUTHORIZE_PATH,
  OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
  REDIRECT_URL: process.env.REDIRECT_URL,
  OAUTH_SCOPES: process.env.OAUTH_SCOPES
});

function getScript(mess, content) {
  return `<html><body><script>
  (function() {
    function receiveMessage(e) {
      console.log("receiveMessage %o", e)
      window.opener.postMessage(
        'authorization:github:${mess}:${JSON.stringify(content)}',
        e.origin
      )
      window.removeEventListener("message",receiveMessage,false);
    }
    window.addEventListener("message", receiveMessage, false)
    console.log("Sending message: %o", "github")
    window.opener.postMessage("authorizing:github", "*")
    })()
  </script></body></html>`;
}

module.exports.auth = (e, ctx, cb) => secrets.init().then(() => {
  const oauth2 = new AuthorizationCode({
    client: {
      id: secrets.OAUTH_CLIENT_ID,
      secret: secrets.OAUTH_CLIENT_SECRET,
    },
    auth: {
      tokenHost: secrets.GIT_HOSTNAME,
      tokenPath: secrets.OAUTH_TOKEN_PATH,
      authorizePath: secrets.OAUTH_AUTHORIZE_PATH,
    },
  });

  // Authorization uri definition
  const authorizationUri = oauth2.authorizeURL({
    redirectURI: secrets.REDIRECT_URL,
    scope: secrets.OAUTH_SCOPES,
    state: randomstring.generate(32),
  });

  cb(null, {
    statusCode: 302,
    headers: {
      Location: authorizationUri,
    },
  });
});

module.exports.callback = (e, ctx, cb) => {
  const oauth2 = new AuthorizationCode({
    client: {
      id: secrets.OAUTH_CLIENT_ID,
      secret: secrets.OAUTH_CLIENT_SECRET,
    },
    auth: {
      tokenHost: secrets.GIT_HOSTNAME,
      tokenPath: secrets.OAUTH_TOKEN_PATH,
      authorizePath: secrets.OAUTH_AUTHORIZE_PATH,
    },
  });

  secrets.init().then(() => {
    const options = {
      code: e.queryStringParameters.code,
    };
    return oauth2.getToken(options);
  }).then((result) => {
    const token = oauth2.createToken(result);
    cb(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: getScript('success', {
        token: token.token.token.access_token,
        provider: 'github',
      })
    });
  }).catch((err) => {
    cb(null, {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: getScript('error', err),
    });
  });
};

module.exports.success = (e, ctx, cb) => cb(null, {
    statusCode: 204,
    body: '',
  },
);

module.exports.default = (e, ctx, cb) => {
  cb(null, {
    statusCode: 302,
    headers: {
      Location: '/auth',
    },
  });
};