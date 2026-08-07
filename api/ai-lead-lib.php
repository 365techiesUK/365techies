<?php
/*
 * AI opportunity pipeline - store library (blueprint doc 06, v1 minimum).
 *
 * The store is a single JSON file (ai-pipeline.json, .htaccess-denied) holding
 * every AI opportunity from public intake or staff entry. Writes go through an
 * exclusive flock on a sidecar .lock file plus an atomic tmp+rename, the same
 * durability pattern as the rest of api/. This v1 deliberately stays at the
 * intake/opportunity layer: quote versions, subscriptions and GoCardless refs
 * arrive with the 06-D build on the store the doc-07 ADR picks for them.
 *
 * Doc 06 semantics kept even at this size: stable opaque IDs, stage separate
 * from work_state, idempotent submission, append-only audit trail per record,
 * downstream sync state recorded (a failed Slack ping never loses the lead -
 * the record is durable BEFORE any notification is attempted).
 *
 * Library only: functions and constants, no top-level state, safe to include
 * from any scope. NO closing tag anywhere in this file (the ?> - in - comment
 * trap took the whole api down once).
 */

define('AI_PIPE_FILE', __DIR__ . '/ai-pipeline.json');
define('AI_PIPE_LOCK', __DIR__ . '/ai-pipeline.json.lock');
define('AI_PIPE_SCHEMA', 1);

/* Stable opaque id: AIO- + seconds base36 + 4 random base36 chars. */
function ai_pipe_new_id() {
    $t = base_convert((string)time(), 10, 36);
    $r = substr(base_convert((string)mt_rand(46656, 1679615), 10, 36), 0, 4);
    return 'AIO-' . strtoupper($t . $r);
}

