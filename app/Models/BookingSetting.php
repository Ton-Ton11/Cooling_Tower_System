<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingSetting extends Model
{
    protected $table = 'booking_settings';

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Get a setting value by key with optional fallback.
     */
    public static function getValue(string $key, $default = null)
    {
        try {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        } catch (\Throwable $e) {
            return $default;
        }
    }

    /**
     * Set/update a setting value by key.
     */
    public static function setValue(string $key, $value)
    {
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value]
        );
    }
}

