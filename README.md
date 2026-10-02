# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Ray Pearson Law analytics

PostHog loads on production builds only when both `PUBLIC_POSTHOG_KEY` and `PUBLIC_POSTHOG_HOST` are set. Create/select the dedicated Ray Pearson Law project in PostHog and use its public project token, not a personal API key. Set these variables in `.env` or the build environment before running `npm run build:hostinger`, then deploy with the existing Hostinger workflow. Static sites must be rebuilt when these values change.

Tracked events: `$pageview`, `phone_link_clicked` (a call-link click, not a completed call), and `lead_form_submitted` (only after a successful response from the lead endpoint). Event properties exclude form values and query strings. Autocapture and session replay are disabled. No visitor identification is performed. Local development does not send events.

After deployment, open the site, visit another page, and click a phone link. Confirm those events in the Ray Pearson Law project's live events. Verify submission tracking using an approved test lead; submitting the form also invokes the existing CRM and email workflow.
