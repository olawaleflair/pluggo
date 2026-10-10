# Forking and proposing changes

You are welcome to fork, reuse and suggest changes through pull requests. I may review contributions when time allows, but I do not promise a review, merge or ongoing support.

## Work in your own fork

1. Select **Fork** on GitHub to create your own copy of this repository.
2. Clone your fork locally, create a branch for your change, and follow the setup instructions in [README.md](README.md).
3. Use fictional demo data. Add only your own optional credentials to ignored `.env.local` or `.dev.vars` files. Keep the simulation disclosures and never commit credentials, runtime databases, logs or private captures.
4. Run the relevant checks before proposing code changes:

   ```sh
   npm run lint
   npm test
   npm run test:worker
   npm run build
   npm run build:public
   ```

5. Push the branch to your fork. If you want to suggest it here, select **Pull requests > New pull request**, compare your branch against this repository's `main`, and explain the problem, change, checks and any limitations. Keep each proposal focused.

You can maintain or publish your own fork under the MIT license without sending a pull request. Preserve the copyright and license notices and the applicable third-party notices. Contributions you submit here should be available under the same MIT license, and you should have permission to share everything included.

Do not post secrets or personal account details in pull requests, comments or screenshots. If you accidentally expose a credential, revoke it with its provider; removing the text alone does not revoke it. Use your own hosting and database resources. Changes to your fork do not update the separately maintained live portfolio demo.