/* Run $fn while holding the store lock. Returns [ok, resultOrError]. */
function ai_pipe_locked($fn) {
    $lh = @fopen(AI_PIPE_LOCK, 'c');
    if (!$lh) return [false, 'lock-open'];
    if (!flock($lh, LOCK_EX)) { fclose($lh); return [false, 'lock']; }
    $data = @json_decode((string)@file_get_contents(AI_PIPE_FILE), true);
    if (!is_array($data) || !isset($data['opportunities'])) {
        $data = ['schema' => AI_PIPE_SCHEMA, 'opportunities' => []];
    }
    $out = $fn($data);           // $fn mutates $data by reference semantics via return
    if (is_array($out) && isset($out['__data'])) {
        $tmp = AI_PIPE_FILE . '.tmp';
        $json = json_encode($out['__data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false || @file_put_contents($tmp, $json) === false) {
            flock($lh, LOCK_UN); fclose($lh); return [false, 'write'];
        }
        if (!@rename($tmp, AI_PIPE_FILE)) { @unlink($tmp); flock($lh, LOCK_UN); fclose($lh); return [false, 'rename']; }
        $res = isset($out['__result']) ? $out['__result'] : true;
    } else {
        // A read-only path may still return a wrapped result (e.g. the
        // idempotent-replay early return) - unwrap it so callers see the same
        // shape whether or not the store was written.
        $res = (is_array($out) && array_key_exists('__result', $out)) ? $out['__result'] : $out;
    }
    flock($lh, LOCK_UN); fclose($lh);
    return [true, $res];
}

/*
 * Create (or idempotently return) an opportunity from a validated intake.
 * $intake keys: problem, category, outcome, systems, frequency, team_size,
 * timeline, name, email, phone, company, existing_customer, page, cta, ref, idem.
 * Returns [ok, ['id'=>..,'duplicate'=>bool]] or [false,'error'].
 */
function ai_pipe_create($intake) {
    return ai_pipe_locked(function ($data) use ($intake) {
        $now = gmdate('c');
        $idem = (string)$intake['idem'];
        // Idempotent replay: same client submission key returns the same record.
        foreach ($data['opportunities'] as $o) {
            if ($idem !== '' && isset($o['idem']) && $o['idem'] === $idem) {
                return ['__result' => ['id' => $o['id'], 'duplicate' => true]];
            }
        }
        // Soft dedupe: identical email + problem inside 10 minutes = browser retry.
        $cut = time() - 600;
        foreach ($data['opportunities'] as $o) {
            if ($o['contact']['email'] === $intake['email']
                && $o['problem'] === $intake['problem']
                && strtotime($o['created_at']) >= $cut) {
                return ['__result' => ['id' => $o['id'], 'duplicate' => true]];
            }
        }
        $id = ai_pipe_new_id();
        $data['opportunities'][] = [
            'id'         => $id,
            'schema'     => AI_PIPE_SCHEMA,
            'created_at' => $now,
            'stage'      => 'NEW',                        // doc 06 s4 canonical stages
            'work_state' => 'INTERNAL_ACTION_REQUIRED',   // doc 06 s4.2
            'source_channel' => 'web',
            'idem'       => $idem,
            'problem'    => $intake['problem'],
            'category'   => $intake['category'],
            'outcome'    => $intake['outcome'],
            'systems'    => $intake['systems'],
            'frequency'  => $intake['frequency'],
            'team_size'  => $intake['team_size'],
            'timeline'   => $intake['timeline'],
            'contact'    => [
                'name'    => $intake['name'],
                'email'   => $intake['email'],
                'phone'   => $intake['phone'],
                'company' => $intake['company'],
                'existing_customer' => $intake['existing_customer'],
            ],
            'attribution' => ['page' => $intake['page'], 'cta' => $intake['cta'], 'ref' => $intake['ref']],
            'owner'      => '',
            'next_action' => 'Review new AI enquiry',
            'sync'       => ['slack' => 'pending'],
            'audit'      => [['t' => $now, 'ev' => 'created via public intake']],
        ];
        return ['__data' => $data, '__result' => ['id' => $id, 'duplicate' => false]];
    });
}

/* Record the outcome of a downstream notification attempt on a record. */
function ai_pipe_mark_sync($id, $channel, $state) {
    return ai_pipe_locked(function ($data) use ($id, $channel, $state) {
        foreach ($data['opportunities'] as $i => $o) {
            if ($o['id'] === $id) {
                $data['opportunities'][$i]['sync'][$channel] = $state;
                $data['opportunities'][$i]['audit'][] = ['t' => gmdate('c'), 'ev' => $channel . ' sync ' . $state];
                return ['__data' => $data, '__result' => true];
            }
        }
        return false;
    });
}

/* ---- staff operations (doc 06 s3/s4): stages, work states, audited updates ---- */

/* Canonical commercial stages (doc 06 s4) and where each may move next. Reopening
 * a terminal stage is allowed but always demands a note (audited reason). */
function ai_pipe_stages() {
    return [
        'NEW'                  => ['TRIAGE'],
        'TRIAGE'               => ['DISCOVERY', 'DEFERRED', 'CLOSED_NOT_PURSUED'],
        'DISCOVERY'            => ['SOLUTION_SCOPE', 'DEFERRED', 'CLOSED_NOT_PURSUED'],
        'SOLUTION_SCOPE'       => ['QUOTE', 'DISCOVERY', 'DEFERRED'],
        'QUOTE'                => ['WON', 'LOST', 'DEFERRED', 'SOLUTION_SCOPE'],
        'WON'                  => ['HANDOFF'],
        'HANDOFF'              => ['DELIVERY_TRANSFERRED'],
        'DELIVERY_TRANSFERRED' => [],
        'DEFERRED'             => ['TRIAGE', 'DISCOVERY', 'SOLUTION_SCOPE', 'QUOTE'],
        'LOST'                 => [],
        'CLOSED_NOT_PURSUED'   => [],
    ];
}

function ai_pipe_work_states() {
    return ['INTERNAL_ACTION_REQUIRED', 'WAITING_ON_CUSTOMER', 'WAITING_ON_THIRD_PARTY',
            'WAITING_ON_OWNER_DECISION', 'SCHEDULED', 'NO_ACTION_CURRENTLY', 'COMPLETE'];
}

/* Stages whose ENTRY always requires a written reason (doc 06 s4.1), plus WON:
 * v1 has no quote-version model yet, so acceptance evidence must be described
 * in the note - never set from enthusiasm alone. */
function ai_pipe_note_required($from, $to) {
    if (in_array($to, ['DEFERRED', 'LOST', 'CLOSED_NOT_PURSUED', 'WON'], true)) return true;
    $terminal = ['DELIVERY_TRANSFERRED', 'LOST', 'CLOSED_NOT_PURSUED'];
    if (in_array($from, $terminal, true)) return true;   // reopening terminal history
    return false;
}

function ai_pipe_get($id) {
    return ai_pipe_locked(function ($data) use ($id) {
        foreach ($data['opportunities'] as $o) {
            if ($o['id'] === $id) return ['__result' => $o];
        }
        return ['__result' => null];
    });
}

/*
 * Audited staff update. $chg may carry: stage, work_state, owner, next_action,
 * note. Returns [true, updatedRecord] or [false, 'human-readable reason'].
 * Every material change appends to the record's audit trail with the actor.
 */
function ai_pipe_update($id, $chg, $actor) {
    $stages = ai_pipe_stages();
    $wstates = ai_pipe_work_states();
    list($ok, $res) = ai_pipe_locked(function ($data) use ($id, $chg, $actor, $stages, $wstates) {
        foreach ($data['opportunities'] as $i => $o) {
            if ($o['id'] !== $id) continue;
            $now = gmdate('c');
            $events = [];
            $note = trim((string)(isset($chg['note']) ? $chg['note'] : ''));

            if (isset($chg['stage']) && $chg['stage'] !== '' && $chg['stage'] !== $o['stage']) {
                $to = (string)$chg['stage'];
                if (!isset($stages[$to])) return ['__result' => ['err' => 'unknown stage ' . $to]];
                $allowed = isset($stages[$o['stage']]) ? $stages[$o['stage']] : [];
                $normal = in_array($to, $allowed, true);
                if (!$normal && $note === '') {
                    return ['__result' => ['err' => $o['stage'] . ' does not normally move to ' . $to .
                        ' - add a note explaining why to override']];
                }
                if (ai_pipe_note_required($o['stage'], $to) && $note === '') {
                    return ['__result' => ['err' => 'moving to ' . $to . ' requires a note (reason/evidence)']];
                }
                $events[] = 'stage ' . $o['stage'] . ' -> ' . $to . ($normal ? '' : ' (override)');
                $o['stage'] = $to;
            }
            if (isset($chg['work_state']) && $chg['work_state'] !== '' && $chg['work_state'] !== $o['work_state']) {
                if (!in_array($chg['work_state'], $wstates, true)) return ['__result' => ['err' => 'unknown work state']];
                $events[] = 'work_state -> ' . $chg['work_state'];
                $o['work_state'] = (string)$chg['work_state'];
            }
            if (isset($chg['owner']) && (string)$chg['owner'] !== $o['owner']) {
                $events[] = 'owner -> ' . ((string)$chg['owner'] === '' ? '(none)' : (string)$chg['owner']);
                $o['owner'] = (string)$chg['owner'];
            }
            if (isset($chg['next_action']) && (string)$chg['next_action'] !== $o['next_action']) {
                $events[] = 'next action: ' . (string)$chg['next_action'];
                $o['next_action'] = (string)$chg['next_action'];
            }
            if ($note !== '') $events[] = 'note: ' . $note;
            if (!$events) return ['__result' => ['err' => 'nothing to change']];

            foreach ($events as $ev) {
                $o['audit'][] = ['t' => $now, 'by' => $actor, 'ev' => $ev];
            }
            $data['opportunities'][$i] = $o;
            return ['__data' => $data, '__result' => ['rec' => $o]];
        }
        return ['__result' => ['err' => 'not found: ' . $id]];
    });
    if (!$ok) return [false, 'store error: ' . $res];
    if (isset($res['err'])) return [false, $res['err']];
    return [true, $res['rec']];
}

/* CLI helper: `php ai-lead-lib.php --list` prints a compact pipeline view.
 * Refuses to run over HTTP (the file is .htaccess-denied as well - belt and braces). */
if (PHP_SAPI === 'cli' && isset($argv) && basename(__FILE__) === basename((string)$argv[0])) {
    if (in_array('--list', $argv, true)) {
        list($ok, $res) = ai_pipe_locked(function ($data) { return $data; });
        if (!$ok) { fwrite(STDERR, "store error: $res\n"); exit(1); }
        $ops = $res['opportunities'];
        echo count($ops), " opportunit", (count($ops) === 1 ? 'y' : 'ies'), "\n";
        foreach ($ops as $o) {
            echo sprintf("%s  %s  %-22s %-28s %s | %s\n",
                $o['id'], substr($o['created_at'], 0, 16), $o['stage'],
                $o['contact']['company'], $o['contact']['email'],
                substr(preg_replace('/\s+/', ' ', $o['problem']), 0, 70));
        }
        exit(0);
    }
}
