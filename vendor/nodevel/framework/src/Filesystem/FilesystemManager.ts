'use strict';

const fs = require('fs');
const path = require('path');

export {};

/**
 * File storage — the equivalent of `Illuminate\Filesystem` with `local`
 * and `public` disks.
 */

class LocalDisk {
    root: string;
    urlPrefix: string | null;

    constructor(root: string, urlPrefix: string | null = null) {
        this.root = path.resolve(root);
        this.urlPrefix = urlPrefix;
    }

    resolve(relativePath: string): string {
        const fullPath = path.resolve(this.root, relativePath);
        if (!fullPath.startsWith(this.root)) {
            throw new Error(`Invalid path: ${relativePath}`);
        }
        return fullPath;
    }

    async put(fileRelativePath: string, contents: string): Promise<string> {
        const target = this.resolve(fileRelativePath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, contents);
        return fileRelativePath;
    }

    async get(fileRelativePath: string, defaultValue: string | null = null): Promise<string | null> {
        try {
            return fs.readFileSync(this.resolve(fileRelativePath), 'utf8');
        } catch {
            return defaultValue;
        }
    }

    async exists(fileRelativePath: string): Promise<boolean> {
        return fs.existsSync(this.resolve(fileRelativePath));
    }

    async delete(fileRelativePath: string): Promise<boolean> {
        try {
            fs.unlinkSync(this.resolve(fileRelativePath));
            return true;
        } catch {
            return false;
        }
    }

    async copy(from: string, to: string): Promise<boolean> {
        const source = this.resolve(from);
        const target = this.resolve(to);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source, target);
        return true;
    }

    async move(from: string, to: string): Promise<boolean> {
        await this.copy(from, to);
        await this.delete(from);
        return true;
    }

    url(fileRelativePath: string): string {
        if (this.urlPrefix) return `${this.urlPrefix.replace(/\/$/, '')}/${fileRelativePath}`;
        return `/storage/${fileRelativePath}`;
    }

    async files(directory: string = ''): Promise<string[]> {
        const dirPath = this.resolve(directory);
        if (!fs.existsSync(dirPath)) return [];
        return fs.readdirSync(dirPath).filter((f) => fs.statSync(path.join(dirPath, f)).isFile());
    }

    async makeDirectory(directory: string): Promise<boolean> {
        fs.mkdirSync(this.resolve(directory), { recursive: true });
        return true;
    }
}

class FilesystemManager {
    app: any;
    disks: Map<string, LocalDisk>;

    constructor(app: any) {
        this.app = app;
        this.disks = new Map();
    }

    disk(name: any = null): LocalDisk {
        name = name || this.app.config('filesystems.default', 'local');
        if (this.disks.has(name)) return this.disks.get(name)!;

        const config = this.app.config(`filesystems.disks.${name}`, {});
        if (config.driver !== 'local') {
            throw new Error(`Unsupported filesystem driver [${config.driver}].`);
        }

        const disk = new LocalDisk(config.root, config.url);
        this.disks.set(name, disk);
        return disk;
    }

    /** Create public/storage symlink — `storage:link`. */
    linkPublic(): boolean {
        const target = this.app.storagePath('app/public');
        const link = this.app.publicPath('storage');
        if (fs.existsSync(link)) return false;
        fs.mkdirSync(target, { recursive: true });
        fs.symlinkSync(target, link);
        return true;
    }
}

module.exports = { FilesystemManager, LocalDisk };
