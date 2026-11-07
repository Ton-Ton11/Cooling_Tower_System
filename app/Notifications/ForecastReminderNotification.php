<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ForecastReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected string $category,
        protected string $title,
        protected string $message,
        protected array $meta = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->title)
            ->line($this->message)
            ->action('Open Dashboard', url('/dashboard'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'category' => $this->category, // 'customer_maintenance' | 'tech_certification'
            'title'    => $this->title,
            'message'  => $this->message,
            'meta'     => $this->meta,
            'sent_at'  => now()->toISOString(),
        ];
    }
}
