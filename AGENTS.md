## Overview

This is a standalone React SPA for Developer Sandbox, a platform that allows
customers to try the Red Hat products. These are some of the key points of the
repository:

- It expects to be integrated with the Red Hat's single sign on using the OIDC
  flow. Uses `Keycloak` as the authentication back end.
- Talks to a registration service of the platform, which keeps track of the
  signup status of the users: once they sign up, a restricted namespace is
  given to them in a restricted OpenShift cluster.
- Uses a proxy to talk to the Ansible Automation Platform and OpenClaw
  operators, as well as to the Kubernetes API.
- Uses Segment for telemetry and analytics, mainly.

## Repository layout

- `deploy` contains the Containerfile and the required bits to build an image.
- `docs` contains documentation and design documents about the project.
- `e2e` contains the end-to-end tests. It is a self-contained directory with
  its own `package.json` file so that we don't have to include big UI libraries
  for the end-to-end tests.
- `public` holds the configuration example for the UI, and that's where the
  final configuration file and the mock service worker files end up getting
  placed.
- `src/api` is for HTTP use only. Uses `authFetch` for authenticated calls
  to the back ends, and the unexpected API errors are captured in a `ApiError`
  object. It does not, and should not have any React code.
- `src/assets` is used for the static assets that get compiled and optimized
  by Vite.
- `src/auth` holds the authentication, OIDC, Keycloak and token parsing code.
- `src/components` has the application's components. It uses sibling `.css`
  files for styling. The components are separated in big feature directories:
  `Activities`, `Catalog` and `Modals` for features. `common` for shared CSS
  and `Layout` for chrome.
- `src/config` holds the types for the UI's configuration, its parsing, and
  any other definition used by Playwright for the tests.
- `src/error` contains any custom defined error structures and helpers to
  build them.
- `src/hooks` contains all the contexts, providers and hooks of the
  application. The context is defined in a file, and the provider in a
  different one. Type narrowing is used so that contexts that depend on other
  contexts can avoid writing checks on every line. For the providers that
  still need to be rendered, NO-OP providers are used until the required
  variables are populated.
- `src/mocks` has all the mocks that the Mock Service Worker and Playwright
  use for both development and testing.
- `src/types` defines all the custom types used in the UI.
- `src/utils` holds all the utilities or code blocks that are related to
  certain features or files, but that are left in separated utility files for
  testability, maintainability and readability.

## Conventions

### General guidelines

- Avoid using inline styling as much as possible for new code, unless it's
  less than 3 CSS directives. Prefer using CSS classes always, to keep the
  attributes clean.
- Document components, functions, hooks and types.
- Use inline comments to explain complex code or the reasoning about the
  implementation.
- Keep a soft wrap of 80 characters for the code and the comments, and honor
  it unless the function names, titles or indentation does not allow it.
- For components and hooks, try having one component and hook per file, and
  split them when a file is growing.
- For APIs, keep the APIs that are relevant to a single product or feature
  within the same file, if possible.
- Try having files as lightweight as possible, with single purpose and
  responsibility per file if possible.
- When a file starts growing too big, excluding tests, propose a refactor or
  separation of concerns where it makes sense.
- Prefer quality changes as opposed to hacks. If a certain change requires a
  structural change, ask for confirmation and suggest the better solution
  instead of patching an easy hack together.
- Never, under no circumstances, commit anything unless explicitly asked.
- If a new library is required, ask for confirmation before adding it, and
  justify your decision with clear and concise reasoning.
- Always use PatternFly over custom CSS if possible, and ask about adding any
  other new elements only if PatternFly cannot provide with the required
  solution.
- Copy the current flows of the Catalog and Activities whenever adding new
  cards/products or activities. The new `ProductType`s go in
  `src/types/product.ts`, the products themselves in
  `src/components/Catalog/productData.ts`.
- Catalog primary actions follow `UserSignupPhase`, because the user needs to
  be in a `READY` state before the product trials can be opened. Reuse the
  switch in `CatalogGrid` for stateless product instances, and
  `AnsibleCatalogCard` and/or the `OpenClawCatalogCard` for the stateful ones.
