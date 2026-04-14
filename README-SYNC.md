# Syncing the Luna sidebar with another GitHub project

Waypoint Steps consumes **`waypoint-sidebar`** on GitHub. Nothing updates by itself—you pull changes from the original **on purpose** (or bump a submodule pointer).

---

## Remotes (this project)

| Remote     | Repository | Role |
|------------|------------|------|
| **`origin`**   | [`AceConcept/waypoint-steps`](https://github.com/AceConcept/waypoint-steps) | **Your app** — normal `git fetch` / `git push` |
| **`upstream`** | [`AceConcept/waypoint-sidebar`](https://github.com/AceConcept/waypoint-sidebar) | **Canonical sidebar** — `git fetch` (and merge only if you use the merge workflow below) |

If **`upstream`** is missing (e.g. fresh clone), add it once:

```bash
git remote add upstream https://github.com/AceConcept/waypoint-sidebar.git
```

---

## Best simple pattern: `upstream` remote + merge

Use this when the sidebar lives as **regular tracked files** in this repo and you want **`waypoint-sidebar`** history merged into **`main`** (typical “spin-off + periodic sync” setup).

**Nothing runs automatically.** You choose when to fetch + merge (e.g. weekly or before a release).

Whenever you want the latest from the original:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

Or, if you prefer a linear history and know how to resolve rebase conflicts:

```bash
git fetch upstream
git checkout main
git rebase upstream/main
```

Push your updated `main` to **your** GitHub repo as usual:

```bash
git push origin main
```

**Naming**

- **`origin`** → your GitHub repo (**Waypoint Steps**), where you **push**.
- **`upstream`** → **waypoint-sidebar**, where you **only fetch** (and merge/rebase into `main`).

**What this does**

Brings commits from **`waypoint-sidebar`** into this repo. Changes under paths that mirror the upstream tree (for example sidebar sources under the same relative layout) come along; you resolve conflicts if both sides edited the same lines.

**What it does not do**

Run on its own—you decide when to sync.

**Keep merges predictable**

Use the **same paths** in both repos for sidebar code when possible. This project keeps the submodule checkout at **`luna-sidebar/`** (see below), which mirrors checking out **`waypoint-sidebar`** at that path.

If you **heavily customize** files that upstream also changes, merges get noisy—then moving the sidebar into a **shared npm package** (Option A) is the usual upgrade path.

**Submodule vs merge**

This repo currently tracks the sidebar as a **Git submodule** at **`luna-sidebar/`** (not as a root-level merge of `upstream/main` into `waypoint-steps`). **Do not** run `git merge upstream/main` at the **root** of this repo while you still rely on the submodule for the same tree unless you are **deliberately migrating** away from submodules—use the submodule workflow in [Option B](#option-b--git-submodule-other-repo-as-a-folder) instead, or complete a migration first.

---

## Option A — `npm` dependency from the other GitHub repo (recommended for “library + app”)

### 1. Sidebar repository

Add a root **`package.json`** with:

- A package name, e.g. `"name": "@aceconcept/luna-sidebar"`
- Entry points: **`main`**, **`module`**, and/or **`exports`** pointing at your built or source entry (match how you ship JSX—many internal packages ship source and let the app transpile)
- **`peerDependencies`**: `"react"`, `"react-dom"` (versions compatible with this app)
- **`files`**: which paths are included when the package is installed from git

### 2. This repository (Waypoint Steps)

1. **Stop editing** the vendored copy under `luna-sidebar/` here (or remove that folder once the dependency works).
2. In **`package.json`**, add a dependency on the other repo, for example:

```json
"luna-sidebar": "github:AceConcept/YourSidebarRepo#main"
```

Replace with your real **`owner/repo`**, branch, or a **tag** (e.g. `#v1.2.0`) if you want pinned, reviewable upgrades.

3. Update imports from paths like `'../luna-sidebar/index.js'` to the package name, e.g. **`'luna-sidebar'`**. Adjust **Vite** and **TypeScript** (`paths` / `moduleResolution`) if the package needs special handling.

### 3. Day-to-day sync

After changes are **pushed** to the sidebar repo:

```bash
npm update luna-sidebar
```

Or change the `#branch` / tag in `package.json`, then run **`npm install`**. Commit **`package-lock.json`** (and any `package.json` change) in Waypoint Steps.

**Note:** Git does **not** auto-update this repo when the other repo is pushed. That step is manual unless you add CI (below).

---

## Option B — Git submodule (other repo as a folder)

Chosen repo URL: **`https://github.com/AceConcept/waypoint-sidebar.git`**

1. Add the sidebar repository as a **submodule** at **`luna-sidebar/`**:

```bash
git rm -r luna-sidebar
git submodule add https://github.com/AceConcept/waypoint-sidebar.git luna-sidebar
```

2. Point app imports to the submodule source location (current path in this repo):

```ts
import { LunaSidebar } from '../luna-sidebar/src/luna-sidebar/index.js'
```

3. Commit the submodule setup (`.gitmodules`, `luna-sidebar` gitlink, and import updates).

4. When the sidebar repo has new commits you want:

```bash
git submodule update --remote luna-sidebar
git add luna-sidebar
git commit -m "Bump luna-sidebar submodule"
```

This repo stores **which commit** of the other repo it uses. No npm package is required; submodule workflows can be unfamiliar to some teams.

### Super simple daily workflow (Option B)

Think of this as two notebooks:

- Notebook A = **`waypoint-sidebar`** (where sidebar code lives)
- Notebook B = **`waypoint-steps`** (your app)

Notebook B keeps a **bookmark** to a commit in Notebook A.

1. Edit sidebar in `waypoint-sidebar`, then commit and push there.
2. In **Waypoint Steps** (this repo), run:

```powershell
.\update-sidebar.ps1
```

3. Push **Waypoint Steps** so everyone gets the new bookmark.

Rules:

- Make sidebar code changes in `waypoint-sidebar`.
- Move the bookmark in **Waypoint Steps** with `.\update-sidebar.ps1`.
- If teammate pulls and sidebar looks old, run:

```bash
git submodule update --init --recursive
```

---

## Option C — Monorepo (single GitHub repository)

Put both parts in **one** repo, for example:

- `apps/waypoint-steps`
- `packages/luna-sidebar`

Use **npm/pnpm/yarn workspaces**. One **push** updates everything; there is no cross-repo sync.

---

## Automatic updates (“push sidebar → PR in Waypoint Steps”)

GitHub will not merge two repos by itself. Typical automation:

1. **GitHub Actions** on the **sidebar** repository (on push to `main` or on a **release**): use a **PAT** or GitHub App with permission on **Waypoint Steps** to:
   - open a **PR** that bumps the git dependency / lockfile, or  
   - update the **submodule** pointer and open a PR.

2. **Publish to npm** (or GitHub Packages) from the sidebar repo; enable **Dependabot** or **Renovate** in Waypoint Steps to open version-bump PRs.

---

## Quick comparison

| Goal | Approach |
|------|----------|
| Clear ownership, normal `npm install`, versioned consumption | **Git or npm dependency** from the sidebar repo (Option A) |
| Keep a folder in-tree without publishing a package | **Submodule** (Option B) |
| One push always updates app + sidebar | **Monorepo** (Option C) |
| Periodic merge of sidebar `main` into your `main` (vendored layout) | **`upstream` + merge/rebase** (section [Best simple pattern](#best-simple-pattern-upstream-remote--merge)) |
| A PR appears here when the sidebar repo changes | **CI** on top of A or B |

---

## Current state of this project

- **`origin`** → **`https://github.com/AceConcept/waypoint-steps.git`** (push your app here).
- **`upstream`** → **`https://github.com/AceConcept/waypoint-sidebar.git`** (fetch; merge/rebase only if you adopt the merge workflow and drop or replace the submodule model).
- **`luna-sidebar/`** is a **Git submodule** pointing at **`waypoint-sidebar`**. Day-to-day sidebar updates: **`.\update-sidebar.ps1`** (or `git submodule update --remote` + commit).
- `src/App.tsx` imports `LunaSidebar` from `../luna-sidebar/src/luna-sidebar/index.js`.

When you adopt Option A or a merge-only layout, remove or stop maintaining a duplicate **`luna-sidebar/`** copy here so there is a single source of truth.
