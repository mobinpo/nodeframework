'use strict';

/**
 * Scaffolding logic for `nodevel new` — copies the bundled skeleton into the
 * target directory, personalizes it, and installs dependencies.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i;

function fail(message) {
    throw new Error(message);
}

function log(step, message) {
    console.log(`\x1b[32m  ${step}\x1b[0m ${message}`);
}

function validateName(name) {
    if (!NAME_RE.test(name)) {
        fail(`"${name}" is not a valid project name. Use letters, numbers, dashes, and underscores.`);
    }
}

function resolveTarget(nameArg, force) {
    // Accept either a bare project name or a relative/absolute path.
    const name = path.basename(nameArg);
    const target = path.resolve(process.cwd(), nameArg);

    if (fs.existsSync(target)) {
        const entries = fs.readdirSync(target);
        if (entries.length > 0 && !force) {
            fail(`Directory "${name}" already exists and is not empty. Use --force to overwrite.`);
        }
    }

    return { name, target };
}

function copySkeleton(skeletonDir, target) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(skeletonDir, target, { recursive: true });
}

/** Replace APP_NAME / APP_KEY in .env.example content. */
function renderEnv(contents, name) {
    return contents
        .replace(/^APP_KEY=.*$/m, `APP_KEY=base64:${crypto.randomBytes(32).toString('base64')}`)
        .replace(/^APP_NAME=.*$/m, `APP_NAME=${name}`);
}

function personalizeProject(target, name) {
    // package.json — set the project name.
    const pkgPath = path.join(target, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = path.basename(target).toLowerCase().replace(/[^a-z0-9._-]/g, '-');
    pkg.description = `A Nodevel application.`;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');

    // .env — generated from .env.example with a fresh application key.
    const envExample = fs.readFileSync(path.join(target, '.env.example'), 'utf8');
    fs.writeFileSync(path.join(target, '.env'), renderEnv(envExample, name));

    // README — title with the project name.
    const readmePath = path.join(target, 'README.md');
    if (fs.existsSync(readmePath)) {
        const readme = fs.readFileSync(readmePath, 'utf8').replace(/^# .*$/m, `# ${name}`);
        fs.writeFileSync(readmePath, readme);
    }
}

function initGit(target) {
    try {
        spawnSync('git', ['init', '-q'], { cwd: target, stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function installDependencies(target) {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    // --include=dev guarantees tsx/typescript land even when NODE_ENV=production.
    const result = spawnSync(npm, ['install', '--include=dev'], { cwd: target, stdio: 'inherit' });

    if (result.error || result.status !== 0) {
        fail('Dependency installation failed. Run "npm install" manually inside the project.');
    }
}

async function newProject(nameArg, options) {
    const name = path.basename(nameArg);
    validateName(name);

    const { skeletonDir } = options;
    if (!fs.existsSync(path.join(skeletonDir, 'package.json'))) {
        fail('Skeleton directory is missing from this installation of @nodevel/cli.');
    }

    const { target } = resolveTarget(nameArg, options.force);

    console.log(`\n\x1b[1mCreating a new Nodevel application in [${target}]\x1b[0m\n`);

    log('➜', 'Copying application skeleton...');
    copySkeleton(skeletonDir, target);

    log('➜', 'Personalizing project files...');
    personalizeProject(target, name);

    let gitOk = false;
    if (options.git !== false) {
        try {
            gitOk = initGit(target);
            if (gitOk) log('➜', 'Initialized git repository.');
        } catch {
            // git is optional.
        }
    }

    if (options.skipInstall) {
        log('➜', 'Skipping dependency installation (--skip-install).');
    } else {
        log('➜', 'Installing dependencies (this may take a moment)...');
        installDependencies(target);
    }

    console.log(`
  \x1b[32m✔ Application ready!\x1b[0m

  Next steps:

    cd \x1b[1m${name}\x1b[0m

    Then start the dev server at http://localhost:8000 with:

    \x1b[1mnpm run dev\x1b[0m
`);

    return 0;
}

module.exports = { newProject, renderEnv };
