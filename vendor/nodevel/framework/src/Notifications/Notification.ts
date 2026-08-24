'use strict';

export {};

/**
 * Notifications — the equivalent of `Illuminate\Notifications`.
 *
 * A notifiable entity implements `notify(notification)`; notifications declare
 * `via(entity)` returning channel names and per-channel builder methods.
 */
class Notification {
    /**
     * The channels the notification should be delivered on:
     * ['mail', 'database', 'broadcast'].
     */
    via(notifiable?: any): string[] {
        return ['mail'];
    }

    /** Build the mail representation. */
    toMail(notifiable: any): any {
        void notifiable;
        return null;
    }

    /** Build the array stored by the database channel. */
    toArray(notifiable: any): Record<string, any> {
        void notifiable;
        return {};
    }

    /** Build the broadcast payload. */
    toBroadcast(notifiable: any): Record<string, any> {
        return this.toArray(notifiable);
    }
}

/** Sends notifications across their declared channels. */
class NotificationSender {
    app: any;

    constructor(app: any) {
        this.app = app;
    }

    async send(notifiables: any, notification: Notification): Promise<void> {
        for (const notifiable of Array.isArray(notifiables) ? notifiables : [notifiables]) {
            await this.sendTo(notifiable, notification);
        }
    }

    async sendTo(notifiable: any, notification: Notification): Promise<void> {
        const channels: Iterable<string> = await Promise.resolve<any>(
            typeof notification.via === 'function' ? notification.via(notifiable) : notification.via
        );

        for (const channel of channels) {
            switch (channel) {
                case 'mail':
                    await this.sendMailChannel(notifiable, notification);
                    break;
                case 'database':
                    await this.sendDatabaseChannel(notifiable, notification);
                    break;
                case 'broadcast':
                    await this.sendBroadcastChannel(notifiable, notification);
                    break;
                default:
                    throw new Error(`Unsupported notification channel [${channel}].`);
            }
        }
    }

    async sendMailChannel(notifiable: any, notification: Notification): Promise<void> {
        const message = notification.toMail(notifiable);
        if (!message) return;

        const mailer = this.app.make('mailer');
        const email = typeof notifiable.routeNotificationFor === 'function'
            ? notifiable.routeNotificationFor('mail')
            : notifiable.attributes?.email || notifiable.email;

        await mailer.send(new (require('../Mail/Mailer').Message)()
            .recipient(email)
            .subject(message.subject_ || '')
            .html(message.render()));
    }

    async sendDatabaseChannel(notifiable: any, notification: Notification): Promise<void> {
        const data = notification.toArray(notifiable);
        await this.app.make('db').table('notifications').insert({
            type: notification.constructor.name,
            notifiable_type: notifiable.constructor.getTable(),
            notifiable_id: notifiable.getKey(),
            data: JSON.stringify(data),
            read_at: null,
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        });
    }

    async sendBroadcastChannel(notifiable: any, notification: Notification): Promise<void> {
        const broadcaster = this.app.make('broadcast');
        const payload = notification.toBroadcast(notifiable);
        await broadcaster.connection().broadcast(
            [`App.Models.${notifiable.constructor.name}.${notifiable.getKey()}`],
            'NotificationCreated',
            [payload]
        );
    }
}

module.exports = { Notification, NotificationSender };