- Use simple cards for products that just require a URL template, and use
  more complex and domain specific ones like the one for Ansible Automation
  Platform when we are managing state for the product trial.
- Telemetry must be added by using `trackAnalytics` in primary call to actions
  or CTAs when adding new primary catalog and activity actions.
- Follow `.gitignore` if in doubt whether the file should be edited or not. As
  a general rule, `dist/`, `node_modules`, `public/config.js` and
  `public/mockServiceWorker.js` should never be modified to satisfy a code
  requirement.
- Hide products listed in `disabledIntegrations`. Don’t add a ProductType or
  `UserSignupPhase` unless asked.
- Read the `eslint.config.js` and make sure you are following the rules
  defined there. Specifically, the `curly: all` and `simple-import-sort`
  rules.

### Branding

- We use Red Hat's official component library, PatternFly, to implement our UI
  so that it is consistent with the rest of the Red Hat products.
- The footer is the only exception, and it comes from Red Hat Design System,
  RHDS, for the same reason listed in the previous point.

### Error handling

- Always handle errors and exceptions for new code.
- Take two error layers into account: `src/api` throws `ApiError`, and the
  providers or UI code map those to `UserFacingError`, which eventually gets
  surfaced to the user using `addAlert` or `addAlertFromError`. Don't throw
  `UserFacingError` from the API layer.
- Use `UserFacingError` structures to surface errors to the users, log the
  internal details and include them in the error structure so that the users can
  copy them for support.
- Use `addAlert` and `addAlertFromError` to surface those errors.

## Definition of done

- The code changes are documented and well tested.
- The prettier, linters, compilers, unit tests and end-to-end tests pass with
  no errors.
  - Use `make lint` for type checking, ESLint and Prettier checks.
  - Fix any compilation checks, and any warnings/errors. We want a clean
    build without them.
  - Use `make lint-fix` for fixing ESLint and format errors.
  - Use `make test-unit` to run the unit tests and make sure they pass.
  - Use `make test-e2e` for user-facing changes, skip it otherwise.

## Testing

- Use unit testing for API mapping, hooks, components and utilities.
- Use end-to-end testing for user-visible flows, buttons and interactions.

### Unit testing with Vitest and the testing library

- Write thorough and complete test cases which cover all the paths of the
  code, and always provide with a summary of the tested functionality.
- Test files live next to code as `src/**/__tests__/*.test.ts(x)`. The only
  exception is the `App.test.tsx`.
- Query by `getByRole` as much as possible, and avoid generating artificial
  `testid` annotations for testing purposes and querying by CSS selectors.
  When not possible, point it out and suggest adding an appropriate role to
  improve accessibility. The only exception is using `testid` in provider
  tests, not product UI itself.
- Always mock the back ends for the tests. Isolate at one layer:
  - API tests: use MSW only.
  - Component tests: wrap existing context helpers and fixtures like
    `UserContext.Provider`, `makeOpenClawContext`. Don't also mock `src/api`
    or start MSW. The only exception is `Layout.test.tsx`.
  - Provider tests: render the real provider and use MSW, `window.__config__`
    and `setTokenGetter`.
- Mock `@rhds/elements` when a test renders the footer or the layout. Take a
  look at `src/components/__tests__/Layout.test.tsx` for an example.

### End-to-end testing with Playwright

- Specs live in `e2e/tests/*.spec.ts`.
- Use the `window.__playwrightOverrides__` type in `src/config` to drive the
  MSW mock back end, and to control what the back end returns to prepare the
  scenarios for the end-to-end testing.
- Overrides need to be set with `page.addInitScript` before `page.goto`. Use
  `e2e/tests/signup.spec.ts` as an example.
- Tag mock-dependent cases with `@mock-only`.
- Import `UserSignupPhase` from `src/hooks/userSignupPhase.ts` so Playwright
  does not load the react tree.
