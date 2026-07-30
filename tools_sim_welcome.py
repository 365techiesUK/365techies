# -*- coding: utf-8 -*-
"""Simulate the portal-welcome queue path, including PHP's include-scope rule.

There is no PHP on this machine, so the 30 Jul 2026 bug - the automatic welcome
email silently doing nothing for two days - is reproduced here instead, and the
fix is checked against it. What is modelled is the one rule that caused it:

    PHP binds an include's TOP-LEVEL variables to whichever scope ran the
    include. Include inside a function and the config lands in that function's
    locals; the globals stay unset.

Run:  py -X utf8 tools_sim_welcome.py
"""
import json
import os
import tempfile

REAL_QUEUE = os.path.join(tempfile.gettempdir(), "sim_pcm_reviewq.json")


class Php(object):
    """Just enough of a PHP runtime to be wrong in the same way PHP was."""

    def __init__(self):
        self.globals = {}

    def include_review_lib(self, into):
        """pcm-review.php's top-level assignments land in `into`."""
        into["RV_Q"] = REAL_QUEUE
        into["WC_LIVE"] = True
        into["WC_DELAY"] = 0
        into["WC_MAX_AGE"] = 604800

    # ---- the library, reading config through `global` exactly as the PHP does ----
    def rvq_open(self, guard):
        rv_q = self.globals.get("RV_Q")            # global $RV_Q;
        if guard and not (isinstance(rv_q, str) and rv_q):
            return (None, None)                    # the new refusal
        if not rv_q:
            # OLD behaviour: file_exists(null) is false, so the queue reads EMPTY
            return ("phantom-lock", {})
        q = {}
        if os.path.exists(rv_q):
            q = json.load(open(rv_q, encoding="utf-8"))
        return ("lock", q)

    def rvq_save(self, q):
        rv_q = self.globals.get("RV_Q")
        if not rv_q:
            return False                           # rename($tmp, '') fails, silently
        with open(rv_q, "w", encoding="utf-8") as f:
            json.dump(q, f)
        return True

    def wc_record(self, ckey, email, guard):
        lk, q = self.rvq_open(guard)
        if lk is None:
            return False
        q.setdefault("wc", {})
        if ckey in q["wc"]:
            return "exists"
        q["wc"][ckey] = {"em": email, "st": "pending", "tries": 0}
        self.rvq_save(q)
        return True

    def wc_process(self):
        """What the cron sees when it reads the REAL queue."""
        if not os.path.exists(REAL_QUEUE):
            return 0
        q = json.load(open(REAL_QUEUE, encoding="utf-8"))
        return sum(1 for e in q.get("wc", {}).values() if e.get("st") == "pending")


def sign_in(php, ckey, email, top_level_include, guard, cust=None, verify_stamp=False):
    """One portal sign-in through pcm_welcome_maybe.

    `cust` is the customer record, so a stamp survives between sign-ins.
    `verify_stamp` models the fix that checks the queue before trusting a stamp.
    """
    if top_level_include:
        php.include_review_lib(php.globals)        # FIXED: config is global
    locals_ = {}
    if not top_level_include:
        php.include_review_lib(locals_)            # BROKEN: config is function-local

    if cust is None:
        cust = {}
    if cust.get("welcomed"):
        if not verify_stamp:
            return "blocked", True                 # OLD: locked out for ever
        lk, q = php.rvq_open(guard)
        if lk is None:
            return "blocked", True
        if ckey in q.get("wc", {}):
            return "exists", True                  # genuinely handled
        cust.pop("welcomed")                        # the stamp was a lie

    q = php.wc_record(ckey, email, guard)
    stamped = q in (True, "exists")
    if stamped:
        cust["welcomed"] = 1
    return q, stamped


def scenario(name, top_level_include, guard):
    if os.path.exists(REAL_QUEUE):
        os.remove(REAL_QUEUE)
    php = Php()
    r1, s1 = sign_in(php, "cust-a", "a@example.com", top_level_include, guard)
    r2, s2 = sign_in(php, "cust-b", "b@example.com", top_level_include, guard)
    due = php.wc_process()
    print("%-46s wc_record=%-8s stamped=%-5s cron finds %d to send"
          % (name, str(r1), str(s1), due))
    return due, s1


def margriet():
    """The 30 Jul case: stamped by the broken code, then re-signed-in after the fix.

    Steve was sitting with this customer, Outlook open, re-signing her in. Under
    the old rule pcm_welcome_maybe returned on the stamp alone, so no sign-in
    could ever help her. Verifying the stamp against the queue makes it heal.
    """
    if os.path.exists(REAL_QUEUE):
        os.remove(REAL_QUEUE)
    php = Php()
    cust = {}
    # day one, broken build: stamped, nothing queued
    sign_in(php, "margriet", "m@example.com", False, False, cust)
    was_stamped = bool(cust.get("welcomed"))
    queued_then = php.wc_process()

    # fix deployed. She signs in again - OLD rule (trust the bare stamp):
    php_old = Php()
    r_old, _ = sign_in(php_old, "margriet", "m@example.com", True, True,
                       dict(cust), verify_stamp=False)
    queued_old = php_old.wc_process()

    # ...and with the fix that verifies the stamp against the queue:
    php_new = Php()
    r_new, _ = sign_in(php_new, "margriet", "m@example.com", True, True,
                       dict(cust), verify_stamp=True)
    queued_new = php_new.wc_process()
    return was_stamped, queued_then, r_old, queued_old, r_new, queued_new


if __name__ == "__main__":
    print("Modelling: include scope -> $RV_Q -> whether anything reaches the cron\n")

    broken_due, broken_stamped = scenario(
        "BEFORE (include in function, no guard)", False, False)
    guard_due, guard_stamped = scenario(
        "GUARD ONLY (still function scope)", False, True)
    fixed_due, fixed_stamped = scenario(
        "AFTER (include at top level + guard)", True, True)

    print()
    ok = True
    checks = [
        ("the old path queued nothing for the cron", broken_due == 0),
        ("...yet still stamped the customer as welcomed", broken_stamped is True),
        ("the guard alone stops the false stamp", guard_stamped is False),
        ("the guard alone still sends nothing (needs the real fix)", guard_due == 0),
        ("the fix queues both customers for the cron", fixed_due == 2),
        ("the fix stamps them truthfully", fixed_stamped is True),
    ]

    st, q_then, r_old, q_old, r_new, q_new = margriet()
    print()
    print("Re-signing in a customer the broken build had already stamped:")
    print("  day one (broken)      stamped=%s, queued=%d" % (st, q_then))
    print("  trusting the stamp    -> %-8s queued=%d" % (r_old, q_old))
    print("  verifying the stamp   -> %-8s queued=%d" % (r_new, q_new))
    print()
    checks += [
        ("the broken build stamped her with nothing queued", st is True and q_then == 0),
        ("trusting a bare stamp locks her out for ever", r_old == "blocked" and q_old == 0),
        ("verifying the stamp heals her on the next sign-in", r_new is True and q_new == 1),
    ]
    for label, passed in checks:
        print("  %s  %s" % ("PASS" if passed else "FAIL", label))
        ok = ok and passed
    if os.path.exists(REAL_QUEUE):
        os.remove(REAL_QUEUE)
    print("\n%s" % ("all checks pass" if ok else "SIMULATION FAILED"))
    raise SystemExit(0 if ok else 1)
