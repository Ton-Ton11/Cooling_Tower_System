<?php

namespace App\Console\Commands;

use App\Services\ForecastingService;
use Illuminate\Console\Command;

class EvaluateForecastsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'forecast:evaluate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Evaluate customer predictive maintenance schedules and technician certification expiries, and dispatch automated reminders.';

    /**
     * Execute the console command.
     */
    public function handle(ForecastingService $forecastingService): int
    {
        $this->info('Evaluating predictive maintenance & technician certification compliance forecasts...');

        $result = $forecastingService->evaluateAndDispatchReminders();

        $this->info(sprintf(
            'Done! Dispatched %d customer maintenance reminders and %d technician certification renewal notices (%s).',
            $result['customer_reminders_sent'],
            $result['technician_reminders_sent'],
            $result['evaluated_at']
        ));

        return self::SUCCESS;
    }
}
