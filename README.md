# Workflow Trigger UI

This project provides a small web interface for selecting one or more app names and posting them to a GitHub repository dispatch event.

## Features

- Choose repository owner and repository name
- Set the workflow event name
- Select one or more apps from a checklist
- Send the request to GitHub through a backend server
- Keep the GitHub token off the browser by using a local server

## Setup

1. Install dependencies:
   npm install
2. Copy the example environment file:
   cp .env.example .env
3. Add your GitHub token to `.env`:
   GITHUB_TOKEN=ghp_your_token_here
4. Start the app:
   npm start
5. Open http://localhost:3000

## Example request payload

The app sends a payload like this:

```json
{
  "event_type": "build-apps",
  "client_payload": {
    "apps": ["FirstApp", "ThirdApp"]
  }
}
```

The UI sends the selected values to GitHub using the repository dispatch API.
