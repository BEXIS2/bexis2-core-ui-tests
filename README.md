# Initial setup
It is recommended to install Playwright's official Visual Studio Code [extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) for a better testing experience and an interactive GUI.
## Shared functions
Create a `.env` file in the root folder of the project for your user credentials and host URL. `HOST`, `USER` and `PASSWORD` are the environment variables required to run shared functions.

Here's an example `.env` file contents:
```bash
export HOST="https://localhost:4173"
export USER="user"
export PASSWORD="user"
```
### Using shared variables
Importing shared functions from `shared.ts`:
```typescript
import { login, host } from  './shared';
```
\
Usage of shared functions in tests:
```typescript
test('Test', async ({ page }) => {
    await login(page); // Login
    await page.goto(`${host}/test/`); // Go to /test route
});
```
## Playwright Docs
You can check Playwright documentation [page](https://playwright.dev/docs/intro) for more details, guides and information.