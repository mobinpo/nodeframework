'use strict';

export {};

/**
 * Mail — the equivalent of `Illuminate\Mail`.
 *
 * The `log` driver writes rendered emails to storage; an SMTP driver can be
 * plugged in through nodemailer when installed.
 */

interface MailAttachment {
    path: string;
    [key: string]: any;
}

interface SmtpMailerConfig {
    host?: string;
    port?: number | string;
    encryption?: string;
    username?: string;
    password?: string;
    [key: string]: any;
}

/** A mailable message under construction — the MailMessage builder. */
class Message {
    recipients: string[];
    subject_: string;
    htmlBody: string;
    textBody: string;
    from_: string | null;
    attachments: MailAttachment[];
    renderedView: Promise<string> | null = null;

    constructor() {
        this.recipients = [];
        this.subject_ = '';
        this.htmlBody = '';
        this.textBody = '';
        this.from_ = null;
        this.attachments = [];
    }

    to(address: string | string[]): Message {
        for (const recipient of Array.isArray(address) ? address : [address]) {
            this.recipients.push(recipient);
        }
        return this;
    }

    recipient(address: string | string[]): Message {
        return this.to(address);
    }

    from(address: string): Message {
        this.from_ = address;
        return this;
    }

    subject(subject: string): Message {
        this.subject_ = subject;
        return this;
    }

    html(body: string): Message {
        this.htmlBody = body;
        return this;
    }

    text(body: string): Message {
        this.textBody = body;
        return this;
    }

    render(): string {
        if (this.htmlBody) return this.htmlBody;
        if (this.textBody) return `<pre>${this.textBody}</pre>`;
        return '';
    }

    line(text: string): Message {
        this.textBody += `${text}\n`;
        return this;
    }

    action(text: string, url: string): Message {
        this.textBody += `${text}: ${url}\n`;
        this.htmlBody += `<p><a href="${url}">${text}</a></p>`;
        return this;
    }

    view(viewName: string, data: Record<string, any> = {}): Message {
        const app = require('../Foundation/Application').getInstance();
        const factory = app.make('view');
        this.renderedView = factory.make(viewName, data).then((v: any) => v.renderAsync());
        return this;
    }

    attach(fileRelativePath: string, options: Record<string, any> = {}): Message {
        this.attachments.push({ path: fileRelativePath, ...options });
        return this;
    }
}

class LogMailer {
    app: any;

    constructor(app: any) {
        this.app = app;
    }

    async send(message: Message): Promise<boolean> {
        let body = message.htmlBody || message.textBody;
        if (!body && message.renderedView) body = await message.renderedView;

        this.app.make('log').info('Mail sent', {
            to: message.recipients,
            subject: message.subject_,
            preview: String(body).slice(0, 200),
        });

        // Also persist to storage so local development can inspect emails.
        const fs = require('fs');
        const dir = this.app.storagePath('framework/mail');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
            `${dir}/${Date.now()}.eml`,
            [
                `To: ${message.recipients.join(', ')}`,
                `Subject: ${message.subject_}`,
                'Content-Type: text/html; charset=utf-8',
                '',
                body,
            ].join('\n')
        );

        return true;
    }
}

class SmtpMailer {
    config: SmtpMailerConfig;

    constructor(config: SmtpMailerConfig) {
        this.config = config;
    }

    async send(message: Message): Promise<boolean> {
        let nodemailer;
        try {
            nodemailer = require('nodemailer');
        } catch {
            throw new Error('The smtp mailer requires nodemailer. Install via npm install nodemailer.');
        }

        const transport = nodemailer.createTransport({
            host: this.config.host,
            port: Number(this.config.port || 587),
            secure: Boolean(this.config.encryption === 'tls' && Number(this.config.port) === 465),
            auth:
                this.config.username
                    ? { user: this.config.username, pass: this.config.password }
                    : undefined,
        });

        await transport.sendMail({
            from: message.from_,
            to: message.recipients,
            subject: message.subject_,
            html: message.htmlBody,
            text: message.textBody,
        });

        return true;
    }
}

class ArrayMailer {
    sent: Message[];

    constructor() {
        this.sent = [];
    }

    async send(message: Message): Promise<boolean> {
        this.sent.push(message);
        return true;
    }
}

class MailManager {
    app: any;

    constructor(app: any) {
        this.app = app;
    }

    mailer(name: string | null = null): LogMailer | SmtpMailer | ArrayMailer {
        const driver = name || this.app.config('mail.default', 'log');
        switch (driver) {
            case 'log':
                return new LogMailer(this.app);
            case 'smtp':
                return new SmtpMailer(this.app.config('mail.mailers.smtp', {}));
            case 'array':
                return new ArrayMailer();
            default:
                throw new Error(`Unsupported mail driver [${driver}].`);
        }
    }
}

module.exports = { MailManager, Message, LogMailer, SmtpMailer, ArrayMailer };
