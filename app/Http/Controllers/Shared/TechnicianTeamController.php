<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\TechnicianTeam;
use App\Models\TechnicianTeamMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TechnicianTeamController extends Controller
{
    /**
     * Authorize access for Head Technician (role 5 with is_head_technician) or Super Admin (role 1) or Manager (role 2).
     */
    protected function authorizeTeamManager(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $isAuthorized = (int) $user->role_id === 1
            || (int) $user->role_id === 2
            || (int) $user->role_id === 7
            || ((int) $user->role_id === 5 && (bool) $user->is_head_technician);

        abort_unless($isAuthorized, 403, 'Unauthorized to manage technician teams.');
    }

    /**
     * Resolve all role IDs that are considered technician roles.
     */
    protected function getTechnicianRoleIds(): array
    {
        $roleIds = DB::table('roles')
            ->where(function ($q) {
                $q->where('role_name', 'like', '%technician%')
                    ->orWhere('role_name', 'like', '%Technician%');
            })
            ->orWhereIn('role_id', [5, 7])
            ->pluck('role_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();

        return ! empty($roleIds) ? array_values(array_unique($roleIds)) : [5, 7];
    }

    /**
     * Check if technician is assigned to any squad other than the specified team ID.
     */
    protected function getTechnicianCurrentTeam(int $technicianId, ?int $excludeTeamId = null): ?object
    {
        $memberOf = DB::table('technician_team_members')
            ->join('technician_teams', 'technician_teams.team_id', '=', 'technician_team_members.team_id')
            ->where('technician_teams.status', '!=', 'Archived')
            ->where('technician_team_members.technician_id', $technicianId)
            ->when($excludeTeamId !== null, fn ($q) => $q->where('technician_teams.team_id', '!=', $excludeTeamId))
            ->select('technician_teams.team_id', 'technician_teams.team_name')
            ->first();

        if ($memberOf) {
            return $memberOf;
        }

        return DB::table('technician_teams')
            ->where('leader_id', $technicianId)
            ->where('status', '!=', 'Archived')
            ->when($excludeTeamId !== null, fn ($q) => $q->where('team_id', '!=', $excludeTeamId))
            ->select('team_id', 'team_name')
            ->first();
    }

    /**
     * Find any technician in the list already assigned to a team other than $excludeTeamId.
     */
    protected function findTechnicianConflicts(array $technicianIds, ?int $excludeTeamId = null): array
    {
        if (empty($technicianIds)) {
            return [];
        }

        $conflictsFromMembers = DB::table('technician_team_members')
            ->join('technician_teams', 'technician_teams.team_id', '=', 'technician_team_members.team_id')
            ->join('users', 'users.user_id', '=', 'technician_team_members.technician_id')
            ->whereIn('technician_team_members.technician_id', $technicianIds)
            ->where('technician_teams.status', '!=', 'Archived')
            ->when($excludeTeamId !== null, fn ($q) => $q->where('technician_teams.team_id', '!=', $excludeTeamId))
            ->select(
                'technician_team_members.technician_id',
                'technician_teams.team_name',
                DB::raw("TRIM(CONCAT_WS(' ', users.given_name, users.last_name)) as tech_name")
            )
            ->get();

        $conflictsFromLeaders = DB::table('technician_teams')
            ->join('users', 'users.user_id', '=', 'technician_teams.leader_id')
            ->whereIn('technician_teams.leader_id', $technicianIds)
            ->where('technician_teams.status', '!=', 'Archived')
            ->when($excludeTeamId !== null, fn ($q) => $q->where('technician_teams.team_id', '!=', $excludeTeamId))
            ->select(
                'technician_teams.leader_id as technician_id',
                'technician_teams.team_name',
                DB::raw("TRIM(CONCAT_WS(' ', users.given_name, users.last_name)) as tech_name")
            )
            ->get();

        return $conflictsFromMembers
            ->concat($conflictsFromLeaders)
            ->unique('technician_id')
            ->values()
            ->all();
    }

    /**
     * Get array of all active technicians available for team assignments.
     */
    protected function getAvailableTechniciansList(): array
    {
        $roleIds = $this->getTechnicianRoleIds();

        return User::where(function ($query) use ($roleIds) {
                $query->whereIn('role_id', $roleIds)
                    ->orWhere('is_head_technician', true)
                    ->orWhere('is_head_technician', 1);
            })
            ->where(function ($query) {
                $query->whereNull('is_active')
                    ->orWhere('is_active', 1)
                    ->orWhere('is_active', true);
            })
            ->with(['role', 'technicianTeams:technician_teams.team_id,team_name,status', 'ledTeams:team_id,team_name,status'])
            ->orderBy('last_name')
            ->orderBy('given_name')
            ->get(['user_id', 'role_id', 'given_name', 'middle_name', 'last_name', 'email', 'contact_number', 'is_head_technician', 'is_active'])
            ->map(function ($tech) {
                $name = $tech->name ?: trim("{$tech->given_name} {$tech->last_name}");
                $roleName = $tech->role?->role_name ?? ($tech->is_head_technician ? 'Head Technician' : 'Technician');

                $allTeams = $tech->technicianTeams
                    ->filter(fn ($t) => ($t->status ?? '') !== 'Archived')
                    ->concat($tech->ledTeams->filter(fn ($t) => ($t->status ?? '') !== 'Archived'))
                    ->unique('team_id')
                    ->map(fn ($t) => [
                        'team_id' => (int) $t->team_id,
                        'team_name' => $t->team_name,
                    ])
                    ->values();

                return [
                    'user_id' => (int) $tech->user_id,
                    'technician_id' => (int) $tech->user_id,
                    'name' => $name,
                    'full_name' => $name,
                    'email' => $tech->email,
                    'contact_number' => $tech->contact_number,
                    'role_id' => (int) $tech->role_id,
                    'role_name' => $roleName,
                    'is_head_technician' => (bool) $tech->is_head_technician,
                    'teams' => $allTeams,
                    'is_assigned' => $allTeams->isNotEmpty(),
                    'current_team_name' => $allTeams->first()['team_name'] ?? null,
                ];
            })
            ->values()
            ->toArray();
    }

    /**
     * List all technician teams with members, leader, and active stats.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeTeamManager($request);

        $teams = TechnicianTeam::with([
            'leader:user_id,given_name,middle_name,last_name,email,contact_number,is_head_technician',
            'technicians:users.user_id,given_name,middle_name,last_name,email,contact_number,is_head_technician',
            'creator:user_id,given_name,last_name',
        ])
            ->withCount(['bookings', 'members'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($team) {
                return [
                    'team_id' => (int) $team->team_id,
                    'team_name' => $team->team_name,
                    'status' => $team->status,
                    'description' => $team->description,
                    'leader_id' => $team->leader_id ? (int) $team->leader_id : null,
                    'leader' => $team->leader ? [
                        'user_id' => (int) $team->leader->user_id,
                        'name' => $team->leader->name ?: trim("{$team->leader->given_name} {$team->leader->last_name}"),
                        'full_name' => $team->leader->name ?: trim("{$team->leader->given_name} {$team->leader->last_name}"),
                        'email' => $team->leader->email,
                        'contact_number' => $team->leader->contact_number,
                        'is_head_technician' => (bool) $team->leader->is_head_technician,
                    ] : null,
                    'leader_name' => $team->leader ? ($team->leader->name ?: trim("{$team->leader->given_name} {$team->leader->last_name}")) : null,
                    'creator_name' => $team->creator ? $team->creator->name : null,
                    'bookings_count' => (int) $team->bookings_count,
                    'members_count' => (int) $team->members_count,
                    'members' => $team->technicians->map(function ($tech) {
                        $name = $tech->name ?: trim("{$tech->given_name} {$tech->last_name}");
                        return [
                            'user_id' => (int) $tech->user_id,
                            'technician_id' => (int) $tech->user_id,
                            'name' => $name,
                            'full_name' => $name,
                            'email' => $tech->email,
                            'contact_number' => $tech->contact_number,
                            'role_in_team' => $tech->pivot?->role_in_team ?? 'Member',
                            'is_head_technician' => (bool) $tech->is_head_technician,
                        ];
                    })->values(),
                    'created_at' => $team->created_at?->toISOString(),
                ];
            });

        $technicians = $this->getAvailableTechniciansList();

        return response()->json([
            'data' => $teams,
            'technicians' => $technicians,
        ]);
    }

    /**
     * Create a new technician team.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeTeamManager($request);

        $roleIds = $this->getTechnicianRoleIds();

        $validated = $request->validate([
            'team_name' => ['required', 'string', 'max:100', 'unique:technician_teams,team_name'],
            'leader_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'user_id')->where(function ($q) use ($roleIds) {
                    $q->where(function ($sq) use ($roleIds) {
                        $sq->whereIn('role_id', $roleIds)
                            ->orWhere('is_head_technician', true)
                            ->orWhere('is_head_technician', 1);
                    });
                }),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => [
                'integer',
                Rule::exists('users', 'user_id')->where(function ($q) use ($roleIds) {
                    $q->where(function ($sq) use ($roleIds) {
                        $sq->whereIn('role_id', $roleIds)
                            ->orWhere('is_head_technician', true)
                            ->orWhere('is_head_technician', 1);
                    });
                }),
            ],
        ]);

        $currentUserId = (int) $request->user()->user_id;

        // Check if any requested technicians already belong to a squad
        $requestedTechIds = collect($validated['member_ids'] ?? [])
            ->when(! empty($validated['leader_id']), fn ($c) => $c->push($validated['leader_id']))
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $conflicts = $this->findTechnicianConflicts($requestedTechIds, null);
        if (! empty($conflicts)) {
            $conflictList = collect($conflicts)
                ->map(fn ($c) => "{$c->tech_name} (in \"{$c->team_name}\")")
                ->implode(', ');

            return response()->json([
                'message' => "The following technician(s) already belong to a squad: {$conflictList}. Technicians can only belong to one team at a time.",
            ], 422);
        }

        $team = DB::transaction(function () use ($validated, $currentUserId) {
            $team = TechnicianTeam::create([
                'team_name' => $validated['team_name'],
                'leader_id' => $validated['leader_id'] ?? null,
                'created_by' => $currentUserId,
                'status' => 'Active',
                'description' => $validated['description'] ?? null,
            ]);

            $memberIds = collect($validated['member_ids'] ?? []);
            if (! empty($validated['leader_id']) && ! $memberIds->contains($validated['leader_id'])) {
                $memberIds->push($validated['leader_id']);
            }

            foreach ($memberIds->unique() as $techId) {
                TechnicianTeamMember::create([
                    'team_id' => $team->team_id,
                    'technician_id' => (int) $techId,
                    'role_in_team' => ($validated['leader_id'] ?? null) == $techId ? 'Lead' : 'Member',
                ]);
            }

            return $team;
        });

        // Log activity
        DB::table('activity_logs')->insert([
            'user_id' => $currentUserId,
            'action_type' => 'CREATE_TEAM',
            'description' => sprintf('Created technician team "%s".', $team->team_name),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Technician team created successfully.',
            'data' => $team->fresh(['leader', 'technicians']),
        ], 201);
    }

    /**
     * Update a technician team.
     */
    public function update(Request $request, int $teamId): JsonResponse
    {
        $this->authorizeTeamManager($request);

        $team = TechnicianTeam::findOrFail($teamId);
        $roleIds = $this->getTechnicianRoleIds();

        $validated = $request->validate([
            'team_name' => ['required', 'string', 'max:100', Rule::unique('technician_teams', 'team_name')->ignore($teamId, 'team_id')],
            'leader_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'user_id')->where(function ($q) use ($roleIds) {
                    $q->where(function ($sq) use ($roleIds) {
                        $sq->whereIn('role_id', $roleIds)
                            ->orWhere('is_head_technician', true)
                            ->orWhere('is_head_technician', 1);
                    });
                }),
            ],
            'status' => ['nullable', 'string', Rule::in(['Active', 'Inactive', 'Archived'])],
            'description' => ['nullable', 'string', 'max:500'],
            'member_ids' => ['nullable', 'array'],
            'member_ids.*' => [
                'integer',
                Rule::exists('users', 'user_id')->where(function ($q) use ($roleIds) {
                    $q->where(function ($sq) use ($roleIds) {
                        $sq->whereIn('role_id', $roleIds)
                            ->orWhere('is_head_technician', true)
                            ->orWhere('is_head_technician', 1);
                    });
                }),
            ],
        ]);

        // Check if any requested technicians already belong to another squad
        if (isset($validated['member_ids']) || isset($validated['leader_id'])) {
            $currentLeaderId = $validated['leader_id'] ?? $team->leader_id;
            $requestedTechIds = collect($validated['member_ids'] ?? [])
                ->when(! empty($currentLeaderId), fn ($c) => $c->push($currentLeaderId))
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();

            $conflicts = $this->findTechnicianConflicts($requestedTechIds, $teamId);
            if (! empty($conflicts)) {
                $conflictList = collect($conflicts)
                    ->map(fn ($c) => "{$c->tech_name} (in \"{$c->team_name}\")")
                    ->implode(', ');

                return response()->json([
                    'message' => "The following technician(s) already belong to another squad: {$conflictList}. Technicians can only belong to one team at a time.",
                ], 422);
            }
        }

        DB::transaction(function () use ($team, $validated) {
            $team->update([
                'team_name' => $validated['team_name'],
                'leader_id' => $validated['leader_id'] ?? null,
                'status' => $validated['status'] ?? $team->status,
                'description' => $validated['description'] ?? null,
            ]);

            if (isset($validated['member_ids'])) {
                $memberIds = collect($validated['member_ids']);
                if (! empty($validated['leader_id']) && ! $memberIds->contains($validated['leader_id'])) {
                    $memberIds->push($validated['leader_id']);
                }

                // Sync members
                TechnicianTeamMember::where('team_id', $team->team_id)->delete();

                foreach ($memberIds->unique() as $techId) {
                    TechnicianTeamMember::create([
                        'team_id' => $team->team_id,
                        'technician_id' => (int) $techId,
                        'role_in_team' => ($validated['leader_id'] ?? null) == $techId ? 'Lead' : 'Member',
                    ]);
                }
            }
        });

        // Log activity
        DB::table('activity_logs')->insert([
            'user_id' => (int) $request->user()->user_id,
            'action_type' => 'UPDATE_TEAM',
            'description' => sprintf('Updated technician team "%s".', $team->team_name),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Technician team updated successfully.',
            'data' => $team->fresh(['leader', 'technicians']),
        ]);
    }

    /**
     * Add a single technician to a team directly.
     */
    public function addMember(Request $request, int $teamId): JsonResponse
    {
        $this->authorizeTeamManager($request);

        $team = TechnicianTeam::findOrFail($teamId);
        $roleIds = $this->getTechnicianRoleIds();

        $validated = $request->validate([
            'technician_id' => [
                'required',
                'integer',
                Rule::exists('users', 'user_id')->where(function ($q) use ($roleIds) {
                    $q->where(function ($sq) use ($roleIds) {
                        $sq->whereIn('role_id', $roleIds)
                            ->orWhere('is_head_technician', true)
                            ->orWhere('is_head_technician', 1);
                    });
                }),
            ],
            'role_in_team' => ['nullable', 'string', 'max:50'],
        ]);

        $techId = (int) $validated['technician_id'];
        $roleInTeam = $validated['role_in_team'] ?? 'Member';

        // Check if already in this team
        $existing = TechnicianTeamMember::where('team_id', $teamId)
            ->where('technician_id', $techId)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Technician is already a member of this team.',
                'data' => $team->fresh(['leader', 'technicians']),
            ]);
        }

        // Check if already in another team
        $techUser = User::find($techId);
        $techName = $techUser ? $techUser->name : "ID #{$techId}";

        $existingOtherTeam = $this->getTechnicianCurrentTeam($techId, $teamId);
        if ($existingOtherTeam) {
            return response()->json([
                'message' => sprintf(
                    'Technician "%s" is already assigned to team "%s". Technicians can only be assigned to one squad at a time.',
                    $techName,
                    $existingOtherTeam->team_name
                ),
            ], 422);
        }

        TechnicianTeamMember::create([
            'team_id' => $teamId,
            'technician_id' => $techId,
            'role_in_team' => $roleInTeam,
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => (int) $request->user()->user_id,
            'action_type' => 'ADD_TEAM_MEMBER',
            'description' => sprintf('Added technician "%s" to team "%s".', $techName, $team->team_name),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => sprintf('Technician "%s" added to team successfully.', $techName),
            'data' => $team->fresh(['leader', 'technicians']),
        ]);
    }

    /**
     * Remove a single technician from a team directly.
     */
    public function removeMember(Request $request, int $teamId, int $technicianId): JsonResponse
    {
        $this->authorizeTeamManager($request);

        $team = TechnicianTeam::findOrFail($teamId);

        TechnicianTeamMember::where('team_id', $teamId)
            ->where('technician_id', $technicianId)
            ->delete();

        if ($team->leader_id === $technicianId) {
            $team->update(['leader_id' => null]);
        }

        $techUser = User::find($technicianId);
        $techName = $techUser ? $techUser->name : "ID #{$technicianId}";

        DB::table('activity_logs')->insert([
            'user_id' => (int) $request->user()->user_id,
            'action_type' => 'REMOVE_TEAM_MEMBER',
            'description' => sprintf('Removed technician "%s" from team "%s".', $techName, $team->team_name),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => sprintf('Technician "%s" removed from team.', $techName),
            'data' => $team->fresh(['leader', 'technicians']),
        ]);
    }

    /**
     * Archive a technician team (soft-archive and unassign members).
     */
    public function archive(Request $request, int $teamId): JsonResponse
    {
        $this->authorizeTeamManager($request);

        $team = TechnicianTeam::findOrFail($teamId);

        // Check if team has active bookings
        $hasActiveBookings = DB::table('bookings')
            ->where('assigned_team_id', $teamId)
            ->whereIn('booking_status', ['Approved', 'Dispatched', 'In-Progress'])
            ->exists();

        if ($hasActiveBookings) {
            return response()->json([
                'message' => 'Cannot archive team with active bookings. Reassign or complete bookings first.',
            ], 422);
        }

        $teamName = $team->team_name;

        DB::transaction(function () use ($team) {
            // Unassign members so technicians become available for other squads
            TechnicianTeamMember::where('team_id', $team->team_id)->delete();
            $team->update([
                'status' => 'Archived',
                'leader_id' => null,
            ]);
        });

        DB::table('activity_logs')->insert([
            'user_id' => (int) $request->user()->user_id,
            'action_type' => 'ARCHIVE_TEAM',
            'description' => sprintf('Archived technician team "%s".', $teamName),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => sprintf('Technician team "%s" archived successfully.', $teamName),
            'data' => $team->fresh(['leader', 'technicians']),
        ]);
    }

    /**
     * Alias for archive to support legacy DELETE routes.
     */
    public function destroy(Request $request, int $teamId): JsonResponse
    {
        return $this->archive($request, $teamId);
    }

    /**
     * Permanently delete a technician team from the database (Super Admin only).
     */
    public function forceDelete(Request $request, int $teamId): JsonResponse
    {
        abort_unless((int) $request->user()->role_id === 1, 403, 'Only Super Admin can permanently delete technician teams.');

        $team = TechnicianTeam::findOrFail($teamId);

        // Check if team has active bookings in flight
        $hasActiveBookings = DB::table('bookings')
            ->where('assigned_team_id', $teamId)
            ->whereIn('booking_status', ['Approved', 'Dispatched', 'In-Progress'])
            ->exists();

        if ($hasActiveBookings) {
            return response()->json([
                'message' => 'Cannot permanently delete a squad with active in-flight bookings. Reassign or complete bookings first.',
            ], 422);
        }

        $teamName = $team->team_name;

        DB::transaction(function () use ($team) {
            // Delete members
            TechnicianTeamMember::where('team_id', $team->team_id)->delete();
            // Delete the team record
            $team->delete();
        });

        DB::table('activity_logs')->insert([
            'user_id' => (int) $request->user()->user_id,
            'action_type' => 'FORCE_DELETE_TEAM',
            'description' => sprintf('Permanently deleted technician team "%s" from database.', $teamName),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => sprintf('Technician squad "%s" permanently deleted.', $teamName),
            'deleted' => true,
        ]);
    }

    /**
     * Restore an archived technician team back to active.
     */
    public function restore(Request $request, int $teamId): JsonResponse
    {
        $this->authorizeTeamManager($request);

        $team = TechnicianTeam::findOrFail($teamId);
        $team->update([
            'status' => 'Active',
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => (int) $request->user()->user_id,
            'action_type' => 'RESTORE_TEAM',
            'description' => sprintf('Restored technician team "%s" to active.', $team->team_name),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => sprintf('Technician team "%s" restored successfully.', $team->team_name),
            'data' => $team->fresh(['leader', 'technicians']),
        ]);
    }

    /**
     * List all technicians available for team grouping.
     */
    public function availableTechnicians(Request $request): JsonResponse
    {
        $this->authorizeTeamManager($request);

        $technicians = $this->getAvailableTechniciansList();

        return response()->json([
            'data' => $technicians,
            'technicians' => $technicians,
        ]);
    }
}
