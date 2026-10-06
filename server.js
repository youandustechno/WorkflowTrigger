require('dotenv').config();

const express = require('express');
const path = require('path');

const MAX_APPS_PER_DISPATCH = 20;

function generateAppCatalog(size = 50) {
  const apps = [];

  for (let i = 1; i <= size; i += 1) {
    if (i === 1) {
      apps.push('FirstApp');
    } else if (i === 2) {
      apps.push('SecondApp');
    } else if (i === 3) {
      apps.push('ThirdApp');
    } else if (i === 4) {
      apps.push('FourthApp');
    } else if (i === 5) {
      apps.push('FifthApp');
    } else if (i === 6) {
      apps.push('ShareExtra');
    } else if (i === 7) {
      apps.push('Shares Plus');
    } else if (i === 8) {
      apps.push('Shares');
    } else {
      apps.push(`App-${String(i).padStart(2, '0')}`);
    }
  }

  return apps;
}

function validateDispatchPayload({ owner, repo, eventType, apps, githubToken }) {
  if (!owner || !repo || !eventType || !Array.isArray(apps) || apps.length === 0) {
    throw new Error('owner, repo, eventType, and at least one app are required.');
  }

  const cleanApps = [...new Set(
    apps
      .map((app) => String(app).trim())
      .filter(Boolean)
  )];

  if (cleanApps.length > MAX_APPS_PER_DISPATCH) {
    throw new Error(`You can select at most ${MAX_APPS_PER_DISPATCH} apps.`);
  }

  const token = githubToken || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('A GitHub token is required. Provide it in the form or set GITHUB_TOKEN in the environment.');
  }

  return {
    owner: String(owner).trim(),
    repo: String(repo).trim(),
    eventType: String(eventType).trim(),
    apps: cleanApps,
    githubToken: token
  };
}

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const appCatalog = generateAppCatalog();

app.get('/api/apps', (_req, res) => {
  res.json({ apps: appCatalog });
});

app.post('/api/trigger-workflow', async (req, res) => {
  try {
    const payload = validateDispatchPayload(req.body || {});

    const url = `https://api.github.com/repos/${payload.owner}/${payload.repo}/dispatches`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${payload.githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: payload.eventType,
        client_payload: {
          apps: payload.apps
        }
      })
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        message: 'GitHub workflow dispatch failed.',
        status: response.status,
        response: text
      });
    }

    return res.json({
      ok: true,
      owner: payload.owner,
      repo: payload.repo,
      eventType: payload.eventType,
      apps: payload.apps,
      status: response.status,
      response: text || 'Dispatch accepted.'
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Workflow Trigger UI running at http://localhost:${PORT}`);
  });
}

module.exports = {
  app,
  MAX_APPS_PER_DISPATCH,
  generateAppCatalog,
  validateDispatchPayload
};
